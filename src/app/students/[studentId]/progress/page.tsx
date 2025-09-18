'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

interface Profile {
  id: string
  name: string
  role: string
}

interface Student {
  id: string
  name: string
  role: string
}

interface ProgressSubject {
  id: string
  name: string
  display_order: number
}

export default function StudentProgressPage() {
  const { studentId } = useParams()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [student, setStudent] = useState<Student | null>(null)
  const [subjects, setSubjects] = useState<ProgressSubject[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        return
      }

      // Get current user profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, name, role')
        .eq('id', user.id)
        .single()

      if (!profileData || profileData.role !== 'coach') {
        return
      }

      setProfile(profileData)

      // Get student details
      const { data: studentData } = await supabase
        .from('profiles')
        .select('id, name, role')
        .eq('id', studentId)
        .single()

      setStudent(studentData)

      // Get subjects
      const { data: subjectsData } = await supabase
        .from('progress_subjects')
        .select('id, name, display_order')
        .order('display_order', { ascending: true })

      setSubjects(subjectsData || [])
      setLoading(false)
    }

    fetchData()
  }, [studentId])

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-black text-blue-400 text-2xl">Yükleniyor...</div>
  }

  if (!profile || !student) {
    return <div className="min-h-screen flex items-center justify-center bg-black text-red-400 text-xl">Öğrenci bulunamadı.</div>
  }

  return (
    <div className="min-h-screen bg-black flex flex-col items-center py-10">
      <div className="w-full max-w-4xl px-4">
        <div className="mb-6">
          <Link 
            href={`/students/${studentId}`}
            className="inline-flex items-center text-blue-400 hover:text-blue-300 mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Geri Dön
          </Link>
          <h1 className="text-3xl font-bold text-blue-400 mb-2">{student.name}</h1>
          <h2 className="text-xl text-blue-300">İlerleme</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {subjects.map(subject => (
            <Link
              key={subject.id}
              href={`/students/${studentId}/progress/${subject.id}`}
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
