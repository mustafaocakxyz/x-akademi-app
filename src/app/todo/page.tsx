'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

interface Profile {
  id: string
  name: string
  role: string
}

interface Todo {
  id: string
  title: string
  description?: string
  completed: boolean
}

export default function TodoPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [students, setStudents] = useState<Profile[]>([])
  const [selectedStudent, setSelectedStudent] = useState<string>('')
  const [todos, setTodos] = useState<Todo[]>([])
  const [loading, setLoading] = useState(true)
  const [newTask, setNewTask] = useState({ title: '', description: '' })
  const [editingTask, setEditingTask] = useState<Todo | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    async function fetchProfileAndStudents() {
      setLoading(true)
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      // Fetch profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, name, role')
        .eq('id', user.id)
        .single()
      setProfile(profileData)
      // If coach, fetch students
      if (profileData?.role === 'coach') {
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
  }, [])

  useEffect(() => {
    async function fetchTodos() {
      setLoading(true)
      const supabase = createClient()
      if (!profile) return
      let studentId = profile.id
      if (profile.role === 'coach' && selectedStudent) {
        studentId = selectedStudent
      }
      if (!studentId) {
        setTodos([])
        setLoading(false)
        return
      }
      const { data: todosData } = await supabase
        .from('todos')
        .select('id, title, description, completed')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false })
      setTodos(todosData || [])
      setLoading(false)
    }
    fetchTodos()
  }, [profile, selectedStudent])

  // Student: toggle complete
  async function toggleTodo(id: string, completed: boolean) {
    const supabase = createClient()
    await supabase.from('todos').update({ completed: !completed }).eq('id', id)
    setTodos(todos => todos.map(t => t.id === id ? { ...t, completed: !completed } : t))
  }

  // Coach: add/edit/delete
  async function addTodo() {
    if (!selectedStudent || !newTask.title) return
    const supabase = createClient()
    const { data, error } = await supabase.from('todos').insert({
      student_id: selectedStudent,
      title: newTask.title,
      description: newTask.description,
    }).select('id, title, description, completed').single()
    if (error) setError(error.message)
    else setTodos(todos => [data, ...todos])
    setNewTask({ title: '', description: '' })
  }
  async function startEdit(todo: Todo) {
    setEditingTask(todo)
  }
  async function saveEdit() {
    if (!editingTask) return
    const supabase = createClient()
    const { data, error } = await supabase.from('todos').update({
      title: editingTask.title,
      description: editingTask.description,
    }).eq('id', editingTask.id).select('id, title, description, completed').single()
    if (error) setError(error.message)
    else setTodos(todos => todos.map(t => t.id === editingTask.id ? data : t))
    setEditingTask(null)
  }
  async function deleteTodo(id: string) {
    const supabase = createClient()
    await supabase.from('todos').delete().eq('id', id)
    setTodos(todos => todos.filter(t => t.id !== id))
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-black text-blue-400 text-2xl">Yükleniyor...</div>
  }
  if (!profile) {
    return <div className="min-h-screen flex items-center justify-center bg-black text-red-400 text-xl">Kullanıcı profili bulunamadı.</div>
  }

  // Coach view
  if (profile.role === 'coach') {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center py-10">
        <h1 className="text-3xl font-bold text-blue-400 mb-6">Öğrenci Görevleri</h1>
        <div className="mb-6">
          <label className="text-blue-300 font-medium mr-2">Öğrenci seç:</label>
          <select
            className="bg-gray-900 text-blue-200 border border-blue-800 rounded-lg px-4 py-2"
            value={selectedStudent}
            onChange={e => setSelectedStudent(e.target.value)}
          >
            <option value="">-- Öğrenci Seçin --</option>
            {students.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        {selectedStudent && (
          <div className="w-full max-w-3xl bg-gray-900 rounded-xl p-6 border border-blue-900">
            <h2 className="text-xl font-bold text-blue-400 mb-4">Görevler</h2>
            <div className="mb-4 flex gap-2">
              <input
                className="flex-1 px-4 py-2 rounded-lg bg-black border border-blue-800 text-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-400"
                placeholder="Görev başlığı"
                value={newTask.title}
                onChange={e => setNewTask(t => ({ ...t, title: e.target.value }))}
              />
              <input
                className="flex-1 px-4 py-2 rounded-lg bg-black border border-blue-800 text-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-400"
                placeholder="Açıklama (isteğe bağlı)"
                value={newTask.description}
                onChange={e => setNewTask(t => ({ ...t, description: e.target.value }))}
              />
              <button
                className="px-4 py-2 bg-blue-500 text-white rounded-lg font-bold hover:bg-blue-600"
                onClick={addTodo}
                type="button"
              >Ekle</button>
            </div>
            {error && <div className="text-red-400 mb-2">{error}</div>}
            <ul className="space-y-2">
              {todos.map(todo => (
                <li key={todo.id} className="flex items-center gap-x-4 bg-gray-800 p-3 rounded-lg border border-blue-900">
                  <input
                    type="checkbox"
                    className="h-5 w-5 accent-blue-500"
                    checked={todo.completed}
                    onChange={() => toggleTodo(todo.id, todo.completed)}
                  />
                  {editingTask && editingTask.id === todo.id ? (
                    <>
                      <input
                        className="flex-1 px-2 py-1 rounded bg-black border border-blue-800 text-blue-200"
                        value={editingTask.title}
                        onChange={e => setEditingTask(t => t ? { ...t, title: e.target.value } : t)}
                      />
                      <input
                        className="flex-1 px-2 py-1 rounded bg-black border border-blue-800 text-blue-200"
                        value={editingTask.description || ''}
                        onChange={e => setEditingTask(t => t ? { ...t, description: e.target.value } : t)}
                      />
                      <button className="px-2 py-1 bg-blue-500 text-white rounded-lg" onClick={saveEdit} type="button">Kaydet</button>
                      <button className="px-2 py-1 bg-gray-700 text-white rounded-lg" onClick={() => setEditingTask(null)} type="button">İptal</button>
                    </>
                  ) : (
                    <>
                      <span className={`flex-1 ${todo.completed ? 'line-through text-blue-700' : 'text-blue-200'}`}>{todo.title}</span>
                      <span className="flex-1 text-blue-300">{todo.description}</span>
                      <button className="px-2 py-1 bg-blue-700 text-white rounded-lg" onClick={() => startEdit(todo)} type="button">Düzenle</button>
                      <button className="px-2 py-1 bg-red-600 text-white rounded-lg" onClick={() => deleteTodo(todo.id)} type="button">Sil</button>
                    </>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    )
  }

  // Student view
  return (
    <div className="min-h-screen bg-black flex flex-col items-center py-10">
      <h1 className="text-3xl font-bold text-blue-400 mb-6">Görevlerim</h1>
      <div className="w-full max-w-3xl bg-gray-900 rounded-xl p-6 border border-blue-900">
        <ul className="space-y-2">
          {todos.length === 0 ? (
            <div className="text-blue-300">Henüz görev yok.</div>
          ) : (
            todos.map(todo => (
              <li key={todo.id} className="flex items-center gap-x-4 bg-gray-800 p-3 rounded-lg border border-blue-900">
                <input
                  type="checkbox"
                  className="h-5 w-5 accent-blue-500"
                  checked={todo.completed}
                  onChange={() => toggleTodo(todo.id, todo.completed)}
                />
                <span className={`flex-1 ${todo.completed ? 'line-through text-blue-700' : 'text-blue-200'}`}>{todo.title}</span>
                <span className="flex-1 text-blue-300">{todo.description}</span>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  )
} 