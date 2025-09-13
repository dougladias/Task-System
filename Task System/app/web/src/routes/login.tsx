import { createRoute, useNavigate } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useEffect, useState } from 'react'
import { Eye, EyeOff, Gamepad2, Lock, Mail, UserPlus } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { useToast } from '../components/ui/toast'

// Schema de validação do formulário
const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
})

type LoginFormData = z.infer<typeof loginSchema>

function LoginPage() {
  const { login, isLoading, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  useEffect(() => {
    if (isAuthenticated) {
      navigate({ to: '/' })
    }
  }, [isAuthenticated, navigate])

  const onSubmit = async (data: LoginFormData) => {
    setError('')
    setSuccess(false)

    const result = await login(data.email, data.password)

    if (result.success) {
      setSuccess(true)
      showToast('🎮 Login realizado com sucesso! Bem-vindo à Jungle Gaming!', 'success', 2000)
      setTimeout(() => {
        navigate({ to: '/' })
      }, 1000)
    } else {
      const errorMessage = result.error || 'Erro no login'
      setError(errorMessage)
      showToast(errorMessage, 'error')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-[url('/jungle-pattern.svg')] opacity-10"></div>
      <div className="absolute top-0 left-0 w-full h-full">
        <div className="absolute top-20 left-10 w-64 h-64 bg-green-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-green-400/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      {/* Login Container */}
      <div className="relative z-10 w-full max-w-md sm:max-w-lg md:max-w-xl lg:max-w-2xl p-4 sm:p-8">
        <div className="bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-2xl border border-gray-700/50 p-8 sm:p-10 md:p-12 lg:p-16 space-y-8 sm:space-y-10">
          {/* Logo Section */}
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <img
                src="/favicon.svg"
                alt="Jungle Gaming"
                className="h-16 w-auto animate-bounce hover:animate-spin transition-all duration-300"
              />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-green-400 to-green-600 bg-clip-text text-transparent">
                Jungle Gaming
              </h1>
              <p className="text-gray-400 text-sm mt-2 flex items-center justify-center gap-1">
                <Gamepad2 className="w-4 h-4" />
                Task Management System
              </p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-4">
              {/* Email Field */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-gray-300 font-medium">
                  Email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    {...register('email')}
                    type="email"
                    placeholder="Digite seu email"
                    className="pl-10 bg-gray-700/50 border-gray-600 text-white placeholder:text-gray-400 focus:border-green-500 focus:ring-green-500/20 transition-all duration-200"
                  />
                </div>
                {errors.email && (
                  <p className="text-red-400 text-sm flex items-center gap-1">
                    <span className="w-1 h-1 bg-red-400 rounded-full"></span>
                    {errors.email.message}
                  </p>
                )}
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-gray-300 font-medium">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    {...register('password')}
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Digite sua senha"
                    className="pl-10 pr-10 bg-gray-700/50 border-gray-600 text-white placeholder:text-gray-400 focus:border-green-500 focus:ring-green-500/20 transition-all duration-200"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-green-400 transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-red-400 text-sm flex items-center gap-1">
                    <span className="w-1 h-1 bg-red-400 rounded-full"></span>
                    {errors.password.message}
                  </p>
                )}
              </div>
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <input
                  id="remember-me"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 text-green-500 bg-gray-700 border-gray-600 rounded focus:ring-green-500 focus:ring-2"
                />
                <Label htmlFor="remember-me" className="text-sm text-gray-400 cursor-pointer hover:text-green-400 transition-colors">
                  Lembrar-me
                </Label>
              </div>
              <button
                type="button"
                className="text-sm text-green-400 hover:text-green-300 transition-colors"
              >
                Esqueci a senha?
              </button>
            </div>

            {/* Login Button */}
            <Button
              type="submit"
              disabled={isSubmitting || isLoading}
              className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold py-3 rounded-lg transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 cursor-pointer"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Entrando...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Gamepad2 className="w-4 h-4" />
                  Entrar
                </div>
              )}
            </Button>

            {/* Messages */}
            {error && (
              <div className="p-4 bg-red-500/20 border border-red-500/50 text-red-400 rounded-lg text-sm animate-in slide-in-from-top-2 duration-300">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                  {error}
                </div>
              </div>
            )}

            {success && (
              <div className="p-4 bg-green-500/20 border border-green-500/50 text-green-400 rounded-lg text-sm animate-in slide-in-from-top-2 duration-300">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  Login realizado com sucesso! Redirecionando...
                </div>
              </div>
            )}
          </form>

          {/* Create Account Section */}
          <div className="text-center pt-4 border-t border-gray-700/50">
            <p className="text-gray-400 text-sm mb-3">
              Ainda não tem uma conta?
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate({ to: '/register' })}
              className="bg-transparent border-green-500/50 text-green-400 hover:bg-green-500/10 hover:border-green-500 transition-all duration-200 cursor-pointer"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Criar conta
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function createLoginRoute(rootRoute: any) {
  return createRoute({
    getParentRoute: () => rootRoute,
    path: '/login',
    component: LoginPage,
  })
}