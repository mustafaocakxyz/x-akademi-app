'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase'

interface Profile { id: string; name: string; role: string }
interface Student { id: string; name: string; role: string }
interface ProgressSubject { id: string; name: string }
interface ProgressRow { id: string; title: string; display_order: number }
interface ProgressColumn { id: string; title: string; display_order: number; is_active: boolean; student_id?: string | null }
interface Cell { row_id: string; column_id: string; state: number }

export default function CoachStudentSubjectProgressPage() {
  const params = useParams()
  const studentId = params.studentId as string
  const subjectId = params.subjectId as string

  const [profile, setProfile] = useState<Profile | null>(null)
  const [student, setStudent] = useState<Student | null>(null)
  const [subject, setSubject] = useState<ProgressSubject | null>(null)
  const [rows, setRows] = useState<ProgressRow[]>([])
  const [columns, setColumns] = useState<ProgressColumn[]>([])
  const [cells, setCells] = useState<Cell[]>([])
  const [loading, setLoading] = useState(true)

  // Column rename state
  const [editingColumnId, setEditingColumnId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState<string>('')

  // New column state
  const [isAddingColumn, setIsAddingColumn] = useState(false)
  const [newColumnTitle, setNewColumnTitle] = useState('')
  const [savingNewColumn, setSavingNewColumn] = useState(false)

  useEffect(() => {
    async function fetchData() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Current profile must be coach
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, name, role')
        .eq('id', user.id)
        .single()
      if (!profileData || profileData.role !== 'coach') return
      setProfile(profileData)

      // Student details
      const { data: studentData } = await supabase
        .from('profiles')
        .select('id, name, role')
        .eq('id', studentId)
        .single()
      setStudent(studentData || null)

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
          .eq('student_id', studentId)
          .eq('is_active', true)
          .order('display_order', { ascending: true })
      ])
      setRows(rowData || [])
      // Filter to ensure student-specific and active only
      const activeCols = (colData || []).filter(c => (c as ProgressColumn).is_active && (c as ProgressColumn).student_id)
      setColumns(activeCols as ProgressColumn[])

      // Cells for this student
      const { data: cellData } = await supabase
        .from('progress_cells')
        .select('row_id, column_id, state')
        .eq('student_id', studentId)
        .eq('subject_id', subjectId)
      setCells(cellData || [])

      setLoading(false)
    }
    fetchData()
  }, [studentId, subjectId])

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
        student_id: studentId,
        subject_id: subjectId,
        row_id: rowId,
        column_id: columnId,
        state: next,
        updated_by: profile.id,
        updated_at: new Date().toISOString()
      }, { onConflict: 'student_id,row_id,column_id' })
  }, [profile, stateMap, studentId, subjectId])

  const startEditColumn = useCallback((columnId: string, currentTitle: string) => {
    setEditingColumnId(columnId)
    setEditingTitle(currentTitle)
  }, [])

  const cancelEditColumn = useCallback(() => {
    setEditingColumnId(null)
    setEditingTitle('')
  }, [])

  const saveEditColumn = useCallback(async () => {
    if (!editingColumnId || editingTitle.trim() === '') return
    const newTitle = editingTitle.trim()

    // optimistic update
    setColumns(prev => prev.map(c => c.id === editingColumnId ? { ...c, title: newTitle } : c))

    const supabase = createClient()
    await supabase
      .from('progress_columns')
      .update({ title: newTitle, updated_at: new Date().toISOString() })
      .eq('id', editingColumnId)
      .eq('student_id', studentId)
      .eq('subject_id', subjectId)

    setEditingColumnId(null)
    setEditingTitle('')
  }, [editingColumnId, editingTitle, studentId, subjectId])

  const openAddColumn = useCallback(() => {
    setIsAddingColumn(true)
    setNewColumnTitle('')
  }, [])

  const cancelAddColumn = useCallback(() => {
    setIsAddingColumn(false)
    setNewColumnTitle('')
  }, [])

  const saveNewColumn = useCallback(async () => {
    if (!profile) return
    const title = newColumnTitle.trim() || 'Yeni Sütun'
    setSavingNewColumn(true)

    // determine next order
    const nextOrder = (columns[columns.length - 1]?.display_order || 0) + 1

    const supabase = createClient()
    const { data, error } = await supabase
      .from('progress_columns')
      .insert({
        student_id: studentId,
        subject_id: subjectId,
        title,
        display_order: nextOrder,
        is_active: true,
        created_by: profile.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select('id, title, display_order, is_active, student_id')
      .single()

    if (!error && data) {
      setColumns(prev => [...prev, data as ProgressColumn])
      setIsAddingColumn(false)
      setNewColumnTitle('')
    } else {
      console.error('Column insert failed:', error)
    }

    setSavingNewColumn(false)
  }, [profile, newColumnTitle, columns, subjectId, studentId])

  const deleteColumn = useCallback(async (columnId: string) => {
    if (columns.length < 3) return
    if (!window.confirm('Bu sütunu silmek istediğinize emin misiniz?')) return

    const prevColumns = columns
    setColumns(prev => prev.filter(c => c.id !== columnId))

    const supabase = createClient()
    const { error } = await supabase
      .from('progress_columns')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', columnId)
      .eq('student_id', studentId)
      .eq('subject_id', subjectId)

    if (error) {
      console.error('Column delete (soft) failed:', error)
      setColumns(prevColumns)
      alert('Sütun silinemedi: ' + error.message)
    }
  }, [columns, studentId, subjectId])

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-black text-blue-400 text-2xl">Yükleniyor...</div>
  if (!profile || !student || !subject) return <div className="min-h-screen flex items-center justify-center bg-black text-red-400 text-xl">Sayfa yüklenemedi.</div>

  const canShowDelete = columns.length >= 3

  return (
    <div className="min-h-screen bg-black flex flex-col items-center py-10">
      <div className="w-full max-w-6xl px-4">
        <div className="mb-6">
          <Link href={`/students/${studentId}/progress`} className="inline-flex items-center text-blue-400 hover:text-blue-300">
            <ArrowLeft className="h-4 w-4 mr-2" /> Geri Dön
          </Link>
        </div>
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl font-bold text-blue-400">{student.name} • {subject.name}</h1>
          <div className="flex items-center gap-2">
            {!isAddingColumn ? (
              <button
                onClick={openAddColumn}
                className="bg-blue-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-blue-700 border border-blue-800"
              >
                + Yeni Sütun
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <input
                  value={newColumnTitle}
                  onChange={e => setNewColumnTitle(e.target.value)}
                  placeholder="Sütun başlığı"
                  className="bg-black border border-blue-800 text-blue-200 px-2 py-1 rounded text-sm w-48"
                  autoFocus
                />
                <button
                  onClick={saveNewColumn}
                  disabled={savingNewColumn}
                  className="bg-green-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-green-700 border border-green-800 disabled:opacity-60"
                >
                  Kaydet
                </button>
                <button
                  onClick={cancelAddColumn}
                  className="bg-red-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-red-700 border border-red-800"
                >
                  İptal
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="bg-gray-900 rounded-xl p-4 border border-blue-900 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-blue-800">
                <th className="text-left p-2 text-blue-300 font-bold w-64">Konu</th>
                {columns.map(col => (
                  <th key={col.id} className="text-center p-2 text-blue-300 font-bold">
                    <div className="flex items-center justify-center gap-2">
                      {editingColumnId === col.id ? (
                        <input
                          value={editingTitle}
                          onChange={e => setEditingTitle(e.target.value)}
                          onBlur={saveEditColumn}
                          onKeyDown={e => { if (e.key === 'Enter') saveEditColumn(); if (e.key === 'Escape') cancelEditColumn() }}
                          className="bg-black border border-blue-800 text-blue-200 px-2 py-1 rounded text-sm w-40"
                          autoFocus
                        />
                      ) : (
                        <button
                          className="text-blue-300 hover:text-blue-200 underline-offset-2 hover:underline"
                          onClick={() => startEditColumn(col.id, col.title)}
                          title="Başlığı düzenle"
                        >
                          {col.title}
                        </button>
                      )}

                      {canShowDelete && (
                        <button
                          onClick={() => deleteColumn(col.id)}
                          className="text-red-400 hover:text-red-300"
                          title="Sütunu sil"
                          aria-label="Sütunu sil"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </th>
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
