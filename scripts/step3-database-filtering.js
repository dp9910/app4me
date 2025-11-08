/**
 * Step 3: Database App Filtering
 * Filter apps from database using processed keywords on app titles and features
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

class DatabaseFilter {
  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );
  }

  /**
   * Filter apps using weighted priority hierarchy
   */
  async filterApps(keywordData) {
    console.log('🗃️ Filtering apps from database...');
    console.log('=' .repeat(60));
    
    try {
      if (!keywordData) {
        throw new Error('Keyword data object must be provided to filterApps.');
      }
      // Load processed keywords with weighted categories
      const weightedKeywords = keywordData.original_analysis?.weighted_keywords || {};
      const primaryDomain = keywordData.processed_keywords.primary_domain;
      
      console.log(`🎯 Primary Domain: ${primaryDomain || 'general'}`);
      console.log(`⚖️ Using weighted priority search hierarchy`);
      
      // PRIORITY LEVEL 1: Adapt based on query type
      let highPriorityKeywords;
      const queryType = keywordData.original_analysis?.query_type || 'problem';
      
      if (queryType === 'problem') {
        // PROBLEM + SOLUTION (Weights 1.0, 0.9)
        highPriorityKeywords = [
          ...(weightedKeywords.problem?.keywords || []),
          ...(weightedKeywords.solution?.keywords || [])
        ];
      } else {
        // PRIMARY + FUNCTIONAL (Weights 1.0, 0.9) for general queries
        highPriorityKeywords = [
          ...(weightedKeywords.primary?.keywords || []),
          ...(weightedKeywords.functional?.keywords || [])
        ];
      }
      
      console.log(`\n🔥 HIGH PRIORITY: ${highPriorityKeywords.slice(0, 5).join(', ')}${highPriorityKeywords.length > 5 ? '...' : ''}`);
      const highPriorityCandidates = await this.searchWithKeywords(highPriorityKeywords, 'HIGH', 30);
      
      let allCandidates = [...highPriorityCandidates];
      console.log(`✅ Found ${highPriorityCandidates.length} HIGH priority candidates`);
      
      // PRIORITY LEVEL 2: Adapt medium priority based on query type
      if (allCandidates.length < 20) {
        let mediumPriorityKeywords;
        if (queryType === 'problem') {
          // CAUSE (Weight 0.7) for problem queries
          mediumPriorityKeywords = weightedKeywords.cause?.keywords || [];
        } else {
          // DESCRIPTIVE (Weight 0.7) for general queries  
          mediumPriorityKeywords = weightedKeywords.descriptive?.keywords || [];
        }
        
        if (mediumPriorityKeywords.length > 0) {
          console.log(`\n🔶 MEDIUM PRIORITY: ${mediumPriorityKeywords.join(', ')}`);
          const mediumPriorityCandidates = await this.searchWithKeywords(mediumPriorityKeywords, 'MEDIUM', 15);
          
          // Combine and deduplicate
          allCandidates = this.combineAndDeduplicate([
            ...allCandidates.map(app => ({ ...app, priority_level: 'HIGH' })),
            ...mediumPriorityCandidates.map(app => ({ ...app, priority_level: 'MEDIUM' }))
          ]);
          
          console.log(`✅ Added ${mediumPriorityCandidates.length} MEDIUM priority candidates (Total: ${allCandidates.length})`);
        }
      }
      
      // PRIORITY LEVEL 3: CONTEXT (Weight 0.5) - Only as last resort
      if (allCandidates.length < 15) {
        const lowPriorityKeywords = weightedKeywords.context?.keywords || [];
        
        if (lowPriorityKeywords.length > 0) {
          console.log(`\n🔹 LOW PRIORITY: ${lowPriorityKeywords.slice(0, 3).join(', ')}`);
          const lowPriorityCandidates = await this.searchWithKeywords(lowPriorityKeywords, 'LOW', 10);
          
          allCandidates = this.combineAndDeduplicate([
            ...allCandidates.map(app => ({ ...app, priority_level: app.priority_level || 'HIGH' })),
            ...lowPriorityCandidates.map(app => ({ ...app, priority_level: 'LOW' }))
          ]);
          
          console.log(`✅ Added ${lowPriorityCandidates.length} LOW priority candidates (Total: ${allCandidates.length})`);
        }
      }
      
      // Sort by priority level and rating
      const sortedCandidates = this.prioritizeAndSortWeighted(allCandidates);
      
      console.log(`\n📊 Total unique candidate apps: ${sortedCandidates.length}`);
      
      // Show priority breakdown
      const priorityBreakdown = {
        HIGH: sortedCandidates.filter(app => app.priority_level === 'HIGH').length,
        MEDIUM: sortedCandidates.filter(app => app.priority_level === 'MEDIUM').length,
        LOW: sortedCandidates.filter(app => app.priority_level === 'LOW').length
      };
      
      console.log(`📊 Priority Breakdown: HIGH: ${priorityBreakdown.HIGH}, MEDIUM: ${priorityBreakdown.MEDIUM}, LOW: ${priorityBreakdown.LOW}`);
      
      if (sortedCandidates.length > 0) {
        console.log('\n🎯 Top candidates:');
        sortedCandidates.slice(0, 10).forEach((app, i) => {
          const priorityIcon = app.priority_level === 'HIGH' ? '🔥' : app.priority_level === 'MEDIUM' ? '🔶' : '🔹';
          console.log(`   ${i+1}. ${app.title} (${app.source}) ${priorityIcon} ${app.priority_level} - Rating: ${app.rating} - Cat: ${app.primary_category}`);
        });
      }
      
      // Save filtered candidates for next step
      const result = {
        weighted_search: true,
        primary_domain: primaryDomain,
        candidates: sortedCandidates,
        priority_breakdown: priorityBreakdown,
        weighted_keywords: weightedKeywords,
        stats: {
          high_priority_matches: priorityBreakdown.HIGH,
          medium_priority_matches: priorityBreakdown.MEDIUM,
          low_priority_matches: priorityBreakdown.LOW,
          total_unique: sortedCandidates.length
        },
        timestamp: new Date().toISOString()
      };
      
      return result;
      
    } catch (error) {
      console.error('❌ Database filtering failed:', error.message);
      throw error;
    }
  }

  /**
   * Search apps by title keywords
   */
  async searchAppsByTitle(titleKeywords, limit = 50) {
    if (titleKeywords.length === 0) return [];
    
    console.log(`🔍 Searching app titles for: ${titleKeywords.join(', ')}`);
    
    try {
      // Build title search conditions with word boundaries
      const titleConditions = titleKeywords.map(keyword => 
        `title.ilike.%${keyword}%`
      ).join(',');
      
      const { data: titleMatches, error } = await this.supabase
        .from('apps_unified')
        .select('id, title, developer, primary_category, description, rating, icon_url, price')
        .or(titleConditions)
        .gte('rating', 2.0) // Quality filter
        .order('rating', { ascending: false })
        .limit(limit);
      
      if (error) {
        console.error('❌ Title search error:', error.message);
        return [];
      }
      
      return titleMatches || [];
      
    } catch (error) {
      console.error('❌ Title search failed:', error.message);
      return [];
    }
  }

  /**
   * Search apps by features (using app_features table if it exists)
   */
  async searchAppsByFeatures(featureKeywords, limit = 100) {
    if (featureKeywords.length === 0) return [];
    
    console.log(`🔍 Searching app features for: ${featureKeywords.slice(0, 3).join(', ')}...`);
    
    try {
      // First check if app_features table exists and has data
      const { data: featureData, error: featureError } = await this.supabase
        .from('app_features')
        .select('app_id, primary_use_case, key_benefit, target_user')
        .limit(1);
      
      if (featureError || !featureData || featureData.length === 0) {
        console.log('⚠️ No app_features table found, skipping feature search');
        return [];
      }
      
      // Build feature search conditions
      const featureConditions = featureKeywords.slice(0, 5).map(keyword => 
        `primary_use_case.ilike.%${keyword}%,key_benefit.ilike.%${keyword}%,target_user.ilike.%${keyword}%`
      ).flat().join(',');
      
      const { data: featureMatches, error } = await this.supabase
        .from('app_features')
        .select('app_id')
        .or(featureConditions)
        .limit(limit);
      
      if (error) {
        console.error('❌ Feature search error:', error.message);
        return [];
      }
      
      if (!featureMatches || featureMatches.length === 0) {
        return [];
      }
      
      // Get app details for feature matches
      const appIds = featureMatches.map(f => f.app_id);
      const { data: apps, error: appError } = await this.supabase
        .from('apps_unified')
        .select('id, title, developer, primary_category, description, rating, icon_url, price')
        .in('id', appIds)
        .gte('rating', 1.5)
        .order('rating', { ascending: false });
      
      if (appError) {
        console.error('❌ App details fetch error:', appError.message);
        return [];
      }
      
      return apps || [];
      
    } catch (error) {
      console.error('❌ Feature search failed:', error.message);
      return [];
    }
  }

  /**
   * Search apps by description (fallback)
   */
  async searchAppsByDescription(descriptionKeywords, limit = 30) {
    if (descriptionKeywords.length === 0) return [];
    
    console.log(`🔍 Searching app descriptions for: ${descriptionKeywords.join(', ')}`);
    
    try {
      // Build description search conditions (limit to top keywords)
      const descConditions = descriptionKeywords.slice(0, 3).map(keyword => 
        `description.ilike.%${keyword}%`
      ).join(',');
      
      const { data: descMatches, error } = await this.supabase
        .from('apps_unified')
        .select('id, title, developer, primary_category, description, rating, icon_url, price')
        .or(descConditions)
        .gte('rating', 2.5) // Higher threshold for description matches
        .order('rating', { ascending: false })
        .limit(limit);
      
      if (error) {
        console.error('❌ Description search error:', error.message);
        return [];
      }
      
      return descMatches || [];
      
    } catch (error) {
      console.error('❌ Description search failed:', error.message);
      return [];
    }
  }

  /**
   * Combine results and remove duplicates
   */
  combineAndDeduplicate(allCandidates) {
    const seen = new Map();
    
    for (const app of allCandidates) {
      const id = app.id;
      
      if (!seen.has(id)) {
        seen.set(id, app);
      } else {
        // Keep the one with higher priority
        const existing = seen.get(id);
        if (app.priority > existing.priority) {
          seen.set(id, app);
        }
      }
    }
    
    return Array.from(seen.values());
  }

  /**
   * Search with specific keywords across title, features, and description
   */
  async searchWithKeywords(keywords, priorityLevel, limit = 30) {
    if (keywords.length === 0) return [];
    
    const allResults = [];
    
    // Search titles first (highest relevance)
    const titleResults = await this.searchAppsByTitle(keywords.slice(0, 3), Math.min(limit, 15));
    allResults.push(...titleResults.map(app => ({ ...app, source: 'title', search_priority: 3 })));
    
    // Search features if we need more results
    if (allResults.length < limit * 0.7) {
      const featureResults = await this.searchAppsByFeatures(keywords.slice(0, 4), Math.min(limit - allResults.length, 15));
      allResults.push(...featureResults.map(app => ({ ...app, source: 'features', search_priority: 2 })));
    }
    
    // Search descriptions only if we still need more
    if (allResults.length < limit * 0.5) {
      const descResults = await this.searchAppsByDescription(keywords.slice(0, 2), Math.min(limit - allResults.length, 10));
      allResults.push(...descResults.map(app => ({ ...app, source: 'description', search_priority: 1 })));
    }
    
    // Remove duplicates and return
    return this.combineAndDeduplicate(allResults);
  }

  /**
   * Prioritize and sort candidates using weighted approach
   */
  prioritizeAndSortWeighted(candidates) {
    return candidates.sort((a, b) => {
      // First by priority level (HIGH > MEDIUM > LOW)
      const priorityOrder = { 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 };
      const priorityA = priorityOrder[a.priority_level] || 1;
      const priorityB = priorityOrder[b.priority_level] || 1;
      
      if (priorityA !== priorityB) {
        return priorityB - priorityA;
      }
      
      // Then by search priority (title > features > description) 
      if (a.search_priority !== b.search_priority) {
        return (b.search_priority || 0) - (a.search_priority || 0);
      }
      
      // Finally by rating
      const ratingA = a.rating || 0;
      const ratingB = b.rating || 0;
      return ratingB - ratingA;
    });
  }

  /**
   * Prioritize and sort candidates (legacy method)
   */
  prioritizeAndSort(candidates) {
    return candidates.sort((a, b) => {
      // First by priority (title > features > description)
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }
      
      // Then by rating
      const ratingA = a.rating || 0;
      const ratingB = b.rating || 0;
      return ratingB - ratingA;
    });
  }

  /**
   * Get statistics about the filtering process
   */
  async getFilteringStats() {
    try {
      // Get total app count
      const { count: totalApps } = await this.supabase
        .from('apps_unified')
        .select('*', { count: 'exact', head: true });
      
      // Check if we have features table
      const { count: totalFeatures } = await this.supabase
        .from('app_features')
        .select('*', { count: 'exact', head: true })
        .then(result => result, () => ({ count: 0 }));
      
      console.log(`\n📊 Database Stats:`);
      console.log(`   Total Apps: ${totalApps || 0}`);
      console.log(`   Apps with Features: ${totalFeatures || 0}`);
      
      return {
        total_apps: totalApps || 0,
        apps_with_features: totalFeatures || 0
      };
      
    } catch (error) {
      console.error('⚠️ Could not get database stats:', error.message);
      return { total_apps: 0, apps_with_features: 0 };
    }
  }
}

// Test function
async function testDatabaseFiltering() {
  const filter = new DatabaseFilter();
  
  try {
    await filter.getFilteringStats();
    
    const result = await filter.filterApps();
    
    // Save filtered candidates for next step
    fs.writeFileSync('./temp-candidates.json', JSON.stringify(result, null, 2));
    console.log('\n💾 Filtered candidates saved to temp-candidates.json');
    
    return result;
    
  } catch (error) {
    console.error('💥 Test failed:', error.message);
  }
}

// Export for use in other scripts
module.exports = DatabaseFilter;

// Run test if called directly
if (require.main === module) {
  testDatabaseFiltering().catch(console.error);
}