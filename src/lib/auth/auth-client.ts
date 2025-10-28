import { createClient } from '@supabase/supabase-js'

// Check if we're in browser environment and have valid URLs
const isValidUrl = (url: string) => {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'

// Only create client if we have valid configuration or are in development with placeholders
let supabase: any = null

if (typeof window !== 'undefined' || isValidUrl(supabaseUrl)) {
  try {
    supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
      }
    })
  } catch (error) {
    console.warn('Failed to initialize Supabase client:', error)
  }
}

export { supabase }

// Auth helper functions
export const auth = {
  // Sign up with email
  signUp: async (email: string, password: string, userData?: any) => {
    if (!supabase) return { data: null, error: { message: 'Supabase not configured' } }
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: userData
      }
    })
    return { data, error }
  },

  // Sign in with email
  signIn: async (email: string, password: string) => {
    if (!supabase) return { data: null, error: { message: 'Supabase not configured' } }
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    return { data, error }
  },

  // Sign in with Google
  signInWithGoogle: async () => {
    if (!supabase) return { data: null, error: { message: 'Supabase not configured' } }
    
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          prompt: 'select_account',
          access_type: 'offline'
        }
      }
    })
    return { data, error }
  },

  // Sign out
  signOut: async () => {
    if (!supabase) return { error: { message: 'Supabase not configured' } }
    
    // Sign out from all sessions
    const { error } = await supabase.auth.signOut({ scope: 'global' })
    
    // Clear any local storage/session storage related to auth
    if (typeof window !== 'undefined') {
      // Clear any cached auth data
      localStorage.removeItem('supabase.auth.token')
      sessionStorage.clear()
    }
    
    return { error }
  },

  // Get current user
  getCurrentUser: async () => {
    if (!supabase) return { user: null, error: { message: 'Supabase not configured' } }
    
    const { data: { user }, error } = await supabase.auth.getUser()
    return { user, error }
  },

  // Get current session
  getCurrentSession: async () => {
    if (!supabase) return { session: null, error: { message: 'Supabase not configured' } }
    
    const { data: { session }, error } = await supabase.auth.getSession()
    return { session, error }
  },

  // Reset password
  resetPassword: async (email: string) => {
    if (!supabase) return { data: null, error: { message: 'Supabase not configured' } }
    
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`
    })
    return { data, error }
  },

  // Update user
  updateUser: async (updates: any) => {
    if (!supabase) return { data: null, error: { message: 'Supabase not configured' } }
    
    const { data, error } = await supabase.auth.updateUser(updates)
    return { data, error }
  }
}

// Database helper functions for user profiles
export const userProfile = {
  // Create user profile
  create: async (userId: string, profileData: any) => {
    if (!supabase) return { data: null, error: { message: 'Supabase not configured' } }
    
    const { data, error } = await supabase
      .from('user_profiles')
      .insert({
        id: userId,
        ...profileData
      })
    return { data, error }
  },

  // Get user profile
  get: async (userId: string) => {
    if (!supabase) return { data: null, error: { message: 'Supabase not configured' } }
    
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single()
    return { data, error }
  },

  // Update user profile
  update: async (userId: string, updates: any) => {
    if (!supabase) return { data: null, error: { message: 'Supabase not configured' } }
    
    const { data, error } = await supabase
      .from('user_profiles')
      .update(updates)
      .eq('id', userId)
    return { data, error }
  },

  // Upsert user profile (create or update)
  upsert: async (userId: string, profileData: any) => {
    if (!supabase) return { data: null, error: { message: 'Supabase not configured' } }
    
    const { data, error } = await supabase
      .from('user_profiles')
      .upsert({
        id: userId,
        ...profileData
      })
    return { data, error }
  }
}