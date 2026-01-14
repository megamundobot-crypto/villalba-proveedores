'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, ArrowRightLeft, Building2, FileText, Download, Check, Calendar, DollarSign, Receipt, History, ChevronDown, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import Link from 'next/link'

// Interfaces para datos de cuenta_interna
interface CuentaInternaRow {
  id: number
  tipo: string
  factura_id?: number
  proveedor_id?: number
  pagador?: 'VH' | 'VC'
  receptor?: 'VH' | 'VC'
  debe_vh: number
  debe_vc: number
  monto?: number
  fecha?: string
  pagado: boolean
  observaciones?: string
  facturas_imputadas?: number[]
  created_at: string
}

interface ProveedorResumen {
  id: number
  nombre: string
  vh_debe: number      // Facturas recibidas por VH (lo que debe VH al proveedor)
  vc_debe: number      // Facturas recibidas por VC (lo que debe VC al proveedor)
  total_general: number
  deuda_real_vh: number  // 65% del total
  deuda_real_vc: number  // 35% del total
}

interface PagoInterno {
  id: number
  fecha: string
  pagador: 'VH' | 'VC'
  receptor: 'VH' | 'VC'
  monto: number
  observaciones?: string
  facturas_imputadas?: number[]
}

type SortField = 'nombre' | 'vh_debe' | 'vc_debe' | 'total_general' | 'deuda_real_vh' | 'deuda_real_vc'
type SortDirection = 'asc' | 'desc'

