'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import ProtectedRoute from '@/components/ProtectedRoute'
import UserMenu from '@/components/UserMenu'
import { useAuth } from '@/contexts/AuthContext'

interface Usuario {
  id: number
  username: string
  nombre_completo: string
  nivel: 'admin' | 'operador' | 'consulta'
  activo: boolean
  ultimo_login: string | null
  created_at: string
}

export default function AdminUsuarios() {
  const { user } = useAuth()
  const router = useRouter()
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingUser, setEditingUser] = useState<Usuario | null>(null)
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    nombre_completo: '',
    nivel: 'operador' as 'admin' | 'operador' | 'consulta'
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    loadUsuarios()
  }, [])

  async function loadUsuarios() {
    setLoading(true)
    try {
      const res = await fetch('/api/usuarios')
      if (res.ok) {
        const data = await res.json()
        setUsuarios(data.usuarios)
      }
    } catch (err) {
      console.error('Error cargando usuarios:', err)
    }
    setLoading(false)
  }

  const openCreateModal = () => {
    setEditingUser(null)
    setFormData({ username: '', password: '', nombre_completo: '', nivel: 'operador' })
    setError('')
    setShowModal(true)
  }

  const openEditModal = (usuario: Usuario) => {
    setEditingUser(usuario)
    setFormData({
      username: usuario.username,
      password: '',
      nombre_completo: usuario.nombre_completo,
      nivel: usuario.nivel
    })
    setError('')
    setShowModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    try {
      if (editingUser) {
        // Actualizar usuario
        const res = await fetch('/api/usuarios', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingUser.id,
            nombre_completo: formData.nombre_completo,
            nivel: formData.nivel,
            password: formData.password || undefined
          })
        })

        if (!res.ok) {
          const data = await res.json()
          setError(data.error)
          return
        }
      } else {
        // Crear usuario
        if (!formData.password) {
          setError('La contraseña es requerida')
          return
        }

        const res = await fetch('/api/usuarios', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        })

        if (!res.ok) {
          const data = await res.json()
          setError(data.error)
          return
        }
      }

      setShowModal(false)
      setSuccess(editingUser ? 'Usuario actualizado correctamente' : 'Usuario creado correctamente')
      setTimeout(() => setSuccess(''), 3000)
      loadUsuarios()
    } catch (err) {
      setError('Error de conexión')
    }
  }

  const toggleActivo = async (usuario: Usuario) => {
    try {
      const res = await fetch('/api/usuarios', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: usuario.id, activo: !usuario.activo })
      })

      if (res.ok) {
        setSuccess(`Usuario ${usuario.activo ? 'desactivado' : 'activado'} correctamente`)
        setTimeout(() => setSuccess(''), 3000)
        loadUsuarios()
      }
    } catch (err) {
      console.error('Error:', err)
    }
  }

  const deleteUsuario = async (usuario: Usuario) => {
    if (!confirm(`¿Estás seguro de eliminar a ${usuario.nombre_completo}?`)) return

    try {
      const res = await fetch(`/api/usuarios?id=${usuario.id}`, { method: 'DELETE' })
      if (res.ok) {
        setSuccess('Usuario eliminado correctamente')
        setTimeout(() => setSuccess(''), 3000)
        loadUsuarios()
      } else {
        const data = await res.json()
        setError(data.error)
        setTimeout(() => setError(''), 3000)
      }
    } catch (err) {
      console.error('Error:', err)
    }
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Nunca'
    return new Date(dateStr).toLocaleString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getNivelBadge = (nivel: string) => {
    switch (nivel) {
      case 'admin':
        return <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full">Admin</span>
      case 'operador':
        return <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">Operador</span>
      default:
        return <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-full">Consulta</span>
    }
  }

  return (
    <ProtectedRoute requiredLevel="admin">
      <div className="min-h-screen bg-slate-50">
        {/* Header */}
        <header className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white shadow-xl">
          <div className="container mx-auto px-6 py-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Link href="/" className="text-white/70 hover:text-white transition-colors">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                </Link>
                <div>
                  <h1 className="text-2xl font-bold tracking-tight">Gestión de Usuarios</h1>
                  <p className="text-slate-400 text-sm mt-0.5">Administración del sistema</p>
                </div>
              </div>
              <UserMenu />
            </div>
          </div>
        </header>

        <main className="container mx-auto px-6 py-8">
          {/* Mensajes */}
          {success && (
            <div className="mb-6 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-lg flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              {success}
            </div>
          )}

          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          )}

          {/* Botón crear */}
          <div className="flex justify-between items-center mb-6">
            <p className="text-slate-600">{usuarios.length} usuarios registrados</p>
            <button
              onClick={openCreateModal}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Nuevo Usuario
            </button>
          </div>

          {/* Tabla */}
          <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
            {loading ? (
              <div className="p-12 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                <p className="text-slate-500 mt-4">Cargando usuarios...</p>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Usuario</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Nombre</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Nivel</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Estado</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Último Login</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-slate-600 uppercase">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {usuarios.map((usuario) => (
                    <tr key={usuario.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                            <span className="text-indigo-600 font-semibold">
                              {usuario.nombre_completo.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <span className="font-medium text-slate-700">@{usuario.username}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-600">{usuario.nombre_completo}</td>
                      <td className="px-6 py-4">{getNivelBadge(usuario.nivel)}</td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => toggleActivo(usuario)}
                          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                            usuario.activo
                              ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                              : 'bg-red-100 text-red-700 hover:bg-red-200'
                          }`}
                        >
                          {usuario.activo ? '● Activo' : '○ Inactivo'}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">{formatDate(usuario.ultimo_login)}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEditModal(usuario)}
                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="Editar"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          {usuario.id !== user?.id && (
                            <button
                              onClick={() => deleteUsuario(usuario)}
                              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Eliminar"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </main>

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
              <div className="p-6 border-b border-slate-200">
                <h3 className="text-xl font-semibold text-slate-800">
                  {editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}
                </h3>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
                    {error}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Usuario</label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    disabled={!!editingUser}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100"
                    required={!editingUser}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Contraseña {editingUser && '(dejar vacío para mantener)'}
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    required={!editingUser}
                    minLength={4}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nombre Completo</label>
                  <input
                    type="text"
                    value={formData.nombre_completo}
                    onChange={(e) => setFormData({ ...formData, nombre_completo: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nivel de Acceso</label>
                  <select
                    value={formData.nivel}
                    onChange={(e) => setFormData({ ...formData, nivel: e.target.value as any })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="consulta">Consulta - Solo ver información</option>
                    <option value="operador">Operador - Crear facturas y pagos</option>
                    <option value="admin">Admin - Acceso total</option>
                  </select>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    {editingUser ? 'Guardar Cambios' : 'Crear Usuario'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  )
}
