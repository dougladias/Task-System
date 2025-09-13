const API_BASE_URL = 'http://localhost:3001/api'

export const apiConfig = {
  baseURL: API_BASE_URL,
  endpoints: {
    auth: {
      login: '/auth/login',
      register: '/auth/register',
      refresh: '/auth/refresh'
    },
    tasks: {
      list: '/tasks',
      create: '/tasks',
      detail: '/tasks/:id',
      update: '/tasks/:id',
      delete: '/tasks/:id',
      comments: '/tasks/:id/comments'
    }
  }
}

export const api = {
  get: async (endpoint: string, options?: RequestInit) => {
    const token = localStorage.getItem('accessToken')

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options?.headers,
      },
      ...options,
    })

    return response
  },

  post: async (endpoint: string, data?: any, options?: RequestInit) => {
    const token = localStorage.getItem('accessToken')

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options?.headers,
      },
      body: data ? JSON.stringify(data) : undefined,
      ...options,
    })

    return response
  },

  put: async (endpoint: string, data?: any, options?: RequestInit) => {
    const token = localStorage.getItem('accessToken')

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options?.headers,
      },
      body: data ? JSON.stringify(data) : undefined,
      ...options,
    })

    return response
  },

  delete: async (endpoint: string, options?: RequestInit) => {
    const token = localStorage.getItem('accessToken')

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options?.headers,
      },
      ...options,
    })

    return response
  }
}