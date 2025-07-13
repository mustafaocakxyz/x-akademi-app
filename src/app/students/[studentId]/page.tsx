'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'

interface StudyStats {
  todaySeconds: number
  totalSeconds: number
  sessionCount: number
  averageSessionLength: number
}

export default function StudentDetailPage() {
  const { studentId } = useParams()
  const [student, setStudent] = useState<{ id: string; name: string; role: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [studyStats, setStudyStats] = useState<StudyStats | null>(null)

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
        const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Istanbul' })
        
        // Fetch today's sessions
        const { data: todaySessions } = await supabase
          .from('study_sessions')
          .select('duration_seconds')
          .eq('student_id', studentId)
          .eq('session_date', today)
        
        // Fetch all sessions for total stats
        const { data: allSessions } = await supabase
          .from('study_sessions')
          .select('duration_seconds')
          .eq('student_id', studentId)
        
        if (todaySessions && allSessions) {
          const todaySeconds = todaySessions.reduce((sum, s) => sum + (s.duration_seconds || 0), 0)
          const totalSeconds = allSessions.reduce((sum, s) => sum + (s.duration_seconds || 0), 0)
          const sessionCount = todaySessions.length
          const averageSessionLength = sessionCount > 0 ? Math.round(todaySeconds / sessionCount) : 0
          
          setStudyStats({
            todaySeconds,
            totalSeconds,
            sessionCount,
            averageSessionLength
          })
        }
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

  function formatAverageTime(seconds: number) {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    if (h > 0) {
      return `${h} saat ${m} dakika`
    }
    return `${m} dakika`
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
      
      {studyStats && (
        <div className="w-full max-w-2xl bg-gray-900 rounded-xl p-6 border border-blue-900 mb-6">
          <h2 className="text-xl font-bold text-blue-400 mb-4">Çalışma İstatistikleri</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Today's Study Time */}
            <div className="bg-gray-800 rounded-lg p-4 border border-blue-800">
              <div className="text-blue-300 text-sm mb-1">Bugünkü Çalışma</div>
              <div className="text-2xl font-bold text-green-400">
                {formatTotalTime(studyStats.todaySeconds)}
              </div>
              {studyStats.todaySeconds === 0 && (
                <div className="text-yellow-400 text-sm mt-1">Henüz çalışma yok</div>
              )}
            </div>
            
            {/* Total Study Time */}
            <div className="bg-gray-800 rounded-lg p-4 border border-blue-800">
              <div className="text-blue-300 text-sm mb-1">Toplam Çalışma</div>
              <div className="text-2xl font-bold text-blue-400">
                {formatTotalTime(studyStats.totalSeconds)}
              </div>
            </div>
            
            {/* Session Count */}
            <div className="bg-gray-800 rounded-lg p-4 border border-blue-800">
              <div className="text-blue-300 text-sm mb-1">Bugünkü Oturum</div>
              <div className="text-2xl font-bold text-purple-400">
                {studyStats.sessionCount}
              </div>
            </div>
            
            {/* Average Session Length */}
            <div className="bg-gray-800 rounded-lg p-4 border border-blue-800">
              <div className="text-blue-300 text-sm mb-1">Ortalama Oturum</div>
              <div className="text-2xl font-bold text-orange-400">
                {formatAverageTime(studyStats.averageSessionLength)}
              </div>
            </div>
          </div>
        </div>
      )}
      
      <div className="w-full max-w-2xl bg-gray-900 rounded-xl p-6 border border-blue-900">
        <h2 className="text-xl font-bold text-blue-400 mb-4">Sayfalar</h2>
        <div className="grid grid-cols-3 gap-4">
          <Link href={`/students/${student.id}/todo`} className="block p-3 rounded-lg bg-gray-800 text-blue-200 border border-blue-900 hover:bg-blue-900 transition-colors text-center">
            Görevler
          </Link>
          <Link href={`/kazanim-takibi?studentId=${student.id}`} className="block p-3 rounded-lg bg-gray-800 text-blue-200 border border-blue-900 hover:bg-blue-900 transition-colors text-center">
            Kazanımlar
          </Link>
          <Link href={`/net-tracker?studentId=${student.id}`} className="block p-3 rounded-lg bg-gray-800 text-blue-200 border border-blue-900 hover:bg-blue-900 transition-colors text-center">
            Denemeler
          </Link>
          {/* Add more student-related pages here as needed */}
        </div>
      </div>
    </div>
  )
} 