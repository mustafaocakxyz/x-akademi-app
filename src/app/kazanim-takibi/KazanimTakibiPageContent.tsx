'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

interface Subject {
  id: string
  name: string
}

interface SubjectWithProgress extends Subject {
  completedCount: number
  totalCount: number
  percentage: number
}

export default function KazanimTakibiPageContent() {
  const searchParams = useSearchParams()
  const studentId = searchParams.get('studentId')
  const [subjects, setSubjects] = useState<SubjectWithProgress[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchSubjectsWithProgress() {
      setLoading(true)
      const supabase = createClient()
      // Get current user profile to determine target student
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, name, role')
        .eq('id', user.id)
        .single()
      // Determine which student's progress to fetch
      let targetStudentId = user.id
      if (profileData?.role === 'coach' && studentId) {
        targetStudentId = studentId
      }
      // Get all subjects
      const { data: subjectsData } = await supabase
        .from('subjects')
        .select('id, name')
        .order('name')
      
      if (!subjectsData) {
        setSubjects([])
        setLoading(false)
        return
      }
      // Get progress for each subject
      const subjectsWithProgress = await Promise.all(
        subjectsData.map(async (subject) => {
          // Get total learning outcomes for this subject
          const { data: outcomesData } = await supabase
            .from('learning_outcomes')
            .select('id')
            .eq('subject_id', subject.id)
          
          const totalCount = outcomesData?.length || 0
          if (totalCount === 0) {
            return {
              ...subject,
              completedCount: 0,
              totalCount: 0,
              percentage: 0
            }
          }
          // Get completed outcomes for this student and subject
          const { data: completedData } = await supabase
            .from('student_outcomes')
            .select(`
              id,
              learning_outcomes!inner(subject_id)
            `)
            .eq('student_id', targetStudentId)
            .eq('completed', true)
            .eq('learning_outcomes.subject_id', subject.id)
          const completedCount = completedData?.length || 0
          const percentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0
          return {
            ...subject,
            completedCount,
            totalCount,
            percentage
          }
        })
      )
      setSubjects(subjectsWithProgress)
      setLoading(false)
    }
    fetchSubjectsWithProgress()
  }, [studentId])

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-black text-blue-400 text-2xl">Yükleniyor...</div>
  }

  return (
    <div className="min-h-screen bg-black flex flex-col items-center py-10">
      <h1 className="text-3xl font-bold text-blue-400 mb-8">Kazanım Takibi</h1>
      <div className="w-full max-w-4xl px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {subjects.map(subject => (
            <Link
              key={subject.id}
              href={`/kazanim-takibi/${subject.id}${studentId ? `?studentId=${studentId}` : ''}`}
              className="block"
            >
              <div className="bg-gray-900 rounded-xl p-6 border border-blue-900 hover:border-blue-600 transition-colors duration-200 hover:bg-gray-800">
                <div className="flex justify-between items-start mb-2">
                  <h2 className="text-xl font-bold text-blue-300">{subject.name}</h2>
                  <span className={`text-sm font-bold px-2 py-1 rounded ${
                    subject.percentage === 100 
                      ? 'bg-green-600 text-white' 
                      : subject.percentage >= 50 
                      ? 'bg-yellow-600 text-white' 
                      : 'bg-red-600 text-white'
                  }`}>
                    {subject.percentage}%
                  </span>
                </div>
                <p className="text-blue-400 text-sm mb-2">
                  {subject.completedCount} / {subject.totalCount} kazanım tamamlandı
                </p>
                <p className="text-blue-400 text-sm">Kazanımları görüntüle</p>
              </div>
            </Link>
          ))}
        </div>
        {subjects.length === 0 && (
          <div className="text-center text-blue-300">
            Henüz ders bulunmuyor.
          </div>
        )}
      </div>
    </div>
  )
} 