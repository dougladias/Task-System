import React, { createContext, useContext, useEffect, useState } from 'react'
import { api, apiConfig } from '../lib/api'
import type { ReactNode } from 'react';

interface User {
  id: string
  email: string
  username: string
}

interface AuthContextType {
  user: User | null
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  register: (email: string, username: string, password: string) => Promise<{ success: boolean; error?: string }>
  logout: () => void
  isLoading: boolean
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    const userData = localStorage.getItem('user')

    if (token && userData) {
      try {
        setUser(JSON.parse(userData))
      } catch (error) {
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
        localStorage.removeItem('user')
      }
    }
    setIsLoading(false)
  }, [])

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true)
    try {
      const response = await api.post(apiConfig.endpoints.auth.login, {
        emailOrUsername: email,
        password
      })

      if (response.ok) {
        const data = await response.json()

        localStorage.setItem('accessToken', data.accessToken)
        localStorage.setItem('refreshToken', data.refreshToken)
        localStorage.setItem('user', JSON.stringify(data.user))

        setUser(data.user)
        return { success: true }
      } else {
        const error = await response.json()
        return { success: false, error: error.message || 'Erro no login' }
      }
    } catch (error) {
      return { success: false, error: 'Erro de conexão' }
    } finally {
      setIsLoading(false)
    }
  }

  const register = async (email: string, username: string, password: string): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true)
    try {
      const response = await api.post(apiConfig.endpoints.auth.register, {
        email,
        username,
        password
      })

      if (response.ok) {
        const data = await response.json()

        localStorage.setItem('accessToken', data.accessToken)
        localStorage.setItem('refreshToken', data.refreshToken)
        localStorage.setItem('user', JSON.stringify(data.user))

        setUser(data.user)
        return { success: true }
      } else {
        const error = await response.json()
        return { success: false, error: error.message || 'Erro no cadastro' }
      }
    } catch (error) {
      return { success: false, error: 'Erro de conexão' }
    } finally {
      setIsLoading(false)
    }
  }

  const logout = () => {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('user')
    setUser(null)
  }

  const isAuthenticated = !!user

  const value: AuthContextType = {
    user,
    login,
    register,
    logout,
    isLoading,
    isAuthenticated
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}