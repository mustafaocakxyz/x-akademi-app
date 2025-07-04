'use client'

import { Suspense } from 'react'
import NetTrackerPageContent from './NetTrackerPageContent'

export default function NetTrackerPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-black text-blue-400 text-2xl">Yükleniyor...</div>}>
      <NetTrackerPageContent />
    </Suspense>
  )
} 