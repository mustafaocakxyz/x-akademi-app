'use client'

import { createClient } from '@/lib/supabase'
import { useEffect, useState } from 'react'

export default function TestConnectionPage() {
  const [status, setStatus] = useState('Testing connection...')

  useEffect(() => {
    async function testConnection() {
      try {
        const supabase = createClient()
        const { error } = await supabase.from('profiles').select('*').limit(1)
        
        if (error) {
          setStatus(`Error: ${error.message}`)
        } else {
          setStatus('✅ Supabase connection successful!')
        }
      } catch (err) {
        setStatus(`Connection failed: ${err}`)
      }
    }

    testConnection()
  }, [])

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-4">Supabase Connection Test</h1>
      <p className="text-lg">{status}</p>
    </div>
  )
} 