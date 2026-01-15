'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import NavRapida from '@/components/NavRapida'

interface LotePago {
  id: number
  fecha: string
  empresa: string
  total: number
  cantidad_pagos: number
  estado: string
  archivo_txt: string
  fecha_confirmacion: string | null
  observaciones: string | null
}

interface DetallePago {
  id: number
  lote_id: number
  factura_id: number
  proveedor_id: number
  proveedor_nombre: string
  factura_numero: string
  cbu: string
  banco: string
  monto: number
  tipo: string
  confirmado: boolean
  fecha_confirmacion: string | null
  observaciones: string | null
  whatsapp?: string
  notificado?: boolean
}

// Referencia global a la ventana de WhatsApp
let whatsappWindow: Window | null = null

export default function HistorialPagosPage() {
  const [lotes, setLotes] = useState<LotePago[]>([])
  const [loteSeleccionado, setLoteSeleccionado] = useState<LotePago | null>(null)
  const [detalles, setDetalles] = useState<DetallePago[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroEmpresa, setFiltroEmpresa] = useState<string>('todas')
  const [filtroEstado, setFiltroEstado] = useState<string>('todos')
  const [fechaDesde, setFechaDesde] = useState<string>('')
  const [fechaHasta, setFechaHasta] = useState<string>('')

  const redondear = (num: number): number => Math.round(num * 100) / 100

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(redondear(amount))
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatDateShort = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  useEffect(() => {
    cargarHistorial()
  }, [filtroEmpresa, filtroEstado, fechaDesde, fechaHasta])

  const cargarHistorial = async () => {
    setLoading(true)

    let query = supabase
      .from('lotes_pago')
      .select('*')
      .order('fecha', { ascending: false })

    if (filtroEmpresa !== 'todas') {
      query = query.eq('empresa', filtroEmpresa)
    }

    if (filtroEstado !== 'todos') {
      query = query.eq('estado', filtroEstado)
    }

    if (fechaDesde) {
      query = query.gte('fecha', fechaDesde)
    }

    if (fechaHasta) {
      query = query.lte('fecha', fechaHasta + 'T23:59:59')
    }

    const { data, error } = await query

    if (data) {
      setLotes(data)
    }
    setLoading(false)
  }

  const seleccionarLote = async (lote: LotePago) => {
    setLoteSeleccionado(lote)
    const { data } = await supabase
      .from('lotes_pago_detalle')
      .select('*')
      .eq('lote_id', lote.id)
      .order('proveedor_nombre')

    if (data) {
      // Cargar WhatsApp de cada proveedor
      const proveedorIds = [...new Set(data.map(d => d.proveedor_id))]
      const { data: proveedores } = await supabase
        .from('proveedores')
        .select('id, whatsapp')
        .in('id', proveedorIds)

      const whatsappMap = new Map(proveedores?.map(p => [p.id, p.whatsapp]) || [])

      setDetalles(data.map(d => ({
        ...d,
        whatsapp: whatsappMap.get(d.proveedor_id)
      })))
    }
  }

  const enviarWhatsApp = (detalle: DetallePago) => {
    if (!detalle.whatsapp) {
      alert('Este proveedor no tiene WhatsApp configurado. Editalo en la sección Proveedores.')
      return
    }

    const empresa = loteSeleccionado?.empresa === 'VH' ? 'Villalba Hermanos SRL' : 'Villalba Cristino'
    const tipoTexto = detalle.tipo === 'cancela' ? '✅ Cancela total' : '💰 A cuenta'

    const mensaje = `¡Hola! 👋

Te informamos que se realizó una *transferencia bancaria* desde *${empresa}*:

📄 *Factura:* ${detalle.factura_numero}
💵 *Monto:* ${formatMoney(detalle.monto)}
📌 *Concepto:* ${tipoTexto}

Te adjuntamos el comprobante 📎

¡Saludos! 🙌`

    // Abrir WhatsApp Web directamente en el chat del contacto
    const url = `https://web.whatsapp.com/send?phone=${detalle.whatsapp}&text=${encodeURIComponent(mensaje)}`

    // Reutilizar la misma ventana si existe y no está cerrada
    if (whatsappWindow && !whatsappWindow.closed) {
      whatsappWindow.location.href = url
      whatsappWindow.focus()
    } else {
      whatsappWindow = window.open(url, 'whatsapp')
    }

    // Marcar como notificado localmente
    setDetalles(prev => prev.map(d =>
      d.id === detalle.id ? { ...d, notificado: true } : d
    ))
  }

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case 'confirmado':
        return 'bg-green-100 text-green-800'
      case 'pendiente':
        return 'bg-yellow-100 text-yellow-800'
      case 'anulado':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getEstadoIcon = (estado: string) => {
    switch (estado) {
      case 'confirmado':
        return '✅'
      case 'pendiente':
        return '⏳'
      case 'anulado':
        return '❌'
      default:
        return '❓'
    }
  }

  // Estadísticas
  const totalConfirmado = lotes
    .filter(l => l.estado === 'confirmado')
    .reduce((sum, l) => sum + l.total, 0)

  const totalPendiente = lotes
    .filter(l => l.estado === 'pendiente')
    .reduce((sum, l) => sum + l.total, 0)

  const cantidadConfirmados = lotes.filter(l => l.estado === 'confirmado').length
  const cantidadPendientes = lotes.filter(l => l.estado === 'pendiente').length

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-slate-800 text-white p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Historial de Pagos</h1>
            <p className="text-slate-400 text-sm">Consultá los lotes de pagos confirmados y pendientes</p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/pagos/confirmar"
              className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg"
            >
              Confirmar Pagos
            </Link>
            <Link
              href="/pagos"
              className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg"
            >
              ← Volver a Pagos
            </Link>
          </div>
        </div>
      </header>
      <NavRapida />

      <div className="max-w-7xl mx-auto p-4">
        {/* Estadísticas */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">Confirmados</p>
            <p className="text-2xl font-bold text-green-600">{cantidadConfirmados}</p>
            <p className="text-sm text-gray-600">{formatMoney(totalConfirmado)}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">Pendientes</p>
            <p className="text-2xl font-bold text-yellow-600">{cantidadPendientes}</p>
            <p className="text-sm text-gray-600">{formatMoney(totalPendiente)}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">Total Lotes</p>
            <p className="text-2xl font-bold text-gray-800">{lotes.length}</p>
            <p className="text-sm text-gray-600">en el período</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">Total General</p>
            <p className="text-2xl font-bold text-blue-600">
              {formatMoney(totalConfirmado + totalPendiente)}
            </p>
            <p className="text-sm text-gray-600">conf + pend</p>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Empresa</label>
              <select
                value={filtroEmpresa}
                onChange={(e) => setFiltroEmpresa(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              >
                <option value="todas">Todas</option>
                <option value="VH">VH - Villalba Hnos</option>
                <option value="VC">VC - Villalba Cristino</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
              <select
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              >
                <option value="todos">Todos</option>
                <option value="confirmado">Confirmados</option>
                <option value="pendiente">Pendientes</option>
                <option value="anulado">Anulados</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Desde</label>
              <input
                type="date"
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hasta</label>
              <input
                type="date"
                value={fechaHasta}
                onChange={(e) => setFechaHasta(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Lista de lotes */}
          <div className="bg-white rounded-lg shadow p-4 max-h-[600px] overflow-y-auto">
            <h2 className="text-lg font-semibold mb-4 text-gray-700 sticky top-0 bg-white pb-2">
              Lotes de Pago ({lotes.length})
            </h2>

            {loading ? (
              <div className="text-center py-8 text-gray-500">Cargando...</div>
            ) : lotes.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No hay lotes para los filtros seleccionados</p>
              </div>
            ) : (
              <div className="space-y-3">
                {lotes.map(lote => (
                  <div
                    key={lote.id}
                    onClick={() => seleccionarLote(lote)}
                    className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      loteSeleccionado?.id === lote.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{getEstadoIcon(lote.estado)}</span>
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                          lote.empresa === 'VH' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                        }`}>
                          {lote.empresa}
                        </span>
                        <span className="text-sm text-gray-500">#{lote.id}</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${getEstadoBadge(lote.estado)}`}>
                        {lote.estado}
                      </span>
                    </div>
                    <div className="mt-2">
                      <p className="font-semibold text-gray-800">{formatMoney(lote.total)}</p>
                      <p className="text-sm text-gray-500">{lote.cantidad_pagos} pago(s)</p>
                    </div>
                    <div className="mt-1 text-xs text-gray-400">
                      <p>Creado: {formatDateShort(lote.fecha)}</p>
                      {lote.fecha_confirmacion && (
                        <p>Confirmado: {formatDateShort(lote.fecha_confirmacion)}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Detalle del lote */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow p-4">
            {!loteSeleccionado ? (
              <div className="text-center py-16 text-gray-500">
                <p className="text-xl">👈 Seleccioná un lote para ver los detalles</p>
                <p className="text-sm mt-2">Hacé clic en un lote de la lista</p>
              </div>
            ) : (
              <>
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-700">
                      Lote #{loteSeleccionado.id}
                      <span className={`ml-2 px-2 py-0.5 rounded text-sm ${getEstadoBadge(loteSeleccionado.estado)}`}>
                        {loteSeleccionado.estado}
                      </span>
                    </h2>
                    <p className="text-sm text-gray-500">
                      {loteSeleccionado.archivo_txt && `📄 ${loteSeleccionado.archivo_txt}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">
                      Empresa: <span className="font-semibold">{loteSeleccionado.empresa}</span>
                    </p>
                    <p className="text-sm text-gray-500">
                      Creado: {formatDate(loteSeleccionado.fecha)}
                    </p>
                    {loteSeleccionado.fecha_confirmacion && (
                      <p className="text-sm text-green-600">
                        Confirmado: {formatDate(loteSeleccionado.fecha_confirmacion)}
                      </p>
                    )}
                  </div>
                </div>

                {/* Resumen */}
                <div className="bg-gray-50 rounded-lg p-3 mb-4 flex justify-between items-center">
                  <div>
                    <span className="text-gray-600">Total del lote:</span>
                    <span className="ml-2 text-xl font-bold text-gray-800">
                      {formatMoney(loteSeleccionado.total)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-gray-600">{loteSeleccionado.cantidad_pagos} pagos</span>
                  </div>
                </div>

                {/* Tabla de detalles */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="px-3 py-2 text-left">Proveedor</th>
                        <th className="px-3 py-2 text-left">Factura</th>
                        <th className="px-3 py-2 text-left hidden md:table-cell">CBU</th>
                        <th className="px-3 py-2 text-left hidden md:table-cell">Banco</th>
                        <th className="px-3 py-2 text-right">Monto</th>
                        <th className="px-3 py-2 text-center">Tipo</th>
                        {loteSeleccionado?.estado === 'confirmado' && (
                          <th className="px-3 py-2 text-center">Notificar</th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {detalles.map(detalle => (
                        <tr
                          key={detalle.id}
                          className={`border-b ${
                            detalle.confirmado ? 'bg-green-50' : ''
                          }`}
                        >
                          <td className="px-3 py-3 font-medium">{detalle.proveedor_nombre}</td>
                          <td className="px-3 py-3 text-gray-600">{detalle.factura_numero}</td>
                          <td className="px-3 py-3 text-gray-600 font-mono text-xs hidden md:table-cell">
                            {detalle.cbu ? `${detalle.cbu.slice(0, 8)}...${detalle.cbu.slice(-4)}` : '-'}
                          </td>
                          <td className="px-3 py-3 text-gray-600 hidden md:table-cell">{detalle.banco || '-'}</td>
                          <td className="px-3 py-3 text-right font-mono font-semibold">
                            {formatMoney(detalle.monto)}
                          </td>
                          <td className="px-3 py-3 text-center">
                            <span className={`px-2 py-0.5 rounded text-xs ${
                              detalle.tipo === 'cancela'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-yellow-100 text-yellow-700'
                            }`}>
                              {detalle.tipo === 'cancela' ? 'Cancela' : 'A cuenta'}
                            </span>
                          </td>
                          {loteSeleccionado?.estado === 'confirmado' && (
                            <td className="px-3 py-3 text-center">
                              <button
                                onClick={() => enviarWhatsApp(detalle)}
                                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                                  detalle.notificado
                                    ? 'bg-gray-200 text-gray-500'
                                    : detalle.whatsapp
                                      ? 'bg-green-500 hover:bg-green-600 text-white'
                                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                }`}
                                title={detalle.whatsapp ? `Enviar a ${detalle.whatsapp}` : 'Sin WhatsApp configurado'}
                              >
                                {detalle.notificado ? '✓ Enviado' : '📲 WhatsApp'}
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-gray-100 font-semibold">
                        <td colSpan={4} className="px-3 py-2 text-right hidden md:table-cell">Total:</td>
                        <td colSpan={2} className="px-3 py-2 text-right md:hidden">Total:</td>
                        <td className="px-3 py-2 text-right font-mono">
                          {formatMoney(detalles.reduce((sum, d) => sum + d.monto, 0))}
                        </td>
                        <td className="hidden md:table-cell"></td>
                        {loteSeleccionado?.estado === 'confirmado' && <td></td>}
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Info para gerentes */}
                <div className="mt-4 p-3 bg-blue-50 rounded-lg text-sm text-blue-800">
                  <p className="font-semibold">ℹ️ Información para control gerencial</p>
                  <p className="mt-1">
                    Este listado puede usarse para cotejar con el resumen bancario de la cuenta
                    {loteSeleccionado.empresa === 'VH' ? ' de Villalba Hnos' : ' de Villalba Cristino'}.
                  </p>
                  <p className="mt-1">
                    Verificá que cada transferencia figure en el home banking con el monto y destinatario correctos.
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
