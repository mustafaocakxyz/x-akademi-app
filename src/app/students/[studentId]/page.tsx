'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'

export default function StudentDetailPage() {
  const { studentId } = useParams()
  const [student, setStudent] = useState<{ id: string; name: string; role: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [totalSeconds, setTotalSeconds] = useState<number | null>(null)

  useEffect(() => {
    async function fetchStudentAndSessions() {
      const supabase = createClient()
      const { data } = await supabase
        .from('profiles')
        .select('id, name, role')
        .eq('id', studentId)
        .single()
      setStudent(data)
      if (data) {
        const { data: sessions } = await supabase
          .from('study_sessions')
          .select('duration_seconds')
          .eq('student_id', studentId)
        const total = (sessions || []).reduce((sum, s) => sum + (s.duration_seconds || 0), 0)
        setTotalSeconds(total)
      }
      setLoading(false)
    }
    fetchStudentAndSessions()
  }, [studentId])

  function formatTotalTime(seconds: number) {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    return `${h} saat ${m} dakika`
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-black text-blue-400 text-2xl">Yükleniyor...</div>
  }
  if (!student) {
    return <div className="min-h-screen flex items-center justify-center bg-black text-red-400 text-xl">Öğrenci bulunamadı.</div>
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-black">
      <h1 className="text-3xl font-bold text-blue-400 mb-4">{student.name}</h1>
      <div className="text-blue-300 mb-2">Öğrenci Detayları</div>
      {totalSeconds !== null && (
        <div className="text-lg text-blue-200 mb-6">
          Toplam Çalışma Süresi: <span className="font-bold">{formatTotalTime(totalSeconds)}</span>
        </div>
      )}
      <div className="w-full max-w-md bg-gray-900 rounded-xl p-6 border border-blue-900">
        <h2 className="text-xl font-bold text-blue-400 mb-4">Sayfalar</h2>
        <ul className="space-y-2">
          <li>
            <Link href={`/students/${student.id}/todo`} className="block p-3 rounded-lg bg-gray-800 text-blue-200 border border-blue-900 hover:bg-blue-900 transition-colors">
              To-Do List
            </Link>
          </li>
          <li>
            <Link href={`/kazanim-takibi?studentId=${student.id}`} className="block p-3 rounded-lg bg-gray-800 text-blue-200 border border-blue-900 hover:bg-blue-900 transition-colors">
              Kazanıms
            </Link>
          </li>
          <li>
            <Link href={`/net-tracker?studentId=${student.id}`} className="block p-3 rounded-lg bg-gray-800 text-blue-200 border border-blue-900 hover:bg-blue-900 transition-colors">
              Deneme Takibi
            </Link>
          </li>
          {/* Add more student-related pages here as needed */}
        </ul>
      </div>
    </div>
  )
} 