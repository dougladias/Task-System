import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { X, Calendar, AlertCircle, User } from 'lucide-react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { useTasks } from '../contexts/TasksContext'
import { useToast } from './ui/toast'
import { useAuth } from '../contexts/AuthContext'

const createTaskSchema = z.object({
  title: z.string().min(3, 'Título deve ter pelo menos 3 caracteres'),
  description: z.string().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
  dueDate: z.string().optional()
})

type CreateTaskFormData = z.infer<typeof createTaskSchema>

interface CreateTaskModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function CreateTaskModal({ isOpen, onClose }: CreateTaskModalProps) {
  const { createTask } = useTasks()
  const { showToast } = useToast()
  const { user } = useAuth()
  const [isLoading, setIsLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm<CreateTaskFormData>({
    resolver: zodResolver(createTaskSchema),
    defaultValues: {
      priority: 'MEDIUM'
    }
  })

  const onSubmit = async (data: CreateTaskFormData) => {
    setIsLoading(true)

    const taskData = {
      ...data,
      status: 'TODO' as const,
      assignedUserIds: [user?.id || ''],
      assignedUsernames: [user?.username || '']
    }

    const result = await createTask(taskData)

    if (result.success) {
      showToast('✅ Tarefa criada com sucesso!', 'success')
      reset()
      onClose()
    } else {
      showToast(result.error || 'Erro ao criar tarefa', 'error')
    }

    setIsLoading(false)
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  if (!isOpen) return null

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT': return 'border-red-500 text-red-400'
      case 'HIGH': return 'border-orange-500 text-orange-400'
      case 'MEDIUM': return 'border-yellow-500 text-yellow-400'
      case 'LOW': return 'border-blue-500 text-blue-400'
      default: return 'border-gray-500 text-gray-400'
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800/90 backdrop-blur-lg rounded-2xl border border-gray-700/50 w-full max-w-md mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700/50">
          <h2 className="text-xl font-bold text-white">Nova Tarefa</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title" className="text-gray-300 font-medium">
              Título *
            </Label>
            <Input
              {...register('title')}
              type="text"
              placeholder="Ex: Implementar nova funcionalidade"
              className="bg-gray-700/50 border-gray-600 text-white placeholder:text-gray-400 focus:border-green-500 focus:ring-green-500/20"
            />
            {errors.title && (
              <p className="text-red-400 text-sm flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {errors.title.message}
              </p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-gray-300 font-medium">
              Descrição
            </Label>
            <textarea
              {...register('description')}
              placeholder="Descreva os detalhes da tarefa..."
              rows={3}
              className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 text-white placeholder:text-gray-400 focus:border-green-500 focus:ring-green-500/20 rounded-md resize-none"
            />
          </div>

          {/* Priority */}
          <div className="space-y-2">
            <Label htmlFor="priority" className="text-gray-300 font-medium">
              Prioridade *
            </Label>
            <select
              {...register('priority')}
              className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 text-white focus:border-green-500 focus:ring-green-500/20 rounded-md cursor-pointer"
            >
              <option value="LOW">🔵 Baixa</option>
              <option value="MEDIUM">🟡 Média</option>
              <option value="HIGH">🟠 Alta</option>
              <option value="URGENT">🔴 Urgente</option>
            </select>
          </div>

          {/* Due Date */}
          <div className="space-y-2">
            <Label htmlFor="dueDate" className="text-gray-300 font-medium">
              Data de vencimento
            </Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                {...register('dueDate')}
                type="date"
                className="pl-10 bg-gray-700/50 border-gray-600 text-white focus:border-green-500 focus:ring-green-500/20 cursor-pointer"
              />
            </div>
          </div>

          {/* Assigned User Info */}
          <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
            <div className="flex items-center gap-2 text-green-400 text-sm">
              <User className="w-4 h-4" />
              <span>Atribuída para: <strong>{user?.username}</strong></span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="flex-1 bg-transparent border-gray-600 text-gray-300 hover:bg-gray-700 cursor-pointer"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="flex-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white cursor-pointer"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Criando...
                </div>
              ) : (
                'Criar Tarefa'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}