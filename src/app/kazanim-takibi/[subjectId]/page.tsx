'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useParams, useSearchParams } from 'next/navigation'
import Link from 'next/link'

interface Profile {
  id: string
  name: string
  role: string
}

interface LearningOutcome {
  id: string
  title: string
  order: number
}

interface StudentOutcome {
  id: string
  outcome_id: string
  completed: boolean
  completed_at: string | null
}

interface Subject {
  id: string
  name: string
}

export default function SubjectDetailPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const subjectId = params.subjectId as string
  const studentId = searchParams.get('studentId') // Get studentId from URL params
  
  const [profile, setProfile] = useState<Profile | null>(null)
  const [subject, setSubject] = useState<Subject | null>(null)
  const [outcomes, setOutcomes] = useState<LearningOutcome[]>([])
  const [studentOutcomes, setStudentOutcomes] = useState<StudentOutcome[]>([])
  const [loading, setLoading] = useState(true)
  const [completionStats, setCompletionStats] = useState({ completed: 0, total: 0, percentage: 0 })

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      const supabase = createClient()
      
      // Get current user profile
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, name, role')
        .eq('id', user.id)
        .single()
      setProfile(profileData)

      // Get subject details
      const { data: subjectData } = await supabase
        .from('subjects')
        .select('id, name')
        .eq('id', subjectId)
        .single()
      setSubject(subjectData)

      // Get learning outcomes for this subject
      const { data: outcomesData } = await supabase
        .from('learning_outcomes')
        .select('id, title, order')
        .eq('subject_id', subjectId)
        .order('order', { ascending: true })
      
      // Sort numerically to handle string vs number ordering
      const sortedOutcomes = outcomesData ? outcomesData.sort((a, b) => {
        const orderA = Number(a.order) || 0
        const orderB = Number(b.order) || 0
        return orderA - orderB
      }) : []
      
      setOutcomes(sortedOutcomes)

      // Determine which student's outcomes to fetch
      let targetStudentId = user.id // Default to current user
      
      if (profileData?.role === 'student') {
        // Students always see their own outcomes
        targetStudentId = user.id
      } else if (profileData?.role === 'coach' && studentId) {
        // Coaches see specific student's outcomes if studentId is provided
        targetStudentId = studentId
      }

      // Get student outcomes for the target student
      const { data: studentOutcomesData } = await supabase
        .from('student_outcomes')
        .select(`
          id, 
          outcome_id, 
          completed, 
          completed_at,
          learning_outcomes!inner(subject_id)
        `)
        .eq('student_id', targetStudentId)
        .eq('learning_outcomes.subject_id', subjectId)
      setStudentOutcomes(studentOutcomesData || [])

      // Calculate completion stats
      const total = outcomesData?.length || 0
      const completed = studentOutcomesData?.filter(so => so.completed).length || 0
      const percentage = total > 0 ? Math.round((completed / total) * 100) : 0
      setCompletionStats({ completed, total, percentage })

      setLoading(false)
    }
    fetchData()
  }, [subjectId, studentId])

  async function toggleOutcome(outcomeId: string, completed: boolean) {
    if (!profile || profile.role !== 'coach' || !studentId) return
    
    const supabase = createClient()
    
    // Find existing student outcome
    const existingOutcome = studentOutcomes.find(so => so.outcome_id === outcomeId)
    
    if (existingOutcome) {
      // Update existing outcome
      const { data } = await supabase
        .from('student_outcomes')
        .update({ 
          completed: !completed,
          completed_at: !completed ? new Date().toISOString() : null
        })
        .eq('id', existingOutcome.id)
        .select('id, outcome_id, completed, completed_at')
        .single()
      
      if (data) {
        const updatedOutcomes = studentOutcomes.map(so => so.id === existingOutcome.id ? data : so)
        setStudentOutcomes(updatedOutcomes)
        
        // Update completion stats
        const completed = updatedOutcomes.filter(so => so.completed).length
        const percentage = outcomes.length > 0 ? Math.round((completed / outcomes.length) * 100) : 0
        setCompletionStats({ completed, total: outcomes.length, percentage })
      }
    } else {
      // Create new outcome for the specific student
      const { data } = await supabase
        .from('student_outcomes')
        .insert({
          student_id: studentId,
          outcome_id: outcomeId,
          completed: true,
          completed_at: new Date().toISOString()
        })
        .select('id, outcome_id, completed, completed_at')
        .single()
      
      if (data) {
        const updatedOutcomes = [...studentOutcomes, data]
        setStudentOutcomes(updatedOutcomes)
        
        // Update completion stats
        const completed = updatedOutcomes.filter(so => so.completed).length
        const percentage = outcomes.length > 0 ? Math.round((completed / outcomes.length) * 100) : 0
        setCompletionStats({ completed, total: outcomes.length, percentage })
      }
    }
  }

  function isOutcomeCompleted(outcomeId: string): boolean {
    const studentOutcome = studentOutcomes.find(so => so.outcome_id === outcomeId)
    return studentOutcome?.completed || false
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-black text-blue-400 text-2xl">Yükleniyor...</div>
  }

  if (!subject || !profile) {
    return <div className="min-h-screen flex items-center justify-center bg-black text-red-400 text-xl">Ders bulunamadı.</div>
  }

  // For coaches without studentId, show error
  if (profile.role === 'coach' && !studentId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center">
          <div className="text-red-400 text-xl mb-4">Öğrenci seçilmedi</div>
          <Link 
            href="/kazanim-takibi"
            className="text-blue-400 hover:text-blue-300"
          >
            ← Geri dön
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black flex flex-col items-center py-10">
      <div className="w-full max-w-4xl px-4">
        <div className="mb-6">
          <Link 
            href={`/kazanim-takibi${studentId ? `?studentId=${studentId}` : ''}`}
            className="text-blue-400 hover:text-blue-300 mb-4 inline-block"
          >
            ← Geri dön
          </Link>
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-blue-400">{subject.name}</h1>
              <p className="text-blue-300 mt-2">
                {profile.role === 'student' ? 'Kazanımlarınızı takip edin' : 'Öğrenci kazanımlarını yönetin'}
              </p>
            </div>
            <div className="text-right">
              <div className={`text-2xl font-bold px-3 py-1 rounded ${
                completionStats.percentage === 100 
                  ? 'bg-green-600 text-white' 
                  : completionStats.percentage >= 50 
                  ? 'bg-yellow-600 text-white' 
                  : 'bg-red-600 text-white'
              }`}>
                {completionStats.percentage}%
              </div>
              <p className="text-blue-400 text-sm mt-1">
                {completionStats.completed} / {completionStats.total} tamamlandı
              </p>
            </div>
          </div>
        </div>

        <div className="bg-gray-900 rounded-xl p-6 border border-blue-900">
          <div className="space-y-4">
            {outcomes.map(outcome => {
              const isCompleted = isOutcomeCompleted(outcome.id)
              return (
                <div 
                  key={outcome.id} 
                  className={`flex items-start gap-4 p-4 rounded-lg border ${
                    isCompleted 
                      ? 'bg-gray-800 border-green-700' 
                      : 'bg-gray-800 border-blue-900'
                  }`}
                >
                  {profile.role === 'coach' && (
                    <input
                      type="checkbox"
                      className="mt-1 h-5 w-5 accent-green-500"
                      checked={isCompleted}
                      onChange={() => toggleOutcome(outcome.id, isCompleted)}
                    />
                  )}
                  <div className="flex-1">
                    <p className={`text-sm font-mono text-blue-400 mb-1`}>
                      Kazanım {outcome.order}
                    </p>
                    <p className={`text-blue-200 ${isCompleted ? 'line-through text-green-400' : ''}`}>
                      {outcome.title}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
          
          {outcomes.length === 0 && (
            <div className="text-center text-blue-300 py-8">
              Bu ders için henüz kazanım bulunmuyor.
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 