'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'
import { CheckSquare, Clock, BarChart3, Target, TrendingUp } from 'lucide-react'

interface Profile {
  id: string
  name: string
  role: string
  email?: string
}

export default function DashboardPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [students, setStudents] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    async function fetchProfileAndStudents() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.replace('/login')
        return
      }
      // Fetch profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, name, role')
        .eq('id', user.id)
        .single()
      if (profileError || !profileData) {
        setProfile(null)
        setLoading(false)
        return
      }
      setProfile(profileData)
      // If coach, fetch students
      if (profileData.role === 'coach') {
        const { data: studentsData } = await supabase
          .from('profiles')
          .select('id, name, role')
          .eq('coach_id', user.id)
          .eq('role', 'student')
        setStudents(studentsData || [])
      }
      setLoading(false)
    }
    fetchProfileAndStudents()
  }, [router])

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-black text-blue-400 text-2xl">Yükleniyor...</div>
  }
  if (!profile) {
    return <div className="min-h-screen flex items-center justify-center bg-black text-red-400 text-xl">Kullanıcı profili bulunamadı.</div>
  }
  if (profile.role === 'coach') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-black">
        <h1 className="text-4xl font-extrabold mb-4 text-blue-400 tracking-wide">
          Hoş geldin, {profile.name}!
        </h1>
        <div className="text-2xl font-semibold text-blue-300 mb-6">
          Rolün: Koç
        </div>
        <div className="w-full max-w-lg bg-gray-900 rounded-xl p-6 border border-blue-900">
          <h2 className="text-xl font-bold text-blue-400 mb-4">Öğrencilerin</h2>
          {students.length === 0 ? (
            <div className="text-gray-400">Henüz atanmış öğrenci yok.</div>
          ) : (
            <ul className="space-y-2">
              {students.map((student) => (
                <li key={student.id}>
                  <Link href={`/students/${student.id}`} className="block p-3 rounded-lg bg-gray-800 text-blue-200 border border-blue-900 hover:bg-blue-900 transition-colors">
                    {student.name}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    )
  }
  // Student view
  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center py-10">
      <h1 className="text-4xl font-extrabold mb-8 text-blue-400 tracking-wide">
        Hoş geldin, {profile.name}!
      </h1>

      {/* Navigation Cards */}
      <div className="w-full max-w-5xl px-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <Link href="/todo" className="block">
            <div className="bg-gray-900 rounded-xl p-6 border border-blue-900 hover:border-blue-600 hover:bg-gray-800 transition-colors">
              <div className="flex items-center gap-3 mb-2">
                <CheckSquare className="h-5 w-5 text-blue-300" />
                <h2 className="text-xl font-bold text-blue-300">Yapılacaklar</h2>
              </div>
              <p className="text-blue-400 text-sm">Görevlerini planla ve takip et</p>
            </div>
          </Link>

          <Link href="/stopwatch" className="block">
            <div className="bg-gray-900 rounded-xl p-6 border border-blue-900 hover:border-blue-600 hover:bg-gray-800 transition-colors">
              <div className="flex items-center gap-3 mb-2">
                <Clock className="h-5 w-5 text-blue-300" />
                <h2 className="text-xl font-bold text-blue-300">Kronometre</h2>
              </div>
              <p className="text-blue-400 text-sm">Çalışma sürelerini kaydet</p>
            </div>
          </Link>

          <Link href="/net-tracker" className="block">
            <div className="bg-gray-900 rounded-xl p-6 border border-blue-900 hover:border-blue-600 hover:bg-gray-800 transition-colors">
              <div className="flex items-center gap-3 mb-2">
                <BarChart3 className="h-5 w-5 text-blue-300" />
                <h2 className="text-xl font-bold text-blue-300">Denemeler</h2>
              </div>
              <p className="text-blue-400 text-sm">Netlerini kaydet ve karşılaştır</p>
            </div>
          </Link>

          <Link href="/kazanim-takibi" className="block">
            <div className="bg-gray-900 rounded-xl p-6 border border-blue-900 hover:border-blue-600 hover:bg-gray-800 transition-colors">
              <div className="flex items-center gap-3 mb-2">
                <Target className="h-5 w-5 text-blue-300" />
                <h2 className="text-xl font-bold text-blue-300">Kazanımlar</h2>
              </div>
              <p className="text-blue-400 text-sm">Ders kazanımlarını takip et</p>
            </div>
          </Link>

          <Link href="/progress" className="block">
            <div className="bg-gray-900 rounded-xl p-6 border border-blue-900 hover:border-blue-600 hover:bg-gray-800 transition-colors">
              <div className="flex items-center gap-3 mb-2">
                <TrendingUp className="h-5 w-5 text-blue-300" />
                <h2 className="text-xl font-bold text-blue-300">İlerleme</h2>
              </div>
              <p className="text-blue-400 text-sm">Konu bazlı ilerlemeni yönet</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  )
} 