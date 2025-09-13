import React, { createContext, useContext, useEffect, useState } from 'react'
import { api, apiConfig } from '../lib/api'
import type { ReactNode } from 'react'

export interface Task {
  id: string
  title: string
  description: string
  status: 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'DONE'
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  dueDate?: string
  createdBy: string
  createdByUsername: string
  assignedUserIds: string[]
  assignedUsernames: string[]
  comments: Comment[]
  createdAt: string
  updatedAt: string
}

export interface Comment {
  id: string
  content: string
  authorId: string
  authorUsername: string
  createdAt: string
  updatedAt: string
}

export interface TaskStats {
  total: number
  todo: number
  inProgress: number
  review: number
  done: number
}

interface TasksContextType {
  tasks: Task[]
  stats: TaskStats
  isLoading: boolean
  error: string | null
  fetchTasks: (params?: { search?: string; status?: string; priority?: string }) => Promise<void>
  createTask: (taskData: Partial<Task>) => Promise<{ success: boolean; error?: string; task?: Task }>
  updateTask: (id: string, taskData: Partial<Task>) => Promise<{ success: boolean; error?: string }>
  deleteTask: (id: string) => Promise<{ success: boolean; error?: string }>
  assignUserToTask: (taskId: string, userId: string) => Promise<{ success: boolean; error?: string }>
}

const TasksContext = createContext<TasksContextType | undefined>(undefined)

export const useTasks = () => {
  const context = useContext(TasksContext)
  if (!context) {
    throw new Error('useTasks must be used within a TasksProvider')
  }
  return context
}

interface TasksProviderProps {
  children: ReactNode
}

export const TasksProvider: React.FC<TasksProviderProps> = ({ children }) => {
  const [tasks, setTasks] = useState<Task[]>([])
  const [stats, setStats] = useState<TaskStats>({
    total: 0,
    todo: 0,
    inProgress: 0,
    review: 0,
    done: 0
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchTasks = async (params?: { search?: string; status?: string; priority?: string }) => {
    setIsLoading(true)
    setError(null)

    try {
      // Build query parameters
      const queryParams = new URLSearchParams({
        page: '1',
        limit: '100'
      })

      if (params?.search) {
        queryParams.set('search', params.search)
      }
      if (params?.status) {
        queryParams.set('status', params.status)
      }
      if (params?.priority) {
        queryParams.set('priority', params.priority)
      }

      // Fetch tasks
      const tasksResponse = await api.get(`${apiConfig.endpoints.tasks.base}?${queryParams.toString()}`)

      if (tasksResponse.ok) {
        const tasksData = await tasksResponse.json()
        setTasks(tasksData.data || tasksData.tasks || [])
      } else {
        throw new Error('Erro ao buscar tarefas')
      }

      // Fetch stats only if no filters applied
      if (!params?.search && !params?.status && !params?.priority) {
        const statsResponse = await api.get(apiConfig.endpoints.tasks.stats)

        if (statsResponse.ok) {
          const statsData = await statsResponse.json()
          setStats(statsData)
        }
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao buscar dados')
    } finally {
      setIsLoading(false)
    }
  }

  const createTask = async (taskData: Partial<Task>): Promise<{ success: boolean; error?: string; task?: Task }> => {
    try {
      const response = await api.post(apiConfig.endpoints.tasks.base, taskData)

      if (response.ok) {
        const newTask = await response.json()
        setTasks(prev => [...prev, newTask])

        // Update stats
        await fetchTasks()

        return { success: true, task: newTask }
      } else {
        const error = await response.json()
        return { success: false, error: error.message || 'Erro ao criar tarefa' }
      }
    } catch (err) {
      return { success: false, error: 'Erro de conexão' }
    }
  }

  const updateTask = async (id: string, taskData: Partial<Task>): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await api.put(`${apiConfig.endpoints.tasks.base}/${id}`, taskData)

      if (response.ok) {
        const updatedTask = await response.json()
        setTasks(prev => prev.map(task => task.id === id ? updatedTask : task))

        // Update stats if status changed
        if (taskData.status) {
          await fetchTasks()
        }

        return { success: true }
      } else {
        const error = await response.json()
        return { success: false, error: error.message || 'Erro ao atualizar tarefa' }
      }
    } catch (err) {
      return { success: false, error: 'Erro de conexão' }
    }
  }

  const deleteTask = async (id: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await api.delete(`${apiConfig.endpoints.tasks.base}/${id}`)

      if (response.ok) {
        setTasks(prev => prev.filter(task => task.id !== id))

        // Update stats
        await fetchTasks()

        return { success: true }
      } else {
        const error = await response.json()
        return { success: false, error: error.message || 'Erro ao deletar tarefa' }
      }
    } catch (err) {
      return { success: false, error: 'Erro de conexão' }
    }
  }

  const assignUserToTask = async (taskId: string, userId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await api.post(`${apiConfig.endpoints.tasks.base}/${taskId}/assign/${userId}`, {})

      if (response.ok) {
        // Refresh tasks to get updated assignment
        await fetchTasks()
        return { success: true }
      } else {
        const error = await response.json()
        return { success: false, error: error.message || 'Erro ao atribuir usuário' }
      }
    } catch (err) {
      return { success: false, error: 'Erro de conexão' }
    }
  }

  // Fetch tasks on mount
  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    if (token) {
      fetchTasks()
    }
  }, [])

  const value: TasksContextType = {
    tasks,
    stats,
    isLoading,
    error,
    fetchTasks,
    createTask,
    updateTask,
    deleteTask,
    assignUserToTask
  }

  return (
    <TasksContext.Provider value={value}>
      {children}
    </TasksContext.Provider>
  )
}