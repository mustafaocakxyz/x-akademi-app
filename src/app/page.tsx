'use client'

import { useRouter } from 'next/navigation'

export default function LandingPage() {
  const router = useRouter()
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-black">
      <h1 className="text-4xl font-extrabold mb-8 text-blue-400 tracking-wide">X Akademi'ye Hoş Geldiniz</h1>
      <button
        className="px-8 py-3 bg-blue-500 text-white rounded-lg font-bold text-lg hover:bg-blue-600 transition-colors"
        onClick={() => router.push('/login')}
      >
        Giriş Yap
      </button>
    </div>
  )
}
