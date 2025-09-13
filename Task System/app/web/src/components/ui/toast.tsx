import React, { useEffect, useState } from 'react'
import { X, CheckCircle, AlertCircle, XCircle } from 'lucide-react'

interface ToastProps {
  message: string
  type?: 'success' | 'error' | 'warning' | 'info'
  duration?: number
  onClose: () => void
  show: boolean
}

export const Toast: React.FC<ToastProps> = ({
  message,
  type = 'info',
  duration = 4000,
  onClose,
  show
}) => {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (show) {
      setIsVisible(true)
      const timer = setTimeout(() => {
        setIsVisible(false)
        setTimeout(onClose, 300) // Wait for animation
      }, duration)

      return () => clearTimeout(timer)
    }
  }, [show, duration, onClose])

  if (!show && !isVisible) return null

  const getToastStyles = () => {
    const baseStyles = "fixed top-4 right-4 z-50 max-w-md p-4 rounded-lg shadow-2xl border backdrop-blur-lg transition-all duration-300 transform"

    if (!isVisible) {
      return `${baseStyles} translate-x-full opacity-0`
    }

    switch (type) {
      case 'success':
        return `${baseStyles} bg-green-500/20 border-green-500/50 text-green-400 translate-x-0 opacity-100`
      case 'error':
        return `${baseStyles} bg-red-500/20 border-red-500/50 text-red-400 translate-x-0 opacity-100`
      case 'warning':
        return `${baseStyles} bg-yellow-500/20 border-yellow-500/50 text-yellow-400 translate-x-0 opacity-100`
      default:
        return `${baseStyles} bg-blue-500/20 border-blue-500/50 text-blue-400 translate-x-0 opacity-100`
    }
  }

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-400" />
      case 'error':
        return <XCircle className="w-5 h-5 text-red-400" />
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-yellow-400" />
      default:
        return <AlertCircle className="w-5 h-5 text-blue-400" />
    }
  }

  return (
    <div className={getToastStyles()}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {getIcon()}
          <p className="text-sm font-medium">{message}</p>
        </div>
        <button
          onClick={() => {
            setIsVisible(false)
            setTimeout(onClose, 300)
          }}
          className="ml-4 text-gray-400 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

// Toast Context para gerenciar múltiplos toasts
interface ToastContextType {
  showToast: (message: string, type?: 'success' | 'error' | 'warning' | 'info', duration?: number) => void
}

const ToastContext = React.createContext<ToastContextType | null>(null)

export const useToast = () => {
  const context = React.useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return context
}

interface ToastState {
  id: string
  message: string
  type: 'success' | 'error' | 'warning' | 'info'
  duration: number
}

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastState[]>([])

  const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info', duration = 4000) => {
    const id = Math.random().toString(36).substr(2, 9)
    const newToast: ToastState = { id, message, type, duration }

    setToasts(prev => [...prev, newToast])
  }

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map((toast, index) => (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            duration={toast.duration}
            onClose={() => removeToast(toast.id)}
            show={true}
          />
        ))}
      </div>
    </ToastContext.Provider>
  )
}