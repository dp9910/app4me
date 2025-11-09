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
      if (!keywordData || !keywordData.search_terms) {
        throw new Error('Keyword data with search_terms must be provided to filterApps.');
      }

      const { high_priority, medium_priority, low_priority } = keywordData.search_terms;
      const primaryDomain = keywordData.processed_keywords.primary_domain;
      
      console.log(`🎯 Primary Domain: ${primaryDomain || 'general'}`);
      console.log(`⚖️ Using weighted priority search hierarchy`);
      
      console.log(`🔥 HIGH PRIORITY: ${high_priority.slice(0, 5).join(', ')}${high_priority.length > 5 ? '...' : ''}`);
      const highPriorityCandidates = await this.searchWithKeywords(high_priority, 'HIGH', 10); // Fetch 10 high priority
      
      console.log(`✅ Found ${highPriorityCandidates.length} HIGH priority candidates`);
      
      console.log(`
🔶 MEDIUM PRIORITY: ${medium_priority.join(', ')}`);
      const mediumPriorityCandidates = await this.searchWithKeywords(medium_priority, 'MEDIUM', 10); // Fetch 10 medium priority
      
      console.log(`✅ Found ${mediumPriorityCandidates.length} MEDIUM priority candidates`);

      console.log(`
🔹 LOW PRIORITY: ${low_priority.slice(0, 3).join(', ')}${low_priority.length > 3 ? '...' : ''}`);
      const lowPriorityCandidates = await this.searchWithKeywords(low_priority, 'LOW', 10); // Fetch 10 low priority
      
      console.log(`✅ Found ${lowPriorityCandidates.length} LOW priority candidates`);

      let allCandidates = [
        ...highPriorityCandidates.map(app => ({ ...app, priority_level: 'HIGH' })),
        ...mediumPriorityCandidates.map(app => ({ ...app, priority_level: 'MEDIUM' })),
        ...lowPriorityCandidates.map(app => ({ ...app, priority_level: 'LOW' }))
      ];
      allCandidates = this.combineAndDeduplicate(allCandidates);
      
      // Sort by priority level and rating
      const sortedCandidates = this.prioritizeAndSortWeighted(allCandidates);
      
      console.log(`
📊 Total unique candidate apps: ${sortedCandidates.length}`);
      
      // Show priority breakdown
      const priorityBreakdown = {
        HIGH: sortedCandidates.filter(app => app.priority_level === 'HIGH').length,
        MEDIUM: sortedCandidates.filter(app => app.priority_level === 'MEDIUM').length,
        LOW: sortedCandidates.filter(app => app.priority_level === 'LOW').length
      };
      
      console.log(`📊 Priority Breakdown: HIGH: ${priorityBreakdown.HIGH}, MEDIUM: ${priorityBreakdown.MEDIUM}, LOW: ${priorityBreakdown.LOW}`);
      
      if (sortedCandidates.length > 0) {
        console.log('
🎯 Top candidates:');
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
      // Build title search conditions for each original keyword as a phrase
      const phraseConditions = titleKeywords.map(keyword => 
        `title.ilike.%${keyword}%`
      ).join(',');
      
      let { data: titleMatches, error } = await this.supabase
        .from('apps_unified')
        .select('id, title, developer, primary_category, description, rating, icon_url, price')
        .or(phraseConditions)
        .gte('rating', 2.0) // Quality filter
        .order('rating', { ascending: false })
        .limit(limit);
      
      if (error) {
        console.error('❌ Title phrase search error:', error.message);
        return [];
      }

      // If no matches found with phrases, try individual words (more flexible)
      if (!titleMatches || titleMatches.length === 0) {
        console.log('⚠️ No phrase matches found, trying individual word search for titles.');
        const individualWordConditions = titleKeywords.flatMap(keyword => 
          keyword.split(/\s+/).map(word => `title.ilike.%${word}%`)
        ).join(',');

        let { data: wordMatches, error: wordError } = await this.supabase
          .from('apps_unified')
          .select('id, title, developer, primary_category, description, rating, icon_url, price')
          .or(individualWordConditions)
          .gte('rating', 2.0) // Quality filter
          .order('rating', { ascending: false })
          .limit(limit);

        if (wordError) {
          console.error('❌ Title individual word search error:', wordError.message);
          return [];
        }
        return wordMatches || [];
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
        // Keep the one with higher search priority (e.g., title match > description match)
        const existing = seen.get(id);
        if ((app.search_priority || 0) > (existing.search_priority || 0)) {
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
    
    // Search descriptions only if we still need more, and not for HIGH priority searches
    if (priorityLevel !== 'HIGH' && allResults.length < limit * 0.5) {
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
      return ratingB - a.rating;
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
      
      console.log(`
📊 Database Stats:`);
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
    console.log('
💾 Filtered candidates saved to temp-candidates.json');
    
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