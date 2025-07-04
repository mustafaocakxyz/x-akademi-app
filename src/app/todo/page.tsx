'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { getDateRange, formatDateForDB } from '@/lib/dateUtils'
import { Todo, Profile } from '@/types'
import DayView from '@/components/DayView'

export default function TodoPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [students, setStudents] = useState<Profile[]>([])
  const [selectedStudent, setSelectedStudent] = useState<string>('')
  const [todosByDate, setTodosByDate] = useState<Record<string, Todo[]>>({})
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const dateRange = getDateRange()

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
      if (!profile) return
      
      const supabase = createClient()
      
      let studentId = profile.id
      if (profile.role === 'coach' && selectedStudent) {
        studentId = selectedStudent
      }
      
      if (!studentId) {
        setTodosByDate({})
        return
      }

      // Fetch todos for all 7 days
      const dateStrings = dateRange.map(date => formatDateForDB(date))
      const { data: todosData, error } = await supabase
        .from('todos')
        .select('id, student_id, title, description, completed, due_date, created_at, updated_at')
        .eq('student_id', studentId)
        .in('due_date', dateStrings)
        .order('due_date', { ascending: true })
        .order('created_at', { ascending: false })

      if (error) {
        setError(error.message)
        return
      }

      // Group todos by date
      const groupedTodos: Record<string, Todo[]> = {}
      dateStrings.forEach(dateStr => {
        groupedTodos[dateStr] = []
      })

      todosData?.forEach(todo => {
        const dateStr = todo.due_date
        if (!groupedTodos[dateStr]) {
          groupedTodos[dateStr] = []
        }
        groupedTodos[dateStr].push(todo)
      })

      setTodosByDate(groupedTodos)
    }

    fetchTodos()
  }, [profile, selectedStudent, dateRange])

  // Student: toggle complete
  async function toggleTodo(todoId: string, completed: boolean) {
    const supabase = createClient()
    const { error } = await supabase
      .from('todos')
      .update({ completed: !completed })
      .eq('id', todoId)
    
    if (error) {
      setError(error.message)
      return
    }

    // Update local state
    setTodosByDate(prev => {
      const newState = { ...prev }
      Object.keys(newState).forEach(dateStr => {
        newState[dateStr] = newState[dateStr].map(todo => 
          todo.id === todoId ? { ...todo, completed: !completed } : todo
        )
      })
      return newState
    })
  }

  // Coach: add todo
  async function addTodo(title: string, description: string, dueDate: Date) {
    if (!profile || profile.role !== 'coach' || !selectedStudent) return
    
    const supabase = createClient()
    const dueDateStr = formatDateForDB(dueDate)
    
    const { data, error } = await supabase
      .from('todos')
      .insert({
        student_id: selectedStudent,
        title,
        description,
        due_date: dueDateStr,
      })
      .select('id, student_id, title, description, completed, due_date, created_at, updated_at')
      .single()

    if (error) {
      setError(error.message)
      return
    }

    // Update local state
    setTodosByDate(prev => ({
      ...prev,
      [dueDateStr]: [data, ...(prev[dueDateStr] || [])]
    }))
  }

  // Coach: edit todo
  async function editTodo(updatedTodo: Todo) {
    if (!profile || profile.role !== 'coach') return
    
    const supabase = createClient()
    const { error } = await supabase
      .from('todos')
      .update({
        title: updatedTodo.title,
        description: updatedTodo.description,
      })
      .eq('id', updatedTodo.id)

    if (error) {
      setError(error.message)
      return
    }

    // Update local state
    setTodosByDate(prev => {
      const newState = { ...prev }
      Object.keys(newState).forEach(dateStr => {
        newState[dateStr] = newState[dateStr].map(todo => 
          todo.id === updatedTodo.id ? { ...todo, ...updatedTodo } : todo
        )
      })
      return newState
    })
  }

  // Coach: delete todo
  async function deleteTodo(todoId: string) {
    if (!profile || profile.role !== 'coach') return
    
    if (!window.confirm('Bu görevi silmek istediğinize emin misiniz?')) return
    
    const supabase = createClient()
    const { error } = await supabase
      .from('todos')
      .delete()
      .eq('id', todoId)

    if (error) {
      setError(error.message)
      return
    }

    // Update local state
    setTodosByDate(prev => {
      const newState = { ...prev }
      Object.keys(newState).forEach(dateStr => {
        newState[dateStr] = newState[dateStr].filter(todo => todo.id !== todoId)
      })
      return newState
    })
  }

  function getTodosForDate(date: Date): Todo[] {
    const dateStr = formatDateForDB(date)
    return todosByDate[dateStr] || []
  }

  if (loading && !profile) {
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
        
        {/* Student Selector */}
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

        {selectedStudent ? (
          <div className="w-full max-w-7xl px-4">
            {/* Days Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-4">
              {dateRange.map(date => (
                <DayView
                  key={date.toISOString()}
                  date={date}
                  todos={getTodosForDate(date)}
                  isActive={selectedDate.toDateString() === date.toDateString()}
                  onDateSelect={setSelectedDate}
                  onToggleTodo={toggleTodo}
                  onAddTodo={addTodo}
                  onEditTodo={editTodo}
                  onDeleteTodo={deleteTodo}
                  isCoach={true}
                  loading={loading}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center text-blue-300">
            Lütfen bir öğrenci seçin.
          </div>
        )}

        {error && (
          <div className="mt-4 text-red-400 text-center">
            Hata: {error}
          </div>
        )}
      </div>
    )
  }

  // Student view
  return (
    <div className="min-h-screen bg-black flex flex-col items-center py-10">
      <h1 className="text-3xl font-bold text-blue-400 mb-6">Görevlerim</h1>
      
      <div className="w-full max-w-7xl px-4">
        {/* Days Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-4">
          {dateRange.map(date => (
            <DayView
              key={date.toISOString()}
              date={date}
              todos={getTodosForDate(date)}
              isActive={selectedDate.toDateString() === date.toDateString()}
              onDateSelect={setSelectedDate}
              onToggleTodo={toggleTodo}
              onAddTodo={(title: string, description: string, dueDate: Date) => {}} // Students can't add
              onEditTodo={() => {}} // Students can't edit
              onDeleteTodo={() => {}} // Students can't delete
              isCoach={false}
              loading={loading}
            />
          ))}
        </div>
      </div>

      {error && (
        <div className="mt-4 text-red-400 text-center">
          Hata: {error}
        </div>
      )}
    </div>
  )
} 