'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { useParams } from 'next/navigation'
import { getDateRange, formatDateForDB } from '@/lib/dateUtils'
import { Todo, Profile } from '@/types'
import DayView from '@/components/DayView'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function StudentTodoPage() {
  const params = useParams()
  const studentId = params.studentId as string
  const [student, setStudent] = useState<Profile | null>(null)
  const [todosByDate, setTodosByDate] = useState<Record<string, Todo[]>>({})
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const dateRange = useMemo(() => getDateRange(), [])

  useEffect(() => {
    async function fetchStudent() {
      setLoading(true)
      const supabase = createClient()
      
      // Fetch student details
      const { data: studentData } = await supabase
        .from('profiles')
        .select('id, name, role')
        .eq('id', studentId)
        .single()
      
      setStudent(studentData)
      setLoading(false)
    }
    fetchStudent()
  }, [studentId])

  useEffect(() => {
    async function fetchTodos() {
      if (!studentId) return
      
      const supabase = createClient()

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
  }, [studentId, dateRange])

  // Coach: toggle complete
  const toggleTodo = useCallback(async (todoId: string, completed: boolean) => {
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
  }, [])

  // Coach: add todo
  const addTodo = useCallback(async (title: string, description: string, dueDate: Date) => {
    if (!studentId) return
    
    console.log('Adding todo for student:', studentId)
    console.log('Due date:', dueDate)
    
    const supabase = createClient()
    const dueDateStr = formatDateForDB(dueDate)
    
    const { data, error } = await supabase
      .from('todos')
      .insert({
        student_id: studentId,
        title,
        description,
        due_date: dueDateStr,
      })
      .select('id, student_id, title, description, completed, due_date, created_at, updated_at')
      .single()

    if (error) {
      console.error('Error adding todo:', error)
      setError(error.message)
      return
    }

    console.log('Successfully added todo:', data)

    // Update local state
    setTodosByDate(prev => ({
      ...prev,
      [dueDateStr]: [data, ...(prev[dueDateStr] || [])]
    }))
  }, [studentId])

  // Coach: edit todo
  const editTodo = useCallback(async (updatedTodo: Todo) => {
    console.log('Editing todo:', updatedTodo.id)
    
    const supabase = createClient()
    const { error } = await supabase
      .from('todos')
      .update({
        title: updatedTodo.title,
        description: updatedTodo.description,
      })
      .eq('id', updatedTodo.id)

    if (error) {
      console.error('Error editing todo:', error)
      setError(error.message)
      return
    }

    console.log('Successfully edited todo')

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
  }, [])

  // Coach: delete todo
  const deleteTodo = useCallback(async (todoId: string) => {
    if (!window.confirm('Bu görevi silmek istediğinize emin misiniz?')) return
    
    console.log('Deleting todo:', todoId)
    
    const supabase = createClient()
    const { error } = await supabase
      .from('todos')
      .delete()
      .eq('id', todoId)

    if (error) {
      console.error('Error deleting todo:', error)
      setError(error.message)
      return
    }

    console.log('Successfully deleted todo')

    // Update local state
    setTodosByDate(prev => {
      const newState = { ...prev }
      Object.keys(newState).forEach(dateStr => {
        newState[dateStr] = newState[dateStr].filter(todo => todo.id !== todoId)
      })
      return newState
    })
  }, [])

  const getTodosForDate = useCallback((date: Date): Todo[] => {
    const dateStr = formatDateForDB(date)
    return todosByDate[dateStr] || []
  }, [todosByDate])

  if (loading && !student) {
    return <div className="min-h-screen flex items-center justify-center bg-black text-blue-400 text-2xl">Yükleniyor...</div>
  }

  if (!student) {
    return <div className="min-h-screen flex items-center justify-center bg-black text-red-400 text-xl">Öğrenci bulunamadı.</div>
  }

  return (
    <div className="min-h-screen bg-black flex flex-col items-center py-10">
      <div className="w-full max-w-8xl px-4">
        <div className="mb-6">
          <Link 
            href={`/students/${studentId}`}
            className="inline-flex items-center text-blue-400 hover:text-blue-300 mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Geri Dön
          </Link>
          <h1 className="text-3xl font-bold text-blue-400 mb-2">{student.name}</h1>
          <h2 className="text-xl text-blue-300">Görevleri</h2>
        </div>
        
        {/* Days Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-6">
          {dateRange.map(date => (
            <DayView
              key={`${date.toISOString()}-${studentId}`}
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

        {error && (
          <div className="mt-4 text-red-400 text-center">
            Hata: {error}
          </div>
        )}
      </div>
    </div>
  )
} 