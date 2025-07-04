'use client'

import { useState, useCallback, useMemo } from 'react'
import { formatDateTurkish, isToday, isYesterday, getShortDayName, getDayNumber } from '@/lib/dateUtils'
import { Todo } from '@/types'
import { Plus, Edit, Trash2, Check, X } from 'lucide-react'

interface DayViewProps {
  date: Date
  todos: Todo[]
  isActive: boolean
  onDateSelect: (date: Date) => void
  onToggleTodo: (todoId: string, completed: boolean) => void
  onAddTodo: (title: string, description: string, dueDate: Date) => void
  onEditTodo: (todo: Todo) => void
  onDeleteTodo: (todoId: string) => void
  isCoach: boolean
  loading: boolean
}

export default function DayView({
  date,
  todos,
  isActive,
  onDateSelect,
  onToggleTodo,
  onAddTodo,
  onEditTodo,
  onDeleteTodo,
  isCoach,
  loading
}: DayViewProps) {
  const [isAdding, setIsAdding] = useState(false)
  const [newTask, setNewTask] = useState({ title: '', description: '' })
  const [editingTask, setEditingTask] = useState<Todo | null>(null)

  const handleAddTask = useCallback(() => {
    if (newTask.title.trim()) {
      onAddTodo(newTask.title.trim(), newTask.description.trim(), date)
      setNewTask({ title: '', description: '' })
      setIsAdding(false)
    }
  }, [newTask.title, newTask.description, onAddTodo, date])

  const handleEditTask = useCallback(() => {
    if (editingTask && newTask.title.trim()) {
      onEditTodo({
        ...editingTask,
        title: newTask.title.trim(),
        description: newTask.description.trim()
      })
      setNewTask({ title: '', description: '' })
      setEditingTask(null)
    }
  }, [editingTask, newTask.title, newTask.description, onEditTodo])

  const startEdit = useCallback((todo: Todo) => {
    setEditingTask(todo)
    setNewTask({ title: todo.title, description: todo.description || '' })
  }, [])

  const cancelEdit = useCallback(() => {
    setEditingTask(null)
    setNewTask({ title: '', description: '' })
  }, [])

  const getDayLabel = useMemo(() => {
    if (isToday(date)) return 'Bugün'
    if (isYesterday(date)) return 'Dün'
    return getShortDayName(date)
  }, [date])

  const getDayClass = useMemo(() => {
    let baseClass = 'flex-1 min-w-0 p-4 rounded-lg border transition-all cursor-pointer'
    
    if (isActive) {
      baseClass += ' bg-blue-600 text-white border-blue-600'
    } else {
      baseClass += ' bg-gray-800 text-blue-200 border-blue-900 hover:bg-gray-700'
    }
    
    return baseClass
  }, [isActive])

  return (
    <div className="flex-1 min-w-0">
      {/* Day Header */}
      <div 
        className={getDayClass}
        onClick={() => onDateSelect(date)}
      >
        <div className="text-center">
          <div className="text-2xl font-bold">{getDayNumber(date)}</div>
          <div className="text-sm opacity-80">{getDayLabel}</div>
          <div className="text-xs opacity-60 mt-1">{formatDateTurkish(date)}</div>
        </div>
      </div>

      {/* Tasks List */}
      <div className="mt-4 space-y-2">
          {loading ? (
            <div className="text-center text-blue-300 py-4">Yükleniyor...</div>
          ) : (
            <>
              {/* Existing Tasks */}
              {todos.map(todo => (
                <div key={todo.id} className="bg-gray-800 rounded-lg p-3 border border-blue-900">
                  {editingTask?.id === todo.id ? (
                    // Edit Mode
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={newTask.title}
                        onChange={(e) => setNewTask(prev => ({ ...prev, title: e.target.value }))}
                        className="w-full bg-gray-700 text-blue-200 px-3 py-1 rounded border border-blue-700"
                        placeholder="Görev başlığı"
                      />
                      <textarea
                        value={newTask.description}
                        onChange={(e) => setNewTask(prev => ({ ...prev, description: e.target.value }))}
                        className="w-full bg-gray-700 text-blue-200 px-3 py-1 rounded border border-blue-700"
                        placeholder="Açıklama (opsiyonel)"
                        rows={2}
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={handleEditTask}
                          className="bg-green-600 text-white px-2 py-1 rounded text-xs hover:bg-green-700"
                        >
                          <Check className="h-3 w-3" />
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="bg-red-600 text-white px-2 py-1 rounded text-xs hover:bg-red-700"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    // View Mode
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={todo.completed}
                        onChange={() => onToggleTodo(todo.id, todo.completed)}
                        className="mt-1 h-4 w-4 accent-green-500"
                      />
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${todo.completed ? 'line-through text-green-400' : 'text-blue-200'}`}>
                          {todo.title}
                        </p>
                        {todo.description && (
                          <p className={`text-xs mt-1 ${todo.completed ? 'line-through text-green-400/70' : 'text-blue-300/70'}`}>
                            {todo.description}
                          </p>
                        )}
                      </div>
                      {isCoach && (
                        <div className="flex gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              console.log('Starting edit for todo:', todo.id)
                              startEdit(todo)
                            }}
                            className="text-blue-400 hover:text-blue-300 p-1"
                          >
                            <Edit className="h-3 w-3" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              onDeleteTodo(todo.id)
                            }}
                            className="text-red-400 hover:text-red-300 p-1"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}

              {/* Add New Task */}
              {isCoach && !isAdding && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    console.log('Setting isAdding to true')
                    setIsAdding(true)
                  }}
                  className="w-full bg-gray-800 border-2 border-dashed border-blue-700 rounded-lg p-3 text-blue-400 hover:bg-gray-700 hover:border-blue-600 transition-colors"
                >
                  <Plus className="h-4 w-4 mx-auto" />
                </button>
              )}

              {/* Add Task Form */}
              {isCoach && isAdding && (
                <div 
                  className="bg-gray-800 rounded-lg p-3 border border-blue-900"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={newTask.title}
                      onChange={(e) => {
                        e.stopPropagation()
                        setNewTask(prev => ({ ...prev, title: e.target.value }))
                      }}
                      className="w-full bg-gray-700 text-blue-200 px-3 py-1 rounded border border-blue-700"
                      placeholder="Görev başlığı"
                      autoFocus
                    />
                    <textarea
                      value={newTask.description}
                      onChange={(e) => {
                        e.stopPropagation()
                        setNewTask(prev => ({ ...prev, description: e.target.value }))
                      }}
                      className="w-full bg-gray-700 text-blue-200 px-3 py-1 rounded border border-blue-700"
                      placeholder="Açıklama (opsiyonel)"
                      rows={2}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleAddTask()
                        }}
                        className="bg-green-600 text-white px-2 py-1 rounded text-xs hover:bg-green-700"
                      >
                        <Check className="h-3 w-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          console.log('Canceling add task')
                          setIsAdding(false)
                          setNewTask({ title: '', description: '' })
                        }}
                        className="bg-red-600 text-white px-2 py-1 rounded text-xs hover:bg-red-700"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Empty State */}
              {todos.length === 0 && !isAdding && (
                <div className="text-center text-blue-300 py-4">
                  Bu gün için görev bulunmuyor.
                </div>
              )}
            </>
          )}
        </div>
    </div>
  )
} 