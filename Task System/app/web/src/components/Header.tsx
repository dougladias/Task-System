import { Link } from '@tanstack/react-router'
import { Bell, CheckSquare, Gamepad2, LogOut, User } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { Button } from './ui/button'

export default function Header() {
  const { user, logout } = useAuth()

  const handleLogout = () => {
    logout()
  }

  return (
    <header className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 border-b border-gray-700/50 backdrop-blur-lg relative z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <img
                src="/favicon.svg"
                alt="Jungle Gaming"
                className="h-8 w-auto"
              />
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-green-400 to-green-600 bg-clip-text text-transparent">
                  Jungle Gaming
                </h1>
                <p className="text-xs text-gray-400 -mt-1">Task System</p>
              </div>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="hidden md:flex items-center space-x-1">
            <Link to="/">
              <Button variant="ghost" className="text-gray-300 hover:text-green-400 hover:bg-green-500/10 cursor-pointer">
                <CheckSquare className="w-4 h-4 mr-2" />
                Tarefas
              </Button>
            </Link>
            <Button variant="ghost" className="text-gray-300 hover:text-green-400 hover:bg-green-500/10 cursor-pointer">
              <Bell className="w-4 h-4 mr-2" />
              Notificações
            </Button>
          </nav>

          {/* User Menu */}
          <div className="flex items-center space-x-4">
            {/* User Info */}
            <div className="hidden sm:flex items-center space-x-3">
              <div className="text-right">
                <p className="text-sm font-medium text-white">{user?.username}</p>
                <p className="text-xs text-gray-400">{user?.email}</p>
              </div>
              <div className="w-8 h-8 bg-gradient-to-r from-green-400 to-green-600 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-white" />
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="text-gray-300 hover:text-red-400 hover:bg-red-500/10 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
