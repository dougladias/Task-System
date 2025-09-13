import { useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import { useAuth } from './contexts/AuthContext'
import DashboardPage from './pages/DashboardPage'

function App() {
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!isAuthenticated) {
      navigate({ to: '/login' })
    }
  }, [isAuthenticated, navigate])

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-green-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Redirecionando para login...</p>
        </div>
      </div>
    )
  }

  return <DashboardPage />
}

export default App
