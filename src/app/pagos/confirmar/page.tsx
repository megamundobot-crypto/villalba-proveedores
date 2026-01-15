'use client'

import { useState, useEffect } from 'react'
import { supabase, registrarAuditoria } from '@/lib/supabase'
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
}

export default function ConfirmarPagosPage() {
  const [lotes, setLotes] = useState<LotePago[]>([])
  const [loteSeleccionado, setLoteSeleccionado] = useState<LotePago | null>(null)
  const [detalles, setDetalles] = useState<DetallePago[]>([])
  const [loading, setLoading] = useState(true)
  const [confirmando, setConfirmando] = useState(false)
  const [mensaje, setMensaje] = useState<{ tipo: 'success' | 'error', texto: string } | null>(null)

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

  useEffect(() => {
    cargarLotesPendientes()
  }, [])

  const cargarLotesPendientes = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('lotes_pago')
      .select('*')
      .eq('estado', 'pendiente')
      .order('fecha', { ascending: false })

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
      setDetalles(data)
    }
  }

  const toggleConfirmacion = async (detalle: DetallePago) => {
    const nuevoEstado = !detalle.confirmado

    const { error } = await supabase
      .from('lotes_pago_detalle')
      .update({
        confirmado: nuevoEstado,
        fecha_confirmacion: nuevoEstado ? new Date().toISOString() : null
      })
      .eq('id', detalle.id)

    if (!error) {
      setDetalles(prev => prev.map(d =>
        d.id === detalle.id
          ? { ...d, confirmado: nuevoEstado, fecha_confirmacion: nuevoEstado ? new Date().toISOString() : null }
          : d
      ))
    }
  }

  const marcarTodos = async (confirmado: boolean) => {
    if (!loteSeleccionado) return

    const { error } = await supabase
      .from('lotes_pago_detalle')
      .update({
        confirmado,
        fecha_confirmacion: confirmado ? new Date().toISOString() : null
      })
      .eq('lote_id', loteSeleccionado.id)

    if (!error) {
      setDetalles(prev => prev.map(d => ({
        ...d,
        confirmado,
        fecha_confirmacion: confirmado ? new Date().toISOString() : null
      })))
    }
  }

  const confirmarLote = async () => {
    if (!loteSeleccionado) return

    const pendientes = detalles.filter(d => !d.confirmado)
    if (pendientes.length > 0) {
      setMensaje({
        tipo: 'error',
        texto: `Hay ${pendientes.length} pago(s) sin confirmar. Marcá todos los pagos antes de confirmar el lote.`
      })
      return
    }

    setConfirmando(true)
    setMensaje(null)

    try {
      // 1. Registrar cada pago en la tabla de pagos
      for (const detalle of detalles) {
        // Insertar pago
        const { error: pagoError } = await supabase
          .from('pagos')
          .insert({
            factura_id: detalle.factura_id,
            fecha: new Date().toISOString(),
            monto: redondear(detalle.monto),
            medio_pago: 'transferencia',
            referencia_banco: `Lote #${loteSeleccionado.id} - ${loteSeleccionado.archivo_txt}`,
            observaciones: detalle.tipo === 'cancela' ? 'Cancela factura' : 'Pago a cuenta'
          })

        if (pagoError) {
          throw new Error(`Error al registrar pago para ${detalle.proveedor_nombre}: ${pagoError.message}`)
        }

        // Actualizar estado de factura si corresponde
        if (detalle.tipo === 'cancela') {
          await supabase
            .from('facturas')
            .update({ estado: 'pagada' })
            .eq('id', detalle.factura_id)
        } else {
          // Para pagos a cuenta, actualizar el saldo
          const { data: factura } = await supabase
            .from('facturas')
            .select('total, saldo')
            .eq('id', detalle.factura_id)
            .single()

          if (factura) {
            const nuevoSaldo = redondear((factura.saldo || factura.total) - detalle.monto)
            await supabase
              .from('facturas')
              .update({
                saldo: nuevoSaldo,
                estado: nuevoSaldo <= 0 ? 'pagada' : 'pendiente'
              })
              .eq('id', detalle.factura_id)
          }
        }
      }

      // 2. Actualizar estado del lote
      await supabase
        .from('lotes_pago')
        .update({
          estado: 'confirmado',
          fecha_confirmacion: new Date().toISOString()
        })
        .eq('id', loteSeleccionado.id)

      // 3. Registrar auditoría
      await registrarAuditoria(
        'CONFIRMAR_LOTE_PAGO',
        `Lote #${loteSeleccionado.id} confirmado - ${detalles.length} pagos por ${formatMoney(loteSeleccionado.total)}`,
        {
          lote_id: loteSeleccionado.id,
          empresa: loteSeleccionado.empresa,
          total: loteSeleccionado.total,
          cantidad_pagos: detalles.length,
          proveedores: detalles.map(d => d.proveedor_nombre),
          archivo_txt: loteSeleccionado.archivo_txt
        }
      )

      setMensaje({
        tipo: 'success',
        texto: `✅ Lote confirmado exitosamente. Se registraron ${detalles.length} pagos.`
      })

      // Recargar lotes pendientes
      setTimeout(() => {
        setLoteSeleccionado(null)
        setDetalles([])
        cargarLotesPendientes()
      }, 2000)

    } catch (error: any) {
      setMensaje({ tipo: 'error', texto: error.message })
    } finally {
      setConfirmando(false)
    }
  }

  const anularLote = async () => {
    if (!loteSeleccionado) return

    if (!confirm('¿Estás seguro de anular este lote? Esta acción no se puede deshacer.')) {
      return
    }

    await supabase
      .from('lotes_pago')
      .update({ estado: 'anulado' })
      .eq('id', loteSeleccionado.id)

    // Registrar auditoría
    await registrarAuditoria(
      'ANULAR_LOTE_PAGO',
      `Lote #${loteSeleccionado.id} anulado - ${loteSeleccionado.cantidad_pagos} pagos por ${formatMoney(loteSeleccionado.total)}`,
      {
        lote_id: loteSeleccionado.id,
        empresa: loteSeleccionado.empresa,
        total: loteSeleccionado.total,
        archivo_txt: loteSeleccionado.archivo_txt
      }
    )

    setMensaje({ tipo: 'success', texto: 'Lote anulado correctamente.' })

    setTimeout(() => {
      setLoteSeleccionado(null)
      setDetalles([])
      cargarLotesPendientes()
    }, 1500)
  }

  const confirmados = detalles.filter(d => d.confirmado).length
  const totalConfirmado = detalles.filter(d => d.confirmado).reduce((sum, d) => sum + d.monto, 0)

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-slate-800 text-white p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Confirmar Pagos</h1>
            <p className="text-slate-400 text-sm">Verificá las transferencias realizadas y confirmalas en el sistema</p>
          </div>
          <Link
            href="/pagos"
            className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg"
          >
            ← Volver a Pagos
          </Link>
        </div>
      </header>
      <NavRapida />

      <div className="max-w-7xl mx-auto p-4">

        {mensaje && (
          <div className={`mb-4 p-4 rounded-lg ${
            mensaje.tipo === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {mensaje.texto}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Lista de lotes pendientes */}
          <div className="bg-white rounded-lg shadow p-4">
            <h2 className="text-lg font-semibold mb-4 text-gray-700">
              Lotes Pendientes ({lotes.length})
            </h2>

            {loading ? (
              <div className="text-center py-8 text-gray-500">Cargando...</div>
            ) : lotes.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No hay lotes pendientes</p>
                <p className="text-sm mt-2">Los pagos ya fueron confirmados o no se generaron lotes aún.</p>
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
                      <div>
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                          lote.empresa === 'VH' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                        }`}>
                          {lote.empresa}
                        </span>
                        <span className="ml-2 text-sm text-gray-500">
                          Lote #{lote.id}
                        </span>
                      </div>
                      <span className="text-xs text-gray-400">
                        {formatDate(lote.fecha)}
                      </span>
                    </div>
                    <div className="mt-2">
                      <p className="font-semibold text-gray-800">{formatMoney(lote.total)}</p>
                      <p className="text-sm text-gray-500">{lote.cantidad_pagos} pago(s)</p>
                    </div>
                    {lote.archivo_txt && (
                      <p className="text-xs text-gray-400 mt-1 truncate">
                        📄 {lote.archivo_txt}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Detalle del lote seleccionado */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow p-4">
            {!loteSeleccionado ? (
              <div className="text-center py-16 text-gray-500">
                <p className="text-xl">👈 Seleccioná un lote para ver los detalles</p>
                <p className="text-sm mt-2">Hacé clic en un lote de la lista de la izquierda</p>
              </div>
            ) : (
              <>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-semibold text-gray-700">
                    Detalle del Lote #{loteSeleccionado.id}
                  </h2>
                  <div className="flex gap-2">
                    <button
                      onClick={() => marcarTodos(true)}
                      className="text-sm bg-green-100 hover:bg-green-200 text-green-700 px-3 py-1 rounded"
                    >
                      ✅ Marcar todos
                    </button>
                    <button
                      onClick={() => marcarTodos(false)}
                      className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1 rounded"
                    >
                      Desmarcar todos
                    </button>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mb-4">
                  <div className="flex justify-between text-sm text-gray-600 mb-1">
                    <span>Progreso: {confirmados}/{detalles.length} confirmados</span>
                    <span>{formatMoney(totalConfirmado)} de {formatMoney(loteSeleccionado.total)}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full transition-all ${
                        confirmados === detalles.length ? 'bg-green-500' : 'bg-blue-500'
                      }`}
                      style={{ width: `${(confirmados / detalles.length) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Tabla de detalles */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="px-3 py-2 text-left">Estado</th>
                        <th className="px-3 py-2 text-left">Proveedor</th>
                        <th className="px-3 py-2 text-left">Factura</th>
                        <th className="px-3 py-2 text-left">Banco</th>
                        <th className="px-3 py-2 text-right">Monto</th>
                        <th className="px-3 py-2 text-center">Tipo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detalles.map(detalle => (
                        <tr
                          key={detalle.id}
                          onClick={() => toggleConfirmacion(detalle)}
                          className={`border-b cursor-pointer transition-colors ${
                            detalle.confirmado
                              ? 'bg-green-50 hover:bg-green-100'
                              : 'hover:bg-gray-50'
                          }`}
                        >
                          <td className="px-3 py-3">
                            <span className={`text-2xl ${detalle.confirmado ? '' : 'opacity-30'}`}>
                              {detalle.confirmado ? '✅' : '⬜'}
                            </span>
                          </td>
                          <td className="px-3 py-3 font-medium">{detalle.proveedor_nombre}</td>
                          <td className="px-3 py-3 text-gray-600">{detalle.factura_numero}</td>
                          <td className="px-3 py-3 text-gray-600">{detalle.banco || '-'}</td>
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
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Acciones */}
                <div className="mt-6 flex justify-between items-center border-t pt-4">
                  <button
                    onClick={anularLote}
                    className="text-red-600 hover:text-red-800 hover:underline"
                  >
                    Anular lote
                  </button>

                  <button
                    onClick={confirmarLote}
                    disabled={confirmando || confirmados !== detalles.length}
                    className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
                      confirmados === detalles.length
                        ? 'bg-green-600 hover:bg-green-700 text-white'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    {confirmando ? 'Confirmando...' : `Confirmar Lote (${detalles.length} pagos)`}
                  </button>
                </div>

                {confirmados !== detalles.length && (
                  <p className="text-center text-sm text-gray-500 mt-2">
                    Marcá todos los pagos como confirmados para habilitar el botón
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
