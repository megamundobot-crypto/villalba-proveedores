'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface User {
  id: number
  username: string
  nombre: string
  nivel: 'admin' | 'operador' | 'consulta'
}

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
  isAdmin: boolean
  isOperador: boolean
  canEdit: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  const checkAuth = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/me')
      if (response.ok) {
        const data = await response.json()
        setUser(data.user)
        // Guardar en localStorage para auditoría
        localStorage.setItem('user', JSON.stringify(data.user))
      } else {
        setUser(null)
        localStorage.removeItem('user')
      }
    } catch {
      setUser(null)
      localStorage.removeItem('user')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  const login = async (username: string, password: string) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      })

      const data = await response.json()

      if (response.ok) {
        setUser(data.user)
        // Guardar en localStorage para auditoría
        localStorage.setItem('user', JSON.stringify(data.user))
        return { success: true }
      } else {
        return { success: false, error: data.error }
      }
    } catch {
      return { success: false, error: 'Error de conexión' }
    }
  }

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch {
      // Ignorar errores en logout
    }
    setUser(null)
    localStorage.removeItem('user')
    router.push('/login')
  }

  const isAdmin = user?.nivel === 'admin'
  const isOperador = user?.nivel === 'operador' || user?.nivel === 'admin'
  const canEdit = user?.nivel === 'admin' || user?.nivel === 'operador'

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      login,
      logout,
      isAdmin,
      isOperador,
      canEdit
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth debe usarse dentro de AuthProvider')
  }
  return context
}
