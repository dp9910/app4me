'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase, auth, userProfile } from './auth-client'

interface AuthContextType {
  user: User | null
  session: Session | null
  userProfile: any
  loading: boolean
  signUp: (email: string, password: string, userData?: any) => Promise<any>
  signIn: (email: string, password: string) => Promise<any>
  signInWithGoogle: () => Promise<any>
  signOut: () => Promise<any>
  updateProfile: (updates: any) => Promise<any>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [userProfileData, setUserProfileData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    const initializeAuth = async () => {
      try {
        const { session } = await auth.getCurrentSession()
        setSession(session)
        setUser(session?.user ?? null)

        if (session?.user) {
          await loadUserProfile(session.user.id)
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
            await loadUserProfile(session.user.id)
          } else if (event === 'SIGNED_OUT') {
            setUserProfileData(null)
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

  const loadUserProfile = async (userId: string) => {
    try {
      const { data, error } = await userProfile.get(userId)
      if (error && error.code !== 'PGRST116') { // Not found error
        console.error('Error loading user profile:', error)
      } else {
        setUserProfileData(data)
      }
    } catch (error) {
      console.error('Error loading user profile:', error)
    }
  }

  const signUp = async (email: string, password: string, userData?: any) => {
    setLoading(true)
    try {
      const result = await auth.signUp(email, password, userData)
      
      if (result.data.user && !result.error) {
        // Create user profile
        await userProfile.create(result.data.user.id, {
          email: email,
          ...userData
        })
      }
      
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
      return result
    } finally {
      setLoading(false)
    }
  }

  const updateProfile = async (updates: any) => {
    if (!user) return { error: 'No user logged in' }
    
    try {
      const result = await userProfile.upsert(user.id, updates)
      if (!result.error) {
        setUserProfileData({ ...userProfileData, ...updates })
      }
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
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
    updateProfile
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