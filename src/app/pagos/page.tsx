'use client'

import { useEffect, useState, Suspense } from 'react'
import { supabase, Factura } from '@/lib/supabase'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import ProtectedRoute from '@/components/ProtectedRoute'
import UserMenu from '@/components/UserMenu'
import NavRapida from '@/components/NavRapida'
import { BancoIcon } from '@/components/BancoLogo'
import { getBancoFromCBU } from '@/lib/bancos-argentina'

// Función para redondear a 2 decimales
const redondear = (num: number): number => Math.round(num * 100) / 100

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
  chevronRight: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
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
  warning: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
  clock: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  list: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
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
  const [lotesPendientes, setLotesPendientes] = useState(0)

  const [ordenarPor, setOrdenarPor] = useState<'nombre' | 'vh' | 'vc' | 'total'>('total')
  const [ordenAsc, setOrdenAsc] = useState(false)
  const [empresaBloqueada, setEmpresaBloqueada] = useState<'VH' | 'VC' | null>(null)

  const CBU_VC = '3110003611000000296085'
  const CBU_VH = '3110030211000006923105'

  useEffect(() => {
    loadData()
    loadLotesPendientes()
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

    filtered.sort((a, b) => {
      let comparison = 0
      switch (ordenarPor) {
        case 'nombre': comparison = a.nombre.localeCompare(b.nombre); break
        case 'vh': comparison = b.total_vh - a.total_vh; break
        case 'vc': comparison = b.total_vc - a.total_vc; break
        default: comparison = b.total - a.total
      }
      return ordenAsc ? -comparison : comparison
    })

    setProveedoresFiltrados(filtered)
  }, [proveedores, busqueda, filtroEmpresa, ordenarPor, ordenAsc])

  useEffect(() => {
    if (pagosSeleccionados.length === 0) {
      setEmpresaBloqueada(null)
    } else {
      setEmpresaBloqueada(pagosSeleccionados[0].cuenta_origen)
    }
  }, [pagosSeleccionados])

  async function loadLotesPendientes() {
    const { count } = await supabase
      .from('lotes_pago')
      .select('*', { count: 'exact', head: true })
      .eq('estado', 'pendiente')
    setLotesPendientes(count || 0)
  }

  const handleSort = (columna: 'nombre' | 'vh' | 'vc' | 'total') => {
    if (ordenarPor === columna) setOrdenAsc(!ordenAsc)
    else { setOrdenarPor(columna); setOrdenAsc(columna === 'nombre') }
  }

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
        pagosPorFactura[p.factura_id] = redondear((pagosPorFactura[p.factura_id] || 0) + Number(p.monto))
      })
    }

    const cbusPorProveedor: Record<number, string> = {}
    if (cbusData) {
      cbusData.forEach(c => { cbusPorProveedor[c.proveedor_id] = c.cbu })
    }

    if (facturasData) {
      const proveedoresMap: Record<number, ProveedorAgrupado> = {}
      facturasData.forEach((f: any) => {
        const pagado = pagosPorFactura[f.id] || 0
        const saldo = redondear(f.monto_total - pagado)
        const provId = f.proveedor_id
        const provNombre = f.proveedores?.nombre || 'Sin nombre'

        if (!proveedoresMap[provId]) {
          proveedoresMap[provId] = {
            id: provId, nombre: provNombre, facturas: [],
            total_vh: 0, total_vc: 0, total: 0,
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
          proveedoresMap[provId].total_vh = redondear(proveedoresMap[provId].total_vh + saldo)
        } else {
          proveedoresMap[provId].total_vc = redondear(proveedoresMap[provId].total_vc + saldo)
        }
        proveedoresMap[provId].total = redondear(proveedoresMap[provId].total + saldo)
      })

      setProveedores(Object.values(proveedoresMap).sort((a, b) => b.total - a.total))
    }
    setLoading(false)
  }

  function toggleProveedor(proveedorId: number) {
    const newExpanded = new Set(expandedProveedores)
    if (newExpanded.has(proveedorId)) newExpanded.delete(proveedorId)
    else newExpanded.add(proveedorId)
    setExpandedProveedores(newExpanded)
  }

  function agregarPago(factura: FacturaConPagos, tipo: 'cancela' | 'a_cuenta', montoCustom?: number) {
    const empresaFactura = factura.empresa as 'VH' | 'VC'
    if (empresaBloqueada && empresaBloqueada !== empresaFactura) {
      alert(`⚠️ No podés mezclar facturas de VH y VC.\nYa tenés facturas de ${empresaBloqueada === 'VH' ? 'Villalba Hermanos' : 'Villalba Cristino'} seleccionadas.`)
      return
    }

    const existe = pagosSeleccionados.find(p => p.factura.id === factura.id)
    if (existe) {
      setPagosSeleccionados(prev => prev.map(p =>
        p.factura.id === factura.id
          ? { ...p, tipo, monto: redondear(montoCustom || (tipo === 'cancela' ? factura.saldo_pendiente : p.monto)) }
          : p
      ))
      return
    }
    const monto = redondear(tipo === 'cancela' ? factura.saldo_pendiente : (montoCustom || 0))
    setPagosSeleccionados(prev => [...prev, { factura, tipo, monto, cuenta_origen: empresaFactura }])
  }

  function quitarPago(facturaId: number) {
    setPagosSeleccionados(prev => prev.filter(p => p.factura.id !== facturaId))
  }

  function actualizarMontoPago(facturaId: number, monto: number) {
    setPagosSeleccionados(prev => prev.map(p =>
      p.factura.id === facturaId ? { ...p, monto: redondear(monto) } : p
    ))
  }

  function limpiarCarrito() { setPagosSeleccionados([]) }
  function isPagoSeleccionado(facturaId: number): boolean { return pagosSeleccionados.some(p => p.factura.id === facturaId) }
  const totalGeneral = redondear(pagosSeleccionados.reduce((sum, p) => sum + p.monto, 0))

  async function confirmarYGenerarTxt() {
    if (pagosSeleccionados.length === 0) return
    setGeneratingTxt(true)

    const fecha = new Date()
    const fechaStr = `${fecha.getDate().toString().padStart(2, '0')}${(fecha.getMonth() + 1).toString().padStart(2, '0')}${fecha.getFullYear().toString().slice(-2)}`
    const cuenta = empresaBloqueada || 'VC'
    const CBU_ORIGEN = cuenta === 'VC' ? CBU_VC : CBU_VH
    const nombreArchivo = `transfer_masiva_${cuenta}_${fechaStr}.txt`

    // 1. Crear lote de pago (pendiente de confirmación)
    const { data: lote, error: loteError } = await supabase
      .from('lotes_pago')
      .insert({
        empresa: cuenta,
        total: totalGeneral,
        cantidad_pagos: pagosSeleccionados.length,
        estado: 'pendiente',
        archivo_txt: nombreArchivo
      })
      .select()
      .single()

    if (loteError || !lote) {
      alert('Error al crear el lote de pago')
      setGeneratingTxt(false)
      return
    }

    // 2. Insertar detalles del lote (sin confirmar aún)
    const detalles = pagosSeleccionados.map(pago => ({
      lote_id: lote.id,
      factura_id: pago.factura.id,
      proveedor_id: pago.factura.proveedor_id,
      proveedor_nombre: pago.factura.proveedor_nombre,
      factura_numero: pago.factura.numero,
      cbu: pago.factura.cbu_principal,
      banco: getBancoFromCBU(pago.factura.cbu_principal || '')?.nombreCorto || null,
      monto: pago.monto,
      tipo: pago.tipo,
      confirmado: false
    }))

    await supabase.from('lotes_pago_detalle').insert(detalles)

    // 3. Generar archivo TXT
    const pagosPorProveedor: Record<string, { cbu: string, monto: number, facturas: string[], concepto: string }> = {}
    for (const pago of pagosSeleccionados) {
      const cbu = pago.factura.cbu_principal || ''
      if (!cbu) continue
      if (!pagosPorProveedor[cbu]) {
        pagosPorProveedor[cbu] = { cbu, monto: 0, facturas: [], concepto: 'CANCELA' }
      }
      pagosPorProveedor[cbu].monto = redondear(pagosPorProveedor[cbu].monto + pago.monto)
      pagosPorProveedor[cbu].facturas.push(pago.factura.numero)
      if (pago.tipo === 'a_cuenta') pagosPorProveedor[cbu].concepto = 'A CUENTA'
    }

    const lineas: string[] = []
    for (const [cbu, data] of Object.entries(pagosPorProveedor)) {
      const montoEnCentavos = Math.round(data.monto * 100)
      const referencia = `FAC ${data.facturas.join(' ')}`
      const linea = CBU_ORIGEN + cbu + ' '.repeat(44) +
        montoEnCentavos.toString().padStart(12, '0') +
        data.concepto.padEnd(50) + referencia.padEnd(50) + ' '.repeat(15) + '1'
      lineas.push(linea)
    }

    const totalCentavos = Math.round(totalGeneral * 100)
    const trailer = (lineas.length + 1).toString().padStart(5, '0') +
      totalCentavos.toString().padStart(17, '0') + ' '.repeat(216 - 22)
    lineas.push(trailer)

    // Descargar archivo
    const contenido = lineas.join('\r\n') + '\r\n'
    const blob = new Blob([contenido], { type: 'text/plain;charset=latin1' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = nombreArchivo
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    setGeneratingTxt(false)
    setShowConfirmModal(false)
    setPagosSeleccionados([])
    loadLotesPendientes()

    // Mostrar mensaje informativo
    alert(`✅ Lote de pago #${lote.id} creado correctamente.\n\n📁 Archivo: ${nombreArchivo}\n💰 Total: $${totalGeneral.toLocaleString('es-AR', { minimumFractionDigits: 2 })}\n\n⏳ Ahora hacé las transferencias en el banco y luego confirmá los pagos en "Confirmar Pagos".`)
  }

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(redondear(amount))
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

  const puedeAgregar = (factura: FacturaConPagos) => {
    if (!empresaBloqueada) return true
    return factura.empresa === empresaBloqueada
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
              <div className="flex items-center gap-3">
                {/* Botón para ir a confirmar pagos */}
                <Link
                  href="/pagos/confirmar"
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all ${
                    lotesPendientes > 0
                      ? 'bg-amber-500 text-white hover:bg-amber-600 animate-pulse'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  {Icons.clock}
                  <span>Confirmar Pagos</span>
                  {lotesPendientes > 0 && (
                    <span className="px-2 py-0.5 bg-white/20 rounded-full text-xs font-bold">
                      {lotesPendientes}
                    </span>
                  )}
                </Link>
                <Link
                  href="/pagos/historial"
                  className="flex items-center gap-2 px-4 py-2 bg-slate-700 text-slate-300 rounded-xl font-medium hover:bg-slate-600 transition-all"
                >
                  {Icons.list}
                  <span>Historial</span>
                </Link>
                <UserMenu />
              </div>
            </div>
          </div>
        </header>
        <NavRapida />

        <main className="container-app py-6">
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
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

              {empresaBloqueada && (
                <div className={`p-4 rounded-xl border-2 flex items-center gap-3 animate-fadeIn ${
                  empresaBloqueada === 'VH' ? 'bg-blue-50 border-blue-300' : 'bg-emerald-50 border-emerald-300'
                }`}>
                  {Icons.warning}
                  <div>
                    <p className={`font-semibold ${empresaBloqueada === 'VH' ? 'text-blue-700' : 'text-emerald-700'}`}>
                      Modo {empresaBloqueada === 'VH' ? 'Villalba Hermanos' : 'Villalba Cristino'}
                    </p>
                    <p className="text-sm text-slate-600">
                      Solo podés agregar facturas de {empresaBloqueada}. Para cambiar, limpiá la selección actual.
                    </p>
                  </div>
                </div>
              )}

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

              {/* Tabla de proveedores */}
              <div className="card-premium overflow-hidden animate-slideUp" style={{animationDelay: '0.15s'}}>
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-100 border-b-2 border-slate-200">
                      <th className="w-10 px-4 py-3"></th>
                      <th className="px-4 py-3 text-left cursor-pointer hover:bg-slate-200 transition-colors" onClick={() => handleSort('nombre')}>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Proveedor</span>
                          <span className={ordenarPor === 'nombre' ? 'text-indigo-600' : 'text-slate-300'}>{ordenarPor === 'nombre' ? (ordenAsc ? '↑' : '↓') : '↕'}</span>
                        </div>
                      </th>
                      <th className="px-4 py-3 text-right cursor-pointer hover:bg-slate-200 transition-colors" onClick={() => handleSort('vh')}>
                        <div className="flex items-center justify-end gap-2">
                          <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Saldo VH</span>
                          <span className={ordenarPor === 'vh' ? 'text-blue-600' : 'text-slate-300'}>{ordenarPor === 'vh' ? (ordenAsc ? '↑' : '↓') : '↕'}</span>
                        </div>
                      </th>
                      <th className="px-4 py-3 text-right cursor-pointer hover:bg-slate-200 transition-colors" onClick={() => handleSort('vc')}>
                        <div className="flex items-center justify-end gap-2">
                          <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Saldo VC</span>
                          <span className={ordenarPor === 'vc' ? 'text-emerald-600' : 'text-slate-300'}>{ordenarPor === 'vc' ? (ordenAsc ? '↑' : '↓') : '↕'}</span>
                        </div>
                      </th>
                      <th className="px-4 py-3 text-right cursor-pointer hover:bg-slate-200 transition-colors" onClick={() => handleSort('total')}>
                        <div className="flex items-center justify-end gap-2">
                          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Total</span>
                          <span className={ordenarPor === 'total' ? 'text-indigo-600' : 'text-slate-300'}>{ordenarPor === 'total' ? (ordenAsc ? '↑' : '↓') : '↕'}</span>
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {proveedoresFiltrados.map((proveedor, idx) => (
                      <>
                        <tr
                          key={proveedor.id}
                          id={`proveedor-${proveedor.id}`}
                          className={`cursor-pointer transition-colors ${
                            expandedProveedores.has(proveedor.id) ? 'bg-violet-100 border-l-4 border-violet-500'
                              : idx % 2 === 0 ? 'bg-white hover:bg-violet-50' : 'bg-slate-100 hover:bg-violet-100'
                          }`}
                          onClick={() => toggleProveedor(proveedor.id)}
                        >
                          <td className="px-4 py-4">
                            <span className={`transition-transform inline-block ${expandedProveedores.has(proveedor.id) ? 'rotate-90 text-violet-600' : 'text-slate-400'}`}>
                              {Icons.chevronRight}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <p className="font-semibold text-slate-800">{proveedor.nombre}</p>
                            <p className="text-xs text-slate-500">{proveedor.facturas.length} facturas</p>
                          </td>
                          <td className="px-4 py-4 text-right">
                            {proveedor.total_vh > 0 ? <span className="font-bold text-blue-600 tabular-nums">{formatMoney(proveedor.total_vh)}</span> : <span className="text-slate-300">—</span>}
                          </td>
                          <td className="px-4 py-4 text-right">
                            {proveedor.total_vc > 0 ? <span className="font-bold text-emerald-600 tabular-nums">{formatMoney(proveedor.total_vc)}</span> : <span className="text-slate-300">—</span>}
                          </td>
                          <td className="px-4 py-4 text-right">
                            <span className="font-extrabold text-slate-800 tabular-nums">{formatMoney(proveedor.total)}</span>
                          </td>
                        </tr>

                        {expandedProveedores.has(proveedor.id) && (
                          <tr key={`${proveedor.id}-detail`}>
                            <td colSpan={5} className="p-0">
                              <div className="bg-slate-50 border-t border-slate-200">
                                <table className="w-full text-sm">
                                  <thead className="bg-slate-200/50">
                                    <tr>
                                      <th className="px-4 py-2 text-left font-bold text-slate-600 text-xs uppercase">Emp</th>
                                      <th className="px-4 py-2 text-left font-bold text-slate-600 text-xs uppercase">Factura</th>
                                      <th className="px-4 py-2 text-left font-bold text-slate-600 text-xs uppercase">Fecha</th>
                                      <th className="px-4 py-2 text-right font-bold text-slate-600 text-xs uppercase">Saldo</th>
                                      <th className="px-4 py-2 text-center font-bold text-slate-600 text-xs uppercase">Días</th>
                                      <th className="px-4 py-2 text-center font-bold text-slate-600 text-xs uppercase">Acción</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {proveedor.facturas.map((factura, fidx) => {
                                      const dias = getDiasAntiguedad(factura.fecha)
                                      const seleccionado = isPagoSeleccionado(factura.id)
                                      const bloqueado = !puedeAgregar(factura) && !seleccionado
                                      return (
                                        <tr
                                          key={factura.id}
                                          className={`transition-colors ${
                                            seleccionado ? 'bg-violet-100 border-l-4 border-violet-500'
                                              : bloqueado ? 'bg-slate-200/50 opacity-50'
                                              : fidx % 2 === 0 ? 'bg-white hover:bg-violet-50' : 'bg-slate-100 hover:bg-violet-100'
                                          }`}
                                        >
                                          <td className="px-4 py-2">
                                            <span className={`badge ${factura.empresa === 'VH' ? 'badge-vh' : 'badge-vc'}`}>{factura.empresa}</span>
                                          </td>
                                          <td className="px-4 py-2 font-medium text-slate-800">{factura.numero}</td>
                                          <td className="px-4 py-2 text-slate-600">{formatDate(factura.fecha)}</td>
                                          <td className="px-4 py-2 text-right font-bold text-slate-800 tabular-nums">{formatMoney(factura.saldo_pendiente)}</td>
                                          <td className="px-4 py-2 text-center">
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${getAlertaColor(dias)}`}>{dias}d</span>
                                          </td>
                                          <td className="px-4 py-2 text-center">
                                            {seleccionado ? (
                                              <button onClick={(e) => { e.stopPropagation(); quitarPago(factura.id) }} className="px-2 py-1 bg-red-100 text-red-700 rounded-lg text-xs font-semibold hover:bg-red-200">Quitar</button>
                                            ) : bloqueado ? (
                                              <span className="text-xs text-slate-400">Bloqueado</span>
                                            ) : (
                                              <button
                                                onClick={(e) => { e.stopPropagation(); agregarPago(factura, 'cancela') }}
                                                className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-xs font-semibold hover:bg-emerald-200 disabled:opacity-50"
                                                disabled={!factura.cbu_principal}
                                                title={!factura.cbu_principal ? 'Sin CBU' : 'Agregar'}
                                              >+ Agregar</button>
                                            )}
                                          </td>
                                        </tr>
                                      )
                                    })}
                                  </tbody>
                                </table>
                                {!proveedor.cbu_principal && (
                                  <div className="px-4 py-2 bg-amber-50 border-t border-amber-200 flex items-center gap-2 text-amber-700 text-sm">
                                    {Icons.alert}
                                    <span>Este proveedor no tiene CBU configurado.</span>
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

                {proveedoresFiltrados.length === 0 && (
                  <div className="p-16 text-center">
                    <div className="text-slate-300 mx-auto mb-4">{Icons.search}</div>
                    <p className="text-slate-500 font-medium">No se encontraron proveedores</p>
                  </div>
                )}
              </div>
            </div>

            {/* Panel derecho - Carrito */}
            <div className="xl:col-span-1">
              <div className="card-premium sticky top-24 overflow-hidden animate-slideUp" style={{animationDelay: '0.2s'}}>
                <div className={`p-4 ${empresaBloqueada === 'VH' ? 'bg-gradient-to-r from-blue-600 to-blue-700' : empresaBloqueada === 'VC' ? 'bg-gradient-to-r from-emerald-600 to-emerald-700' : 'bg-gradient-to-r from-violet-600 to-purple-600'}`}>
                  <div className="flex items-center justify-between text-white">
                    <div className="flex items-center gap-2">
                      {Icons.creditCard}
                      <h2 className="font-semibold">Pagos a Confirmar</h2>
                    </div>
                    <span className="px-2.5 py-1 bg-white/20 rounded-full text-xs font-medium">{pagosSeleccionados.length} items</span>
                  </div>
                  {empresaBloqueada && <p className="text-white/80 text-xs mt-1">{empresaBloqueada === 'VH' ? 'Villalba Hermanos SRL' : 'Villalba Cristino'}</p>}
                </div>

                {pagosSeleccionados.length === 0 ? (
                  <div className="p-8 text-center">
                    <div className="text-slate-300 mx-auto mb-3">{Icons.fileText}</div>
                    <p className="text-slate-500 font-medium">No hay pagos seleccionados</p>
                    <p className="text-slate-400 text-sm mt-1">Seleccioná facturas para pagar</p>
                  </div>
                ) : (
                  <>
                    <div className="max-h-[350px] overflow-y-auto divide-y divide-slate-100">
                      {pagosSeleccionados.map((pago) => (
                        <div key={pago.factura.id} className="p-3">
                          <div className="flex items-start justify-between mb-1">
                            <div className="flex items-start gap-2">
                              {pago.factura.cbu_principal && <BancoIcon cbu={pago.factura.cbu_principal} size="sm" />}
                              <div>
                                <p className="font-semibold text-slate-800 text-sm">{pago.factura.proveedor_nombre}</p>
                                <p className="text-xs text-slate-500">FC {pago.factura.numero}</p>
                                {pago.factura.cbu_principal && (
                                  <p className="text-xs text-slate-400">{getBancoFromCBU(pago.factura.cbu_principal)?.nombreCorto || 'Banco'}</p>
                                )}
                              </div>
                            </div>
                            <button onClick={() => quitarPago(pago.factura.id)} className="p-1 hover:bg-red-100 rounded-lg text-red-500">{Icons.trash}</button>
                          </div>

                          <div className="flex items-center gap-2 mb-1">
                            <select
                              value={pago.tipo}
                              onChange={(e) => agregarPago(pago.factura, e.target.value as 'cancela' | 'a_cuenta', e.target.value === 'cancela' ? pago.factura.saldo_pendiente : pago.monto)}
                              className="flex-1 text-xs border border-slate-200 rounded-lg px-2 py-1 bg-slate-50"
                            >
                              <option value="cancela">Cancela</option>
                              <option value="a_cuenta">A Cuenta</option>
                            </select>
                            <span className={`text-xs px-2 py-1 rounded-lg font-semibold ${pago.cuenta_origen === 'VH' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>{pago.cuenta_origen}</span>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-500">$</span>
                            <input
                              type="number"
                              step="0.01"
                              value={pago.monto.toFixed(2)}
                              onChange={(e) => actualizarMontoPago(pago.factura.id, parseFloat(e.target.value) || 0)}
                              className="flex-1 text-sm font-bold border border-slate-200 rounded-lg px-2 py-1 text-right bg-slate-50 tabular-nums"
                              disabled={pago.tipo === 'cancela'}
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="p-4 border-t border-slate-200 bg-slate-50">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-slate-700">TOTAL SELECCIONADO</span>
                        <span className="text-2xl font-extrabold text-slate-800 tabular-nums">{formatMoney(totalGeneral)}</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">{pagosSeleccionados.length} factura(s) de {empresaBloqueada === 'VH' ? 'Villalba Hermanos' : 'Villalba Cristino'}</p>
                    </div>

                    <div className="p-4 border-t border-slate-200 space-y-2">
                      <button
                        onClick={() => setShowConfirmModal(true)}
                        className={`w-full py-3 flex items-center justify-center gap-2 font-semibold rounded-xl text-white transition-all ${empresaBloqueada === 'VH' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}
                      >
                        {Icons.download}
                        Generar TXT {empresaBloqueada}
                      </button>
                      <button onClick={limpiarCarrito} className="w-full py-2.5 border border-slate-300 text-slate-600 font-semibold rounded-xl hover:bg-slate-50">Limpiar selección</button>
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
              <div className={`p-6 border-b border-slate-200 ${empresaBloqueada === 'VH' ? 'bg-gradient-to-r from-blue-600 to-blue-700' : 'bg-gradient-to-r from-emerald-600 to-emerald-700'} rounded-t-2xl`}>
                <h2 className="text-xl font-bold text-white">Generar Lote de Pagos</h2>
                <p className="text-white/80 mt-1">{empresaBloqueada === 'VH' ? 'Villalba Hermanos SRL' : 'Villalba Cristino'}</p>
              </div>

              <div className="p-6 space-y-4">
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <p className="text-amber-800 text-sm font-medium flex items-center gap-2">
                    {Icons.warning}
                    Los pagos NO se asentarán automáticamente
                  </p>
                  <p className="text-amber-700 text-xs mt-1">
                    Después de hacer las transferencias en el banco, debés ir a &quot;Confirmar Pagos&quot; para marcar cada uno como realizado.
                  </p>
                </div>

                <div className="bg-slate-50 rounded-xl p-4">
                  <p className="text-sm text-slate-600 mb-3 font-medium">Resumen:</p>
                  <div className={`flex justify-between items-center p-3 rounded-xl border ${empresaBloqueada === 'VH' ? 'bg-blue-50 border-blue-200' : 'bg-emerald-50 border-emerald-200'}`}>
                    <div className="flex items-center gap-2">
                      <span className={empresaBloqueada === 'VH' ? 'text-blue-600' : 'text-emerald-600'}>{Icons.building}</span>
                      <span className={`font-semibold ${empresaBloqueada === 'VH' ? 'text-blue-700' : 'text-emerald-700'}`}>
                        {empresaBloqueada === 'VH' ? 'Villalba Hermanos' : 'Villalba Cristino'}
                      </span>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold tabular-nums ${empresaBloqueada === 'VH' ? 'text-blue-700' : 'text-emerald-700'}`}>{formatMoney(totalGeneral)}</p>
                      <p className={`text-xs ${empresaBloqueada === 'VH' ? 'text-blue-600' : 'text-emerald-600'}`}>{pagosSeleccionados.length} transferencias</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-slate-200 flex gap-3">
                <button onClick={() => setShowConfirmModal(false)} className="flex-1 py-3 border border-slate-300 text-slate-600 font-semibold rounded-xl hover:bg-slate-50" disabled={generatingTxt}>Cancelar</button>
                <button
                  onClick={confirmarYGenerarTxt}
                  disabled={generatingTxt}
                  className={`flex-1 py-3 flex items-center justify-center gap-2 font-semibold rounded-xl text-white ${empresaBloqueada === 'VH' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}
                >
                  {generatingTxt ? (
                    <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>Generando...</>
                  ) : (
                    <>{Icons.download}Generar TXT</>
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
