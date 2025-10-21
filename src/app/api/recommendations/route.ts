import { NextRequest, NextResponse } from 'next/server'
import { geminiService, UserPreferences } from '@/lib/ai/gemini-client'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { preferences, query } = body as {
      preferences: UserPreferences
      query?: string
    }

    // Validate that we have at least some preferences or a query
    if (!preferences && !query) {
      return NextResponse.json(
        { error: 'Either preferences or query is required' },
        { status: 400 }
      )
    }

    // Generate recommendations using Gemini AI
    const recommendations = await geminiService.generateAppRecommendations(
      preferences || {},
      query
    )

    return NextResponse.json({
      success: true,
      recommendations,
      count: recommendations.length
    })

  } catch (error: any) {
    console.error('Error generating recommendations:', error)
    
    // Return appropriate error response
    if (error.message.includes('Gemini AI not configured')) {
      return NextResponse.json(
        { error: 'AI service is not configured properly' },
        { status: 503 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to generate recommendations' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const query = searchParams.get('q')

  if (!query) {
    return NextResponse.json(
      { error: 'Query parameter "q" is required' },
      { status: 400 }
    )
  }

  try {
    // Generate recommendations based on search query only
    const recommendations = await geminiService.generateAppRecommendations(
      {}, // Empty preferences
      query
    )

    return NextResponse.json({
      success: true,
      query,
      recommendations,
      count: recommendations.length
    })

  } catch (error: any) {
    console.error('Error generating search recommendations:', error)
    
    return NextResponse.json(
      { error: 'Failed to generate search recommendations' },
      { status: 500 }
    )
  }
}