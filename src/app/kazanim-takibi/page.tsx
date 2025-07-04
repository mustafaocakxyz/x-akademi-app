'use client'

import { Suspense } from 'react'
import KazanimTakibiPageContent from './KazanimTakibiPageContent'

export default function KazanimTakibiPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-black text-blue-400 text-2xl">Yükleniyor...</div>}>
      <KazanimTakibiPageContent />
    </Suspense>
  )
} 