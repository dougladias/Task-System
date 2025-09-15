import { useEffect, useState } from 'react'
import { Calendar, Filter, MessageSquare, MoreHorizontal, Plus, Search } from 'lucide-react'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { useTasks } from '../contexts/TasksContext'
import { useToast } from '../components/ui/toast'
import CreateTaskModal from '../components/CreateTaskModal'

export default function DashboardPage() {
  const { tasks, isLoading, fetchTasks, updateTask } = useTasks()
  const { showToast } = useToast()
  const [searchTerm, setSearchTerm] = useState('')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [filters, setFilters] = useState({
    status: '',
    priority: ''
  })
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    // Refresh tasks on mount
    fetchTasks()
  }, [])


  // Handle search with debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchTerm || filters.status || filters.priority) {
        fetchTasks({
          search: searchTerm || undefined,
          status: filters.status || undefined,
          priority: filters.priority || undefined
        })
      } else {
        fetchTasks()
      }
    }, 500)

    return () => clearTimeout(timeoutId)
  }, [searchTerm, filters.status, filters.priority])

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const clearFilters = () => {
    setSearchTerm('')
    setFilters({ status: '', priority: '' })
    fetchTasks()
  }


  // Show loading state
  if (isLoading && tasks.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-green-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Carregando tarefas...</p>
        </div>
      </div>
    )
  }

  // Remove error state - just show empty board if no connection

  // Group tasks by status
  const columns = [
    {
      id: 'TODO',
      title: 'A Fazer',
      color: 'bg-gray-500',
      tasks: tasks.filter(task => task.status === 'TODO')
    },
    {
      id: 'IN_PROGRESS',
      title: 'Em Progresso',
      color: 'bg-blue-500',
      tasks: tasks.filter(task => task.status === 'IN_PROGRESS')
    },
    {
      id: 'REVIEW',
      title: 'Em Revisão',
      color: 'bg-yellow-500',
      tasks: tasks.filter(task => task.status === 'REVIEW')
    },
    {
      id: 'DONE',
      title: 'Concluído',
      color: 'bg-green-500',
      tasks: tasks.filter(task => task.status === 'DONE')
    }
  ]

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT': return 'bg-red-500'
      case 'HIGH': return 'bg-orange-500'
      case 'MEDIUM': return 'bg-yellow-500'
      case 'LOW': return 'bg-blue-500'
      default: return 'bg-gray-500'
    }
  }

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    const result = await updateTask(taskId, { status: newStatus as any })
    if (result.success) {
      showToast('Status da tarefa atualizado!', 'success')
    } else {
      showToast(result.error || 'Erro ao atualizar tarefa', 'error')
    }
  }

  const TaskCard = ({ task }: { task: any }) => (
    <div className="bg-gray-800/80 backdrop-blur-lg rounded-xl border border-gray-700/50 p-4 mb-3 cursor-pointer hover:bg-gray-700/60 transition-all duration-200 group">
      {/* Priority Badge */}
      <div className="flex items-center justify-between mb-3">
        <span className={`w-3 h-3 rounded-full ${getPriorityColor(task.priority)}`} title={task.priority}></span>
        <button className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-white cursor-pointer">
          <MoreHorizontal className="w-4 h-4" />
        </button>
      </div>

      {/* Title & Description */}
      <div className="mb-3">
        <h3 className="text-white font-medium mb-1 text-sm leading-tight">{task.title}</h3>
        {task.description && (
          <p className="text-gray-400 text-xs line-clamp-2">{task.description}</p>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-3">
          {/* Due Date */}
          {task.dueDate && (
            <div className="flex items-center gap-1 text-gray-400">
              <Calendar className="w-3 h-3" />
              <span>{new Date(task.dueDate).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</span>
            </div>
          )}

          {/* Comments */}
          {task.comments && task.comments.length > 0 && (
            <div className="flex items-center gap-1 text-gray-400">
              <MessageSquare className="w-3 h-3" />
              <span>{task.comments.length}</span>
            </div>
          )}
        </div>

        {/* Assignees */}
        <div className="flex -space-x-2">
          {task.assignedUsernames?.slice(0, 3).map((username: string, index: number) => (
            <div
              key={index}
              className="w-6 h-6 rounded-full bg-gradient-to-r from-green-400 to-green-600 flex items-center justify-center text-white text-xs font-medium border-2 border-gray-800"
              title={username}
            >
              {username.charAt(0).toUpperCase()}
            </div>
          ))}
          {task.assignedUsernames && task.assignedUsernames.length > 3 && (
            <div className="w-6 h-6 rounded-full bg-gray-600 flex items-center justify-center text-white text-xs border-2 border-gray-800">
              +{task.assignedUsernames.length - 3}
            </div>
          )}
        </div>
      </div>

      {/* Status Change Buttons */}
      <div className="mt-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {task.status !== 'TODO' && (
          <button
            onClick={() => handleStatusChange(task.id, 'TODO')}
            className="px-2 py-1 bg-gray-600 text-white text-xs rounded cursor-pointer hover:bg-gray-500"
          >
            ← TODO
          </button>
        )}
        {task.status !== 'IN_PROGRESS' && (
          <button
            onClick={() => handleStatusChange(task.id, 'IN_PROGRESS')}
            className="px-2 py-1 bg-blue-600 text-white text-xs rounded cursor-pointer hover:bg-blue-500"
          >
            Progresso
          </button>
        )}
        {task.status !== 'REVIEW' && (
          <button
            onClick={() => handleStatusChange(task.id, 'REVIEW')}
            className="px-2 py-1 bg-yellow-600 text-white text-xs rounded cursor-pointer hover:bg-yellow-500"
          >
            Revisão
          </button>
        )}
        {task.status !== 'DONE' && (
          <button
            onClick={() => handleStatusChange(task.id, 'DONE')}
            className="px-2 py-1 bg-green-600 text-white text-xs rounded cursor-pointer hover:bg-green-500"
          >
            ✓ Done
          </button>
        )}
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-[url('/jungle-pattern.svg')] opacity-5"></div>
      <div className="absolute top-0 left-0 w-full h-full">
        <div className="absolute top-20 left-10 w-64 h-64 bg-green-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-green-400/5 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 h-full">
        {/* Header */}
        <div>
          <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-4">
            <div className="flex flex-col sm:flex-row items-center justify-end gap-3">
              <div className="relative w-full sm:w-auto">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  type="text"
                  placeholder="Buscar tarefas..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full sm:w-64 bg-gray-800/60 border-gray-700 text-white placeholder:text-gray-400 focus:border-green-500 focus:ring-green-500/20"
                />
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <Button
                  variant="outline"
                  onClick={() => setShowFilters(!showFilters)}
                  className={`flex-1 sm:flex-none bg-gray-800/60 border-gray-700 text-gray-300 hover:bg-gray-700 cursor-pointer ${showFilters ? 'bg-gray-700 border-green-500' : ''}`}
                >
                  <Filter className="w-4 h-4 mr-2" />
                  Filtros
                </Button>
                <Button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="flex-1 sm:flex-none bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 cursor-pointer"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Nova Tarefa
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="border-b border-gray-700/30">
          <div className="max-w-6xl mx-auto px-6 sm:px-8 lg:px-12 py-4">
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex gap-2 items-center">
                <label className="text-sm text-gray-400">Status:</label>
                <select
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className="bg-gray-800 border border-gray-700 text-white px-3 py-1 rounded text-sm"
                >
                  <option value="">Todos</option>
                  <option value="TODO">A Fazer</option>
                  <option value="IN_PROGRESS">Em Progresso</option>
                  <option value="REVIEW">Em Revisão</option>
                  <option value="DONE">Concluído</option>
                </select>
              </div>

              <div className="flex gap-2 items-center">
                <label className="text-sm text-gray-400">Prioridade:</label>
                <select
                  value={filters.priority}
                  onChange={(e) => handleFilterChange('priority', e.target.value)}
                  className="bg-gray-800 border border-gray-700 text-white px-3 py-1 rounded text-sm"
                >
                  <option value="">Todas</option>
                  <option value="LOW">Baixa</option>
                  <option value="MEDIUM">Média</option>
                  <option value="HIGH">Alta</option>
                  <option value="URGENT">Urgente</option>
                </select>
              </div>

              <Button
                variant="outline"
                onClick={clearFilters}
                className="bg-gray-800/60 border-gray-700 text-gray-300 hover:bg-gray-700 text-sm cursor-pointer"
              >
                Limpar Filtros
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Kanban Board */}
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 py-6 h-[calc(100vh-280px)]">
          {columns.map((column) => (
            <div key={column.id} className="flex flex-col min-h-0">
              {/* Column Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-4 h-4 rounded-full ${column.color}`}></div>
                  <h2 className="font-semibold text-white text-sm lg:text-base">{column.title}</h2>
                  <span className="bg-gray-700 text-gray-300 text-xs px-2 py-1 rounded-full">
                    {column.tasks.length}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsCreateModalOpen(true)}
                  className="text-gray-400 hover:text-white p-1 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>

              {/* Column Cards */}
              <div className="flex-1 space-y-0 overflow-y-auto">
                {column.tasks.map((task) => (
                  <TaskCard key={task.id} task={task} />
                ))}

                {/* Add Card Button */}
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="w-full p-3 border-2 border-dashed border-gray-700 rounded-xl text-gray-400 hover:text-white hover:border-gray-600 transition-all duration-200 text-sm flex items-center justify-center gap-2 mt-3 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  Adicionar tarefa
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Empty State */}
      {tasks.length === 0 && !isLoading && (
        <div className="max-w-6xl mx-auto px-6 sm:px-8 lg:px-12 py-20 text-center">
          <div className="bg-gray-800/40 backdrop-blur-lg rounded-2xl border border-gray-700/50 p-8">
            <h3 className="text-xl font-bold text-white mb-2">🎯 Bem-vindo ao seu espaço de trabalho!</h3>
            <p className="text-gray-400 mb-6">Comece criando sua primeira tarefa e organize seu trabalho de forma eficiente</p>
            <Button
              onClick={() => setIsCreateModalOpen(true)}
              className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 cursor-pointer"
            >
              <Plus className="w-4 h-4 mr-2" />
              Criar primeira tarefa
            </Button>
          </div>
        </div>
      )}

      {/* Create Task Modal */}
      <CreateTaskModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
    </div>
  )
}