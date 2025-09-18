'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase'

interface Profile { id: string; name: string; role: string }
interface ProgressSubject { id: string; name: string }
interface ProgressRow { id: string; title: string; display_order: number }
interface ProgressColumn { id: string; title: string; display_order: number; is_active: boolean; student_id?: string | null }
interface Cell { row_id: string; column_id: string; state: number }

export default function StudentSubjectProgressPage() {
  const params = useParams()
  const router = useRouter()
  const subjectId = params.subjectId as string

  const [profile, setProfile] = useState<Profile | null>(null)
  const [subject, setSubject] = useState<ProgressSubject | null>(null)
  const [rows, setRows] = useState<ProgressRow[]>([])
  const [columns, setColumns] = useState<ProgressColumn[]>([])
  const [cells, setCells] = useState<Cell[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/login'); return }

      // Profile (must be student for this page)
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, name, role')
        .eq('id', user.id)
        .single()
      if (!profileData || profileData.role !== 'student') {
        router.replace('/dashboard')
        return
      }
      setProfile(profileData)

      // Subject
      const { data: subjectData } = await supabase
        .from('progress_subjects')
        .select('id, name')
        .eq('id', subjectId)
        .single()
      setSubject(subjectData || null)

      // Rows & Columns
      const [{ data: rowData }, { data: colData }] = await Promise.all([
        supabase
          .from('progress_rows')
          .select('id, title, display_order')
          .eq('subject_id', subjectId)
          .order('display_order', { ascending: true }),
        supabase
          .from('progress_columns')
          .select('id, title, display_order, is_active, student_id')
          .eq('subject_id', subjectId)
          .eq('student_id', user.id)
          .eq('is_active', true)
          .order('display_order', { ascending: true })
      ])
      setRows(rowData || [])
      // Defensive filter: ensure only active + has student_id columns are rendered
      const activeCols = (colData || []).filter(c => (c as ProgressColumn).is_active && (c as ProgressColumn).student_id)
      setColumns(activeCols as ProgressColumn[])

      // Cells for this student
      const { data: cellData } = await supabase
        .from('progress_cells')
        .select('row_id, column_id, state')
        .eq('student_id', user.id)
        .eq('subject_id', subjectId)
      setCells(cellData || [])

      setLoading(false)
    }
    fetchData()
  }, [subjectId, router])

  const stateMap = useMemo(() => {
    const m = new Map<string, number>()
    cells.forEach(c => m.set(`${c.row_id}:${c.column_id}`, c.state))
    return m
  }, [cells])

  const renderState = useCallback((state: number | undefined) => {
    const s = state ?? 0
    if (s === 2) return <span className="text-green-400">●</span>
    if (s === 1) return <span className="text-yellow-400">◐</span>
    return <span className="text-blue-500/40">○</span>
  }, [])

  const toggleCell = useCallback(async (rowId: string, columnId: string) => {
    if (!profile) return
    const key = `${rowId}:${columnId}`
    const current = stateMap.get(key) ?? 0
    const next = (current + 1) % 3

    // optimistic update
    setCells(prev => {
      const idx = prev.findIndex(c => c.row_id === rowId && c.column_id === columnId)
      if (idx >= 0) {
        const copy = [...prev]
        copy[idx] = { ...copy[idx], state: next }
        return copy
      }
      return [...prev, { row_id: rowId, column_id: columnId, state: next }]
    })

    // persist
    const supabase = createClient()
    await supabase
      .from('progress_cells')
      .upsert({
        student_id: profile.id,
        subject_id: subjectId,
        row_id: rowId,
        column_id: columnId,
        state: next,
        updated_by: profile.id,
        updated_at: new Date().toISOString()
      }, { onConflict: 'student_id,row_id,column_id' })
  }, [profile, stateMap, subjectId])

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-black text-blue-400 text-2xl">Yükleniyor...</div>
  if (!profile || !subject) return <div className="min-h-screen flex items-center justify-center bg-black text-red-400 text-xl">Sayfa yüklenemedi.</div>

  return (
    <div className="min-h-screen bg-black flex flex-col items-center py-10">
      <div className="w-full max-w-6xl px-4">
        <div className="mb-6">
          <Link href="/progress" className="inline-flex items-center text-blue-400 hover:text-blue-300">
            <ArrowLeft className="h-4 w-4 mr-2" /> Geri Dön
          </Link>
        </div>
        <h1 className="text-3xl font-bold text-blue-400 mb-6">{subject.name}</h1>

        <div className="bg-gray-900 rounded-xl p-4 border border-blue-900 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-blue-800">
                <th className="text-left p-2 text-blue-300 font-bold w-64">Konu</th>
                {columns.map(col => (
                  <th key={col.id} className="text-center p-2 text-blue-300 font-bold">{col.title}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr key={row.id} className="border-b border-blue-900 hover:bg-gray-800/60">
                  <td className="p-2 text-blue-200">{row.title}</td>
                  {columns.map(col => {
                    const key = `${row.id}:${col.id}`
                    const state = stateMap.get(key)
                    return (
                      <td
                        key={col.id}
                        className="text-center p-2 cursor-pointer select-none"
                        onClick={() => toggleCell(row.id, col.id)}
                      >
                        {renderState(state)}
                      </td>
                    )
                  })}
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={Math.max(1, columns.length + 1)} className="text-center p-6 text-blue-300">Henüz satır bulunmuyor.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
