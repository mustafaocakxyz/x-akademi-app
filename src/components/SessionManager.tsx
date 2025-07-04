'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase'

export default function SessionManager() {
  useEffect(() => {
    const supabase = createClient()
    
    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN') {
          console.log('User signed in:', session?.user?.email)
        } else if (event === 'SIGNED_OUT') {
          console.log('User signed out')
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  return null // This component doesn't render anything
} 