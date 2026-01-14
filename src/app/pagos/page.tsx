'use client'

import { useEffect, useState, Suspense } from 'react'
import { supabase, Factura } from '@/lib/supabase'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import ProtectedRoute from '@/components/ProtectedRoute'
import UserMenu from '@/components/UserMenu'

// Icons inline
const Icons = {
  arrowLeft: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
    </svg>
  ),
  search: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  ),
  chevronDown: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  ),
  chevronRight: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  ),
  x: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  trash: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  ),
  creditCard: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
    </svg>
  ),
  download: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
  ),
  check: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ),
  building: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  ),
  fileText: (
    <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  alert: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
}

interface FacturaConPagos extends Factura {
  total_pagado: number
  saldo_pendiente: number
  proveedor_nombre?: string
  cbu_principal?: string
}

interface ProveedorAgrupado {
  id: number
  nombre: string
  facturas: FacturaConPagos[]
  total_vh: number
  total_vc: number
  total: number
  cbu_principal?: string
}

interface PagoSeleccionado {
  factura: FacturaConPagos
  tipo: 'cancela' | 'a_cuenta'
  monto: number
  cuenta_origen: 'VC' | 'VH'
}

function PagosContent() {
  const searchParams = useSearchParams()
  const proveedorIdParam = searchParams.get('proveedor')

  const [proveedores, setProveedores] = useState<ProveedorAgrupado[]>([])
  const [proveedoresFiltrados, setProveedoresFiltrados] = useState<ProveedorAgrupado[]>([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [filtroEmpresa, setFiltroEmpresa] = useState<'todos' | 'VH' | 'VC'>('todos')
  const [expandedProveedores, setExpandedProveedores] = useState<Set<number>>(new Set())
  const [pagosSeleccionados, setPagosSeleccionados] = useState<PagoSeleccionado[]>([])
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [generatingTxt, setGeneratingTxt] = useState(false)

  const CBU_VC = '3110003611000000296085'
  const CBU_VH = '3110030211000006923105'

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (proveedorIdParam && proveedores.length > 0) {
      const provId = parseInt(proveedorIdParam)
      setExpandedProveedores(new Set([provId]))
      setTimeout(() => {
        document.getElementById(`proveedor-${provId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 100)
    }
  }, [proveedorIdParam, proveedores])

  useEffect(() => {
    let filtered = [...proveedores]
    if (busqueda) {
      filtered = filtered.filter(p => p.nombre.toLowerCase().includes(busqueda.toLowerCase()))
    }
    if (filtroEmpresa === 'VH') {
      filtered = filtered.filter(p => p.total_vh > 0)
    } else if (filtroEmpresa === 'VC') {
      filtered = filtered.filter(p => p.total_vc > 0)
    }
    setProveedoresFiltrados(filtered)
  }, [proveedores, busqueda, filtroEmpresa])

  async function loadData() {
    setLoading(true)
    const { data: facturasData } = await supabase
      .from('facturas')
      .select('*, proveedores(nombre)')
      .in('estado', ['pendiente', 'parcial'])
      .order('fecha', { ascending: true })

    const { data: pagosData } = await supabase.from('pagos').select('factura_id, monto')
    const { data: cbusData } = await supabase
      .from('cbus_proveedores')
      .select('*')
      .eq('principal', true)
      .eq('activo', true)

    const pagosPorFactura: Record<number, number> = {}
    if (pagosData) {
      pagosData.forEach(p => {
        pagosPorFactura[p.factura_id] = (pagosPorFactura[p.factura_id] || 0) + Number(p.monto)
      })
    }

    const cbusPorProveedor: Record<number, string> = {}
    if (cbusData) {
      cbusData.forEach(c => {
        cbusPorProveedor[c.proveedor_id] = c.cbu
      })
    }

    if (facturasData) {
      const proveedoresMap: Record<number, ProveedorAgrupado> = {}
      facturasData.forEach((f: any) => {
        const pagado = pagosPorFactura[f.id] || 0
        const saldo = f.monto_total - pagado
        const provId = f.proveedor_id
        const provNombre = f.proveedores?.nombre || 'Sin nombre'

        if (!proveedoresMap[provId]) {
          proveedoresMap[provId] = {
            id: provId,
            nombre: provNombre,
            facturas: [],
            total_vh: 0,
            total_vc: 0,
            total: 0,
            cbu_principal: cbusPorProveedor[provId]
          }
        }

        const facturaConPagos: FacturaConPagos = {
          ...f,
          total_pagado: pagado,
          saldo_pendiente: saldo,
          proveedor_nombre: provNombre,
          cbu_principal: cbusPorProveedor[provId]
        }

        proveedoresMap[provId].facturas.push(facturaConPagos)
        if (f.empresa === 'VH') {
          proveedoresMap[provId].total_vh += saldo
        } else {
          proveedoresMap[provId].total_vc += saldo
        }
        proveedoresMap[provId].total += saldo
      })

      const proveedoresArray = Object.values(proveedoresMap).sort((a, b) => b.total - a.total)
      setProveedores(proveedoresArray)
    }
    setLoading(false)
  }

  function toggleProveedor(proveedorId: number) {
    const newExpanded = new Set(expandedProveedores)
    if (newExpanded.has(proveedorId)) {
      newExpanded.delete(proveedorId)
    } else {
      newExpanded.add(proveedorId)
    }
    setExpandedProveedores(newExpanded)
  }

  function agregarPago(factura: FacturaConPagos, tipo: 'cancela' | 'a_cuenta', montoCustom?: number) {
    const existe = pagosSeleccionados.find(p => p.factura.id === factura.id)
    if (existe) {
      setPagosSeleccionados(prev => prev.map(p =>
        p.factura.id === factura.id
          ? { ...p, tipo, monto: montoCustom || (tipo === 'cancela' ? factura.saldo_pendiente : p.monto) }
          : p
      ))
      return
    }
    const monto = tipo === 'cancela' ? factura.saldo_pendiente : (montoCustom || 0)
    const nuevoPago: PagoSeleccionado = {
      factura,
      tipo,
      monto,
      cuenta_origen: factura.empresa as 'VC' | 'VH'
    }
    setPagosSeleccionados(prev => [...prev, nuevoPago])
  }

  function quitarPago(facturaId: number) {
    setPagosSeleccionados(prev => prev.filter(p => p.factura.id !== facturaId))
  }

  function actualizarMontoPago(facturaId: number, monto: number) {
    setPagosSeleccionados(prev => prev.map(p =>
      p.factura.id === facturaId ? { ...p, monto } : p
    ))
  }

  function actualizarCuentaOrigen(facturaId: number, cuenta: 'VC' | 'VH') {
    setPagosSeleccionados(prev => prev.map(p =>
      p.factura.id === facturaId ? { ...p, cuenta_origen: cuenta } : p
    ))
  }

  function limpiarCarrito() {
    setPagosSeleccionados([])
  }

  function isPagoSeleccionado(facturaId: number): boolean {
    return pagosSeleccionados.some(p => p.factura.id === facturaId)
  }

  function getPagoSeleccionado(facturaId: number): PagoSeleccionado | undefined {
    return pagosSeleccionados.find(p => p.factura.id === facturaId)
  }

  const pagosPorCuenta = {
    VC: pagosSeleccionados.filter(p => p.cuenta_origen === 'VC'),
    VH: pagosSeleccionados.filter(p => p.cuenta_origen === 'VH')
  }

  const totalVC = pagosPorCuenta.VC.reduce((sum, p) => sum + p.monto, 0)
  const totalVH = pagosPorCuenta.VH.reduce((sum, p) => sum + p.monto, 0)
  const totalGeneral = totalVC + totalVH

  async function confirmarYGenerarTxt() {
    setGeneratingTxt(true)
    const fecha = new Date()
    const fechaStr = `${fecha.getDate().toString().padStart(2, '0')}${(fecha.getMonth() + 1).toString().padStart(2, '0')}${fecha.getFullYear().toString().slice(-2)}`
    const archivosGenerados: { nombre: string, contenido: string }[] = []

    for (const cuenta of ['VC', 'VH'] as const) {
      const pagos = pagosPorCuenta[cuenta]
      if (pagos.length === 0) continue

      const CBU_ORIGEN = cuenta === 'VC' ? CBU_VC : CBU_VH
      const lineas: string[] = []
      const pagosPorProveedor: Record<string, { cbu: string, monto: number, facturas: string[], concepto: string }> = {}

      for (const pago of pagos) {
        const cbu = pago.factura.cbu_principal || ''
        if (!cbu) continue
        if (!pagosPorProveedor[cbu]) {
          pagosPorProveedor[cbu] = { cbu, monto: 0, facturas: [], concepto: pago.tipo === 'cancela' ? 'CANCELA' : 'A CUENTA' }
        }
        pagosPorProveedor[cbu].monto += pago.monto
        pagosPorProveedor[cbu].facturas.push(pago.factura.numero)
        if (pago.tipo === 'a_cuenta') {
          pagosPorProveedor[cbu].concepto = 'A CUENTA'
        }
      }

      for (const [cbu, data] of Object.entries(pagosPorProveedor)) {
        const montoEnCentavos = Math.round(data.monto * 100)
        const referencia = `FAC ${data.facturas.join(' ')}`
        const linea =
          CBU_ORIGEN +
          cbu +
          ' '.repeat(44) +
          montoEnCentavos.toString().padStart(12, '0') +
          data.concepto.padEnd(50) +
          referencia.padEnd(50) +
          ' '.repeat(15) +
          '1'
        lineas.push(linea)
      }

      const totalLineas = lineas.length + 1
      const totalCentavos = Math.round(pagos.reduce((sum, p) => sum + p.monto, 0) * 100)
      const trailer = totalLineas.toString().padStart(5, '0') +
        totalCentavos.toString().padStart(17, '0') +
        ' '.repeat(216 - 22)
      lineas.push(trailer)
      const contenido = lineas.join('\r\n') + '\r\n'
      archivosGenerados.push({ nombre: `transfer_${cuenta}_${fechaStr}.txt`, contenido })
    }

    for (const pago of pagosSeleccionados) {
      await supabase.from('pagos').insert([{
        factura_id: pago.factura.id,
        fecha: new Date().toISOString().split('T')[0],
        monto: pago.monto,
        medio_pago: 'transferencia',
        observaciones: `${pago.tipo === 'cancela' ? 'Cancela' : 'A cuenta'} - ${pago.cuenta_origen}`
      }])
    }

    for (const archivo of archivosGenerados) {
      const blob = new Blob([archivo.contenido], { type: 'text/plain;charset=latin1' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = archivo.nombre
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }

    setGeneratingTxt(false)
    setShowConfirmModal(false)
    setPagosSeleccionados([])
    loadData()
  }

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount)
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' })
  }

  const getDiasAntiguedad = (fecha: string) => {
    return Math.floor((new Date().getTime() - new Date(fecha).getTime()) / (1000 * 60 * 60 * 24))
  }

  const getAlertaColor = (dias: number) => {
    if (dias <= 30) return 'bg-emerald-100 text-emerald-700 border-emerald-200'
    if (dias <= 40) return 'bg-amber-100 text-amber-700 border-amber-200'
    return 'bg-red-100 text-red-700 border-red-200'
  }

  if (loading) {
    return (
      <div className="min-h-screen gradient-mesh flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-violet-200 border-t-violet-600 rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-slate-500 font-medium">Cargando datos...</p>
        </div>
      </div>
    )
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen gradient-mesh">
        {/* Header */}
        <header className="glass-dark sticky top-0 z-50 border-b border-white/10">
          <div className="container-app">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-4">
                <Link href="/" className="text-white/70 hover:text-white transition-colors">
                  {Icons.arrowLeft}
                </Link>
                <div>
                  <h1 className="text-white font-semibold text-lg">Gestión de Pagos</h1>
                  <p className="text-slate-400 text-xs">Seleccioná facturas y generá TXT</p>
                </div>
              </div>
              <UserMenu />
            </div>
          </div>
        </header>

        <main className="container-app py-6">
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Panel izquierdo */}
            <div className="xl:col-span-2 space-y-6">
              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 animate-fadeIn">
                <div className="card-stat p-4">
                  <p className="stat-label">Deuda Total</p>
                  <p className="text-2xl font-bold text-slate-800 mt-1 tabular-nums">{formatMoney(proveedores.reduce((s, p) => s + p.total, 0))}</p>
                </div>
                <div className="card-stat p-4 border-l-4 border-blue-500">
                  <p className="stat-label">Villalba Hermanos</p>
                  <p className="text-2xl font-bold text-blue-600 mt-1 tabular-nums">{formatMoney(proveedores.reduce((s, p) => s + p.total_vh, 0))}</p>
                </div>
                <div className="card-stat p-4 border-l-4 border-emerald-500">
                  <p className="stat-label">Villalba Cristino</p>
                  <p className="text-2xl font-bold text-emerald-600 mt-1 tabular-nums">{formatMoney(proveedores.reduce((s, p) => s + p.total_vc, 0))}</p>
                </div>
              </div>

              {/* Filtros */}
              <div className="card-premium p-4 animate-fadeIn" style={{animationDelay: '0.1s'}}>
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">{Icons.search}</span>
                    <input
                      type="text"
                      placeholder="Buscar proveedor..."
                      value={busqueda}
                      onChange={(e) => setBusqueda(e.target.value)}
                      className="input-search w-full"
                    />
                  </div>
                  <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl">
                    {['todos', 'VH', 'VC'].map((f) => (
                      <button
                        key={f}
                        onClick={() => setFiltroEmpresa(f as any)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                          filtroEmpresa === f
                            ? f === 'VH' ? 'bg-blue-600 text-white' : f === 'VC' ? 'bg-emerald-600 text-white' : 'bg-white text-slate-800 shadow-sm'
                            : 'text-slate-600 hover:text-slate-800'
                        }`}
                      >
                        {f === 'todos' ? 'Todos' : f}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Lista de proveedores */}
              <div className="space-y-3">
                {proveedoresFiltrados.map((proveedor, idx) => (
                  <div
                    key={proveedor.id}
                    id={`proveedor-${proveedor.id}`}
                    className="card-premium overflow-hidden animate-slideUp"
                    style={{animationDelay: `${0.15 + idx * 0.03}s`}}
                  >
                    <div
                      className={`p-4 cursor-pointer transition-colors ${
                        expandedProveedores.has(proveedor.id) ? 'bg-violet-50' : 'hover:bg-slate-50'
                      }`}
                      onClick={() => toggleProveedor(proveedor.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className={`transition-transform ${expandedProveedores.has(proveedor.id) ? 'text-violet-600' : 'text-slate-400'}`}>
                            {expandedProveedores.has(proveedor.id) ? Icons.chevronDown : Icons.chevronRight}
                          </span>
                          <div>
                            <h3 className="font-semibold text-slate-800">{proveedor.nombre}</h3>
                            <p className="text-xs text-slate-500">{proveedor.facturas.length} facturas pendientes</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          {proveedor.total_vh > 0 && (
                            <div className="text-right">
                              <span className="text-xs text-blue-600 font-medium">VH</span>
                              <p className="font-bold text-blue-700 tabular-nums">{formatMoney(proveedor.total_vh)}</p>
                            </div>
                          )}
                          {proveedor.total_vc > 0 && (
                            <div className="text-right">
                              <span className="text-xs text-emerald-600 font-medium">VC</span>
                              <p className="font-bold text-emerald-700 tabular-nums">{formatMoney(proveedor.total_vc)}</p>
                            </div>
                          )}
                          <div className="text-right pl-4 border-l border-slate-200">
                            <span className="text-xs text-slate-500">Total</span>
                            <p className="font-extrabold text-slate-800 tabular-nums">{formatMoney(proveedor.total)}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {expandedProveedores.has(proveedor.id) && (
                      <div className="border-t border-slate-200">
                        <table className="w-full text-sm">
                          <thead className="bg-slate-100">
                            <tr>
                              <th className="px-4 py-3 text-left font-bold text-slate-600 text-xs uppercase">Emp</th>
                              <th className="px-4 py-3 text-left font-bold text-slate-600 text-xs uppercase">Factura</th>
                              <th className="px-4 py-3 text-left font-bold text-slate-600 text-xs uppercase">Fecha</th>
                              <th className="px-4 py-3 text-right font-bold text-slate-600 text-xs uppercase">Saldo</th>
                              <th className="px-4 py-3 text-center font-bold text-slate-600 text-xs uppercase">Días</th>
                              <th className="px-4 py-3 text-center font-bold text-slate-600 text-xs uppercase">Acciones</th>
                            </tr>
                          </thead>
                          <tbody>
                            {proveedor.facturas.map((factura, fidx) => {
                              const dias = getDiasAntiguedad(factura.fecha)
                              const seleccionado = isPagoSeleccionado(factura.id)
                              return (
                                <tr
                                  key={factura.id}
                                  className={`transition-colors ${
                                    seleccionado ? 'bg-violet-100 border-l-4 border-violet-500' : fidx % 2 === 0 ? 'bg-white hover:bg-slate-100' : 'bg-slate-100 hover:bg-slate-200'
                                  }`}
                                >
                                  <td className="px-4 py-3">
                                    <span className={`badge ${factura.empresa === 'VH' ? 'badge-vh' : 'badge-vc'}`}>
                                      {factura.empresa}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 font-medium text-slate-800">{factura.numero}</td>
                                  <td className="px-4 py-3 text-slate-600">{formatDate(factura.fecha)}</td>
                                  <td className="px-4 py-3 text-right font-bold text-slate-800 tabular-nums">
                                    {formatMoney(factura.saldo_pendiente)}
                                  </td>
                                  <td className="px-4 py-3 text-center">
                                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${getAlertaColor(dias)}`}>
                                      {dias}d
                                    </span>
                                  </td>
                                  <td className="px-4 py-3">
                                    <div className="flex items-center justify-center gap-2">
                                      {seleccionado ? (
                                        <button
                                          onClick={(e) => { e.stopPropagation(); quitarPago(factura.id) }}
                                          className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-xs font-semibold hover:bg-red-200 transition-colors flex items-center gap-1"
                                        >
                                          {Icons.x} Quitar
                                        </button>
                                      ) : (
                                        <>
                                          <button
                                            onClick={(e) => { e.stopPropagation(); agregarPago(factura, 'cancela') }}
                                            className="px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-lg text-xs font-semibold hover:bg-emerald-200 transition-colors disabled:opacity-50"
                                            disabled={!factura.cbu_principal}
                                            title={!factura.cbu_principal ? 'Sin CBU' : 'Cancelar'}
                                          >
                                            Cancelar
                                          </button>
                                          <button
                                            onClick={(e) => { e.stopPropagation(); agregarPago(factura, 'a_cuenta', Math.round(factura.saldo_pendiente / 2)) }}
                                            className="px-3 py-1.5 bg-amber-100 text-amber-700 rounded-lg text-xs font-semibold hover:bg-amber-200 transition-colors disabled:opacity-50"
                                            disabled={!factura.cbu_principal}
                                            title={!factura.cbu_principal ? 'Sin CBU' : 'A Cuenta'}
                                          >
                                            A Cuenta
                                          </button>
                                        </>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                        {!proveedor.cbu_principal && (
                          <div className="px-4 py-3 bg-amber-50 border-t border-amber-200 flex items-center gap-2 text-amber-700 text-sm">
                            {Icons.alert}
                            <span>Este proveedor no tiene CBU configurado.</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}

                {proveedoresFiltrados.length === 0 && (
                  <div className="card-premium p-16 text-center">
                    <div className="text-slate-300 mx-auto mb-4">{Icons.search}</div>
                    <p className="text-slate-500 font-medium">No se encontraron proveedores</p>
                  </div>
                )}
              </div>
            </div>

            {/* Panel derecho - Carrito */}
            <div className="xl:col-span-1">
              <div className="card-premium sticky top-24 overflow-hidden animate-slideUp" style={{animationDelay: '0.2s'}}>
                <div className="p-4 bg-gradient-to-r from-violet-600 to-purple-600">
                  <div className="flex items-center justify-between text-white">
                    <div className="flex items-center gap-2">
                      {Icons.creditCard}
                      <h2 className="font-semibold">Pagos a Confirmar</h2>
                    </div>
                    <span className="px-2.5 py-1 bg-white/20 rounded-full text-xs font-medium">
                      {pagosSeleccionados.length} items
                    </span>
                  </div>
                </div>

                {pagosSeleccionados.length === 0 ? (
                  <div className="p-8 text-center">
                    <div className="text-slate-300 mx-auto mb-3">{Icons.fileText}</div>
                    <p className="text-slate-500 font-medium">No hay pagos seleccionados</p>
                    <p className="text-slate-400 text-sm mt-1">Seleccioná facturas para pagar</p>
                  </div>
                ) : (
                  <>
                    <div className="max-h-[400px] overflow-y-auto divide-y divide-slate-100">
                      {pagosSeleccionados.map((pago) => (
                        <div key={pago.factura.id} className="p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <p className="font-semibold text-slate-800 text-sm">{pago.factura.proveedor_nombre}</p>
                              <p className="text-xs text-slate-500">FC {pago.factura.numero}</p>
                            </div>
                            <button
                              onClick={() => quitarPago(pago.factura.id)}
                              className="p-1.5 hover:bg-red-100 rounded-lg text-red-500 transition-colors"
                            >
                              {Icons.trash}
                            </button>
                          </div>

                          <div className="flex items-center gap-2 mb-2">
                            <select
                              value={pago.tipo}
                              onChange={(e) => {
                                const tipo = e.target.value as 'cancela' | 'a_cuenta'
                                agregarPago(pago.factura, tipo, tipo === 'cancela' ? pago.factura.saldo_pendiente : pago.monto)
                              }}
                              className="flex-1 text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-slate-50 focus:ring-2 focus:ring-violet-500"
                            >
                              <option value="cancela">Cancela</option>
                              <option value="a_cuenta">A Cuenta</option>
                            </select>
                            <select
                              value={pago.cuenta_origen}
                              onChange={(e) => actualizarCuentaOrigen(pago.factura.id, e.target.value as 'VC' | 'VH')}
                              className={`text-xs border rounded-lg px-2 py-1.5 font-semibold ${
                                pago.cuenta_origen === 'VH' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              }`}
                            >
                              <option value="VC">VC</option>
                              <option value="VH">VH</option>
                            </select>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-500">$</span>
                            <input
                              type="number"
                              value={pago.monto}
                              onChange={(e) => actualizarMontoPago(pago.factura.id, parseFloat(e.target.value) || 0)}
                              className="flex-1 text-sm font-bold border border-slate-200 rounded-lg px-2 py-1.5 text-right bg-slate-50 focus:ring-2 focus:ring-violet-500 tabular-nums"
                              disabled={pago.tipo === 'cancela'}
                            />
                          </div>
                          {pago.tipo === 'a_cuenta' && (
                            <p className="text-xs text-slate-400 mt-1 text-right">
                              Saldo FC: {formatMoney(pago.factura.saldo_pendiente)}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Totales */}
                    <div className="p-4 border-t border-slate-200 bg-slate-50">
                      {totalVH > 0 && (
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm text-blue-700 font-semibold">Total VH</span>
                          <span className="font-bold text-blue-700 tabular-nums">{formatMoney(totalVH)}</span>
                        </div>
                      )}
                      {totalVC > 0 && (
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm text-emerald-700 font-semibold">Total VC</span>
                          <span className="font-bold text-emerald-700 tabular-nums">{formatMoney(totalVC)}</span>
                        </div>
                      )}
                      <div className="flex justify-between items-center pt-2 border-t border-slate-300">
                        <span className="font-bold text-slate-700">TOTAL</span>
                        <span className="text-xl font-extrabold text-slate-800 tabular-nums">{formatMoney(totalGeneral)}</span>
                      </div>
                    </div>

                    {/* Acciones */}
                    <div className="p-4 border-t border-slate-200 space-y-2">
                      <button
                        onClick={() => setShowConfirmModal(true)}
                        className="w-full btn-primary py-3 flex items-center justify-center gap-2"
                      >
                        {Icons.download}
                        Confirmar y Generar TXT
                      </button>
                      <button
                        onClick={limpiarCarrito}
                        className="w-full py-2.5 border border-slate-300 text-slate-600 font-semibold rounded-xl hover:bg-slate-50 transition-colors"
                      >
                        Limpiar selección
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </main>

        {/* Modal de confirmación */}
        {showConfirmModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg animate-scaleIn">
              <div className="p-6 border-b border-slate-200">
                <h2 className="text-xl font-bold text-slate-800">Confirmar Pagos</h2>
                <p className="text-slate-500 mt-1">Se registrarán los pagos y se generarán los archivos TXT</p>
              </div>

              <div className="p-6 space-y-4">
                <div className="bg-slate-50 rounded-xl p-4">
                  <p className="text-sm text-slate-600 mb-3 font-medium">Resumen de pagos:</p>
                  <div className="space-y-2">
                    {totalVC > 0 && (
                      <div className="flex justify-between items-center p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                        <div className="flex items-center gap-2">
                          <span className="text-emerald-600">{Icons.building}</span>
                          <span className="font-semibold text-emerald-700">Villalba Cristino</span>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-emerald-700 tabular-nums">{formatMoney(totalVC)}</p>
                          <p className="text-xs text-emerald-600">{pagosPorCuenta.VC.length} transferencias</p>
                        </div>
                      </div>
                    )}
                    {totalVH > 0 && (
                      <div className="flex justify-between items-center p-3 bg-blue-50 rounded-xl border border-blue-200">
                        <div className="flex items-center gap-2">
                          <span className="text-blue-600">{Icons.building}</span>
                          <span className="font-semibold text-blue-700">Villalba Hermanos</span>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-blue-700 tabular-nums">{formatMoney(totalVH)}</p>
                          <p className="text-xs text-blue-600">{pagosPorCuenta.VH.length} transferencias</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-between items-center p-4 bg-gradient-to-r from-violet-50 to-purple-50 rounded-xl border border-violet-200">
                  <span className="font-bold text-violet-700">Total General</span>
                  <span className="text-2xl font-extrabold text-violet-800 tabular-nums">{formatMoney(totalGeneral)}</span>
                </div>

                <p className="text-sm text-slate-500">
                  Se generarán {(totalVC > 0 ? 1 : 0) + (totalVH > 0 ? 1 : 0)} archivo(s) TXT para cargar en el banco.
                </p>
              </div>

              <div className="p-6 border-t border-slate-200 flex gap-3">
                <button
                  onClick={() => setShowConfirmModal(false)}
                  className="flex-1 py-3 border border-slate-300 text-slate-600 font-semibold rounded-xl hover:bg-slate-50 transition-colors"
                  disabled={generatingTxt}
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmarYGenerarTxt}
                  disabled={generatingTxt}
                  className="flex-1 btn-primary py-3 flex items-center justify-center gap-2"
                >
                  {generatingTxt ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Generando...
                    </>
                  ) : (
                    <>
                      {Icons.check}
                      Confirmar
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  )
}

export default function PagosPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen gradient-mesh flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-violet-200 border-t-violet-600 rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-slate-500 font-medium">Cargando...</p>
        </div>
      </div>
    }>
      <PagosContent />
    </Suspense>
  )
}
