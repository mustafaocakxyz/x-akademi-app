'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Profile {
  id: string
  name: string
  role: string
}

interface ProgressSubject {
  id: string
  name: string
  display_order: number
}

export default function ProgressPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [subjects, setSubjects] = useState<ProgressSubject[]>([])
  const router = useRouter()

  useEffect(() => {
    async function fetchProfileAndSubjects() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.replace('/login')
        return
      }

      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, name, role')
        .eq('id', user.id)
        .single()

      if (!profileData) {
        router.replace('/login')
        return
      }

      // Only allow students to access this page
      if (profileData.role !== 'student') {
        router.replace('/dashboard')
        return
      }

      setProfile(profileData)

      // Fetch subjects
      const { data: subjectsData } = await supabase
        .from('progress_subjects')
        .select('id, name, display_order')
        .order('display_order', { ascending: true })

      setSubjects(subjectsData || [])
      setLoading(false)
    }

    fetchProfileAndSubjects()
  }, [router])

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-black text-blue-400 text-2xl">Yükleniyor...</div>
  }

  if (!profile) {
    return <div className="min-h-screen flex items-center justify-center bg-black text-red-400 text-xl">Kullanıcı profili bulunamadı.</div>
  }

  return (
    <div className="min-h-screen bg-black flex flex-col items-center py-10">
      <div className="w-full max-w-4xl px-4">
        <h1 className="text-3xl font-bold text-blue-400 mb-8">İlerleme</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {subjects.map(subject => (
            <Link
              key={subject.id}
              href={`/progress/${subject.id}`}
              className="block"
            >
              <div className="bg-gray-900 rounded-xl p-6 border border-blue-900 hover:border-blue-600 transition-colors duration-200 hover:bg-gray-800">
                <div className="text-xl font-bold text-blue-300">{subject.name}</div>
                <p className="text-blue-400 text-sm mt-2">Detaya gitmek için tıklayın</p>
              </div>
            </Link>
          ))}
        </div>
        {subjects.length === 0 && (
          <div className="text-center text-blue-300">Henüz konu bulunmuyor.</div>
        )}
      </div>
    </div>
  )
}
