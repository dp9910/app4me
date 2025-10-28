'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase, auth } from './auth-client'

interface AuthContextType {
  user: User | null
  session: Session | null
  userProfile: any
  loading: boolean
  hasCompletedPersonalization: boolean | null
  checkingPersonalization: boolean
  signUp: (email: string, password: string, userData?: any) => Promise<any>
  signIn: (email: string, password: string) => Promise<any>
  signInWithGoogle: () => Promise<any>
  signOut: () => Promise<any>
  updateProfile: (updates: any) => Promise<any>
  checkPersonalizationStatus: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [userProfileData, setUserProfileData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [hasCompletedPersonalization, setHasCompletedPersonalization] = useState<boolean | null>(null)
  const [checkingPersonalization, setCheckingPersonalization] = useState(false)

  useEffect(() => {
    // Get initial session
    const initializeAuth = async () => {
      try {
        const { session } = await auth.getCurrentSession()
        setSession(session)
        setUser(session?.user ?? null)

        if (session?.user) {
          await checkPersonalizationStatusInternal()
        }
      } catch (error) {
        console.error('Auth initialization error:', error)
      } finally {
        setLoading(false)
      }
    }

    initializeAuth()

    // Listen for auth changes
    let subscription: any = null
    if (supabase) {
      const { data } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          console.log('Auth state changed:', event, session?.user?.email)
          
          setSession(session)
          setUser(session?.user ?? null)

          if (event === 'SIGNED_IN' && session?.user) {
            await checkPersonalizationStatusInternal()
          } else if (event === 'SIGNED_OUT') {
            setUserProfileData(null)
            setHasCompletedPersonalization(null)
          }

          setLoading(false)
        }
      )
      subscription = data.subscription
    }

    return () => {
      if (subscription) {
        subscription.unsubscribe()
      }
    }
  }, [])


  const checkPersonalizationStatusInternal = async () => {
    try {
      // Get the current session to include auth token
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        console.log('No session token, setting personalization to false')
        setHasCompletedPersonalization(false)
        return
      }

      console.log('Checking personalization for user:', session.user?.email, session.user?.id)

      const response = await fetch('/api/personalization/check', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })
      
      if (response.ok) {
        const result = await response.json()
        console.log('Personalization check result:', result)
        setHasCompletedPersonalization(result.hasCompleted)
      } else {
        console.error('Failed to check personalization status:', response.status)
        setHasCompletedPersonalization(false)
      }
    } catch (error) {
      console.error('Error checking personalization status:', error)
      setHasCompletedPersonalization(false)
    }
  }

  const checkPersonalizationStatus = async () => {
    setCheckingPersonalization(true)
    try {
      await checkPersonalizationStatusInternal()
    } finally {
      setCheckingPersonalization(false)
    }
  }

  const signUp = async (email: string, password: string, userData?: any) => {
    setLoading(true)
    try {
      const result = await auth.signUp(email, password, userData)
      return result
    } finally {
      setLoading(false)
    }
  }

  const signIn = async (email: string, password: string) => {
    setLoading(true)
    try {
      return await auth.signIn(email, password)
    } finally {
      setLoading(false)
    }
  }

  const signInWithGoogle = async () => {
    setLoading(true)
    try {
      return await auth.signInWithGoogle()
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    setLoading(true)
    try {
      const result = await auth.signOut()
      setUser(null)
      setSession(null)
      setUserProfileData(null)
      setHasCompletedPersonalization(null)
      return result
    } finally {
      setLoading(false)
    }
  }

  const updateProfile = async (updates: any) => {
    if (!user) return { error: 'No user logged in' }
    
    try {
      const result = await auth.updateUser(updates)
      return result
    } catch (error) {
      return { error }
    }
  }

  const value = {
    user,
    session,
    userProfile: userProfileData,
    loading,
    hasCompletedPersonalization,
    checkingPersonalization,
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
    updateProfile,
    checkPersonalizationStatus
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}