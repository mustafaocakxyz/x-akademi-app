'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('Giriş başarısız: ' + error.message)
      setLoading(false)
      return
    }
    setLoading(false)
    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <form
        onSubmit={handleLogin}
        className="w-full max-w-sm p-8 rounded-xl border-2 border-blue-900 shadow-lg"
      >
        <h1 className="text-3xl font-bold mb-8 text-blue-400 text-center tracking-wide">
          X Akademi Giriş
        </h1>
        <label className="block mb-4">
          <span className="text-blue-300 font-medium">E-posta</span>
          <input
            type="email"
            className="mt-1 w-full px-4 py-2 rounded-lg bg-black border border-blue-800 text-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-400"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            autoFocus
          />
        </label>
        <label className="block mb-6">
          <span className="text-blue-300 font-medium">Şifre</span>
          <input
            type="password"
            className="mt-1 w-full px-4 py-2 rounded-lg bg-black border border-blue-800 text-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-400"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
        </label>
        {error && <div className="mb-4 text-red-400 text-center">{error}</div>}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-lg font-bold text-lg bg-blue-500 text-white shadow-md hover:bg-blue-600 transition-colors border-2 border-blue-900"
        >
          {loading ? 'Giriş Yapılıyor...' : 'Giriş Yap'}
        </button>
      </form>
    </div>
  )
} 