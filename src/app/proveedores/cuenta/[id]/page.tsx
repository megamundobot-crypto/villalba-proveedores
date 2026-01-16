'use client'

import { useState, useEffect, use } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import ProtectedRoute from '@/components/ProtectedRoute'
import UserMenu from '@/components/UserMenu'
import NavRapida from '@/components/NavRapida'

interface Proveedor {
  id: number
  nombre: string
  cuit: string | null
}

interface Movimiento {
  fecha: string
  tipo: 'factura' | 'pago'
  concepto: string
  comprobante: string
  debe: number
  haber: number
  empresa: string
  factura_id?: number
  pago_id?: number
}

const redondear = (num: number): number => Math.round(num * 100) / 100

export default function CuentaProveedorPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const proveedorId = parseInt(resolvedParams.id)

  const [proveedor, setProveedor] = useState<Proveedor | null>(null)
  const [movimientos, setMovimientos] = useState<Movimiento[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroEmpresa, setFiltroEmpresa] = useState<string>('todas')
  const [fechaDesde, setFechaDesde] = useState<string>('')
  const [fechaHasta, setFechaHasta] = useState<string>('')

  const formatMoney = (amount: number) => {
    if (amount === 0) return '-'
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
      year: 'numeric'
    })
  }

  useEffect(() => {
    if (proveedorId) {
      cargarDatos()
    }
  }, [proveedorId, filtroEmpresa, fechaDesde, fechaHasta])

  const cargarDatos = async () => {
    setLoading(true)

    // Cargar proveedor
    const { data: prov } = await supabase
      .from('proveedores')
      .select('id, nombre, cuit')
      .eq('id', proveedorId)
      .single()

    if (prov) {
      setProveedor(prov)
    }

    // Cargar facturas
    let queryFacturas = supabase
      .from('facturas')
      .select('id, fecha, numero, monto_total, empresa, estado')
      .eq('proveedor_id', proveedorId)
      .neq('estado', 'anulada')
      .order('fecha', { ascending: true })

    if (filtroEmpresa !== 'todas') {
      queryFacturas = queryFacturas.eq('empresa', filtroEmpresa)
    }
    if (fechaDesde) {
      queryFacturas = queryFacturas.gte('fecha', fechaDesde)
    }
    if (fechaHasta) {
      queryFacturas = queryFacturas.lte('fecha', fechaHasta)
    }

    const { data: facturas } = await queryFacturas

    // Cargar pagos
    let queryPagos = supabase
      .from('pagos')
      .select(`
        id,
        fecha,
        monto,
        medio_pago,
        referencia_banco,
        observaciones,
        factura_id,
        facturas!inner (
          id,
          empresa,
          proveedor_id
        )
      `)
      .eq('facturas.proveedor_id', proveedorId)
      .order('fecha', { ascending: true })

    const { data: pagos } = await queryPagos

    // Combinar movimientos
    const movs: Movimiento[] = []

    // Agregar facturas como DEBE y Notas de Crédito como HABER
    if (facturas) {
      for (const f of facturas) {
        // Si el monto es negativo, es una Nota de Crédito (va al HABER)
        const esNotaCredito = f.monto_total < 0

        if (esNotaCredito) {
          // Nota de Crédito: va al HABER con monto positivo
          movs.push({
            fecha: f.fecha,
            tipo: 'pago', // Lo tratamos como pago para el color verde
            concepto: 'Nota de Crédito',
            comprobante: `NC ${f.numero}`,
            debe: 0,
            haber: Math.abs(f.monto_total),
            empresa: f.empresa,
            factura_id: f.id
          })
        } else {
          // Factura normal: va al DEBE
          movs.push({
            fecha: f.fecha,
            tipo: 'factura',
            concepto: 'Factura',
            comprobante: `FC ${f.numero}`,
            debe: f.monto_total,
            haber: 0,
            empresa: f.empresa,
            factura_id: f.id
          })
        }
      }
    }

    // Agregar pagos como HABER
    if (pagos) {
      for (const p of pagos) {
        const factura = p.facturas as any
        if (filtroEmpresa !== 'todas' && factura.empresa !== filtroEmpresa) continue
        if (fechaDesde && p.fecha < fechaDesde) continue
        if (fechaHasta && p.fecha > fechaHasta) continue

        let concepto = p.medio_pago === 'transferencia' ? 'Transferencia bancaria' :
                       p.medio_pago === 'cheque' ? 'Cheque' :
                       p.medio_pago === 'efectivo' ? 'Pago en efectivo' : 'Pago'

        movs.push({
          fecha: p.fecha,
          tipo: 'pago',
          concepto,
          comprobante: p.referencia_banco || `Pago #${p.id}`,
          debe: 0,
          haber: p.monto,
          empresa: factura.empresa,
          pago_id: p.id
        })
      }
    }

    // Ordenar por fecha
    movs.sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())

    setMovimientos(movs)
    setLoading(false)
  }

  // Calcular saldo acumulado
  let saldoAcumulado = 0
  const movimientosConSaldo = movimientos.map(m => {
    saldoAcumulado = redondear(saldoAcumulado + m.debe - m.haber)
    return { ...m, saldo: saldoAcumulado }
  })

  // Totales
  const totalDebe = redondear(movimientos.reduce((sum, m) => sum + m.debe, 0))
  const totalHaber = redondear(movimientos.reduce((sum, m) => sum + m.haber, 0))
  const saldoFinal = redondear(totalDebe - totalHaber)

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-100">
        {/* Header */}
        <header className="bg-slate-800 text-white p-4">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/proveedores" className="p-2 hover:bg-slate-700 rounded-lg">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </Link>
              <div>
                <h1 className="text-xl font-bold">Cuenta Corriente</h1>
                <p className="text-slate-400 text-sm">Ficha contable del proveedor</p>
              </div>
            </div>
            <UserMenu />
          </div>
        </header>
        <NavRapida />

        <div className="max-w-6xl mx-auto p-4">
          {/* Info Proveedor */}
          {proveedor && (
            <div className="bg-white rounded-lg shadow p-4 mb-4">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">{proveedor.nombre}</h2>
                  {proveedor.cuit && (
                    <p className="text-gray-500">CUIT: {proveedor.cuit}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">Saldo actual</p>
                  <p className={`text-3xl font-bold ${saldoFinal > 0 ? 'text-red-600' : saldoFinal < 0 ? 'text-green-600' : 'text-gray-600'}`}>
                    {formatMoney(Math.abs(saldoFinal))}
                  </p>
                  <p className="text-sm text-gray-500">
                    {saldoFinal > 0 ? 'A favor del proveedor' : saldoFinal < 0 ? 'A favor nuestro' : 'Sin saldo'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Filtros */}
          <div className="bg-white rounded-lg shadow p-4 mb-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

          {/* Tabla de movimientos */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="p-4 border-b bg-gray-50">
              <h3 className="font-semibold text-gray-700">
                Movimientos ({movimientos.length})
              </h3>
            </div>

            {loading ? (
              <div className="p-8 text-center text-gray-500">Cargando...</div>
            ) : movimientos.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                No hay movimientos para este proveedor
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-700 text-white">
                      <th className="px-4 py-3 text-left">Fecha</th>
                      <th className="px-4 py-3 text-left">Concepto</th>
                      <th className="px-4 py-3 text-left">Nº Comprobante</th>
                      <th className="px-4 py-3 text-center">Emp</th>
                      <th className="px-4 py-3 text-right">DEBE</th>
                      <th className="px-4 py-3 text-right">HABER</th>
                      <th className="px-4 py-3 text-right">SALDO</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movimientosConSaldo.map((mov, idx) => (
                      <tr
                        key={`${mov.tipo}-${mov.factura_id || mov.pago_id}-${idx}`}
                        className={`border-b hover:bg-gray-50 ${
                          mov.tipo === 'factura' ? 'bg-red-50' : 'bg-green-50'
                        }`}
                      >
                        <td className="px-4 py-3 font-mono">{formatDate(mov.fecha)}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 ${
                            mov.tipo === 'factura' ? 'text-red-700' : 'text-green-700'
                          }`}>
                            {mov.tipo === 'factura' ? '📄' : mov.concepto === 'Nota de Crédito' ? '📋' : '💰'} {mov.concepto}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-medium">{mov.comprobante}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            mov.empresa === 'VH' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                          }`}>
                            {mov.empresa}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-red-700 font-semibold">
                          {formatMoney(mov.debe)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-green-700 font-semibold">
                          {formatMoney(mov.haber)}
                        </td>
                        <td className={`px-4 py-3 text-right font-mono font-bold ${
                          mov.saldo > 0 ? 'text-red-600' : mov.saldo < 0 ? 'text-green-600' : 'text-gray-600'
                        }`}>
                          {formatMoney(Math.abs(mov.saldo))}
                          {mov.saldo !== 0 && (
                            <span className="text-xs ml-1">
                              {mov.saldo > 0 ? 'D' : 'H'}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-800 text-white font-bold">
                      <td colSpan={4} className="px-4 py-3 text-right">TOTALES:</td>
                      <td className="px-4 py-3 text-right font-mono">{formatMoney(totalDebe)}</td>
                      <td className="px-4 py-3 text-right font-mono">{formatMoney(totalHaber)}</td>
                      <td className={`px-4 py-3 text-right font-mono ${
                        saldoFinal > 0 ? 'text-red-300' : 'text-green-300'
                      }`}>
                        {formatMoney(Math.abs(saldoFinal))}
                        {saldoFinal !== 0 && (
                          <span className="text-xs ml-1">
                            {saldoFinal > 0 ? 'D' : 'H'}
                          </span>
                        )}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>

          {/* Leyenda */}
          <div className="mt-4 p-3 bg-gray-50 rounded-lg text-sm text-gray-600">
            <p><strong>D</strong> = Deudor (le debemos al proveedor) | <strong>H</strong> = Acreedor (el proveedor nos debe)</p>
            <p className="mt-1">
              <span className="inline-block w-3 h-3 bg-red-50 border border-red-200 mr-1"></span> 📄 Facturas (aumentan deuda - DEBE)
              <span className="inline-block w-3 h-3 bg-green-50 border border-green-200 ml-4 mr-1"></span> 📋 Notas de Crédito / 💰 Pagos (disminuyen deuda - HABER)
            </p>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}
