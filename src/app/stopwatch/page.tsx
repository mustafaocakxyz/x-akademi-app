'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'

export default function StopwatchPage() {
  const [running, setRunning] = useState(false)
  const [paused, setPaused] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [currentDate, setCurrentDate] = useState('')
  const [lastSavedDate, setLastSavedDate] = useState('')
  const [todayTotal, setTodayTotal] = useState(0)
  const [showDateChangeWarning, setShowDateChangeWarning] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const dateCheckRef = useRef<NodeJS.Timeout | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Initialize date tracking
  useEffect(() => {
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Istanbul' })
    setCurrentDate(today)
    setLastSavedDate(today)
    loadTodaySession()
  }, [])

  // Load today's session total
  const loadTodaySession = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Istanbul' })
    const { data: sessions } = await supabase
      .from('study_sessions')
      .select('duration_seconds')
      .eq('student_id', user.id)
      .eq('session_date', today)

    if (sessions) {
      const total = sessions.reduce((sum, session) => sum + (session.duration_seconds || 0), 0)
      setTodayTotal(total)
    }
  }

  // Date change detection
  useEffect(() => {
    const checkDateChange = () => {
      const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Istanbul' })
      if (currentDate !== today) {
        autoSaveAndReset()
      }
    }

    // Check every minute for date changes
    dateCheckRef.current = setInterval(checkDateChange, 60000)
    
    return () => {
      if (dateCheckRef.current) clearInterval(dateCheckRef.current)
    }
  }, [currentDate, seconds])

  // Midnight warning
  useEffect(() => {
    const checkMidnightWarning = () => {
      const now = new Date()
      const turkishTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Istanbul' }))
      const hoursUntilMidnight = 24 - turkishTime.getHours()
      const minutesUntilMidnight = 60 - turkishTime.getMinutes()
      
      // Show warning when less than 1 hour until midnight and stopwatch is running
      if (hoursUntilMidnight <= 1 && minutesUntilMidnight <= 30 && running) {
        setShowDateChangeWarning(true)
      } else {
        setShowDateChangeWarning(false)
      }
    }

    // Check every 5 minutes for midnight warning
    const warningInterval = setInterval(checkMidnightWarning, 300000)
    
    return () => clearInterval(warningInterval)
  }, [running])

  // Auto-save and reset when date changes
  const autoSaveAndReset = async () => {
    if (seconds > 0) {
      await saveSession(seconds, lastSavedDate)
      
      // Reset stopwatch
      setSeconds(0)
      setRunning(false)
      setPaused(false)
      
      // Update date tracking
      const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Istanbul' })
      setCurrentDate(today)
      setLastSavedDate(today)
      
      // Reload today's session
      await loadTodaySession()
      
      setSuccess('Otomatik kayıt yapıldı ve kronometre sıfırlandı.')
    }
  }

  // Save session to database
  const saveSession = async (durationSeconds: number, sessionDate: string) => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      throw new Error('Oturum bulunamadı.')
    }
    
    const { error } = await supabase.from('study_sessions').insert({
      student_id: user.id,
      duration_seconds: durationSeconds,
      session_date: sessionDate
    })
    
    if (error) {
      throw new Error('Kayıt başarısız: ' + error.message)
    }
  }

  useEffect(() => {
    if (running && !paused) {
      intervalRef.current = setInterval(() => {
        setSeconds((s) => s + 1)
      }, 1000)
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [running, paused])

  function formatTime(totalSeconds: number) {
    const h = Math.floor(totalSeconds / 3600)
    const m = Math.floor((totalSeconds % 3600) / 60)
    const s = totalSeconds % 60
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  function formatTotalTime(seconds: number) {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    return `${h} saat ${m} dakika`
  }

  async function handleStop() {
    setRunning(false)
    setPaused(false)
    if (seconds === 0) return
    
    setSaving(true)
    setError('')
    setSuccess('')
    
    try {
      await saveSession(seconds, currentDate)
      setSuccess('Çalışma kaydedildi!')
      setSeconds(0)
      
      // Reload today's session total
      await loadTodaySession()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bilinmeyen hata')
    } finally {
      setSaving(false)
    }
  }

  function handlePause() {
    setPaused(true)
  }

  function handleResume() {
    setPaused(false)
  }

  function handleStart() {
    setRunning(true)
    setPaused(false)
    setSuccess('')
    setError('')
    setShowDateChangeWarning(false)
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-black">
      <h1 className="text-3xl font-bold text-blue-400 mb-8">Kronometre</h1>
      
      {/* Today's Total Display */}
      {todayTotal > 0 && (
        <div className="text-lg text-blue-300 mb-4">
          Bugünkü toplam: <span className="font-bold text-green-400">{formatTotalTime(todayTotal)}</span>
        </div>
      )}
      
      {/* Date Change Warning */}
      {showDateChangeWarning && (
        <div className="bg-yellow-900/50 border border-yellow-600 text-yellow-200 px-4 py-2 rounded-lg mb-4">
          ⚠️ Gece yarısına az kaldı! Kronometre otomatik olarak sıfırlanacak.
        </div>
      )}
      
      <div className="text-6xl font-mono text-blue-200 mb-8">{formatTime(seconds)}</div>
      
      <div className="flex gap-4">
        {!running ? (
          <button
            className="px-8 py-3 bg-blue-500 text-white rounded-lg font-bold text-lg hover:bg-blue-600 transition-colors"
            onClick={handleStart}
            disabled={saving}
          >
            Başlat
          </button>
        ) : paused ? (
          <>
            <button
              className="px-8 py-3 bg-blue-500 text-white rounded-lg font-bold text-lg hover:bg-blue-600 transition-colors"
              onClick={handleResume}
              disabled={saving}
            >
              Devam Et
            </button>
            <button
              className="px-8 py-3 bg-blue-700 text-white rounded-lg font-bold text-lg hover:bg-blue-800 transition-colors"
              onClick={handleStop}
              disabled={saving}
            >
              Durdur & Kaydet
            </button>
          </>
        ) : (
          <>
            <button
              className="px-8 py-3 bg-yellow-500 text-white rounded-lg font-bold text-lg hover:bg-yellow-600 transition-colors"
              onClick={handlePause}
              disabled={saving}
            >
              Duraklat
            </button>
            <button
              className="px-8 py-3 bg-blue-700 text-white rounded-lg font-bold text-lg hover:bg-blue-800 transition-colors"
              onClick={handleStop}
              disabled={saving}
            >
              Durdur & Kaydet
            </button>
          </>
        )}
      </div>
      
      {saving && <div className="text-blue-300 mt-4">Kaydediliyor...</div>}
      {error && <div className="text-red-400 mt-4">{error}</div>}
      {success && <div className="text-green-400 mt-4">{success}</div>}
    </div>
  )
} 