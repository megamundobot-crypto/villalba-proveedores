'use client'

import { useEffect, useState } from 'react'
import { supabase, SaldoProveedor, CuentaInternaResumen, Factura } from '@/lib/supabase'
import { Building2, Users, AlertTriangle, TrendingDown, ArrowRightLeft, Search, FileText, CreditCard, Download, ChevronRight, ChevronDown, Filter, X } from 'lucide-react'
import Link from 'next/link'

interface FacturaConPagos extends Factura {
  total_pagado: number
  saldo_pendiente: number
}

interface ProveedorConFacturas extends SaldoProveedor {
  facturas?: FacturaConPagos[]
}

export default function Dashboard() {
  const [saldos, setSaldos] = useState<ProveedorConFacturas[]>([])
  const [saldosFiltrados, setSaldosFiltrados] = useState<ProveedorConFacturas[]>([])
  const [cuentaInterna, setCuentaInterna] = useState<CuentaInternaResumen[]>([])
  const [loading, setLoading] = useState(true)
  const [totales, setTotales] = useState({ vh: 0, vc: 0, total: 0 })
  const [alertas, setAlertas] = useState({ verde: 0, amarillo: 0, rojo: 0 })

  // Proveedor expandido
  const [expandedProveedor, setExpandedProveedor] = useState<number | null>(null)
  const [loadingFacturas, setLoadingFacturas] = useState(false)

  // Filtros
  const [busqueda, setBusqueda] = useState('')
  const [filtroEmpresa, setFiltroEmpresa] = useState<'todos' | 'VH' | 'VC'>('todos')
  const [ordenar, setOrdenar] = useState<'total' | 'nombre' | 'vh' | 'vc'>('total')

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    let filtered = [...saldos]

    // Filtro por búsqueda
    if (busqueda) {
      filtered = filtered.filter(s =>
        s.nombre.toLowerCase().includes(busqueda.toLowerCase())
      )
    }

    // Filtro por empresa
    if (filtroEmpresa === 'VH') {
      filtered = filtered.filter(s => s.saldo_vh > 0)
    } else if (filtroEmpresa === 'VC') {
      filtered = filtered.filter(s => s.saldo_vc > 0)
    }

    // Ordenamiento
    filtered.sort((a, b) => {
      switch (ordenar) {
        case 'nombre': return a.nombre.localeCompare(b.nombre)
        case 'vh': return b.saldo_vh - a.saldo_vh
        case 'vc': return b.saldo_vc - a.saldo_vc
        default: return b.saldo_total - a.saldo_total
      }
    })

    setSaldosFiltrados(filtered)
  }, [saldos, busqueda, filtroEmpresa, ordenar])

  async function loadData() {
    setLoading(true)

    const { data: facturasData } = await supabase
      .from('facturas')
      .select('*, proveedores(nombre)')
      .in('estado', ['pendiente', 'parcial'])

    const { data: pagosData } = await supabase
      .from('pagos')
      .select('factura_id, monto')

    if (facturasData) {
      const pagosPorFactura: Record<number, number> = {}
      if (pagosData) {
        pagosData.forEach(p => {
          pagosPorFactura[p.factura_id] = (pagosPorFactura[p.factura_id] || 0) + Number(p.monto)
        })
      }

      const saldosPorProveedor: Record<number, ProveedorConFacturas> = {}

      facturasData.forEach((f: any) => {
        const pagado = pagosPorFactura[f.id] || 0
        const saldo = f.monto_total - pagado
        const provId = f.proveedor_id
        const provNombre = f.proveedores?.nombre || 'Sin nombre'

        if (!saldosPorProveedor[provId]) {
          saldosPorProveedor[provId] = { id: provId, nombre: provNombre, saldo_vh: 0, saldo_vc: 0, saldo_total: 0 }
        }

        if (f.empresa === 'VH') {
          saldosPorProveedor[provId].saldo_vh += saldo
        } else {
          saldosPorProveedor[provId].saldo_vc += saldo
        }
        saldosPorProveedor[provId].saldo_total += saldo
      })

      const saldosArray = Object.values(saldosPorProveedor).sort((a, b) => b.saldo_total - a.saldo_total)
      setSaldos(saldosArray)

      const vh = saldosArray.reduce((sum, s) => sum + s.saldo_vh, 0)
      const vc = saldosArray.reduce((sum, s) => sum + s.saldo_vc, 0)
      setTotales({ vh, vc, total: vh + vc })

      const hoy = new Date()
      let verde = 0, amarillo = 0, rojo = 0
      facturasData.forEach((f: any) => {
        const fecha = new Date(f.fecha)
        const dias = Math.floor((hoy.getTime() - fecha.getTime()) / (1000 * 60 * 60 * 24))
        if (dias <= 30) verde++
        else if (dias <= 40) amarillo++
        else rojo++
      })
      setAlertas({ verde, amarillo, rojo })
    }

    const { data: cuentaData } = await supabase
      .from('cuenta_interna')
      .select('*')

    if (cuentaData && cuentaData.length > 0) {
      const vhDebeVc = cuentaData.reduce((sum, c) => sum + (c.pagado ? 0 : Number(c.debe_vh)), 0)
      const vcDebeVh = cuentaData.reduce((sum, c) => sum + (c.pagado ? 0 : Number(c.debe_vc)), 0)
      const vhPagado = cuentaData.reduce((sum, c) => sum + (c.pagado ? Number(c.debe_vh) : 0), 0)
      const vcPagado = cuentaData.reduce((sum, c) => sum + (c.pagado ? Number(c.debe_vc) : 0), 0)

      setCuentaInterna([
        { concepto: 'VH debe a VC', monto_pendiente: vhDebeVc, monto_pagado: vhPagado, monto_total: vhDebeVc + vhPagado },
        { concepto: 'VC debe a VH', monto_pendiente: vcDebeVh, monto_pagado: vcPagado, monto_total: vcDebeVh + vcPagado }
      ])
    }

    setLoading(false)
  }

  async function loadFacturasProveedor(proveedorId: number) {
    setLoadingFacturas(true)

    const { data: facturasData } = await supabase
      .from('facturas')
      .select('*')
      .eq('proveedor_id', proveedorId)
      .in('estado', ['pendiente', 'parcial'])
      .order('fecha', { ascending: false })

    const { data: pagosData } = await supabase
      .from('pagos')
      .select('factura_id, monto')

    if (facturasData) {
      const pagosPorFactura: Record<number, number> = {}
      if (pagosData) {
        pagosData.forEach(p => {
          pagosPorFactura[p.factura_id] = (pagosPorFactura[p.factura_id] || 0) + Number(p.monto)
        })
      }

      const facturasConPagos: FacturaConPagos[] = facturasData.map((f: any) => ({
        ...f,
        total_pagado: pagosPorFactura[f.id] || 0,
        saldo_pendiente: f.monto_total - (pagosPorFactura[f.id] || 0)
      }))

      // Actualizar el proveedor con sus facturas
      setSaldos(prev => prev.map(p =>
        p.id === proveedorId ? { ...p, facturas: facturasConPagos } : p
      ))
      setSaldosFiltrados(prev => prev.map(p =>
        p.id === proveedorId ? { ...p, facturas: facturasConPagos } : p
      ))
    }

    setLoadingFacturas(false)
  }

  function toggleProveedor(proveedorId: number) {
    if (expandedProveedor === proveedorId) {
      setExpandedProveedor(null)
    } else {
      setExpandedProveedor(proveedorId)
      // Cargar facturas si no están cargadas
      const proveedor = saldos.find(p => p.id === proveedorId)
      if (!proveedor?.facturas) {
        loadFacturasProveedor(proveedorId)
      }
    }
  }

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatMoneyCompact = (amount: number) => {
    if (amount >= 1000000000) {
      return `$${(amount / 1000000000).toFixed(1)}B`
    }
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`
    }
    return formatMoney(amount)
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' })
  }

  const getDiasAntiguedad = (fecha: string) => {
    const hoy = new Date()
    const fechaFactura = new Date(fecha)
    return Math.floor((hoy.getTime() - fechaFactura.getTime()) / (1000 * 60 * 60 * 24))
  }

  const getAlertaColor = (dias: number) => {
    if (dias <= 30) return 'bg-emerald-100 text-emerald-700'
    if (dias <= 40) return 'bg-amber-100 text-amber-700'
    return 'bg-red-100 text-red-700'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-600 font-medium">Cargando datos...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header Premium */}
      <header className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white shadow-xl">
        <div className="container mx-auto px-6 py-5">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Sistema de Gestión</h1>
              <p className="text-slate-400 text-sm mt-0.5">Villalba Hermanos SRL • Villalba Cristino</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="px-3 py-1.5 bg-emerald-500/20 text-emerald-400 rounded-full text-xs font-medium border border-emerald-500/30">
                ● Sistema Activo
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        {/* Cards de Resumen Premium */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          {/* Deuda Total */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 text-white shadow-xl card-hover">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-slate-400 text-sm font-medium">Deuda Total</p>
                <p className="text-3xl font-bold mt-2 tracking-tight">{formatMoneyCompact(totales.total)}</p>
                <p className="text-slate-500 text-xs mt-1">{formatMoney(totales.total)}</p>
              </div>
              <div className="p-3 bg-white/10 rounded-xl">
                <TrendingDown className="h-6 w-6 text-slate-300" />
              </div>
            </div>
          </div>

          {/* Villalba Hermanos */}
          <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-6 text-white shadow-xl card-hover">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-blue-200 text-sm font-medium">Villalba Hermanos</p>
                <p className="text-3xl font-bold mt-2 tracking-tight">{formatMoneyCompact(totales.vh)}</p>
                <p className="text-blue-300/70 text-xs mt-1">{formatMoney(totales.vh)}</p>
              </div>
              <div className="p-3 bg-white/20 rounded-xl">
                <Building2 className="h-6 w-6" />
              </div>
            </div>
          </div>

          {/* Villalba Cristino */}
          <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-2xl p-6 text-white shadow-xl card-hover">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-emerald-200 text-sm font-medium">Villalba Cristino</p>
                <p className="text-3xl font-bold mt-2 tracking-tight">{formatMoneyCompact(totales.vc)}</p>
                <p className="text-emerald-300/70 text-xs mt-1">{formatMoney(totales.vc)}</p>
              </div>
              <div className="p-3 bg-white/20 rounded-xl">
                <Building2 className="h-6 w-6" />
              </div>
            </div>
          </div>

          {/* Alertas de Facturas */}
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200 card-hover">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-slate-500 text-sm font-medium">Estado de Facturas</p>
                <div className="flex items-center gap-3 mt-3">
                  <div className="text-center">
                    <span className="block text-2xl font-bold text-emerald-600">{alertas.verde}</span>
                    <span className="text-xs text-slate-500">Al día</span>
                  </div>
                  <div className="w-px h-10 bg-slate-200"></div>
                  <div className="text-center">
                    <span className="block text-2xl font-bold text-amber-500">{alertas.amarillo}</span>
                    <span className="text-xs text-slate-500">30-40d</span>
                  </div>
                  <div className="w-px h-10 bg-slate-200"></div>
                  <div className="text-center">
                    <span className="block text-2xl font-bold text-red-500">{alertas.rojo}</span>
                    <span className="text-xs text-slate-500">+40d</span>
                  </div>
                </div>
              </div>
              <div className="p-3 bg-amber-50 rounded-xl">
                <AlertTriangle className="h-6 w-6 text-amber-500" />
              </div>
            </div>
          </div>
        </div>

        {/* Cuenta Interna Premium */}
        {(cuentaInterna.length > 0 && (cuentaInterna[0].monto_pendiente > 0 || cuentaInterna[1].monto_pendiente > 0)) && (
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 mb-8">
            <div className="flex items-center gap-3 mb-5">
              <div className="p-2 bg-violet-100 rounded-lg">
                <ArrowRightLeft className="h-5 w-5 text-violet-600" />
              </div>
              <h2 className="text-lg font-semibold text-slate-800">Cuenta Interna entre Empresas</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {cuentaInterna.map((cuenta, idx) => (
                <div
                  key={idx}
                  className={`p-5 rounded-xl border-2 ${
                    cuenta.concepto.includes('VH debe')
                      ? 'bg-blue-50 border-blue-200'
                      : 'bg-emerald-50 border-emerald-200'
                  }`}
                >
                  <p className="font-medium text-slate-700">{cuenta.concepto}</p>
                  <p className={`text-2xl font-bold mt-1 ${
                    cuenta.concepto.includes('VH debe') ? 'text-blue-700' : 'text-emerald-700'
                  }`}>
                    {formatMoney(Number(cuenta.monto_pendiente))}
                  </p>
                  {Number(cuenta.monto_pagado) > 0 && (
                    <p className="text-sm text-slate-500 mt-1">
                      Pagado: {formatMoney(Number(cuenta.monto_pagado))}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Navegación Rápida Premium */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <Link href="/proveedores" className="group bg-white rounded-xl p-5 shadow-md border border-slate-200 hover:border-blue-300 hover:shadow-lg transition-all">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
                <span className="font-semibold text-slate-700">Proveedores</span>
              </div>
              <ChevronRight className="h-5 w-5 text-slate-400 group-hover:text-blue-500 transition-colors" />
            </div>
          </Link>

          <Link href="/facturas" className="group bg-white rounded-xl p-5 shadow-md border border-slate-200 hover:border-emerald-300 hover:shadow-lg transition-all">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-100 rounded-lg group-hover:bg-emerald-200 transition-colors">
                  <FileText className="h-5 w-5 text-emerald-600" />
                </div>
                <span className="font-semibold text-slate-700">Facturas</span>
              </div>
              <ChevronRight className="h-5 w-5 text-slate-400 group-hover:text-emerald-500 transition-colors" />
            </div>
          </Link>

          <Link href="/pagos" className="group bg-white rounded-xl p-5 shadow-md border border-slate-200 hover:border-violet-300 hover:shadow-lg transition-all">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-violet-100 rounded-lg group-hover:bg-violet-200 transition-colors">
                  <CreditCard className="h-5 w-5 text-violet-600" />
                </div>
                <span className="font-semibold text-slate-700">Pagos</span>
              </div>
              <ChevronRight className="h-5 w-5 text-slate-400 group-hover:text-violet-500 transition-colors" />
            </div>
          </Link>

          <Link href="/cuenta-interna" className="group bg-white rounded-xl p-5 shadow-md border border-slate-200 hover:border-purple-300 hover:shadow-lg transition-all">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-purple-100 rounded-lg group-hover:bg-purple-200 transition-colors">
                  <ArrowRightLeft className="h-5 w-5 text-purple-600" />
                </div>
                <span className="font-semibold text-slate-700">Cuenta Interna</span>
              </div>
              <ChevronRight className="h-5 w-5 text-slate-400 group-hover:text-purple-500 transition-colors" />
            </div>
          </Link>

          <Link href="/generar-txt" className="group bg-white rounded-xl p-5 shadow-md border border-slate-200 hover:border-amber-300 hover:shadow-lg transition-all">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-100 rounded-lg group-hover:bg-amber-200 transition-colors">
                  <Download className="h-5 w-5 text-amber-600" />
                </div>
                <span className="font-semibold text-slate-700">Generar TXT</span>
              </div>
              <ChevronRight className="h-5 w-5 text-slate-400 group-hover:text-amber-500 transition-colors" />
            </div>
          </Link>
        </div>

        {/* Tabla de Proveedores con Filtros */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
          {/* Header de tabla con filtros */}
          <div className="p-5 border-b border-slate-200 bg-slate-50">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-800">Saldos por Proveedor</h2>
                <p className="text-sm text-slate-500 mt-1">Hacé clic en un proveedor para ver el detalle de facturas</p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                {/* Buscador */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Buscar proveedor..."
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    className="pl-10 pr-4 py-2 bg-white border border-slate-300 rounded-lg text-sm w-full sm:w-64 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Filtro por empresa */}
                <div className="flex items-center gap-1 bg-white border border-slate-300 rounded-lg p-1">
                  <button
                    onClick={() => setFiltroEmpresa('todos')}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      filtroEmpresa === 'todos'
                        ? 'bg-slate-800 text-white'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Todos
                  </button>
                  <button
                    onClick={() => setFiltroEmpresa('VH')}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      filtroEmpresa === 'VH'
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-600 hover:bg-blue-50'
                    }`}
                  >
                    VH
                  </button>
                  <button
                    onClick={() => setFiltroEmpresa('VC')}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      filtroEmpresa === 'VC'
                        ? 'bg-emerald-600 text-white'
                        : 'text-slate-600 hover:bg-emerald-50'
                    }`}
                  >
                    VC
                  </button>
                </div>

                {/* Ordenar */}
                <select
                  value={ordenar}
                  onChange={(e) => setOrdenar(e.target.value as any)}
                  className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="total">Mayor deuda</option>
                  <option value="nombre">Nombre A-Z</option>
                  <option value="vh">Mayor VH</option>
                  <option value="vc">Mayor VC</option>
                </select>
              </div>
            </div>

            {/* Contador de resultados */}
            <p className="text-sm text-slate-500 mt-3">
              Mostrando {saldosFiltrados.length} de {saldos.length} proveedores
            </p>
          </div>

          {/* Tabla con expansión */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-100">
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Proveedor</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Saldo VH</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Saldo VC</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Total</th>
                  <th className="px-5 py-3 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {saldosFiltrados.map((proveedor, idx) => (
                  <>
                    {/* Fila principal del proveedor */}
                    <tr
                      key={proveedor.id}
                      className={`cursor-pointer transition-colors ${
                        expandedProveedor === proveedor.id
                          ? 'bg-blue-50'
                          : 'hover:bg-slate-50'
                      }`}
                      onClick={() => toggleProveedor(proveedor.id)}
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${
                            idx < 3 ? 'bg-gradient-to-br from-amber-400 to-amber-600' : 'bg-slate-400'
                          }`}>
                            {idx + 1}
                          </div>
                          <span className="font-medium text-slate-800">{proveedor.nombre}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-right">
                        {proveedor.saldo_vh > 0 ? (
                          <span className="font-semibold text-blue-700">{formatMoney(Number(proveedor.saldo_vh))}</span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-right">
                        {proveedor.saldo_vc > 0 ? (
                          <span className="font-semibold text-emerald-700">{formatMoney(Number(proveedor.saldo_vc))}</span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <span className="font-bold text-slate-800">{formatMoney(Number(proveedor.saldo_total))}</span>
                      </td>
                      <td className="px-5 py-4">
                        {expandedProveedor === proveedor.id ? (
                          <ChevronDown className="h-5 w-5 text-blue-600" />
                        ) : (
                          <ChevronRight className="h-5 w-5 text-slate-400" />
                        )}
                      </td>
                    </tr>

                    {/* Detalle expandido de facturas */}
                    {expandedProveedor === proveedor.id && (
                      <tr key={`${proveedor.id}-detail`}>
                        <td colSpan={5} className="px-0 py-0 bg-slate-50">
                          <div className="px-8 py-4 border-l-4 border-blue-500">
                            <div className="flex items-center justify-between mb-4">
                              <h4 className="font-semibold text-slate-700">Detalle de Facturas Pendientes</h4>
                              <Link
                                href={`/pagos?proveedor=${proveedor.id}`}
                                className="px-4 py-2 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-700 transition-colors"
                                onClick={(e) => e.stopPropagation()}
                              >
                                Registrar Pago
                              </Link>
                            </div>

                            {loadingFacturas ? (
                              <div className="flex items-center justify-center py-8">
                                <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                                <span className="ml-2 text-slate-500">Cargando facturas...</span>
                              </div>
                            ) : proveedor.facturas && proveedor.facturas.length > 0 ? (
                              <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                  <thead>
                                    <tr className="bg-slate-200/50">
                                      <th className="px-4 py-2 text-left font-semibold text-slate-600">Empresa</th>
                                      <th className="px-4 py-2 text-left font-semibold text-slate-600">Nº Factura</th>
                                      <th className="px-4 py-2 text-left font-semibold text-slate-600">Fecha</th>
                                      <th className="px-4 py-2 text-right font-semibold text-slate-600">Monto Total</th>
                                      <th className="px-4 py-2 text-right font-semibold text-slate-600">Pagado</th>
                                      <th className="px-4 py-2 text-right font-semibold text-slate-600">Saldo</th>
                                      <th className="px-4 py-2 text-center font-semibold text-slate-600">Antigüedad</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-200">
                                    {proveedor.facturas.map((factura) => {
                                      const dias = getDiasAntiguedad(factura.fecha)
                                      return (
                                        <tr key={factura.id} className="hover:bg-white transition-colors">
                                          <td className="px-4 py-3">
                                            <span className={`px-2 py-1 rounded text-xs font-bold ${
                                              factura.empresa === 'VH'
                                                ? 'bg-blue-100 text-blue-700'
                                                : 'bg-emerald-100 text-emerald-700'
                                            }`}>
                                              {factura.empresa}
                                            </span>
                                          </td>
                                          <td className="px-4 py-3 font-medium text-slate-800">{factura.numero}</td>
                                          <td className="px-4 py-3 text-slate-600">{formatDate(factura.fecha)}</td>
                                          <td className="px-4 py-3 text-right text-slate-700">{formatMoney(factura.monto_total)}</td>
                                          <td className="px-4 py-3 text-right">
                                            {factura.total_pagado > 0 ? (
                                              <span className="text-emerald-600">{formatMoney(factura.total_pagado)}</span>
                                            ) : (
                                              <span className="text-slate-400">-</span>
                                            )}
                                          </td>
                                          <td className="px-4 py-3 text-right font-semibold text-slate-800">
                                            {formatMoney(factura.saldo_pendiente)}
                                          </td>
                                          <td className="px-4 py-3 text-center">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getAlertaColor(dias)}`}>
                                              {dias}d
                                            </span>
                                          </td>
                                        </tr>
                                      )
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            ) : (
                              <p className="text-slate-500 py-4">No hay facturas pendientes</p>
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

          {saldosFiltrados.length === 0 && (
            <div className="p-12 text-center">
              <Search className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">No se encontraron proveedores</p>
              <p className="text-slate-400 text-sm mt-1">Probá ajustando los filtros</p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
