import { GoogleGenerativeAI } from '@google/generative-ai'

// Initialize Gemini AI
const apiKey = process.env.GEMINI_API_KEY
let genAI: GoogleGenerativeAI | null = null

if (apiKey) {
  genAI = new GoogleGenerativeAI(apiKey)
}

// App recommendation interface
export interface AppRecommendation {
  name: string
  category: string
  description: string
  features: string[]
  rating: number
  price: 'Free' | 'Paid' | 'Freemium'
  platforms: string[]
  recommendationReason: string
}

export interface UserPreferences {
  lifestyle?: string[]
  interests?: string[]
  goals?: string[]
  currentApps?: string[]
  deviceType?: 'ios' | 'android' | 'web' | 'desktop'
  budget?: 'free' | 'low' | 'medium' | 'high'
}

export const geminiService = {
  async generateAppRecommendations(
    userPreferences: UserPreferences,
    query?: string
  ): Promise<AppRecommendation[]> {
    if (!genAI) {
      throw new Error('Gemini AI not configured. Please add GEMINI_API_KEY to environment variables.')
    }

    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

      const prompt = this.buildRecommendationPrompt(userPreferences, query)
      
      const result = await model.generateContent(prompt)
      const response = await result.response
      const text = response.text()

      return this.parseRecommendations(text)
    } catch (error) {
      console.error('Error generating app recommendations:', error)
      throw new Error('Failed to generate app recommendations')
    }
  },

  async improveSearch(query: string): Promise<string> {
    if (!genAI) {
      throw new Error('Gemini AI not configured.')
    }

    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

      const prompt = `
Improve and expand this app search query to be more specific and useful for finding relevant mobile/web applications:

Original query: "${query}"

Please return an improved search query that:
1. Uses specific app-related keywords
2. Includes relevant categories or use cases
3. Is more descriptive but concise
4. Focuses on functionality and purpose

Return only the improved query, nothing else.
`

      const result = await model.generateContent(prompt)
      const response = await result.response
      return response.text().trim()
    } catch (error) {
      console.error('Error improving search query:', error)
      return query // Return original query if AI fails
    }
  },

  buildRecommendationPrompt(preferences: UserPreferences, query?: string): string {
    const basePrompt = `
You are an expert app recommendation system. Generate personalized app recommendations based on user preferences.

User Preferences:
${preferences.lifestyle ? `- Lifestyle: ${preferences.lifestyle.join(', ')}` : ''}
${preferences.interests ? `- Interests: ${preferences.interests.join(', ')}` : ''}
${preferences.goals ? `- Goals: ${preferences.goals.join(', ')}` : ''}
${preferences.currentApps ? `- Current Apps: ${preferences.currentApps.join(', ')}` : ''}
${preferences.deviceType ? `- Device: ${preferences.deviceType}` : ''}
${preferences.budget ? `- Budget: ${preferences.budget}` : ''}
${query ? `- Search Query: ${query}` : ''}

Generate 6-8 diverse app recommendations in JSON format. Each recommendation should include:
- name: App name
- category: App category (e.g., "Productivity", "Health & Fitness", "Entertainment")
- description: Brief description (50-100 words)
- features: Array of 3-5 key features
- rating: Rating out of 5 (as number)
- price: "Free", "Paid", or "Freemium"
- platforms: Array of platforms (e.g., ["iOS", "Android", "Web"])
- recommendationReason: Why this app fits the user's preferences (30-50 words)

Focus on:
1. Real, popular, well-known apps when possible
2. Diverse categories to provide variety
3. Apps that match the user's lifestyle and goals
4. Mix of free and paid options based on budget
5. Apps available on their preferred platform

Return only a JSON array of recommendations, no other text.
`

    return basePrompt
  },

  parseRecommendations(text: string): AppRecommendation[] {
    try {
      // Clean up the response text
      let cleanText = text.trim()
      
      // Remove markdown code blocks if present
      cleanText = cleanText.replace(/```json\n?/g, '').replace(/```\n?/g, '')
      
      // Parse the JSON
      const recommendations = JSON.parse(cleanText)
      
      // Validate the structure
      if (!Array.isArray(recommendations)) {
        throw new Error('Response is not an array')
      }

      return recommendations.map((rec: any) => ({
        name: rec.name || 'Unknown App',
        category: rec.category || 'General',
        description: rec.description || 'No description available',
        features: Array.isArray(rec.features) ? rec.features : [],
        rating: typeof rec.rating === 'number' ? rec.rating : 4.0,
        price: ['Free', 'Paid', 'Freemium'].includes(rec.price) ? rec.price : 'Free',
        platforms: Array.isArray(rec.platforms) ? rec.platforms : ['iOS', 'Android'],
        recommendationReason: rec.recommendationReason || 'Recommended for you'
      }))
    } catch (error) {
      console.error('Error parsing recommendations:', error)
      // Return fallback recommendations
      return this.getFallbackRecommendations()
    }
  },

  getFallbackRecommendations(): AppRecommendation[] {
    return [
      {
        name: 'Notion',
        category: 'Productivity',
        description: 'All-in-one workspace for notes, docs, and collaboration.',
        features: ['Note-taking', 'Database management', 'Team collaboration', 'Templates'],
        rating: 4.5,
        price: 'Freemium',
        platforms: ['iOS', 'Android', 'Web', 'Desktop'],
        recommendationReason: 'Perfect for organizing thoughts and boosting productivity'
      },
      {
        name: 'Headspace',
        category: 'Health & Fitness',
        description: 'Meditation and mindfulness app for mental wellness.',
        features: ['Guided meditation', 'Sleep stories', 'Mindfulness exercises', 'Progress tracking'],
        rating: 4.3,
        price: 'Freemium',
        platforms: ['iOS', 'Android', 'Web'],
        recommendationReason: 'Great for stress relief and mental health'
      },
      {
        name: 'Spotify',
        category: 'Music',
        description: 'Music streaming platform with millions of songs and podcasts.',
        features: ['Music streaming', 'Podcast library', 'Personalized playlists', 'Offline listening'],
        rating: 4.4,
        price: 'Freemium',
        platforms: ['iOS', 'Android', 'Web', 'Desktop'],
        recommendationReason: 'Essential for music lovers and entertainment'
      }
    ]
  }
}

export default geminiService