'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, ArrowRightLeft, Building2, FileText, Download, Check, Calendar, DollarSign, Receipt, History, ChevronDown, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import Link from 'next/link'
import NavRapida from '@/components/NavRapida'
import Buscador from '@/components/Buscador'

interface CuentaInternaRow {
  id: number
  tipo: string
  pagador?: 'VH' | 'VC'
  receptor?: 'VH' | 'VC'
  debe_vh: number
  debe_vc: number
  monto?: number
  fecha?: string
  pagado: boolean
  observaciones?: string
}

interface ProveedorResumen {
  id: number
  nombre: string
  vh_debe: number
  vc_debe: number
  total_general: number
  deuda_real_vh: number
  deuda_real_vc: number
}

interface DeudaHistorica {
  id: number
  fecha: string
  proveedor: string
  nroFactura: string
  montoTotal: number
  neto: number
  porcentaje: number
  montoDeuda: number
  pagado: boolean
}

type SortField = 'nombre' | 'vh_debe' | 'vc_debe' | 'total_general' | 'deuda_real_vh' | 'deuda_real_vc'
type SortDirection = 'asc' | 'desc'

export default function CuentaInternaPage() {
  const [proveedoresResumen, setProveedoresResumen] = useState<ProveedorResumen[]>([])
  const [proveedoresMap, setProveedoresMap] = useState<Record<number, string>>({})
  const [loading, setLoading] = useState(true)

  // Deudas históricas
  const [deudaVHaVC, setDeudaVHaVC] = useState<DeudaHistorica[]>([])
  const [deudaVCaVH, setDeudaVCaVH] = useState<DeudaHistorica[]>([])
  const [totalesCuentaInterna, setTotalesCuentaInterna] = useState({
    totalVHaVC: 0,
    pagadoVHaVC: 0,
    pendienteVHaVC: 0,
    totalVCaVH: 0,
    pagadoVCaVH: 0,
    pendienteVCaVH: 0
  })

  // Ordenamiento
  const [sortField, setSortField] = useState<SortField>('total_general')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  // Tabs
  const [activeTab, setActiveTab] = useState<'resumen' | 'deuda_vh_vc' | 'deuda_vc_vh'>('resumen')

  // Buscador
  const [busqueda, setBusqueda] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)

    // Cargar proveedores
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

    // Cargar facturas y pagos para resumen por proveedor
    const { data: facturasData } = await supabase
      .from('facturas')
      .select('id, proveedor_id, empresa, monto_total, numero')

    const { data: pagosData } = await supabase
      .from('pagos')
      .select('factura_id, monto')

    const pagosPorFactura: Record<number, number> = {}
    if (pagosData) {
      pagosData.forEach((p: any) => {
        pagosPorFactura[p.factura_id] = (pagosPorFactura[p.factura_id] || 0) + Number(p.monto)
      })
    }

    // Procesar facturas para resumen
    const proveedores: Record<number, ProveedorResumen> = {}
    if (facturasData) {
      facturasData.forEach((f: any) => {
        const provId = f.proveedor_id
        if (!provId) return

        const pagado = pagosPorFactura[f.id] || 0
        const saldo = Number(f.monto_total) - pagado
        if (saldo <= 0) return

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

        if (f.empresa === 'VH') {
          proveedores[provId].vh_debe += saldo
          proveedores[provId].deuda_real_vh += (saldoNeto * 0.65) + saldoIva
          proveedores[provId].deuda_real_vc += saldoNeto * 0.35
        } else {
          proveedores[provId].vc_debe += saldo
          proveedores[provId].deuda_real_vh += saldoNeto * 0.65
          proveedores[provId].deuda_real_vc += (saldoNeto * 0.35) + saldoIva
        }
        proveedores[provId].total_general += saldo
      })
    }
    setProveedoresResumen(Object.values(proveedores))

    // Cargar cuenta interna histórica
    const { data: cuentaData } = await supabase
      .from('cuenta_interna')
      .select('*')
      .eq('tipo', 'deuda_historica')
      .order('fecha', { ascending: true })

    const vhAvc: DeudaHistorica[] = []
    const vcAvh: DeudaHistorica[] = []
    let totalVHaVC = 0, pagadoVHaVC = 0
    let totalVCaVH = 0, pagadoVCaVH = 0

    if (cuentaData) {
      cuentaData.forEach((row: CuentaInternaRow) => {
        // Extraer proveedor y nro factura de observaciones "FC 123 - PROVEEDOR"
        const obs = row.observaciones || ''
        const match = obs.match(/FC\s*(\S+)\s*-\s*(.+)/)
        const nroFactura = match ? match[1] : ''
        const proveedor = match ? match[2].trim() : obs

        const montoTotal = Number(row.monto) || 0
        const neto = montoTotal / 1.21

        if (row.pagador === 'VH') {
          // VH debe a VC (35% de facturas de VC)
          const item: DeudaHistorica = {
            id: row.id,
            fecha: row.fecha || '',
            proveedor,
            nroFactura,
            montoTotal: montoTotal / 0.65 * 1.21, // Reconstruir monto total original
            neto: montoTotal / 0.65,
            porcentaje: 65,
            montoDeuda: montoTotal,
            pagado: row.pagado
          }
          vhAvc.push(item)
          totalVHaVC += montoTotal
          if (row.pagado) pagadoVHaVC += montoTotal
        } else {
          // VC debe a VH (35% de facturas de VH)
          const item: DeudaHistorica = {
            id: row.id,
            fecha: row.fecha || '',
            proveedor,
            nroFactura,
            montoTotal: montoTotal / 0.35 * 1.21,
            neto: montoTotal / 0.35,
            porcentaje: 35,
            montoDeuda: montoTotal,
            pagado: row.pagado
          }
          vcAvh.push(item)
          totalVCaVH += montoTotal
          if (row.pagado) pagadoVCaVH += montoTotal
        }
      })
    }

    setDeudaVHaVC(vhAvc)
    setDeudaVCaVH(vcAvh)
    setTotalesCuentaInterna({
      totalVHaVC,
      pagadoVHaVC,
      pendienteVHaVC: totalVHaVC - pagadoVHaVC,
      totalVCaVH,
      pagadoVCaVH,
      pendienteVCaVH: totalVCaVH - pagadoVCaVH
    })

    setLoading(false)
  }

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection(field === 'nombre' ? 'asc' : 'desc')
    }
  }

  const proveedoresFiltrados = proveedoresResumen.filter(p =>
    busqueda ? p.nombre.toLowerCase().includes(busqueda.toLowerCase()) : true
  )

  const proveedoresOrdenados = [...proveedoresFiltrados].sort((a, b) => {
    let comparison = 0
    if (sortField === 'nombre') {
      comparison = a.nombre.localeCompare(b.nombre)
    } else {
      comparison = a[sortField] - b[sortField]
    }
    return sortDirection === 'asc' ? comparison : -comparison
  })

  const totales = proveedoresResumen.reduce((acc, p) => ({
    vh_debe: acc.vh_debe + p.vh_debe,
    vc_debe: acc.vc_debe + p.vc_debe,
    total_general: acc.total_general + p.total_general,
    deuda_real_vh: acc.deuda_real_vh + p.deuda_real_vh,
    deuda_real_vc: acc.deuda_real_vc + p.deuda_real_vc
  }), { vh_debe: 0, vc_debe: 0, total_general: 0, deuda_real_vh: 0, deuda_real_vc: 0 })

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
      <NavRapida />

      <main className="container mx-auto px-6 py-6">
        {/* Cards de resumen - Cuenta Interna Histórica */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-xl p-5 shadow-lg border-l-4 border-blue-500">
            <div className="flex items-center gap-2 mb-3">
              <ArrowRightLeft className="h-5 w-5 text-blue-600" />
              <p className="text-slate-600 font-medium">VH debe a VC</p>
            </div>
            <p className="text-3xl font-bold text-blue-700">{formatMoney(totalesCuentaInterna.totalVHaVC)}</p>
            <div className="mt-2 text-sm">
              <p className="text-emerald-600">Pagado: {formatMoney(totalesCuentaInterna.pagadoVHaVC)}</p>
              <p className="text-red-600 font-semibold">Pendiente: {formatMoney(totalesCuentaInterna.pendienteVHaVC)}</p>
            </div>
          </div>

          <div className="bg-white rounded-xl p-5 shadow-lg border-l-4 border-emerald-500">
            <div className="flex items-center gap-2 mb-3">
              <ArrowRightLeft className="h-5 w-5 text-emerald-600" />
              <p className="text-slate-600 font-medium">VC debe a VH</p>
            </div>
            <p className="text-3xl font-bold text-emerald-700">{formatMoney(totalesCuentaInterna.totalVCaVH)}</p>
            <div className="mt-2 text-sm">
              <p className="text-emerald-600">Pagado: {formatMoney(totalesCuentaInterna.pagadoVCaVH)}</p>
              <p className="text-red-600 font-semibold">Pendiente: {formatMoney(totalesCuentaInterna.pendienteVCaVH)}</p>
            </div>
          </div>
        </div>

        {/* Balance neto */}
        <div className={`rounded-xl p-4 mb-6 ${
          totalesCuentaInterna.pendienteVHaVC > totalesCuentaInterna.pendienteVCaVH
            ? 'bg-blue-100 border border-blue-300'
            : 'bg-emerald-100 border border-emerald-300'
        }`}>
          <p className="text-center text-lg">
            <strong>Balance Neto: </strong>
            {totalesCuentaInterna.pendienteVHaVC > totalesCuentaInterna.pendienteVCaVH ? (
              <span className="text-blue-700">
                VH debe a VC {formatMoney(totalesCuentaInterna.pendienteVHaVC - totalesCuentaInterna.pendienteVCaVH)}
              </span>
            ) : (
              <span className="text-emerald-700">
                VC debe a VH {formatMoney(totalesCuentaInterna.pendienteVCaVH - totalesCuentaInterna.pendienteVHaVC)}
              </span>
            )}
          </p>
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
              onClick={() => setActiveTab('deuda_vh_vc')}
              className={`px-6 py-4 font-medium text-sm whitespace-nowrap transition-colors ${
                activeTab === 'deuda_vh_vc'
                  ? 'text-blue-700 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <span className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Deuda VH a VC ({deudaVHaVC.length})
              </span>
            </button>
            <button
              onClick={() => setActiveTab('deuda_vc_vh')}
              className={`px-6 py-4 font-medium text-sm whitespace-nowrap transition-colors ${
                activeTab === 'deuda_vc_vh'
                  ? 'text-emerald-700 border-b-2 border-emerald-600 bg-emerald-50'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <span className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Deuda VC a VH ({deudaVCaVH.length})
              </span>
            </button>
          </div>

          {/* Contenido de tabs */}
          <div className="p-6">
            {activeTab === 'resumen' && (
              <div>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-800">Resumen por Proveedor</h3>
                    <p className="text-sm text-slate-500">
                      Facturas pendientes actuales • {proveedoresFiltrados.length} de {proveedoresResumen.length} proveedores
                    </p>
                  </div>
                  <Buscador
                    value={busqueda}
                    onChange={setBusqueda}
                    placeholder="Buscar proveedor..."
                    className="w-full sm:w-64"
                  />
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-100">
                        <th className="px-4 py-3 text-left font-semibold text-slate-600 cursor-pointer hover:bg-slate-200" onClick={() => handleSort('nombre')}>
                          <div className="flex items-center gap-2">Proveedor <SortIcon field="nombre" /></div>
                        </th>
                        <th className="px-4 py-3 text-right font-semibold text-blue-600 cursor-pointer hover:bg-slate-200" onClick={() => handleSort('vh_debe')}>
                          <div className="flex items-center justify-end gap-2">VH debe <SortIcon field="vh_debe" /></div>
                        </th>
                        <th className="px-4 py-3 text-right font-semibold text-emerald-600 cursor-pointer hover:bg-slate-200" onClick={() => handleSort('vc_debe')}>
                          <div className="flex items-center justify-end gap-2">VC debe <SortIcon field="vc_debe" /></div>
                        </th>
                        <th className="px-4 py-3 text-right font-semibold text-slate-700 cursor-pointer hover:bg-slate-200" onClick={() => handleSort('total_general')}>
                          <div className="flex items-center justify-end gap-2">Total General <SortIcon field="total_general" /></div>
                        </th>
                        <th className="px-4 py-3 text-right font-semibold text-blue-700 bg-blue-50 cursor-pointer hover:bg-blue-100" onClick={() => handleSort('deuda_real_vh')}>
                          <div className="flex items-center justify-end gap-2">Deuda Real VH <SortIcon field="deuda_real_vh" /></div>
                        </th>
                        <th className="px-4 py-3 text-right font-semibold text-emerald-700 bg-emerald-50 cursor-pointer hover:bg-emerald-100" onClick={() => handleSort('deuda_real_vc')}>
                          <div className="flex items-center justify-end gap-2">Deuda Real VC <SortIcon field="deuda_real_vc" /></div>
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
              </div>
            )}

            {activeTab === 'deuda_vh_vc' && (
              <div>
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-blue-800">Detalle Deuda VH a VC</h3>
                  <p className="text-sm text-slate-500">
                    Facturas de VC donde VH paga el 65% del neto • Total: {formatMoney(totalesCuentaInterna.totalVHaVC)}
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-blue-50">
                        <th className="px-3 py-2 text-left font-semibold text-slate-600">Fecha</th>
                        <th className="px-3 py-2 text-left font-semibold text-slate-600">Proveedor</th>
                        <th className="px-3 py-2 text-left font-semibold text-slate-600">N° FC</th>
                        <th className="px-3 py-2 text-right font-semibold text-slate-600">%</th>
                        <th className="px-3 py-2 text-right font-semibold text-blue-700">Monto Deuda</th>
                        <th className="px-3 py-2 text-center font-semibold text-slate-600">Pagado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {deudaVHaVC.map((d) => (
                        <tr key={d.id} className={`hover:bg-slate-50 ${d.pagado ? 'bg-emerald-50/50' : ''}`}>
                          <td className="px-3 py-2 text-slate-600">{formatDate(d.fecha)}</td>
                          <td className="px-3 py-2 font-medium text-slate-800">{d.proveedor}</td>
                          <td className="px-3 py-2 text-slate-600">{d.nroFactura}</td>
                          <td className="px-3 py-2 text-right text-slate-600">{d.porcentaje}%</td>
                          <td className="px-3 py-2 text-right font-semibold text-blue-700">{formatMoney(d.montoDeuda)}</td>
                          <td className="px-3 py-2 text-center">
                            {d.pagado ? (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">Si</span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">No</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-blue-100 font-bold">
                        <td colSpan={4} className="px-3 py-2 text-slate-800">TOTAL</td>
                        <td className="px-3 py-2 text-right text-blue-800">{formatMoney(totalesCuentaInterna.totalVHaVC)}</td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'deuda_vc_vh' && (
              <div>
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-emerald-800">Detalle Deuda VC a VH</h3>
                  <p className="text-sm text-slate-500">
                    Facturas de VH donde VC paga el 35% del neto • Total: {formatMoney(totalesCuentaInterna.totalVCaVH)}
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-emerald-50">
                        <th className="px-3 py-2 text-left font-semibold text-slate-600">Fecha</th>
                        <th className="px-3 py-2 text-left font-semibold text-slate-600">Proveedor</th>
                        <th className="px-3 py-2 text-left font-semibold text-slate-600">N° FC</th>
                        <th className="px-3 py-2 text-right font-semibold text-slate-600">%</th>
                        <th className="px-3 py-2 text-right font-semibold text-emerald-700">Monto Deuda</th>
                        <th className="px-3 py-2 text-center font-semibold text-slate-600">Pagado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {deudaVCaVH.map((d) => (
                        <tr key={d.id} className={`hover:bg-slate-50 ${d.pagado ? 'bg-emerald-50/50' : ''}`}>
                          <td className="px-3 py-2 text-slate-600">{formatDate(d.fecha)}</td>
                          <td className="px-3 py-2 font-medium text-slate-800">{d.proveedor}</td>
                          <td className="px-3 py-2 text-slate-600">{d.nroFactura}</td>
                          <td className="px-3 py-2 text-right text-slate-600">{d.porcentaje}%</td>
                          <td className="px-3 py-2 text-right font-semibold text-emerald-700">{formatMoney(d.montoDeuda)}</td>
                          <td className="px-3 py-2 text-center">
                            {d.pagado ? (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">Si</span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">No</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-emerald-100 font-bold">
                        <td colSpan={4} className="px-3 py-2 text-slate-800">TOTAL</td>
                        <td className="px-3 py-2 text-right text-emerald-800">{formatMoney(totalesCuentaInterna.totalVCaVH)}</td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
