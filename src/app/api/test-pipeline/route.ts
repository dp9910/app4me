import { NextRequest, NextResponse } from 'next/server';
import { MasterPipeline } from '@/lib/search';

export async function POST(request: NextRequest) {
  try {
    console.log('Testing pipeline import...');
    
    const body = await request.json();
    const { query } = body;
    
    if (!query) {
      return NextResponse.json({ success: false, error: 'Query required' }, { status: 400 });
    }
    
    console.log('Initializing pipeline...');
    const pipeline = new MasterPipeline();
    console.log('Pipeline initialized successfully');
    
    console.log('Running pipeline...');
    const result = await pipeline.runPipeline(query, {
      limit: 5,
      saveIntermediateFiles: false,
      showDetailedLogs: true
    });
    
    console.log('Pipeline completed, result:', result);
    
    return NextResponse.json({
      success: true,
      query,
      result_summary: {
        has_error: !!result.error,
        error: result.error,
        has_steps: !!result.steps,
        has_final_results: !!result.final_results,
        result_count: result.final_results?.results?.length || 0
      }
    });
    
  } catch (error) {
    console.error('Pipeline test error:', error);
    console.error('Error stack:', error.stack);
    
    return NextResponse.json(
      { 
        success: false,
        error: error.message,
        stack: error.stack,
        error_type: error.constructor.name
      },
      { status: 500 }
    );
  }
}