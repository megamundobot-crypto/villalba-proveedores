'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredLevel?: 'admin' | 'operador' | 'consulta'
}

export default function ProtectedRoute({ children, requiredLevel }: ProtectedRouteProps) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!loading && !user && pathname !== '/login') {
      router.push('/login')
    }
  }, [user, loading, router, pathname])

  // Mostrar loading mientras verifica
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Cargando...</p>
        </div>
      </div>
    )
  }

  // Si no hay usuario y no es la página de login, no mostrar nada
  if (!user && pathname !== '/login') {
    return null
  }

  // Verificar nivel de acceso
  if (requiredLevel && user) {
    const nivelJerarquia = { admin: 3, operador: 2, consulta: 1 }
    const nivelUsuario = nivelJerarquia[user.nivel]
    const nivelRequerido = nivelJerarquia[requiredLevel]

    if (nivelUsuario < nivelRequerido) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center bg-white p-8 rounded-xl shadow-lg max-w-md">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">Acceso Denegado</h2>
            <p className="text-gray-500 mb-6">
              No tiene permisos para acceder a esta sección.
              <br />
              Nivel requerido: <span className="font-semibold capitalize">{requiredLevel}</span>
            </p>
            <button
              onClick={() => router.push('/')}
              className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Volver al inicio
            </button>
          </div>
        </div>
      )
    }
  }

  return <>{children}</>
}
