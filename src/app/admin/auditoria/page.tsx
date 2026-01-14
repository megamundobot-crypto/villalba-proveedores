'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import ProtectedRoute from '@/components/ProtectedRoute'
import UserMenu from '@/components/UserMenu'

interface RegistroAuditoria {
  id: number
  usuario_id: number | null
  usuario_nombre: string | null
  accion: string
  tabla_afectada: string | null
  registro_id: number | null
  datos_anteriores: Record<string, unknown> | null
  datos_nuevos: Record<string, unknown> | null
  ip_address: string | null
  created_at: string
}

export default function AdminAuditoria() {
  const [registros, setRegistros] = useState<RegistroAuditoria[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroAccion, setFiltroAccion] = useState('')
  const [expandedRow, setExpandedRow] = useState<number | null>(null)

  useEffect(() => {
    loadRegistros()
  }, [filtroAccion])

  async function loadRegistros() {
    setLoading(true)
    try {
      const url = filtroAccion
        ? `/api/auditoria?accion=${filtroAccion}`
        : '/api/auditoria'
      const res = await fetch(url)
      if (res.ok) {
        const data = await res.json()
        setRegistros(data.registros || [])
      }
    } catch (err) {
      console.error('Error cargando auditoría:', err)
    }
    setLoading(false)
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  const getAccionBadge = (accion: string) => {
    if (accion.includes('LOGIN')) {
      return accion.includes('EXITOSO')
        ? 'bg-emerald-100 text-emerald-700'
        : 'bg-amber-100 text-amber-700'
    }
    if (accion.includes('LOGOUT')) return 'bg-slate-100 text-slate-700'
    if (accion.includes('CREAR')) return 'bg-blue-100 text-blue-700'
    if (accion.includes('ACTUALIZAR')) return 'bg-purple-100 text-purple-700'
    if (accion.includes('ELIMINAR')) return 'bg-red-100 text-red-700'
    return 'bg-gray-100 text-gray-700'
  }

  const acciones = ['LOGIN_EXITOSO', 'LOGIN_FALLIDO', 'LOGOUT', 'CREAR_USUARIO', 'ACTUALIZAR_USUARIO', 'ELIMINAR_USUARIO', 'CREAR_FACTURA', 'CREAR_PAGO']

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
                  <h1 className="text-2xl font-bold tracking-tight">Auditoría del Sistema</h1>
                  <p className="text-slate-400 text-sm mt-0.5">Registro de todas las acciones</p>
                </div>
              </div>
              <UserMenu />
            </div>
          </div>
        </header>

        <main className="container mx-auto px-6 py-8">
          {/* Filtros */}
          <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-4 mb-6">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm font-medium text-slate-600">Filtrar por acción:</span>
              <button
                onClick={() => setFiltroAccion('')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  !filtroAccion
                    ? 'bg-slate-800 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Todas
              </button>
              {acciones.map((accion) => (
                <button
                  key={accion}
                  onClick={() => setFiltroAccion(accion)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    filtroAccion === accion
                      ? 'bg-slate-800 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {accion.replace(/_/g, ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Tabla */}
          <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
            {loading ? (
              <div className="p-12 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                <p className="text-slate-500 mt-4">Cargando registros...</p>
              </div>
            ) : registros.length === 0 ? (
              <div className="p-12 text-center">
                <svg className="w-12 h-12 text-slate-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <p className="text-slate-500">No hay registros de auditoría</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Fecha/Hora</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Usuario</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Acción</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Tabla</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">IP</th>
                      <th className="px-6 py-4 text-center text-xs font-semibold text-slate-600 uppercase">Detalles</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {registros.map((registro) => (
                      <>
                        <tr key={registro.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4 text-sm text-slate-600">{formatDate(registro.created_at)}</td>
                          <td className="px-6 py-4">
                            {registro.usuario_nombre ? (
                              <span className="font-medium text-slate-700">{registro.usuario_nombre}</span>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getAccionBadge(registro.accion)}`}>
                              {registro.accion.replace(/_/g, ' ')}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-600">
                            {registro.tabla_afectada || '-'}
                            {registro.registro_id && ` #${registro.registro_id}`}
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-500 font-mono">{registro.ip_address || '-'}</td>
                          <td className="px-6 py-4 text-center">
                            {(registro.datos_anteriores || registro.datos_nuevos) && (
                              <button
                                onClick={() => setExpandedRow(expandedRow === registro.id ? null : registro.id)}
                                className="p-1 text-slate-400 hover:text-indigo-600 transition-colors"
                              >
                                <svg
                                  className={`w-5 h-5 transition-transform ${expandedRow === registro.id ? 'rotate-180' : ''}`}
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              </button>
                            )}
                          </td>
                        </tr>
                        {expandedRow === registro.id && (
                          <tr key={`${registro.id}-detail`}>
                            <td colSpan={6} className="px-6 py-4 bg-slate-50">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {registro.datos_anteriores && (
                                  <div>
                                    <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Datos Anteriores</p>
                                    <pre className="bg-white p-3 rounded-lg text-xs overflow-x-auto border border-slate-200">
                                      {JSON.stringify(registro.datos_anteriores, null, 2)}
                                    </pre>
                                  </div>
                                )}
                                {registro.datos_nuevos && (
                                  <div>
                                    <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Datos Nuevos</p>
                                    <pre className="bg-white p-3 rounded-lg text-xs overflow-x-auto border border-slate-200">
                                      {JSON.stringify(registro.datos_nuevos, null, 2)}
                                    </pre>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <p className="text-center text-slate-500 text-sm mt-6">
            Mostrando los últimos 100 registros
          </p>
        </main>
      </div>
    </ProtectedRoute>
  )
}
