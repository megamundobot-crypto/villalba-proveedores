'use client'

import { useEffect, useState } from 'react'
import { supabase, SaldoProveedor, CuentaInternaResumen, Factura } from '@/lib/supabase'
import Link from 'next/link'
import ProtectedRoute from '@/components/ProtectedRoute'
import UserMenu from '@/components/UserMenu'
import { useAuth } from '@/contexts/AuthContext'

interface FacturaConPagos extends Factura {
  total_pagado: number
  saldo_pendiente: number
}

interface ProveedorConFacturas extends SaldoProveedor {
  facturas?: FacturaConPagos[]
}

// Icons as components
const Icons = {
  building: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  ),
  users: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  ),
  document: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  creditCard: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
    </svg>
  ),
  exchange: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
    </svg>
  ),
  download: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
  ),
  search: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  ),
  chevronRight: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  ),
  trending: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
    </svg>
  ),
  alert: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
  x: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
}

export default function Dashboard() {
  const { user } = useAuth()
  const [saldos, setSaldos] = useState<ProveedorConFacturas[]>([])
  const [saldosFiltrados, setSaldosFiltrados] = useState<ProveedorConFacturas[]>([])
  const [cuentaInterna, setCuentaInterna] = useState<CuentaInternaResumen[]>([])
  const [loading, setLoading] = useState(true)
  const [totales, setTotales] = useState({ vh: 0, vc: 0, total: 0 })
  const [alertas, setAlertas] = useState({ verde: 0, amarillo: 0, rojo: 0 })
  const [expandedProveedor, setExpandedProveedor] = useState<number | null>(null)
  const [loadingFacturas, setLoadingFacturas] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const [filtroEmpresa, setFiltroEmpresa] = useState<'todos' | 'VH' | 'VC'>('todos')
  const [ordenarPor, setOrdenarPor] = useState<'nombre' | 'vh' | 'vc' | 'total'>('total')
  const [ordenAsc, setOrdenAsc] = useState(false)

  // Selección de facturas individuales
  const [facturasSeleccionadas, setFacturasSeleccionadas] = useState<number[]>([])

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    let filtered = [...saldos]
    if (busqueda) {
      filtered = filtered.filter(s => s.nombre.toLowerCase().includes(busqueda.toLowerCase()))
    }
    if (filtroEmpresa === 'VH') {
      filtered = filtered.filter(s => s.saldo_vh > 0)
    } else if (filtroEmpresa === 'VC') {
      filtered = filtered.filter(s => s.saldo_vc > 0)
    }
    // Ordenamiento dinámico
    filtered.sort((a, b) => {
      let comparison = 0
      switch (ordenarPor) {
        case 'nombre':
          comparison = a.nombre.localeCompare(b.nombre)
          break
        case 'vh':
          comparison = b.saldo_vh - a.saldo_vh
          break
        case 'vc':
          comparison = b.saldo_vc - a.saldo_vc
          break
        case 'total':
        default:
          comparison = b.saldo_total - a.saldo_total
          break
      }
      return ordenAsc ? -comparison : comparison
    })
    setSaldosFiltrados(filtered)
  }, [saldos, busqueda, filtroEmpresa, ordenarPor, ordenAsc])

  const handleSort = (columna: 'nombre' | 'vh' | 'vc' | 'total') => {
    if (ordenarPor === columna) {
      setOrdenAsc(!ordenAsc)
    } else {
      setOrdenarPor(columna)
      setOrdenAsc(columna === 'nombre') // A-Z por defecto para nombre, mayor a menor para números
    }
  }

  // Funciones de selección de facturas
  const toggleFacturaSeleccionada = (facturaId: number) => {
    setFacturasSeleccionadas(prev =>
      prev.includes(facturaId)
        ? prev.filter(id => id !== facturaId)
        : [...prev, facturaId]
    )
  }

  const limpiarSeleccionFacturas = () => {
    setFacturasSeleccionadas([])
  }

  // Obtener todas las facturas de todos los proveedores para calcular totales
  const todasLasFacturas: FacturaConPagos[] = saldosFiltrados
    .filter(p => p.facturas)
    .flatMap(p => p.facturas || [])

  // Calcular totales de facturas seleccionadas
  const totalesSeleccionados = {
    cantidad: facturasSeleccionadas.length,
    vh: todasLasFacturas
      .filter(f => facturasSeleccionadas.includes(f.id) && f.empresa === 'VH')
      .reduce((sum, f) => sum + f.saldo_pendiente, 0),
    vc: todasLasFacturas
      .filter(f => facturasSeleccionadas.includes(f.id) && f.empresa === 'VC')
      .reduce((sum, f) => sum + f.saldo_pendiente, 0),
    total: todasLasFacturas
      .filter(f => facturasSeleccionadas.includes(f.id))
      .reduce((sum, f) => sum + f.saldo_pendiente, 0),
    montoTotal: todasLasFacturas
      .filter(f => facturasSeleccionadas.includes(f.id))
      .reduce((sum, f) => sum + f.monto_total, 0)
  }

  async function loadData() {
    setLoading(true)
    const { data: facturasData } = await supabase
      .from('facturas')
      .select('*, proveedores(nombre)')
      .in('estado', ['pendiente', 'parcial'])

    const { data: pagosData } = await supabase.from('pagos').select('factura_id, monto')

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

    const { data: cuentaData } = await supabase.from('cuenta_interna').select('*')
    if (cuentaData && cuentaData.length > 0) {
      const vhDebeVc = cuentaData.reduce((sum, c) => sum + (c.pagado ? 0 : Number(c.debe_vh)), 0)
      const vcDebeVh = cuentaData.reduce((sum, c) => sum + (c.pagado ? 0 : Number(c.debe_vc)), 0)
      setCuentaInterna([
        { concepto: 'VH debe a VC', monto_pendiente: vhDebeVc, monto_pagado: 0, monto_total: vhDebeVc },
        { concepto: 'VC debe a VH', monto_pendiente: vcDebeVh, monto_pagado: 0, monto_total: vcDebeVh }
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

    const { data: pagosData } = await supabase.from('pagos').select('factura_id, monto')

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

      setSaldos(prev => prev.map(p => p.id === proveedorId ? { ...p, facturas: facturasConPagos } : p))
      setSaldosFiltrados(prev => prev.map(p => p.id === proveedorId ? { ...p, facturas: facturasConPagos } : p))
    }
    setLoadingFacturas(false)
  }

  function toggleProveedor(proveedorId: number) {
    if (expandedProveedor === proveedorId) {
      setExpandedProveedor(null)
    } else {
      setExpandedProveedor(proveedorId)
      const proveedor = saldos.find(p => p.id === proveedorId)
      if (!proveedor?.facturas) loadFacturasProveedor(proveedorId)
    }
  }

  const formatMoney = (amount: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount)

  const formatMoneyCompact = (amount: number) => {
    if (amount >= 1000000000) return `${(amount / 1000000000).toFixed(1)}B`
    if (amount >= 1000000) return `${(amount / 1000000).toFixed(1)}M`
    if (amount >= 1000) return `${(amount / 1000).toFixed(0)}K`
    return formatMoney(amount)
  }

  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' })

  const getDiasAntiguedad = (fecha: string) => Math.floor((new Date().getTime() - new Date(fecha).getTime()) / (1000 * 60 * 60 * 24))

  const getAlertaStyle = (dias: number) => {
    if (dias <= 30) return { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' }
    if (dias <= 40) return { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' }
    return { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-mesh">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto"></div>
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
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-lg shadow-indigo-500/25">
                  <span className="text-white font-bold text-lg">V</span>
                </div>
                <div>
                  <h1 className="text-white font-semibold text-lg">Villalba Sistema</h1>
                  <p className="text-slate-400 text-xs">Gestión de Proveedores</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-emerald-500/20 rounded-full border border-emerald-500/30">
                  <div className="status-dot status-online"></div>
                  <span className="text-emerald-400 text-xs font-medium">Activo</span>
                </div>
                <UserMenu />
              </div>
            </div>
          </div>
        </header>

        <main className="container-app py-8">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
            <div className="card-stat p-6 animate-fadeIn">
              <div className="flex items-start justify-between">
                <div>
                  <p className="stat-label mb-2">Deuda Total</p>
                  <p className="stat-value text-slate-800">${formatMoneyCompact(totales.total)}</p>
                  <p className="text-sm text-slate-400 mt-1 tabular-nums">{formatMoney(totales.total)}</p>
                </div>
                <div className="w-12 h-12 rounded-2xl gradient-total flex items-center justify-center text-white">{Icons.trending}</div>
              </div>
            </div>

            <div className="card-stat p-6 animate-fadeIn" style={{animationDelay: '0.05s'}}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="stat-label mb-2">Villalba Hermanos</p>
                  <p className="stat-value text-blue-600">${formatMoneyCompact(totales.vh)}</p>
                  <p className="text-sm text-slate-400 mt-1 tabular-nums">{formatMoney(totales.vh)}</p>
                </div>
                <div className="w-12 h-12 rounded-2xl gradient-vh flex items-center justify-center text-white">{Icons.building}</div>
              </div>
            </div>

            <div className="card-stat p-6 animate-fadeIn" style={{animationDelay: '0.1s'}}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="stat-label mb-2">Villalba Cristino</p>
                  <p className="stat-value text-emerald-600">${formatMoneyCompact(totales.vc)}</p>
                  <p className="text-sm text-slate-400 mt-1 tabular-nums">{formatMoney(totales.vc)}</p>
                </div>
                <div className="w-12 h-12 rounded-2xl gradient-vc flex items-center justify-center text-white">{Icons.building}</div>
              </div>
            </div>

            <div className="card-stat p-6 animate-fadeIn" style={{animationDelay: '0.15s'}}>
              <div className="flex items-start justify-between mb-4">
                <p className="stat-label">Estado Facturas</p>
                <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-500">{Icons.alert}</div>
              </div>
              <div className="flex items-center justify-between">
                <div className="text-center"><p className="text-2xl font-bold text-emerald-600">{alertas.verde}</p><p className="text-xs text-slate-500">Al día</p></div>
                <div className="w-px h-10 bg-slate-200"></div>
                <div className="text-center"><p className="text-2xl font-bold text-amber-500">{alertas.amarillo}</p><p className="text-xs text-slate-500">30-40d</p></div>
                <div className="w-px h-10 bg-slate-200"></div>
                <div className="text-center"><p className="text-2xl font-bold text-red-500">{alertas.rojo}</p><p className="text-xs text-slate-500">+40d</p></div>
              </div>
            </div>
          </div>

          {/* Cuenta Interna */}
          {cuentaInterna.length > 0 && (cuentaInterna[0].monto_pendiente > 0 || cuentaInterna[1].monto_pendiente > 0) && (
            <div className="card-premium p-6 mb-8 animate-slideUp" style={{animationDelay: '0.2s'}}>
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center text-violet-600">{Icons.exchange}</div>
                <div><h2 className="font-semibold text-slate-800">Cuenta Interna</h2><p className="text-sm text-slate-500">Balance entre empresas</p></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-5 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100">
                  <p className="text-sm font-medium text-blue-600 mb-1">VH debe a VC</p>
                  <p className="text-2xl font-bold text-blue-700 tabular-nums">{formatMoney(Number(cuentaInterna[0].monto_pendiente))}</p>
                </div>
                <div className="p-5 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100">
                  <p className="text-sm font-medium text-emerald-600 mb-1">VC debe a VH</p>
                  <p className="text-2xl font-bold text-emerald-700 tabular-nums">{formatMoney(Number(cuentaInterna[1].monto_pendiente))}</p>
                </div>
              </div>
            </div>
          )}

          {/* Quick Nav */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
            {[
              { href: '/proveedores', icon: Icons.users, label: 'Proveedores', bg: 'bg-blue-100', color: 'text-blue-600' },
              { href: '/facturas', icon: Icons.document, label: 'Facturas', bg: 'bg-emerald-100', color: 'text-emerald-600' },
              { href: '/pagos', icon: Icons.creditCard, label: 'Pagos', bg: 'bg-violet-100', color: 'text-violet-600' },
              { href: '/cuenta-interna', icon: Icons.exchange, label: 'Cuenta Interna', bg: 'bg-purple-100', color: 'text-purple-600' },
              { href: '/generar-txt', icon: Icons.download, label: 'Generar TXT', bg: 'bg-amber-100', color: 'text-amber-600' },
            ].map((item, idx) => (
              <Link key={item.href} href={item.href} className="card-interactive p-5 group animate-fadeIn" style={{animationDelay: `${0.25 + idx * 0.05}s`}}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl ${item.bg} flex items-center justify-center ${item.color} group-hover:scale-110 transition-transform`}>{item.icon}</div>
                    <span className="font-medium text-slate-700">{item.label}</span>
                  </div>
                  <span className="text-slate-400 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all">{Icons.chevronRight}</span>
                </div>
              </Link>
            ))}
          </div>

          {/* Panel de selección de facturas - STICKY siempre visible */}
          {facturasSeleccionadas.length > 0 && (
            <div className="sticky top-20 z-40 mb-6 animate-fadeIn">
              <div className="p-5 bg-slate-900 rounded-2xl border-2 border-slate-700 shadow-2xl">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-5">
                    <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-600 text-white shadow-lg">
                      <span className="text-3xl font-bold">{totalesSeleccionados.cantidad}</span>
                    </div>
                    <div>
                      <p className="font-bold text-white text-xl mb-2">
                        {totalesSeleccionados.cantidad === 1 ? 'Factura seleccionada' : 'Facturas seleccionadas'}
                      </p>
                      <div className="flex items-center gap-6 flex-wrap">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400 text-sm">VH:</span>
                          <span className="text-blue-400 font-bold text-lg">{formatMoney(totalesSeleccionados.vh)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400 text-sm">VC:</span>
                          <span className="text-emerald-400 font-bold text-lg">{formatMoney(totalesSeleccionados.vc)}</span>
                        </div>
                        <div className="flex items-center gap-2 bg-yellow-500/20 px-4 py-2 rounded-xl">
                          <span className="text-yellow-300 text-sm font-medium">TOTAL:</span>
                          <span className="text-yellow-300 font-extrabold text-2xl">{formatMoney(totalesSeleccionados.total)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={limpiarSeleccionFacturas}
                    className="flex items-center gap-2 px-5 py-3 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors shadow-lg"
                  >
                    {Icons.x}
                    Limpiar
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Table */}
          <div className="card-premium overflow-hidden animate-slideUp" style={{animationDelay: '0.3s'}}>
            <div className="p-5 border-b border-slate-100">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div><h2 className="text-lg font-semibold text-slate-800">Saldos por Proveedor</h2><p className="text-sm text-slate-500">Click para ver detalle</p></div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">{Icons.search}</span>
                    <input type="text" placeholder="Buscar..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} className="input-search w-full sm:w-64" />
                  </div>
                  <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl">
                    {['todos', 'VH', 'VC'].map((f) => (
                      <button key={f} onClick={() => setFiltroEmpresa(f as any)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filtroEmpresa === f ? f === 'VH' ? 'bg-blue-600 text-white' : f === 'VC' ? 'bg-emerald-600 text-white' : 'bg-white text-slate-800 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}>
                        {f === 'todos' ? 'Todos' : f}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <p className="text-sm text-slate-500 mt-4">{saldosFiltrados.length} de {saldos.length} proveedores</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-100 border-b-2 border-slate-200">
                    <th
                      className="px-6 py-4 text-left cursor-pointer hover:bg-slate-200 transition-colors group"
                      onClick={(e) => { e.stopPropagation(); handleSort('nombre') }}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-700 uppercase tracking-wider">Proveedor</span>
                        <span className={`transition-all ${ordenarPor === 'nombre' ? 'text-indigo-600' : 'text-slate-300 group-hover:text-slate-400'}`}>
                          {ordenarPor === 'nombre' ? (ordenAsc ? '↑' : '↓') : '↕'}
                        </span>
                      </div>
                    </th>
                    <th
                      className="px-6 py-4 text-center cursor-pointer hover:bg-slate-200 transition-colors group"
                      onClick={(e) => { e.stopPropagation(); handleSort('vh') }}
                    >
                      <div className="flex items-center justify-center gap-2">
                        <span className="text-sm font-bold text-blue-700 uppercase tracking-wider">Saldo VH</span>
                        <span className={`transition-all ${ordenarPor === 'vh' ? 'text-blue-600' : 'text-slate-300 group-hover:text-slate-400'}`}>
                          {ordenarPor === 'vh' ? (ordenAsc ? '↑' : '↓') : '↕'}
                        </span>
                      </div>
                    </th>
                    <th
                      className="px-6 py-4 text-center cursor-pointer hover:bg-slate-200 transition-colors group"
                      onClick={(e) => { e.stopPropagation(); handleSort('vc') }}
                    >
                      <div className="flex items-center justify-center gap-2">
                        <span className="text-sm font-bold text-emerald-700 uppercase tracking-wider">Saldo VC</span>
                        <span className={`transition-all ${ordenarPor === 'vc' ? 'text-emerald-600' : 'text-slate-300 group-hover:text-slate-400'}`}>
                          {ordenarPor === 'vc' ? (ordenAsc ? '↑' : '↓') : '↕'}
                        </span>
                      </div>
                    </th>
                    <th
                      className="px-6 py-4 text-center cursor-pointer hover:bg-slate-200 transition-colors group"
                      onClick={(e) => { e.stopPropagation(); handleSort('total') }}
                    >
                      <div className="flex items-center justify-center gap-2">
                        <span className="text-sm font-bold text-slate-800 uppercase tracking-wider">Total</span>
                        <span className={`transition-all ${ordenarPor === 'total' ? 'text-indigo-600' : 'text-slate-300 group-hover:text-slate-400'}`}>
                          {ordenarPor === 'total' ? (ordenAsc ? '↑' : '↓') : '↕'}
                        </span>
                      </div>
                    </th>
                    <th className="w-12 px-4 py-4"></th>
                  </tr>
                </thead>
                <tbody>
                  {saldosFiltrados.map((prov, idx) => (
                    <>
                      <tr
                        key={prov.id}
                        className={`cursor-pointer transition-colors ${
                          expandedProveedor === prov.id
                            ? 'bg-indigo-50 border-l-4 border-indigo-400'
                            : idx % 2 === 0
                              ? 'bg-white hover:bg-indigo-50'
                              : 'bg-slate-100 hover:bg-indigo-100'
                        }`}
                        onClick={() => toggleProveedor(prov.id)}
                      >
                        <td className="px-6 py-5">
                          <span className="text-base font-semibold text-slate-800">{prov.nombre}</span>
                        </td>
                        <td className="px-6 py-5 text-center">
                          {prov.saldo_vh > 0
                            ? <span className="text-lg font-bold text-blue-600 tabular-nums">{formatMoney(prov.saldo_vh)}</span>
                            : <span className="text-slate-300 text-lg">—</span>
                          }
                        </td>
                        <td className="px-6 py-5 text-center">
                          {prov.saldo_vc > 0
                            ? <span className="text-lg font-bold text-emerald-600 tabular-nums">{formatMoney(prov.saldo_vc)}</span>
                            : <span className="text-slate-300 text-lg">—</span>
                          }
                        </td>
                        <td className="px-6 py-5 text-center">
                          <span className="text-lg font-extrabold text-slate-800 tabular-nums">{formatMoney(prov.saldo_total)}</span>
                        </td>
                        <td className="px-4 py-5">
                          <span className={`transition-transform inline-block ${expandedProveedor === prov.id ? 'rotate-90 text-indigo-600' : 'text-slate-400'}`}>
                            {Icons.chevronRight}
                          </span>
                        </td>
                      </tr>
                      {expandedProveedor === prov.id && (
                        <tr><td colSpan={5} className="p-0 bg-slate-50/80">
                          <div className="p-6 border-l-4 border-indigo-500">
                            <div className="flex items-center justify-between mb-4">
                              <h4 className="font-semibold text-slate-700">Facturas Pendientes</h4>
                              <Link href={`/pagos?proveedor=${prov.id}`} onClick={(e) => e.stopPropagation()} className="btn-primary text-sm">Registrar Pago</Link>
                            </div>
                            {loadingFacturas ? (
                              <div className="flex items-center justify-center py-8"><div className="w-6 h-6 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div><span className="ml-3 text-slate-500">Cargando...</span></div>
                            ) : prov.facturas && prov.facturas.filter(fc => filtroEmpresa === 'todos' || fc.empresa === filtroEmpresa).length > 0 ? (
                              <div className="overflow-x-auto rounded-xl border border-slate-200">
                                <table className="w-full text-sm">
                                  <thead>
                                    <tr className="bg-slate-100">
                                      <th className="px-3 py-3 w-10"></th>
                                      <th className="px-4 py-3 text-left font-semibold text-slate-600">Emp</th>
                                      <th className="px-4 py-3 text-left font-semibold text-slate-600">N° FC</th>
                                      <th className="px-4 py-3 text-left font-semibold text-slate-600">Fecha</th>
                                      <th className="px-4 py-3 text-right font-semibold text-slate-600">Total</th>
                                      <th className="px-4 py-3 text-right font-semibold text-slate-600">Pagado</th>
                                      <th className="px-4 py-3 text-right font-semibold text-slate-600">Saldo</th>
                                      <th className="px-4 py-3 text-center font-semibold text-slate-600">Días</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100 bg-white">
                                    {prov.facturas
                                      .filter(fc => filtroEmpresa === 'todos' || fc.empresa === filtroEmpresa)
                                      .map((fc) => {
                                      const dias = getDiasAntiguedad(fc.fecha)
                                      const st = getAlertaStyle(dias)
                                      const isSelected = facturasSeleccionadas.includes(fc.id)
                                      return (
                                        <tr
                                          key={fc.id}
                                          className={`cursor-pointer transition-colors ${
                                            isSelected
                                              ? 'bg-indigo-100 hover:bg-indigo-150'
                                              : 'hover:bg-slate-50'
                                          }`}
                                          onClick={(e) => { e.stopPropagation(); toggleFacturaSeleccionada(fc.id) }}
                                        >
                                          <td className="px-3 py-3">
                                            <input
                                              type="checkbox"
                                              checked={isSelected}
                                              onChange={() => toggleFacturaSeleccionada(fc.id)}
                                              onClick={(e) => e.stopPropagation()}
                                              className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                            />
                                          </td>
                                          <td className="px-4 py-3"><span className={`badge ${fc.empresa === 'VH' ? 'badge-vh' : 'badge-vc'}`}>{fc.empresa}</span></td>
                                          <td className="px-4 py-3 font-medium text-slate-700">{fc.numero}</td>
                                          <td className="px-4 py-3 text-slate-600">{formatDate(fc.fecha)}</td>
                                          <td className="px-4 py-3 text-right tabular-nums">{formatMoney(fc.monto_total)}</td>
                                          <td className="px-4 py-3 text-right tabular-nums">{fc.total_pagado > 0 ? <span className="text-emerald-600">{formatMoney(fc.total_pagado)}</span> : <span className="text-slate-300">—</span>}</td>
                                          <td className="px-4 py-3 text-right font-bold tabular-nums text-red-600">{formatMoney(fc.saldo_pendiente)}</td>
                                          <td className="px-4 py-3 text-center"><span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${st.bg} ${st.text} border ${st.border}`}>{dias}d</span></td>
                                        </tr>
                                      )
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            ) : <p className="text-slate-500 py-4 text-center">
                                No hay facturas {filtroEmpresa !== 'todos' ? `de ${filtroEmpresa === 'VH' ? 'Villalba Hermanos' : 'Villalba Cristino'}` : ''}
                              </p>}
                          </div>
                        </td></tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>

            {saldosFiltrados.length === 0 && (
              <div className="p-16 text-center">
                <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4 text-slate-400">{Icons.search}</div>
                <p className="text-slate-500 font-medium">No se encontraron proveedores</p>
                <p className="text-slate-400 text-sm mt-1">Ajustá los filtros</p>
              </div>
            )}
          </div>
        </main>
      </div>
    </ProtectedRoute>
  )
}
