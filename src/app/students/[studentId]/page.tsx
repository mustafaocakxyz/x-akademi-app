'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'
import { ActiveSession } from '@/types'

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
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null)
  const [activeSessionTime, setActiveSessionTime] = useState<string>('')

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
        
        // Fetch active session if any
        const { data: activeSessionData } = await supabase
          .from('active_sessions')
          .select('*')
          .eq('student_id', studentId)
          .single()
        
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
        
        setActiveSession(activeSessionData || null)
        if (activeSessionData) {
          setActiveSessionTime(formatActiveSessionTime(activeSessionData.start_time))
        }
      }
      setLoading(false)
    }
    fetchStudentAndSessions()
  }, [studentId])

  // Real-time update for active session time
  useEffect(() => {
    if (!activeSession) return

    const interval = setInterval(() => {
      setActiveSessionTime(formatActiveSessionTime(activeSession.start_time))
    }, 1000)

    return () => clearInterval(interval)
  }, [activeSession])

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

  function formatActiveSessionTime(startTime: string) {
    if (!activeSession) return '00:00:00'
    
    const start = new Date(startTime)
    const now = new Date()
    
    if (activeSession.is_paused && activeSession.last_pause_time) {
      // Currently paused: use last_pause_time
      const lastPauseTime = new Date(activeSession.last_pause_time)
      const elapsed = lastPauseTime.getTime() - start.getTime() - activeSession.total_paused_time
      const elapsedSeconds = Math.max(0, Math.floor(elapsed / 1000))
      const h = Math.floor(elapsedSeconds / 3600)
      const m = Math.floor((elapsedSeconds % 3600) / 60)
      const s = elapsedSeconds % 60
      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
    } else {
      // Currently running: use current time
      const elapsed = now.getTime() - start.getTime() - activeSession.total_paused_time
      const elapsedSeconds = Math.max(0, Math.floor(elapsed / 1000))
      const h = Math.floor(elapsedSeconds / 3600)
      const m = Math.floor((elapsedSeconds % 3600) / 60)
      const s = elapsedSeconds % 60
      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
    }
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
      
      {/* Active Session Display */}
      {activeSession && (
        <div className={`w-full max-w-2xl rounded-xl p-6 mb-6 ${
          activeSession.is_paused 
            ? 'bg-yellow-900/20 border border-yellow-600' 
            : 'bg-green-900/20 border border-green-600'
        }`}>
          <h2 className={`text-xl font-bold mb-2 ${
            activeSession.is_paused ? 'text-yellow-400' : 'text-green-400'
          }`}>
            {activeSession.is_paused ? '🟡 Duraklatılmış' : '🟢 Aktif Çalışma'}
          </h2>
          <div className={`${activeSession.is_paused ? 'text-yellow-300' : 'text-green-300'}`}>
            Başlangıç: {new Date(activeSession.start_time).toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' })}
          </div>
          {activeSession.is_paused && activeSession.last_pause_time && (
            <div className="text-yellow-300">
              Duraklatıldı: {new Date(activeSession.last_pause_time).toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' })}
            </div>
          )}
          <div className={`text-2xl font-bold mt-2 ${
            activeSession.is_paused ? 'text-yellow-400' : 'text-green-400'
          }`}>
            Süre: {activeSessionTime}
          </div>
        </div>
      )}
      
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link href={`/students/${student.id}/todo`} className="block p-3 rounded-lg bg-gray-800 text-blue-200 border border-blue-900 hover:bg-blue-900 transition-colors text-center">
            Görevler
          </Link>
          <Link href={`/kazanim-takibi?studentId=${student.id}`} className="block p-3 rounded-lg bg-gray-800 text-blue-200 border border-blue-900 hover:bg-blue-900 transition-colors text-center">
            Kazanımlar
          </Link>
          <Link href={`/net-tracker?studentId=${student.id}`} className="block p-3 rounded-lg bg-gray-800 text-blue-200 border border-blue-900 hover:bg-blue-900 transition-colors text-center">
            Denemeler
          </Link>
          <Link href={`/students/${student.id}/progress`} className="block p-3 rounded-lg bg-gray-800 text-blue-200 border border-blue-900 hover:bg-blue-900 transition-colors text-center">
            İlerleme
          </Link>
        </div>
      </div>
    </div>
  )
} 