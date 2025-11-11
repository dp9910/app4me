import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const envVars = {
      DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY ? 'Present' : 'Missing',
      GEMINI_API_KEY: process.env.GEMINI_API_KEY ? 'Present' : 'Missing',
      SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY ? 'Present' : 'Missing',
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Present' : 'Missing'
    };

    return NextResponse.json({
      success: true,
      environment_variables: envVars,
      node_env: process.env.NODE_ENV
    });
    
  } catch (error) {
    console.error('Test env error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error.message
      },
      { status: 500 }
    );
  }
}