import { NextRequest, NextResponse } from 'next/server'
import { geminiService } from '@/lib/ai/gemini-client'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { query } = body as { query: string }

    if (!query || query.trim().length === 0) {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      )
    }

    // Improve the search query using AI
    const improvedQuery = await geminiService.improveSearch(query.trim())

    return NextResponse.json({
      success: true,
      originalQuery: query,
      improvedQuery,
      improved: improvedQuery !== query
    })

  } catch (error: any) {
    console.error('Error improving search query:', error)
    
    // Return the original query if AI fails
    const body = await request.json()
    return NextResponse.json({
      success: true,
      originalQuery: body.query,
      improvedQuery: body.query,
      improved: false,
      error: 'AI enhancement failed, using original query'
    })
  }
}