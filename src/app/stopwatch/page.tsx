'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'

export default function StopwatchPage() {
  const [running, setRunning] = useState(false)
  const [paused, setPaused] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

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

  async function handleStop() {
    setRunning(false)
    setPaused(false)
    if (seconds === 0) return
    setSaving(true)
    setError('')
    setSuccess('')
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setError('Oturum bulunamadı.')
      setSaving(false)
      return
    }
    const { error } = await supabase.from('study_sessions').insert({
      student_id: user.id,
      duration_seconds: seconds,
    })
    if (error) setError('Kayıt başarısız: ' + error.message)
    else setSuccess('Çalışma kaydedildi!')
    setSeconds(0)
    setSaving(false)
  }

  function handlePause() {
    setPaused(true)
  }

  function handleResume() {
    setPaused(false)
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-black">
      <h1 className="text-3xl font-bold text-blue-400 mb-8">Kronometre</h1>
      <div className="text-6xl font-mono text-blue-200 mb-8">{formatTime(seconds)}</div>
      <div className="flex gap-4">
        {!running ? (
          <button
            className="px-8 py-3 bg-blue-500 text-white rounded-lg font-bold text-lg hover:bg-blue-600 transition-colors"
            onClick={() => { setRunning(true); setPaused(false); setSuccess(''); setError('') }}
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