export default function CuentaInternaPage() {
  const [proveedoresResumen, setProveedoresResumen] = useState<ProveedorResumen[]>([])
  const [proveedoresMap, setProveedoresMap] = useState<Record<number, string>>({})
  const [pagosInternos, setPagosInternos] = useState<PagoInterno[]>([])
  const [resumen, setResumen] = useState({ vh_debe_vc: 0, vc_debe_vh: 0, balance_neto: 0 })
  const [loading, setLoading] = useState(true)

  // Ordenamiento
  const [sortField, setSortField] = useState<SortField>('total_general')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  // Tabs
  const [activeTab, setActiveTab] = useState<'resumen' | 'nuevo_pago' | 'historial'>('resumen')

  // Nuevo pago
  const [nuevoPago, setNuevoPago] = useState({
    pagador: 'VH' as 'VH' | 'VC',
    monto: 0,
    fecha: new Date().toISOString().split('T')[0],
    observaciones: ''
  })
  const [guardandoPago, setGuardandoPago] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)

    // Cargar proveedores para nombres
    const { data: proveedoresData } = await supabase
      .from('proveedores')
      .select('id, nombre')

    const provMap: Record<number, string> = {}
    if (proveedoresData) {
      proveedoresData.forEach((p: any) => {
        provMap[p.id] = p.nombre
      })
    }
    setProveedoresMap(provMap)

    // Cargar FACTURAS con saldo pendiente (la fuente real de deudas actuales)
    const { data: facturasData } = await supabase
      .from('facturas')
      .select('id, proveedor_id, empresa, monto_total, numero')

    // Cargar PAGOS para calcular saldos
    const { data: pagosData } = await supabase
      .from('pagos')
      .select('factura_id, monto')

    // Calcular pagos por factura
    const pagosPorFactura: Record<number, number> = {}
    if (pagosData) {
      pagosData.forEach((p: any) => {
        pagosPorFactura[p.factura_id] = (pagosPorFactura[p.factura_id] || 0) + Number(p.monto)
      })
    }

    // Cargar pagos internos desde cuenta_interna
    const { data: cuentaData } = await supabase
      .from('cuenta_interna')
      .select('*')
      .eq('tipo', 'pago_interno')
      .order('created_at', { ascending: true })

    const pagosInternosArr: PagoInterno[] = []
    if (cuentaData) {
      cuentaData.forEach((row: CuentaInternaRow) => {
        pagosInternosArr.push({
          id: row.id,
          fecha: row.fecha || '',
          pagador: row.pagador || 'VH',
          receptor: row.receptor || 'VC',
          monto: Number(row.monto) || 0,
          observaciones: row.observaciones,
          facturas_imputadas: row.facturas_imputadas
        })
      })
    }

    // Procesar facturas - agrupar por proveedor con saldos actuales
    const proveedores: Record<number, ProveedorResumen> = {}

    if (facturasData) {
      facturasData.forEach((f: any) => {
        const provId = f.proveedor_id
        if (!provId) return

        // Calcular saldo pendiente
        const pagado = pagosPorFactura[f.id] || 0
        const saldo = Number(f.monto_total) - pagado
        if (saldo <= 0) return // Factura pagada, no mostrar

        // Calcular neto e IVA del SALDO pendiente
        const saldoNeto = saldo / 1.21
        const saldoIva = saldo - saldoNeto

        if (!proveedores[provId]) {
          proveedores[provId] = {
            id: provId,
            nombre: provMap[provId] || `Proveedor ${provId}`,
            vh_debe: 0,
            vc_debe: 0,
            total_general: 0,
            deuda_real_vh: 0,
            deuda_real_vc: 0
          }
        }

        // Sumar al saldo de VH o VC según empresa
        if (f.empresa === 'VH') {
          proveedores[provId].vh_debe += saldo
          // FC de VH: VH paga 65% neto + IVA, VC paga 35% neto
          proveedores[provId].deuda_real_vh += (saldoNeto * 0.65) + saldoIva
          proveedores[provId].deuda_real_vc += saldoNeto * 0.35
        } else {
          proveedores[provId].vc_debe += saldo
          // FC de VC: VH paga 65% neto, VC paga 35% neto + IVA
          proveedores[provId].deuda_real_vh += saldoNeto * 0.65
          proveedores[provId].deuda_real_vc += (saldoNeto * 0.35) + saldoIva
        }
        proveedores[provId].total_general += saldo
      })
    }

    setProveedoresResumen(Object.values(proveedores))
    setPagosInternos(pagosInternosArr)

    // Calcular totales reales sumando deuda real de todos los proveedores
    const totalesReales = Object.values(proveedores).reduce((acc, p) => ({
      vh: acc.vh + p.deuda_real_vh,
      vc: acc.vc + p.deuda_real_vc
    }), { vh: 0, vc: 0 })

    setResumen({
      vh_debe_vc: totalesReales.vh,
      vc_debe_vh: totalesReales.vc,
      balance_neto: totalesReales.vh - totalesReales.vc
    })

    setLoading(false)
  }

  // Función de ordenamiento
  function handleSort(field: SortField) {
    if (sortField === field) {
      // Si ya está ordenado por este campo, invertir dirección
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      // Nuevo campo, ordenar desc por defecto (excepto nombre que es asc)
      setSortField(field)
      setSortDirection(field === 'nombre' ? 'asc' : 'desc')
    }
  }

  // Ordenar proveedores
  const proveedoresOrdenados = [...proveedoresResumen].sort((a, b) => {
    let comparison = 0
    if (sortField === 'nombre') {
      comparison = a.nombre.localeCompare(b.nombre)
    } else {
      comparison = a[sortField] - b[sortField]
    }
    return sortDirection === 'asc' ? comparison : -comparison
  })

  // Totales
  const totales = proveedoresResumen.reduce((acc, p) => ({
    vh_debe: acc.vh_debe + p.vh_debe,
    vc_debe: acc.vc_debe + p.vc_debe,
    total_general: acc.total_general + p.total_general,
    deuda_real_vh: acc.deuda_real_vh + p.deuda_real_vh,
    deuda_real_vc: acc.deuda_real_vc + p.deuda_real_vc
  }), { vh_debe: 0, vc_debe: 0, total_general: 0, deuda_real_vh: 0, deuda_real_vc: 0 })

  async function confirmarPagoInterno() {
    if (nuevoPago.monto <= 0) return

    setGuardandoPago(true)

    const receptor: 'VH' | 'VC' = nuevoPago.pagador === 'VH' ? 'VC' : 'VH'

    // Guardar en cuenta_interna
    const { error } = await supabase
      .from('cuenta_interna')
      .insert([{
        tipo: 'pago_interno',
        fecha: nuevoPago.fecha,
        pagador: nuevoPago.pagador,
        receptor: receptor,
        monto: nuevoPago.monto,
        observaciones: nuevoPago.observaciones || `Pago interno ${nuevoPago.pagador} a ${receptor}`
      }])

    if (!error) {
      // Resetear formulario
      setNuevoPago({
        pagador: 'VH',
        monto: 0,
        fecha: new Date().toISOString().split('T')[0],
        observaciones: ''
      })
      setShowConfirmModal(false)
      setActiveTab('historial')
      loadData()
    }

    setGuardandoPago(false)
  }

  function generarReciboPDF() {
    const receptor = nuevoPago.pagador === 'VH' ? 'Villalba Cristino' : 'Villalba Hermanos SRL'
    const pagador = nuevoPago.pagador === 'VH' ? 'Villalba Hermanos SRL' : 'Villalba Cristino'

    let contenido = `
═══════════════════════════════════════════════════════════
                    RECIBO DE PAGO INTERNO
═══════════════════════════════════════════════════════════

Fecha: ${formatDate(nuevoPago.fecha)}

De: ${pagador}
A: ${receptor}

Monto: ${formatMoney(nuevoPago.monto)}

───────────────────────────────────────────────────────────
${nuevoPago.observaciones ? `Observaciones: ${nuevoPago.observaciones}` : ''}
═══════════════════════════════════════════════════════════
`

    const blob = new Blob([contenido], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `recibo_${nuevoPago.pagador}_${nuevoPago.fecha}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-'
    const date = new Date(dateStr)
    return date.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' })
  }

  // Componente para el ícono de ordenamiento
  function SortIcon({ field }: { field: SortField }) {
    if (sortField !== field) {
      return <ArrowUpDown className="h-4 w-4 text-slate-400" />
    }
    return sortDirection === 'asc'
      ? <ArrowUp className="h-4 w-4 text-purple-600" />
      : <ArrowDown className="h-4 w-4 text-purple-600" />
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-600 font-medium">Cargando datos...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-purple-800 via-purple-700 to-purple-800 text-white shadow-xl">
        <div className="container mx-auto px-6 py-5">
          <div className="flex items-center gap-4">
            <Link href="/" className="p-2 hover:bg-white/10 rounded-lg transition-colors">
              <ArrowLeft className="h-6 w-6" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Cuenta Interna</h1>
              <p className="text-purple-200 text-sm mt-0.5">Deudas entre VH y VC (65% / 35%)</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-6">
        {/* Cards de resumen - Totales reales */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl p-5 text-white shadow-lg">
            <div className="flex items-center gap-2 mb-2">
              <Building2 className="h-5 w-5 text-blue-200" />
              <p className="text-blue-200 text-sm font-medium">Deuda Real VH (65%)</p>
            </div>
            <p className="text-3xl font-bold">{formatMoney(totales.deuda_real_vh)}</p>
            <p className="text-blue-200 text-xs mt-1">Villalba Hermanos debe pagar</p>
          </div>

          <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-xl p-5 text-white shadow-lg">
            <div className="flex items-center gap-2 mb-2">
              <Building2 className="h-5 w-5 text-emerald-200" />
              <p className="text-emerald-200 text-sm font-medium">Deuda Real VC (35%)</p>
            </div>
            <p className="text-3xl font-bold">{formatMoney(totales.deuda_real_vc)}</p>
            <p className="text-emerald-200 text-xs mt-1">Villalba Cristino debe pagar</p>
          </div>

          <div className={`rounded-xl p-5 text-white shadow-lg ${
            resumen.balance_neto > 0
              ? 'bg-gradient-to-br from-blue-700 to-blue-800'
              : resumen.balance_neto < 0
                ? 'bg-gradient-to-br from-emerald-700 to-emerald-800'
                : 'bg-gradient-to-br from-slate-600 to-slate-700'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              <ArrowRightLeft className="h-5 w-5" />
              <p className="text-sm font-medium opacity-80">Total General</p>
            </div>
            <p className="text-3xl font-bold">{formatMoney(totales.total_general)}</p>
            <p className="text-xs mt-1 opacity-80">
              Suma de todas las deudas a proveedores
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
          <div className="flex border-b border-slate-200 overflow-x-auto">
            <button
              onClick={() => setActiveTab('resumen')}
              className={`px-6 py-4 font-medium text-sm whitespace-nowrap transition-colors ${
                activeTab === 'resumen'
                  ? 'text-purple-700 border-b-2 border-purple-600 bg-purple-50'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              Resumen por Proveedor
            </button>
            <button
              onClick={() => setActiveTab('nuevo_pago')}
              className={`px-6 py-4 font-medium text-sm whitespace-nowrap transition-colors ${
                activeTab === 'nuevo_pago'
                  ? 'text-purple-700 border-b-2 border-purple-600 bg-purple-50'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <span className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Nuevo Pago
              </span>
            </button>
            <button
              onClick={() => setActiveTab('historial')}
              className={`px-6 py-4 font-medium text-sm whitespace-nowrap transition-colors ${
                activeTab === 'historial'
                  ? 'text-slate-700 border-b-2 border-slate-600 bg-slate-50'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <span className="flex items-center gap-2">
                <History className="h-4 w-4" />
                Historial ({pagosInternos.length})
              </span>
            </button>
          </div>

          {/* Contenido de tabs */}
          <div className="p-6">
            {activeTab === 'resumen' && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-800">Resumen por Proveedor</h3>
                    <p className="text-sm text-slate-500">
                      Haz clic en las columnas para ordenar • {proveedoresResumen.length} proveedores
                    </p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-100">
                        <th
                          className="px-4 py-3 text-left font-semibold text-slate-600 cursor-pointer hover:bg-slate-200 transition-colors"
                          onClick={() => handleSort('nombre')}
                        >
                          <div className="flex items-center gap-2">
                            Proveedor
                            <SortIcon field="nombre" />
                          </div>
                        </th>
                        <th
                          className="px-4 py-3 text-right font-semibold text-blue-600 cursor-pointer hover:bg-slate-200 transition-colors"
                          onClick={() => handleSort('vh_debe')}
                        >
                          <div className="flex items-center justify-end gap-2">
                            VH debe
                            <SortIcon field="vh_debe" />
                          </div>
                        </th>
                        <th
                          className="px-4 py-3 text-right font-semibold text-emerald-600 cursor-pointer hover:bg-slate-200 transition-colors"
                          onClick={() => handleSort('vc_debe')}
                        >
                          <div className="flex items-center justify-end gap-2">
                            VC debe
                            <SortIcon field="vc_debe" />
                          </div>
                        </th>
                        <th
                          className="px-4 py-3 text-right font-semibold text-slate-700 cursor-pointer hover:bg-slate-200 transition-colors"
                          onClick={() => handleSort('total_general')}
                        >
                          <div className="flex items-center justify-end gap-2">
                            Total General
                            <SortIcon field="total_general" />
                          </div>
                        </th>
                        <th
                          className="px-4 py-3 text-right font-semibold text-blue-700 bg-blue-50 cursor-pointer hover:bg-blue-100 transition-colors"
                          onClick={() => handleSort('deuda_real_vh')}
                        >
                          <div className="flex items-center justify-end gap-2">
                            Deuda Real VH (65%)
                            <SortIcon field="deuda_real_vh" />
                          </div>
                        </th>
                        <th
                          className="px-4 py-3 text-right font-semibold text-emerald-700 bg-emerald-50 cursor-pointer hover:bg-emerald-100 transition-colors"
                          onClick={() => handleSort('deuda_real_vc')}
                        >
                          <div className="flex items-center justify-end gap-2">
                            Deuda Real VC (35%)
                            <SortIcon field="deuda_real_vc" />
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {proveedoresOrdenados.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 font-medium text-slate-800">{p.nombre}</td>
                          <td className="px-4 py-3 text-right text-blue-600">{formatMoney(p.vh_debe)}</td>
                          <td className="px-4 py-3 text-right text-emerald-600">{formatMoney(p.vc_debe)}</td>
                          <td className="px-4 py-3 text-right font-semibold text-slate-800">{formatMoney(p.total_general)}</td>
                          <td className="px-4 py-3 text-right font-semibold text-blue-700 bg-blue-50">{formatMoney(p.deuda_real_vh)}</td>
                          <td className="px-4 py-3 text-right font-semibold text-emerald-700 bg-emerald-50">{formatMoney(p.deuda_real_vc)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-200 font-bold">
                        <td className="px-4 py-3 text-slate-800">TOTALES</td>
                        <td className="px-4 py-3 text-right text-blue-700">{formatMoney(totales.vh_debe)}</td>
                        <td className="px-4 py-3 text-right text-emerald-700">{formatMoney(totales.vc_debe)}</td>
                        <td className="px-4 py-3 text-right text-slate-900">{formatMoney(totales.total_general)}</td>
                        <td className="px-4 py-3 text-right text-blue-800 bg-blue-100">{formatMoney(totales.deuda_real_vh)}</td>
                        <td className="px-4 py-3 text-right text-emerald-800 bg-emerald-100">{formatMoney(totales.deuda_real_vc)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Leyenda */}
                <div className="mt-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <p className="text-sm text-slate-600 mb-2">
                    <strong>¿Cómo funciona la regla 65/35?</strong>
                  </p>
                  <ul className="text-sm text-slate-500 space-y-1">
                    <li>• <strong>VH debe:</strong> Facturas que recibió Villalba Hermanos SRL</li>
                    <li>• <strong>VC debe:</strong> Facturas que recibió Villalba Cristino</li>
                    <li>• <strong>Deuda Real VH (65%):</strong> Lo que VH debe pagar del total de cada proveedor</li>
                    <li>• <strong>Deuda Real VC (35%):</strong> Lo que VC debe pagar del total de cada proveedor</li>
                  </ul>
                </div>
              </div>
            )}

            {activeTab === 'nuevo_pago' && (
              <div className="max-w-2xl mx-auto">
                <h3 className="text-lg font-semibold text-slate-800 mb-6">Registrar Pago Interno</h3>

                <div className="space-y-6">
                  {/* Quien paga */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">¿Quién paga?</label>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setNuevoPago(prev => ({ ...prev, pagador: 'VH' }))}
                        className={`flex-1 p-4 rounded-xl border-2 transition-all ${
                          nuevoPago.pagador === 'VH'
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <Building2 className={`h-6 w-6 mx-auto mb-2 ${nuevoPago.pagador === 'VH' ? 'text-blue-600' : 'text-slate-400'}`} />
                        <p className={`font-semibold ${nuevoPago.pagador === 'VH' ? 'text-blue-700' : 'text-slate-600'}`}>VH paga a VC</p>
                        <p className="text-sm text-slate-500 mt-1">Deuda VH: {formatMoney(totales.deuda_real_vh)}</p>
                      </button>
                      <button
                        onClick={() => setNuevoPago(prev => ({ ...prev, pagador: 'VC' }))}
                        className={`flex-1 p-4 rounded-xl border-2 transition-all ${
                          nuevoPago.pagador === 'VC'
                            ? 'border-emerald-500 bg-emerald-50'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <Building2 className={`h-6 w-6 mx-auto mb-2 ${nuevoPago.pagador === 'VC' ? 'text-emerald-600' : 'text-slate-400'}`} />
                        <p className={`font-semibold ${nuevoPago.pagador === 'VC' ? 'text-emerald-700' : 'text-slate-600'}`}>VC paga a VH</p>
                        <p className="text-sm text-slate-500 mt-1">Deuda VC: {formatMoney(totales.deuda_real_vc)}</p>
                      </button>
                    </div>
                  </div>

                  {/* Fecha y monto */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Fecha</label>
                      <input
                        type="date"
                        value={nuevoPago.fecha}
                        onChange={(e) => setNuevoPago(prev => ({ ...prev, fecha: e.target.value }))}
                        className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Monto</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                        <input
                          type="number"
                          value={nuevoPago.monto || ''}
                          onChange={(e) => setNuevoPago(prev => ({ ...prev, monto: parseFloat(e.target.value) || 0 }))}
                          placeholder="0"
                          className="w-full pl-8 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-right text-lg font-semibold"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Observaciones */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Observaciones (opcional)</label>
                    <textarea
                      value={nuevoPago.observaciones}
                      onChange={(e) => setNuevoPago(prev => ({ ...prev, observaciones: e.target.value }))}
                      placeholder="Ej: Pago en efectivo, Cheque nº..."
                      rows={2}
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    />
                  </div>

                  {/* Botones */}
                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={() => setShowConfirmModal(true)}
                      disabled={nuevoPago.monto <= 0}
                      className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-purple-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      <Check className="h-5 w-5" />
                      Confirmar Pago
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'historial' && (
              <div>
                <h3 className="text-lg font-semibold text-slate-800 mb-4">Historial de Pagos Internos</h3>
                {pagosInternos.length === 0 ? (
                  <div className="text-center py-12">
                    <History className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500">No hay pagos internos registrados</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {pagosInternos.slice().reverse().map((pago) => (
                      <div key={pago.id} className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${
                              pago.pagador === 'VH' ? 'bg-blue-100' : 'bg-emerald-100'
                            }`}>
                              <ArrowRightLeft className={`h-4 w-4 ${
                                pago.pagador === 'VH' ? 'text-blue-600' : 'text-emerald-600'
                              }`} />
                            </div>
                            <div>
                              <p className="font-semibold text-slate-800">
                                {pago.pagador === 'VH' ? 'VH pagó a VC' : 'VC pagó a VH'}
                              </p>
                              <p className="text-sm text-slate-500">{formatDate(pago.fecha)}</p>
                            </div>
                          </div>
                          <p className={`text-xl font-bold ${
                            pago.pagador === 'VH' ? 'text-blue-700' : 'text-emerald-700'
                          }`}>
                            {formatMoney(pago.monto)}
                          </p>
                        </div>
                        {pago.observaciones && (
                          <p className="text-sm text-slate-600 mt-2 pl-11">{pago.observaciones}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Modal de confirmación */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-800">Confirmar Pago Interno</h2>
            </div>

            <div className="p-6 space-y-4">
              <div className={`p-4 rounded-xl ${
                nuevoPago.pagador === 'VH' ? 'bg-blue-50' : 'bg-emerald-50'
              }`}>
                <p className="text-sm text-slate-600 mb-1">
                  {nuevoPago.pagador === 'VH' ? 'Villalba Hermanos SRL' : 'Villalba Cristino'} paga a {nuevoPago.pagador === 'VH' ? 'Villalba Cristino' : 'Villalba Hermanos SRL'}
                </p>
                <p className={`text-2xl font-bold ${
                  nuevoPago.pagador === 'VH' ? 'text-blue-700' : 'text-emerald-700'
                }`}>
                  {formatMoney(nuevoPago.monto)}
                </p>
              </div>

              <p className="text-sm text-slate-600">
                Fecha: <strong>{formatDate(nuevoPago.fecha)}</strong>
              </p>
            </div>

            <div className="p-6 border-t border-slate-200 flex gap-3">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 py-3 border border-slate-300 text-slate-600 font-medium rounded-lg hover:bg-slate-50 transition-colors"
                disabled={guardandoPago}
              >
                Cancelar
              </button>
              <button
                onClick={() => { generarReciboPDF(); confirmarPagoInterno(); }}
                disabled={guardandoPago}
                className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-purple-800 transition-all flex items-center justify-center gap-2"
              >
                {guardandoPago ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Guardando...
                  </>
                ) : (
                  <>
                    <Download className="h-5 w-5" />
                    Confirmar y Descargar Recibo
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
