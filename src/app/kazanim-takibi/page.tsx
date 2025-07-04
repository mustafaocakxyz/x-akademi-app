'use client'

import { useEffect, useState, Suspense } from 'react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import KazanimTakibiPageContent from './KazanimTakibiPageContent'

interface Subject {
  id: string
  name: string
}

interface SubjectWithProgress extends Subject {
  completedCount: number
  totalCount: number
  percentage: number
}

export default function KazanimTakibiPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-black text-blue-400 text-2xl">Yükleniyor...</div>}>
      <KazanimTakibiPageContent />
    </Suspense>
  )
} 