// App Store Data Fetching Service
export interface AppData {
  // iTunes API fields
  trackId: number
  trackName: string
  artistName: string
  description: string
  price: number
  currency: string
  primaryGenreName: string
  genres: string[]
  averageUserRating?: number
  userRatingCount?: number
  artworkUrl60?: string
  artworkUrl100?: string
  artworkUrl512?: string
  screenshotUrls?: string[]
  releaseDate: string
  version: string
  bundleId: string
  trackViewUrl: string
  contentAdvisoryRating?: string
  minimumOsVersion?: string
  fileSizeBytes?: number
  
  // Our processed fields
  isFree: boolean
  category: string
  subcategory?: string
  keywords?: string[]
  lastUpdated: Date
}

export interface SearchFilters {
  category?: string
  priceRange?: 'free' | 'paid' | 'all'
  minRating?: number
  country?: string
  limit?: number
}

export class AppFetcher {
  private baseUrl = 'https://itunes.apple.com/search'
  
  async searchApps(term: string, filters: SearchFilters = {}): Promise<AppData[]> {
    const params = new URLSearchParams({
      term,
      country: filters.country || 'us',
      media: 'software',
      entity: 'software',
      limit: (filters.limit || 50).toString()
    })

    try {
      const response = await fetch(`${this.baseUrl}?${params}`)
      const data = await response.json()

      if (!data.results) {
        throw new Error('No results returned from iTunes API')
      }

      let apps = data.results.map(this.transformAppData)

      // Apply filters
      if (filters.priceRange === 'free') {
        apps = apps.filter(app => app.isFree)
      } else if (filters.priceRange === 'paid') {
        apps = apps.filter(app => !app.isFree)
      }

      if (filters.minRating) {
        apps = apps.filter(app => 
          app.averageUserRating && app.averageUserRating >= filters.minRating!
        )
      }

      return apps
    } catch (error) {
      console.error('Error fetching apps:', error)
      throw new Error('Failed to fetch apps from iTunes API')
    }
  }

  async fetchAppsFromCategories(categories: string[], filters: SearchFilters = {}): Promise<AppData[]> {
    const allApps: AppData[] = []
    
    for (const category of categories) {
      try {
        const apps = await this.searchApps(category, { ...filters, limit: 20 })
        allApps.push(...apps)
      } catch (error) {
        console.error(`Error fetching apps for category ${category}:`, error)
      }
    }

    // Remove duplicates by trackId
    const uniqueApps = Array.from(
      new Map(allApps.map(app => [app.trackId, app])).values()
    )

    return uniqueApps
  }

  private transformAppData(iTunesApp: any): AppData {
    return {
      // iTunes fields
      trackId: iTunesApp.trackId,
      trackName: iTunesApp.trackName,
      artistName: iTunesApp.artistName,
      description: iTunesApp.description || '',
      price: iTunesApp.price || 0,
      currency: iTunesApp.currency || 'USD',
      primaryGenreName: iTunesApp.primaryGenreName,
      genres: iTunesApp.genres || [],
      averageUserRating: iTunesApp.averageUserRating,
      userRatingCount: iTunesApp.userRatingCount,
      artworkUrl60: iTunesApp.artworkUrl60,
      artworkUrl100: iTunesApp.artworkUrl100,
      artworkUrl512: iTunesApp.artworkUrl512,
      screenshotUrls: iTunesApp.screenshotUrls,
      releaseDate: iTunesApp.releaseDate,
      version: iTunesApp.version,
      bundleId: iTunesApp.bundleId,
      trackViewUrl: iTunesApp.trackViewUrl,
      contentAdvisoryRating: iTunesApp.contentAdvisoryRating,
      minimumOsVersion: iTunesApp.minimumOsVersion,
      fileSizeBytes: iTunesApp.fileSizeBytes,
      
      // Processed fields
      isFree: (iTunesApp.price || 0) === 0,
      category: this.normalizeCategory(iTunesApp.primaryGenreName),
      subcategory: iTunesApp.genres?.[1],
      keywords: this.extractKeywords(iTunesApp),
      lastUpdated: new Date()
    }
  }

  private normalizeCategory(genre: string): string {
    const categoryMapping: { [key: string]: string } = {
      'Productivity': 'productivity',
      'Business': 'productivity', 
      'Health & Fitness': 'health-fitness',
      'Medical': 'health-fitness',
      'Entertainment': 'entertainment',
      'Games': 'entertainment',
      'Social Networking': 'social',
      'Lifestyle': 'lifestyle',
      'Finance': 'finance',
      'Education': 'education',
      'News': 'news',
      'Photo & Video': 'creativity',
      'Music': 'entertainment',
      'Sports': 'sports',
      'Travel': 'travel',
      'Food & Drink': 'food',
      'Shopping': 'shopping',
      'Utilities': 'utilities',
      'Weather': 'utilities',
      'Reference': 'reference'
    }

    return categoryMapping[genre] || 'other'
  }

  private extractKeywords(app: any): string[] {
    const keywords: string[] = []
    
    // Extract from app name
    if (app.trackName) {
      keywords.push(...app.trackName.toLowerCase().split(/\W+/).filter(w => w.length > 2))
    }

    // Extract from description (first 200 chars to avoid too many keywords)
    if (app.description) {
      const desc = app.description.substring(0, 200).toLowerCase()
      const descWords = desc.split(/\W+/).filter(w => w.length > 3)
      keywords.push(...descWords.slice(0, 10)) // Limit to 10 keywords from description
    }

    // Add category as keyword
    if (app.primaryGenreName) {
      keywords.push(app.primaryGenreName.toLowerCase().replace(/\s+/g, '-'))
    }

    // Add price-related keywords
    if ((app.price || 0) === 0) {
      keywords.push('free')
    } else {
      keywords.push('paid', 'premium')
    }

    // Remove duplicates and return
    return Array.from(new Set(keywords))
  }

  // Predefined categories for systematic fetching
  static getPopularCategories(): string[] {
    return [
      'productivity',
      'health fitness',
      'entertainment', 
      'social networking',
      'finance',
      'education',
      'lifestyle',
      'business',
      'food drink',
      'travel',
      'photo video',
      'music',
      'news',
      'weather',
      'shopping'
    ]
  }

  // Get apps optimized for specific user preferences
  async getAppsForUserPreferences(preferences: {
    lifestyle?: string[]
    goals?: string[]
    budget?: 'free' | 'paid' | 'mixed'
    categories?: string[]
  }): Promise<AppData[]> {
    const searchTerms: string[] = []
    
    // Add lifestyle-based terms
    if (preferences.lifestyle) {
      searchTerms.push(...preferences.lifestyle)
    }

    // Add goal-based terms
    if (preferences.goals) {
      searchTerms.push(...preferences.goals)
    }

    // Add specific categories
    if (preferences.categories) {
      searchTerms.push(...preferences.categories)
    }

    // Default search if no preferences
    if (searchTerms.length === 0) {
      searchTerms.push('productivity', 'lifestyle', 'health')
    }

    const filters: SearchFilters = {
      priceRange: preferences.budget === 'free' ? 'free' : 
                 preferences.budget === 'paid' ? 'paid' : 'all',
      minRating: 3.5, // Only get well-rated apps
      limit: 25
    }

    return this.fetchAppsFromCategories(searchTerms, filters)
  }
}

export const appFetcher = new AppFetcher()