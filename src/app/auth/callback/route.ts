import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { supabaseAdmin } from '@/lib/supabase/client'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  if (code) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (error) {
      console.error('Auth callback error:', error)
      return NextResponse.redirect(new URL('/auth/signin?error=callback_error', requestUrl.origin))
    }

    // Check if user has completed personalization
    if (data.user) {
      try {
        const { data: personalizationData, error: checkError } = await supabaseAdmin
          .from('user_personalization')
          .select('completed_at')
          .eq('user_id', data.user.id)
          .single()

        // If no personalization record exists or completed_at is null, redirect to personalization
        if (checkError?.code === 'PGRST116' || !personalizationData?.completed_at) {
          console.log('New user detected, redirecting to personalization')
          return NextResponse.redirect(new URL('/personalize', requestUrl.origin))
        }

        console.log('Existing user with personalization, redirecting to home')
      } catch (error) {
        console.error('Error checking personalization in callback:', error)
        // If there's an error checking, default to personalization page for safety
        return NextResponse.redirect(new URL('/personalize', requestUrl.origin))
      }
    }
  }

  // Default redirect to home for existing users or if no code
  return NextResponse.redirect(new URL('/home', requestUrl.origin))
}