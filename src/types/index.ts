export type UserRole = 'student' | 'coach'

export interface User {
  id: string
  email: string
  role: UserRole
  name: string
  created_at: string
}

export interface StopwatchSession {
  id: string
  user_id: string
  duration: number // in seconds
  title: string
  notes?: string
  created_at: string
}

export interface Kazanim {
  id: string
  user_id: string
  title: string
  description: string
  status: 'not_started' | 'in_progress' | 'completed'
  progress: number // 0-100
  target_date?: string
  created_at: string
  updated_at: string
}

export interface NetScore {
  id: string
  user_id: string
  score: number
  total_questions: number
  correct_answers: number
  subject: string
  test_date: string
  notes?: string
  created_at: string
}

export interface Todo {
  id: string
  student_id: string
  title: string
  description?: string
  completed: boolean
  due_date: string // YYYY-MM-DD format
  created_at: string
  updated_at: string
}

export interface Profile {
  id: string
  name: string
  role: string
  email?: string
  student_type?: string
  coach_id?: string
}

export interface DayViewProps {
  date: Date
  todos: Todo[]
  isActive: boolean
  onDateSelect: (date: Date) => void
  onToggleTodo: (todoId: string, completed: boolean) => void
  onAddTodo: (title: string, description: string) => void
  onEditTodo: (todo: Todo) => void
  onDeleteTodo: (todoId: string) => void
  isCoach: boolean
  loading: boolean
} 