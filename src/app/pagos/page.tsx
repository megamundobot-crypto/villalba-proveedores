'use client'

import { useEffect, useState, Suspense } from 'react'
import { supabase, Factura } from '@/lib/supabase'
import { ArrowLeft, Search, Building2, FileText, CreditCard, Download, Trash2, Check, ChevronDown, ChevronRight, X, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

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

  // Proveedores expandidos
  const [expandedProveedores, setExpandedProveedores] = useState<Set<number>>(new Set())

  // Pagos seleccionados (carrito)
  const [pagosSeleccionados, setPagosSeleccionados] = useState<PagoSeleccionado[]>([])

  // Cuenta origen por defecto
  const [cuentaOrigenDefault, setCuentaOrigenDefault] = useState<'VC' | 'VH'>('VC')

  // Modal de confirmación
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [generatingTxt, setGeneratingTxt] = useState(false)

  // CBUs origen
  const CBU_VC = '3110003611000000296085'
  const CBU_VH = '3110030211000006923105'

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (proveedorIdParam && proveedores.length > 0) {
      const provId = parseInt(proveedorIdParam)
      setExpandedProveedores(new Set([provId]))
      // Scroll al proveedor
      setTimeout(() => {
        document.getElementById(`proveedor-${provId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 100)
    }
  }, [proveedorIdParam, proveedores])

  useEffect(() => {
    let filtered = [...proveedores]

    if (busqueda) {
      filtered = filtered.filter(p =>
        p.nombre.toLowerCase().includes(busqueda.toLowerCase())
      )
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

    // Cargar facturas pendientes
    const { data: facturasData } = await supabase
      .from('facturas')
      .select('*, proveedores(nombre)')
      .in('estado', ['pendiente', 'parcial'])
      .order('fecha', { ascending: true })

    // Cargar pagos
    const { data: pagosData } = await supabase
      .from('pagos')
      .select('factura_id, monto')

    // Cargar CBUs
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
    // Verificar si ya está agregada
    const existe = pagosSeleccionados.find(p => p.factura.id === factura.id)
    if (existe) {
      // Actualizar en lugar de agregar
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

  // Agrupar pagos por cuenta origen para generar TXTs separados
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

    // Generar TXT para cada cuenta que tenga pagos
    const archivosGenerados: { nombre: string, contenido: string }[] = []

    for (const cuenta of ['VC', 'VH'] as const) {
      const pagos = pagosPorCuenta[cuenta]
      if (pagos.length === 0) continue

      const CBU_ORIGEN = cuenta === 'VC' ? CBU_VC : CBU_VH
      const lineas: string[] = []

      // Agrupar pagos por proveedor (mismo CBU)
      const pagosPorProveedor: Record<string, { cbu: string, monto: number, facturas: string[], concepto: string }> = {}

      for (const pago of pagos) {
        const cbu = pago.factura.cbu_principal || ''
        if (!cbu) continue

        if (!pagosPorProveedor[cbu]) {
          pagosPorProveedor[cbu] = {
            cbu,
            monto: 0,
            facturas: [],
            concepto: pago.tipo === 'cancela' ? 'CANCELA' : 'A CUENTA'
          }
        }
        pagosPorProveedor[cbu].monto += pago.monto
        pagosPorProveedor[cbu].facturas.push(pago.factura.numero)
        // Si hay algún a cuenta, el concepto es A CUENTA
        if (pago.tipo === 'a_cuenta') {
          pagosPorProveedor[cbu].concepto = 'A CUENTA'
        }
      }

      // Generar líneas de transferencia
      for (const [cbu, data] of Object.entries(pagosPorProveedor)) {
        const montoEnCentavos = Math.round(data.monto * 100)
        const referencia = `FAC ${data.facturas.join(' ')}`

        const linea =
          CBU_ORIGEN +                                    // 22 chars
          cbu +                                           // 22 chars
          ' '.repeat(44) +                                // 44 espacios
          montoEnCentavos.toString().padStart(12, '0') +  // 12 chars (centavos)
          data.concepto.padEnd(50) +                      // 50 chars
          referencia.padEnd(50) +                         // 50 chars
          ' '.repeat(15) +                                // 15 espacios
          '1'                                             // 1 char

        lineas.push(linea)
      }

      // Generar línea de trailer
      const totalLineas = lineas.length + 1
      const totalCentavos = Math.round(pagos.reduce((sum, p) => sum + p.monto, 0) * 100)
      const trailer = totalLineas.toString().padStart(5, '0') +
        totalCentavos.toString().padStart(17, '0') +
        ' '.repeat(216 - 22)

      lineas.push(trailer)

      // Contenido con CRLF
      const contenido = lineas.join('\r\n') + '\r\n'

      archivosGenerados.push({
        nombre: `transfer_${cuenta}_${fechaStr}.txt`,
        contenido
      })
    }

    // Registrar los pagos en la base de datos
    for (const pago of pagosSeleccionados) {
      await supabase
        .from('pagos')
        .insert([{
          factura_id: pago.factura.id,
          fecha: new Date().toISOString().split('T')[0],
          monto: pago.monto,
          medio_pago: 'transferencia',
          observaciones: `${pago.tipo === 'cancela' ? 'Cancela' : 'A cuenta'} - ${pago.cuenta_origen}`
        }])
    }

    // Descargar archivos
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
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
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
          <div className="w-12 h-12 border-4 border-violet-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-600 font-medium">Cargando datos...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-violet-800 via-violet-700 to-violet-800 text-white shadow-xl">
        <div className="container mx-auto px-6 py-5">
          <div className="flex items-center gap-4">
            <Link href="/" className="p-2 hover:bg-white/10 rounded-lg transition-colors">
              <ArrowLeft className="h-6 w-6" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Gestión de Pagos</h1>
              <p className="text-violet-200 text-sm mt-0.5">Seleccioná las facturas a pagar y generá el TXT</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-6">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Panel izquierdo - Lista de proveedores y facturas */}
          <div className="xl:col-span-2">
            {/* Resumen de deudas */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-4 text-white">
                <p className="text-slate-400 text-xs font-medium">Deuda Total</p>
                <p className="text-2xl font-bold mt-1">{formatMoney(proveedores.reduce((s, p) => s + p.total, 0))}</p>
              </div>
              <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl p-4 text-white">
                <p className="text-blue-200 text-xs font-medium">Villalba Hermanos</p>
                <p className="text-2xl font-bold mt-1">{formatMoney(proveedores.reduce((s, p) => s + p.total_vh, 0))}</p>
              </div>
              <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-xl p-4 text-white">
                <p className="text-emerald-200 text-xs font-medium">Villalba Cristino</p>
                <p className="text-2xl font-bold mt-1">{formatMoney(proveedores.reduce((s, p) => s + p.total_vc, 0))}</p>
              </div>
            </div>

            {/* Filtros */}
            <div className="bg-white rounded-xl shadow-lg border border-slate-200 mb-6">
              <div className="p-4 flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Buscar proveedor..."
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    className="pl-10 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm w-full focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                  />
                </div>
                <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
                  <button
                    onClick={() => setFiltroEmpresa('todos')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      filtroEmpresa === 'todos' ? 'bg-slate-800 text-white' : 'text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Todos
                  </button>
                  <button
                    onClick={() => setFiltroEmpresa('VH')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      filtroEmpresa === 'VH' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-blue-50'
                    }`}
                  >
                    VH
                  </button>
                  <button
                    onClick={() => setFiltroEmpresa('VC')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      filtroEmpresa === 'VC' ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:bg-emerald-50'
                    }`}
                  >
                    VC
                  </button>
                </div>
              </div>
            </div>

            {/* Lista de proveedores */}
            <div className="space-y-3">
              {proveedoresFiltrados.map((proveedor) => (
                <div
                  key={proveedor.id}
                  id={`proveedor-${proveedor.id}`}
                  className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden"
                >
                  {/* Header del proveedor */}
                  <div
                    className={`p-4 cursor-pointer transition-colors ${
                      expandedProveedores.has(proveedor.id) ? 'bg-violet-50' : 'hover:bg-slate-50'
                    }`}
                    onClick={() => toggleProveedor(proveedor.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {expandedProveedores.has(proveedor.id) ? (
                          <ChevronDown className="h-5 w-5 text-violet-600" />
                        ) : (
                          <ChevronRight className="h-5 w-5 text-slate-400" />
                        )}
                        <div>
                          <h3 className="font-semibold text-slate-800">{proveedor.nombre}</h3>
                          <p className="text-xs text-slate-500">{proveedor.facturas.length} facturas pendientes</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        {proveedor.total_vh > 0 && (
                          <div className="text-right">
                            <span className="text-xs text-blue-600 font-medium">VH</span>
                            <p className="font-semibold text-blue-700">{formatMoney(proveedor.total_vh)}</p>
                          </div>
                        )}
                        {proveedor.total_vc > 0 && (
                          <div className="text-right">
                            <span className="text-xs text-emerald-600 font-medium">VC</span>
                            <p className="font-semibold text-emerald-700">{formatMoney(proveedor.total_vc)}</p>
                          </div>
                        )}
                        <div className="text-right pl-4 border-l border-slate-200">
                          <span className="text-xs text-slate-500">Total</span>
                          <p className="font-bold text-slate-800">{formatMoney(proveedor.total)}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Detalle de facturas */}
                  {expandedProveedores.has(proveedor.id) && (
                    <div className="border-t border-slate-200">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-100">
                          <tr>
                            <th className="px-4 py-2 text-left font-semibold text-slate-600">Emp</th>
                            <th className="px-4 py-2 text-left font-semibold text-slate-600">Factura</th>
                            <th className="px-4 py-2 text-left font-semibold text-slate-600">Fecha</th>
                            <th className="px-4 py-2 text-right font-semibold text-slate-600">Saldo</th>
                            <th className="px-4 py-2 text-center font-semibold text-slate-600">Días</th>
                            <th className="px-4 py-2 text-center font-semibold text-slate-600">Acciones</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {proveedor.facturas.map((factura) => {
                            const dias = getDiasAntiguedad(factura.fecha)
                            const seleccionado = isPagoSeleccionado(factura.id)
                            const pagoInfo = getPagoSeleccionado(factura.id)

                            return (
                              <tr
                                key={factura.id}
                                className={`transition-colors ${seleccionado ? 'bg-violet-50' : 'hover:bg-slate-50'}`}
                              >
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
                                <td className="px-4 py-3 text-right font-semibold text-slate-800">
                                  {formatMoney(factura.saldo_pendiente)}
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getAlertaColor(dias)}`}>
                                    {dias}d
                                  </span>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex items-center justify-center gap-2">
                                    {seleccionado ? (
                                      <button
                                        onClick={(e) => { e.stopPropagation(); quitarPago(factura.id) }}
                                        className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-xs font-medium hover:bg-red-200 transition-colors flex items-center gap-1"
                                      >
                                        <X className="h-3 w-3" /> Quitar
                                      </button>
                                    ) : (
                                      <>
                                        <button
                                          onClick={(e) => { e.stopPropagation(); agregarPago(factura, 'cancela') }}
                                          className="px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-lg text-xs font-medium hover:bg-emerald-200 transition-colors"
                                          disabled={!factura.cbu_principal}
                                          title={!factura.cbu_principal ? 'Sin CBU configurado' : 'Cancelar factura completa'}
                                        >
                                          Cancelar
                                        </button>
                                        <button
                                          onClick={(e) => { e.stopPropagation(); agregarPago(factura, 'a_cuenta', Math.round(factura.saldo_pendiente / 2)) }}
                                          className="px-3 py-1.5 bg-amber-100 text-amber-700 rounded-lg text-xs font-medium hover:bg-amber-200 transition-colors"
                                          disabled={!factura.cbu_principal}
                                          title={!factura.cbu_principal ? 'Sin CBU configurado' : 'Pago a cuenta parcial'}
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
                          <AlertCircle className="h-4 w-4" />
                          <span>Este proveedor no tiene CBU configurado. Agregalo en Proveedores.</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}

              {proveedoresFiltrados.length === 0 && (
                <div className="bg-white rounded-xl p-12 text-center">
                  <Search className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500">No se encontraron proveedores</p>
                </div>
              )}
            </div>
          </div>

          {/* Panel derecho - Carrito de pagos */}
          <div className="xl:col-span-1">
            <div className="bg-white rounded-xl shadow-lg border border-slate-200 sticky top-6">
              <div className="p-4 border-b border-slate-200 bg-gradient-to-r from-violet-600 to-violet-700 rounded-t-xl">
                <div className="flex items-center justify-between text-white">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    <h2 className="font-semibold">Pagos a Confirmar</h2>
                  </div>
                  <span className="px-2 py-1 bg-white/20 rounded-full text-xs font-medium">
                    {pagosSeleccionados.length} items
                  </span>
                </div>
              </div>

              {pagosSeleccionados.length === 0 ? (
                <div className="p-8 text-center">
                  <FileText className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500">No hay pagos seleccionados</p>
                  <p className="text-slate-400 text-sm mt-1">Seleccioná facturas para pagar</p>
                </div>
              ) : (
                <>
                  <div className="max-h-[400px] overflow-y-auto divide-y divide-slate-100">
                    {pagosSeleccionados.map((pago) => (
                      <div key={pago.factura.id} className="p-3">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-medium text-slate-800 text-sm">{pago.factura.proveedor_nombre}</p>
                            <p className="text-xs text-slate-500">FC {pago.factura.numero}</p>
                          </div>
                          <button
                            onClick={() => quitarPago(pago.factura.id)}
                            className="p-1 hover:bg-red-100 rounded text-red-500 transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>

                        <div className="flex items-center gap-2 mb-2">
                          <select
                            value={pago.tipo}
                            onChange={(e) => {
                              const tipo = e.target.value as 'cancela' | 'a_cuenta'
                              agregarPago(pago.factura, tipo, tipo === 'cancela' ? pago.factura.saldo_pendiente : pago.monto)
                            }}
                            className="flex-1 text-xs border rounded px-2 py-1 bg-slate-50"
                          >
                            <option value="cancela">Cancela</option>
                            <option value="a_cuenta">A Cuenta</option>
                          </select>
                          <select
                            value={pago.cuenta_origen}
                            onChange={(e) => actualizarCuentaOrigen(pago.factura.id, e.target.value as 'VC' | 'VH')}
                            className={`text-xs border rounded px-2 py-1 font-medium ${
                              pago.cuenta_origen === 'VH' ? 'bg-blue-50 text-blue-700' : 'bg-emerald-50 text-emerald-700'
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
                            className="flex-1 text-sm font-semibold border rounded px-2 py-1 text-right"
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
                        <span className="text-sm text-blue-700 font-medium">Total VH</span>
                        <span className="font-bold text-blue-700">{formatMoney(totalVH)}</span>
                      </div>
                    )}
                    {totalVC > 0 && (
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-emerald-700 font-medium">Total VC</span>
                        <span className="font-bold text-emerald-700">{formatMoney(totalVC)}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center pt-2 border-t border-slate-300">
                      <span className="font-semibold text-slate-700">TOTAL</span>
                      <span className="text-xl font-bold text-slate-800">{formatMoney(totalGeneral)}</span>
                    </div>
                  </div>

                  {/* Acciones */}
                  <div className="p-4 border-t border-slate-200 space-y-2">
                    <button
                      onClick={() => setShowConfirmModal(true)}
                      className="w-full py-3 bg-gradient-to-r from-violet-600 to-violet-700 text-white font-semibold rounded-lg hover:from-violet-700 hover:to-violet-800 transition-all flex items-center justify-center gap-2"
                    >
                      <Download className="h-5 w-5" />
                      Confirmar y Generar TXT
                    </button>
                    <button
                      onClick={limpiarCarrito}
                      className="w-full py-2 border border-slate-300 text-slate-600 font-medium rounded-lg hover:bg-slate-50 transition-colors"
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-800">Confirmar Pagos</h2>
              <p className="text-slate-500 mt-1">Se registrarán los pagos y se generarán los archivos TXT</p>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-sm text-slate-600 mb-3">Resumen de pagos:</p>
                <div className="space-y-2">
                  {totalVC > 0 && (
                    <div className="flex justify-between items-center p-3 bg-emerald-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-5 w-5 text-emerald-600" />
                        <span className="font-medium text-emerald-700">Villalba Cristino</span>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-emerald-700">{formatMoney(totalVC)}</p>
                        <p className="text-xs text-emerald-600">{pagosPorCuenta.VC.length} transferencias</p>
                      </div>
                    </div>
                  )}
                  {totalVH > 0 && (
                    <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-5 w-5 text-blue-600" />
                        <span className="font-medium text-blue-700">Villalba Hermanos</span>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-blue-700">{formatMoney(totalVH)}</p>
                        <p className="text-xs text-blue-600">{pagosPorCuenta.VH.length} transferencias</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-between items-center p-4 bg-violet-50 rounded-xl">
                <span className="font-semibold text-violet-700">Total General</span>
                <span className="text-2xl font-bold text-violet-800">{formatMoney(totalGeneral)}</span>
              </div>

              <p className="text-sm text-slate-500">
                Se generarán {(totalVC > 0 ? 1 : 0) + (totalVH > 0 ? 1 : 0)} archivo(s) TXT para cargar en el banco.
              </p>
            </div>

            <div className="p-6 border-t border-slate-200 flex gap-3">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 py-3 border border-slate-300 text-slate-600 font-medium rounded-lg hover:bg-slate-50 transition-colors"
                disabled={generatingTxt}
              >
                Cancelar
              </button>
              <button
                onClick={confirmarYGenerarTxt}
                disabled={generatingTxt}
                className="flex-1 py-3 bg-gradient-to-r from-violet-600 to-violet-700 text-white font-semibold rounded-lg hover:from-violet-700 hover:to-violet-800 transition-all flex items-center justify-center gap-2"
              >
                {generatingTxt ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Generando...
                  </>
                ) : (
                  <>
                    <Check className="h-5 w-5" />
                    Confirmar
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

export default function PagosPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-violet-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-600 font-medium">Cargando...</p>
        </div>
      </div>
    }>
      <PagosContent />
    </Suspense>
  )
}
