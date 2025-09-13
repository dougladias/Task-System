import React, { createContext, useContext, useEffect, useState } from 'react'
import { api, apiConfig } from '../lib/api'
import type { ReactNode } from 'react'

export interface Notification {
  id: string
  type: 'task_created' | 'task_updated' | 'task_assigned' | 'task_status_changed' | 'task_deleted'
  title: string
  message: string
  taskId?: string
  taskTitle?: string
  assignedBy?: string
  assignedByUsername?: string
  createdBy?: string
  createdByUsername?: string
  createdAt: string
  read: boolean
}

interface NotificationsContextType {
  notifications: Notification[]
  isLoading: boolean
  error: string | null
  unreadCount: number
  fetchNotifications: () => Promise<void>
  markAsRead: (id: string) => Promise<void>
  markAllAsRead: () => Promise<void>
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined)

export const useNotifications = () => {
  const context = useContext(NotificationsContext)
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationsProvider')
  }
  return context
}

interface NotificationsProviderProps {
  children: ReactNode
}

export const NotificationsProvider: React.FC<NotificationsProviderProps> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchNotifications = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await api.get(apiConfig.endpoints.notifications.list)

      if (response.ok) {
        const data = await response.json()
        setNotifications(data.notifications || data || [])
      } else {
        // If notifications service is not available, use empty array
        setNotifications([])
      }
    } catch (err) {
      // If notifications service is not available, use empty array
      setNotifications([])
      setError(null) // Don't show error for notifications
    } finally {
      setIsLoading(false)
    }
  }

  const markAsRead = async (id: string) => {
    try {
      const response = await api.put(apiConfig.endpoints.notifications.markAsRead.replace(':id', id))

      if (response.ok) {
        setNotifications(prev => prev.map(notif =>
          notif.id === id ? { ...notif, read: true } : notif
        ))
      }
    } catch (err) {
      // Silently fail if notifications service is not available
      setNotifications(prev => prev.map(notif =>
        notif.id === id ? { ...notif, read: true } : notif
      ))
    }
  }

  const markAllAsRead = async () => {
    try {
      const response = await api.put(apiConfig.endpoints.notifications.markAllAsRead)

      if (response.ok) {
        setNotifications(prev => prev.map(notif => ({ ...notif, read: true })))
      }
    } catch (err) {
      // Silently fail if notifications service is not available
      setNotifications(prev => prev.map(notif => ({ ...notif, read: true })))
    }
  }

  const unreadCount = notifications.filter(n => !n.read).length

  // Fetch notifications on mount
  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    if (token) {
      fetchNotifications()
    }
  }, [])

  // Poll for new notifications every 30 seconds
  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    if (token) {
      const interval = setInterval(fetchNotifications, 30000)
      return () => clearInterval(interval)
    }
  }, [])

  const value: NotificationsContextType = {
    notifications,
    isLoading,
    error,
    unreadCount,
    fetchNotifications,
    markAsRead,
    markAllAsRead
  }

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  )
}