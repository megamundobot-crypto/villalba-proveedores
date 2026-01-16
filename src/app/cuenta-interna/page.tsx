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
  pagado_proveedor: boolean
  factura_id?: number
}

interface PagoInterno {
  id: number
  fecha: string
  pagador: 'VH' | 'VC'
  receptor: 'VH' | 'VC'
  monto: number
  monto_aplicado: number
  saldo_a_favor: number
  observaciones?: string
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
  const [activeTab, setActiveTab] = useState<'resumen' | 'deuda_vh_vc' | 'deuda_vc_vh' | 'historial'>('resumen')

  // Buscador
  const [busqueda, setBusqueda] = useState('')

  // Modal de pago interno
  const [showModalPago, setShowModalPago] = useState(false)
  const [pagoForm, setPagoForm] = useState({
    pagador: 'VH' as 'VH' | 'VC',
    monto: 0,
    observaciones: ''
  })
  const [procesandoPago, setProcesandoPago] = useState(false)

  // Historial de pagos internos
  const [pagosInternos, setPagosInternos] = useState<PagoInterno[]>([])
  const [fcPagadasInternamente, setFcPagadasInternamente] = useState<DeudaHistorica[]>([])

  // Modal para agregar documento (FC o NC)
  const [showModalDocumento, setShowModalDocumento] = useState(false)
  const [documentoForm, setDocumentoForm] = useState({
    tipoDocumento: 'FC' as 'FC' | 'NC',
    deudor: 'VH' as 'VH' | 'VC',  // Quién debe: si VH debe a VC, o VC debe a VH
    fecha: new Date().toISOString().split('T')[0],
    nroDocumento: '',
    proveedor: '',
    monto: 0,
    pagadoProveedor: false
  })
  const [guardandoDocumento, setGuardandoDocumento] = useState(false)

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
    let totalVHaVC = 0
    let totalVCaVH = 0

    if (cuentaData) {
      cuentaData.forEach((row: CuentaInternaRow) => {
        // Extraer proveedor y nro de observaciones "FC 123 - PROVEEDOR" o "NC 123 - PROVEEDOR"
        const obs = row.observaciones || ''
        const match = obs.match(/(FC|NC)\s*(\S+)\s*-\s*(.+)/)
        // nroFactura incluye el tipo de documento (FC o NC) para distinguirlos en la UI
        const nroFactura = match ? `${match[1]} ${match[2]}` : ''
        const proveedor = match ? match[3].trim() : obs

        const montoTotal = Number(row.monto) || 0
        const neto = montoTotal / 1.21

        if (row.pagador === 'VH') {
          // VH debe a VC (65% de facturas de VC)
          // El campo "pagado" del Excel indica si se pagó al proveedor externo
          // Usamos pagado_proveedor si existe, sino usamos pagado del Excel
          const pagadoAlProveedor = (row as any).pagado_proveedor !== undefined
            ? (row as any).pagado_proveedor
            : row.pagado
          const item: DeudaHistorica = {
            id: row.id,
            fecha: row.fecha || '',
            proveedor,
            nroFactura,
            montoTotal: montoTotal / 0.65 * 1.21,
            neto: montoTotal / 0.65,
            porcentaje: 65,
            montoDeuda: montoTotal,
            pagado: row.pagado,
            pagado_proveedor: pagadoAlProveedor,
            factura_id: (row as any).factura_id
          }
          vhAvc.push(item)
          totalVHaVC += montoTotal
        } else {
          // VC debe a VH (35% de facturas de VH)
          // El campo "pagado" del Excel indica si se pagó al proveedor externo
          const pagadoAlProveedor = (row as any).pagado_proveedor !== undefined
            ? (row as any).pagado_proveedor
            : row.pagado
          const item: DeudaHistorica = {
            id: row.id,
            fecha: row.fecha || '',
            proveedor,
            nroFactura,
            montoTotal: montoTotal / 0.35 * 1.21,
            neto: montoTotal / 0.35,
            porcentaje: 35,
            montoDeuda: montoTotal,
            pagado: row.pagado,
            pagado_proveedor: pagadoAlProveedor,
            factura_id: (row as any).factura_id
          }
          vcAvh.push(item)
          totalVCaVH += montoTotal
        }
      })
    }

    // Mostrar TODAS las facturas en las tabs de deuda
    // El campo "pagado" indica si se pagó al proveedor, NO si se saldó la deuda interna
    setDeudaVHaVC(vhAvc)
    setDeudaVCaVH(vcAvh)

    // Cargar historial de pagos internos
    const { data: pagosInternosData } = await supabase
      .from('pagos_internos')
      .select('*')
      .order('fecha', { ascending: false })

    if (pagosInternosData) {
      setPagosInternos(pagosInternosData)
    }

    // Cargar facturas que fueron saldadas mediante pagos internos
    // y calcular montos saldados por cada dirección (VH->VC y VC->VH)
    const { data: detallesPagos } = await supabase
      .from('pagos_internos_detalle')
      .select('cuenta_interna_id, monto_aplicado')

    let pagadoVHaVC = 0
    let pagadoVCaVH = 0
    const idsFacturasSaldadas: number[] = []

    if (detallesPagos && detallesPagos.length > 0) {
      detallesPagos.forEach(d => {
        idsFacturasSaldadas.push(d.cuenta_interna_id)
        // Buscar si es deuda VH->VC o VC->VH
        const esVHaVC = vhAvc.some(item => item.id === d.cuenta_interna_id)
        if (esVHaVC) {
          pagadoVHaVC += Number(d.monto_aplicado) || 0
        } else {
          pagadoVCaVH += Number(d.monto_aplicado) || 0
        }
      })

      const todasLasDeudas = [...vhAvc, ...vcAvh]
      const fcSaldadas = todasLasDeudas.filter(d => idsFacturasSaldadas.includes(d.id))
      setFcPagadasInternamente(fcSaldadas)
    } else {
      setFcPagadasInternamente([])
    }

    // Ahora sí setear los totales con los montos correctos
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

  // Función para registrar pago interno con FIFO
  async function registrarPagoInterno() {
    if (pagoForm.monto <= 0) {
      alert('El monto debe ser mayor a 0')
      return
    }

    setProcesandoPago(true)
    const receptor = pagoForm.pagador === 'VH' ? 'VC' : 'VH'

    // Obtener facturas pendientes ordenadas por fecha (más viejas primero)
    const deudasPendientes = pagoForm.pagador === 'VH' ? deudaVHaVC : deudaVCaVH
    const deudasOrdenadas = [...deudasPendientes].sort((a, b) =>
      new Date(a.fecha).getTime() - new Date(b.fecha).getTime()
    )

    let montoRestante = pagoForm.monto
    const facturasAPagar: { id: number, monto: number }[] = []

    // Aplicar FIFO - pagar facturas de las más viejas a las más nuevas
    for (const deuda of deudasOrdenadas) {
      if (montoRestante <= 0) break

      const montoAAplicar = Math.min(montoRestante, deuda.montoDeuda)
      facturasAPagar.push({ id: deuda.id, monto: montoAAplicar })
      montoRestante -= montoAAplicar
    }

    // Calcular monto aplicado y saldo a favor
    const montoAplicado = pagoForm.monto - montoRestante
    const saldoAFavor = montoRestante

    try {
      // 1. Crear el registro del pago interno
      const { data: pagoCreado, error: errorPago } = await supabase
        .from('pagos_internos')
        .insert({
          pagador: pagoForm.pagador,
          receptor,
          monto: pagoForm.monto,
          monto_aplicado: montoAplicado,
          saldo_a_favor: saldoAFavor,
          observaciones: pagoForm.observaciones || `Pago de ${pagoForm.pagador} a ${receptor}`
        })
        .select()
        .single()

      if (errorPago) throw errorPago

      // 2. Marcar las facturas como pagadas internamente
      for (const fc of facturasAPagar) {
        // Insertar detalle del pago
        await supabase
          .from('pagos_internos_detalle')
          .insert({
            pago_interno_id: pagoCreado.id,
            cuenta_interna_id: fc.id,
            monto_aplicado: fc.monto
          })

        // Si el monto aplicado cubre toda la deuda, marcar como pagado
        const deuda = deudasOrdenadas.find(d => d.id === fc.id)
        if (deuda && fc.monto >= deuda.montoDeuda) {
          await supabase
            .from('cuenta_interna')
            .update({ pagado: true })
            .eq('id', fc.id)
        }
      }

      const fcCompletas = facturasAPagar.filter(f => {
        const deuda = deudasOrdenadas.find(d => d.id === f.id)
        return deuda && f.monto >= deuda.montoDeuda
      }).length

      let mensaje = `✅ Pago registrado exitosamente\n\nMonto total: $${pagoForm.monto.toLocaleString('es-AR')}\nMonto aplicado: $${montoAplicado.toLocaleString('es-AR')}\nFacturas saldadas: ${fcCompletas}`

      if (saldoAFavor > 0) {
        mensaje += `\n\n💰 Saldo a favor: $${saldoAFavor.toLocaleString('es-AR')}\n(Quedará registrado para aplicar a futuras facturas)`
      }

      alert(mensaje)

      // Resetear y recargar
      setShowModalPago(false)
      setPagoForm({ pagador: 'VH', monto: 0, observaciones: '' })
      loadData()
    } catch (error) {
      console.error('Error registrando pago:', error)
      alert('Error al registrar el pago. Verificá la consola.')
    }

    setProcesandoPago(false)
  }

  // Función para marcar factura como pagada al proveedor
  async function togglePagadoProveedor(id: number, valorActual: boolean) {
    const { error } = await supabase
      .from('cuenta_interna')
      .update({ pagado_proveedor: !valorActual })
      .eq('id', id)

    if (!error) {
      loadData()
    }
  }

  // Función para agregar FC o NC a la cuenta interna
  async function guardarDocumento() {
    if (!documentoForm.nroDocumento || !documentoForm.proveedor || documentoForm.monto <= 0) {
      alert('Completá todos los campos: N° documento, proveedor y monto')
      return
    }

    setGuardandoDocumento(true)

    try {
      // Determinar pagador y receptor según quién debe
      // Si VH debe a VC: pagador=VH, receptor=VC (65% de facturas de VC)
      // Si VC debe a VH: pagador=VC, receptor=VH (35% de facturas de VH)
      const pagador = documentoForm.deudor
      const receptor = documentoForm.deudor === 'VH' ? 'VC' : 'VH'
      const porcentaje = documentoForm.deudor === 'VH' ? 0.65 : 0.35

      // Calcular el monto de deuda según el porcentaje
      // El monto ingresado es el total de la factura con IVA
      const montoNeto = documentoForm.monto / 1.21
      const montoDeuda = montoNeto * porcentaje

      // Para NC: el monto será negativo (resta)
      const montoFinal = documentoForm.tipoDocumento === 'NC' ? -montoDeuda : montoDeuda

      const tipoDoc = documentoForm.tipoDocumento === 'FC' ? 'FC' : 'NC'
      const observaciones = `${tipoDoc} ${documentoForm.nroDocumento} - ${documentoForm.proveedor.toUpperCase()}`

      const { error } = await supabase
        .from('cuenta_interna')
        .insert({
          tipo: 'deuda_historica',
          debe_vh: documentoForm.deudor === 'VH' ? montoFinal : 0,
          debe_vc: documentoForm.deudor === 'VC' ? montoFinal : 0,
          pagador,
          receptor,
          monto: montoFinal,
          fecha: documentoForm.fecha,
          observaciones,
          pagado: false,
          pagado_proveedor: documentoForm.pagadoProveedor
        })

      if (error) throw error

      const tipoTexto = documentoForm.tipoDocumento === 'FC' ? 'Factura' : 'Nota de Crédito'
      const accion = documentoForm.tipoDocumento === 'NC' ? 'restando de' : 'sumando a'
      alert(`✅ ${tipoTexto} registrada exitosamente\n\n${accion} la deuda de ${pagador} a ${receptor}\nMonto deuda: $${Math.abs(montoFinal).toLocaleString('es-AR')}`)

      // Resetear y recargar
      setShowModalDocumento(false)
      setDocumentoForm({
        tipoDocumento: 'FC',
        deudor: 'VH',
        fecha: new Date().toISOString().split('T')[0],
        nroDocumento: '',
        proveedor: '',
        monto: 0,
        pagadoProveedor: false
      })
      loadData()
    } catch (error) {
      console.error('Error guardando documento:', error)
      alert('Error al guardar el documento. Verificá la consola.')
    }

    setGuardandoDocumento(false)
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

        {/* Balance neto y botón de pago */}
        <div className={`rounded-xl p-4 mb-6 ${
          totalesCuentaInterna.pendienteVHaVC > totalesCuentaInterna.pendienteVCaVH
            ? 'bg-blue-100 border border-blue-300'
            : 'bg-emerald-100 border border-emerald-300'
        }`}>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-lg">
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
            <div className="flex gap-2">
              <button
                onClick={() => setShowModalDocumento(true)}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
              >
                <FileText className="h-4 w-4" />
                Agregar FC / NC
              </button>
              <button
                onClick={() => setShowModalPago(true)}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
              >
                <DollarSign className="h-4 w-4" />
                Registrar Pago Interno
              </button>
            </div>
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
            <button
              onClick={() => setActiveTab('historial')}
              className={`px-6 py-4 font-medium text-sm whitespace-nowrap transition-colors ${
                activeTab === 'historial'
                  ? 'text-amber-700 border-b-2 border-amber-600 bg-amber-50'
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
                    Facturas de VC donde VH paga el 65% del neto • Total: {formatMoney(totalesCuentaInterna.pendienteVHaVC)}
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-blue-50">
                        <th className="px-3 py-2 text-left font-semibold text-slate-600">Fecha</th>
                        <th className="px-3 py-2 text-left font-semibold text-slate-600">Proveedor</th>
                        <th className="px-3 py-2 text-left font-semibold text-slate-600">Documento</th>
                        <th className="px-3 py-2 text-right font-semibold text-slate-600">%</th>
                        <th className="px-3 py-2 text-right font-semibold text-blue-700">Monto</th>
                        <th className="px-3 py-2 text-center font-semibold text-slate-600">Pagado Prov</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {deudaVHaVC.map((d) => (
                        <tr key={d.id} className={`hover:bg-slate-50 ${d.montoDeuda < 0 ? 'bg-red-50' : ''}`}>
                          <td className="px-3 py-2 text-slate-600">{formatDate(d.fecha)}</td>
                          <td className="px-3 py-2 font-medium text-slate-800">{d.proveedor}</td>
                          <td className="px-3 py-2 text-slate-600">
                            {d.nroFactura.startsWith('NC') ? (
                              <span className="text-red-600 font-medium">{d.nroFactura}</span>
                            ) : d.nroFactura}
                          </td>
                          <td className="px-3 py-2 text-right text-slate-600">{d.porcentaje}%</td>
                          <td className={`px-3 py-2 text-right font-semibold ${d.montoDeuda < 0 ? 'text-red-600' : 'text-blue-700'}`}>
                            {formatMoney(d.montoDeuda)}
                          </td>
                          <td className="px-3 py-2 text-center">
                            <button
                              onClick={() => togglePagadoProveedor(d.id, d.pagado_proveedor)}
                              className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                                d.pagado_proveedor
                                  ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                                  : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                              }`}
                            >
                              {d.pagado_proveedor ? <><Check className="h-3 w-3 mr-1" /> Pagado</> : 'Pendiente'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-blue-100 font-bold">
                        <td colSpan={4} className="px-3 py-2 text-slate-800">TOTAL PENDIENTE</td>
                        <td className="px-3 py-2 text-right text-blue-800">{formatMoney(totalesCuentaInterna.pendienteVHaVC)}</td>
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
                    Facturas de VH donde VC paga el 35% del neto • Total: {formatMoney(totalesCuentaInterna.pendienteVCaVH)}
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-emerald-50">
                        <th className="px-3 py-2 text-left font-semibold text-slate-600">Fecha</th>
                        <th className="px-3 py-2 text-left font-semibold text-slate-600">Proveedor</th>
                        <th className="px-3 py-2 text-left font-semibold text-slate-600">Documento</th>
                        <th className="px-3 py-2 text-right font-semibold text-slate-600">%</th>
                        <th className="px-3 py-2 text-right font-semibold text-emerald-700">Monto</th>
                        <th className="px-3 py-2 text-center font-semibold text-slate-600">Pagado Prov</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {deudaVCaVH.map((d) => (
                        <tr key={d.id} className={`hover:bg-slate-50 ${d.montoDeuda < 0 ? 'bg-red-50' : ''}`}>
                          <td className="px-3 py-2 text-slate-600">{formatDate(d.fecha)}</td>
                          <td className="px-3 py-2 font-medium text-slate-800">{d.proveedor}</td>
                          <td className="px-3 py-2 text-slate-600">
                            {d.nroFactura.startsWith('NC') ? (
                              <span className="text-red-600 font-medium">{d.nroFactura}</span>
                            ) : d.nroFactura}
                          </td>
                          <td className="px-3 py-2 text-right text-slate-600">{d.porcentaje}%</td>
                          <td className={`px-3 py-2 text-right font-semibold ${d.montoDeuda < 0 ? 'text-red-600' : 'text-emerald-700'}`}>
                            {formatMoney(d.montoDeuda)}
                          </td>
                          <td className="px-3 py-2 text-center">
                            <button
                              onClick={() => togglePagadoProveedor(d.id, d.pagado_proveedor)}
                              className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                                d.pagado_proveedor
                                  ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                                  : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                              }`}
                            >
                              {d.pagado_proveedor ? <><Check className="h-3 w-3 mr-1" /> Pagado</> : 'Pendiente'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-emerald-100 font-bold">
                        <td colSpan={4} className="px-3 py-2 text-slate-800">TOTAL PENDIENTE</td>
                        <td className="px-3 py-2 text-right text-emerald-800">{formatMoney(totalesCuentaInterna.pendienteVCaVH)}</td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'historial' && (
              <div>
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-amber-800">Historial de Pagos Internos</h3>
                  <p className="text-sm text-slate-500">
                    Registro de pagos realizados entre VH y VC
                  </p>
                </div>

                {/* Mostrar saldos a favor pendientes */}
                {pagosInternos.some(p => p.saldo_a_favor > 0) && (
                  <div className="mb-6 p-4 bg-purple-50 border border-purple-200 rounded-xl">
                    <h4 className="font-semibold text-purple-800 mb-2">💰 Saldos a Favor Pendientes</h4>
                    <div className="space-y-2">
                      {pagosInternos.filter(p => p.saldo_a_favor > 0).map(p => (
                        <div key={p.id} className="flex justify-between items-center text-sm">
                          <span className="text-slate-600">
                            {formatDate(p.fecha)} - {p.pagador} pagó a {p.receptor}
                          </span>
                          <span className="font-bold text-purple-700">{formatMoney(p.saldo_a_favor)}</span>
                        </div>
                      ))}
                      <div className="border-t border-purple-200 pt-2 mt-2 flex justify-between items-center">
                        <span className="font-semibold text-purple-800">Total saldo a favor:</span>
                        <span className="font-bold text-purple-800 text-lg">
                          {formatMoney(pagosInternos.reduce((acc, p) => acc + (p.saldo_a_favor || 0), 0))}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {pagosInternos.length === 0 ? (
                  <div className="text-center py-12 text-slate-500">
                    <Receipt className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                    <p>No hay pagos internos registrados</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto mb-8">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-amber-50">
                          <th className="px-3 py-2 text-left font-semibold text-slate-600">Fecha</th>
                          <th className="px-3 py-2 text-left font-semibold text-slate-600">Pagador</th>
                          <th className="px-3 py-2 text-left font-semibold text-slate-600">Receptor</th>
                          <th className="px-3 py-2 text-right font-semibold text-amber-700">Monto</th>
                          <th className="px-3 py-2 text-right font-semibold text-emerald-700">Aplicado</th>
                          <th className="px-3 py-2 text-right font-semibold text-purple-700">Saldo</th>
                          <th className="px-3 py-2 text-left font-semibold text-slate-600">Obs</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {pagosInternos.map((p) => (
                          <tr key={p.id} className="hover:bg-slate-50">
                            <td className="px-3 py-2 text-slate-600">{formatDate(p.fecha)}</td>
                            <td className="px-3 py-2">
                              <span className={`px-2 py-1 rounded text-xs font-bold ${
                                p.pagador === 'VH' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'
                              }`}>
                                {p.pagador}
                              </span>
                            </td>
                            <td className="px-3 py-2">
                              <span className={`px-2 py-1 rounded text-xs font-bold ${
                                p.receptor === 'VH' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'
                              }`}>
                                {p.receptor}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-right font-semibold text-amber-700">{formatMoney(p.monto)}</td>
                            <td className="px-3 py-2 text-right text-emerald-600">{formatMoney(p.monto_aplicado || p.monto)}</td>
                            <td className="px-3 py-2 text-right">
                              {p.saldo_a_favor > 0 ? (
                                <span className="text-purple-700 font-semibold">{formatMoney(p.saldo_a_favor)}</span>
                              ) : (
                                <span className="text-slate-400">-</span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-slate-600 text-xs">{p.observaciones || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Facturas pagadas internamente */}
                <div className="mt-8">
                  <h4 className="text-md font-semibold text-slate-700 mb-3">Facturas Saldadas Internamente ({fcPagadasInternamente.length})</h4>
                  {fcPagadasInternamente.length === 0 ? (
                    <p className="text-sm text-slate-500">No hay facturas saldadas aún</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-slate-100">
                            <th className="px-3 py-2 text-left font-semibold text-slate-600">Fecha</th>
                            <th className="px-3 py-2 text-left font-semibold text-slate-600">Proveedor</th>
                            <th className="px-3 py-2 text-left font-semibold text-slate-600">N° FC</th>
                            <th className="px-3 py-2 text-center font-semibold text-slate-600">Deuda de</th>
                            <th className="px-3 py-2 text-right font-semibold text-slate-700">Monto</th>
                            <th className="px-3 py-2 text-center font-semibold text-slate-600">Pagado Prov</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {fcPagadasInternamente.map((d) => (
                            <tr key={d.id} className="hover:bg-slate-50">
                              <td className="px-3 py-2 text-slate-600">{formatDate(d.fecha)}</td>
                              <td className="px-3 py-2 font-medium text-slate-800">{d.proveedor}</td>
                              <td className="px-3 py-2 text-slate-600">{d.nroFactura}</td>
                              <td className="px-3 py-2 text-center">
                                <span className={`px-2 py-1 rounded text-xs font-bold ${
                                  d.porcentaje === 65 ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'
                                }`}>
                                  {d.porcentaje === 65 ? 'VH' : 'VC'}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-right font-semibold text-slate-700">{formatMoney(d.montoDeuda)}</td>
                              <td className="px-3 py-2 text-center">
                                <button
                                  onClick={() => togglePagadoProveedor(d.id, d.pagado_proveedor)}
                                  className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                                    d.pagado_proveedor
                                      ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                                      : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                                  }`}
                                >
                                  {d.pagado_proveedor ? <><Check className="h-3 w-3 mr-1" /> Si</> : 'No'}
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Modal de Pago Interno */}
      {showModalPago && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-purple-600" />
                Registrar Pago Interno
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                El pago se aplicará a las facturas más antiguas primero (FIFO)
              </p>
            </div>

            <div className="p-6 space-y-4">
              {/* Quién paga */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  ¿Quién realiza el pago?
                </label>
                <div className="flex gap-3">
                  <button
                    onClick={() => setPagoForm({ ...pagoForm, pagador: 'VH' })}
                    className={`flex-1 py-3 px-4 rounded-xl font-semibold transition-all ${
                      pagoForm.pagador === 'VH'
                        ? 'bg-blue-600 text-white shadow-lg'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    VH paga a VC
                  </button>
                  <button
                    onClick={() => setPagoForm({ ...pagoForm, pagador: 'VC' })}
                    className={`flex-1 py-3 px-4 rounded-xl font-semibold transition-all ${
                      pagoForm.pagador === 'VC'
                        ? 'bg-emerald-600 text-white shadow-lg'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    VC paga a VH
                  </button>
                </div>
              </div>

              {/* Info de deuda pendiente */}
              <div className={`p-3 rounded-lg ${pagoForm.pagador === 'VH' ? 'bg-blue-50' : 'bg-emerald-50'}`}>
                <p className="text-sm">
                  <strong>Deuda pendiente:</strong>{' '}
                  {formatMoney(pagoForm.pagador === 'VH' ? totalesCuentaInterna.pendienteVHaVC : totalesCuentaInterna.pendienteVCaVH)}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {pagoForm.pagador === 'VH' ? deudaVHaVC.length : deudaVCaVH.length} facturas pendientes
                </p>
              </div>

              {/* Monto */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Monto a pagar
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-medium">$</span>
                  <input
                    type="text"
                    value={pagoForm.monto || ''}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9]/g, '')
                      setPagoForm({ ...pagoForm, monto: Number(val) })
                    }}
                    onFocus={(e) => e.target.select()}
                    className="w-full pl-8 pr-4 py-3 border border-slate-300 rounded-xl text-lg font-semibold focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    placeholder="0"
                  />
                </div>
                {/* Botones rápidos */}
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => setPagoForm({ ...pagoForm, monto: pagoForm.pagador === 'VH' ? totalesCuentaInterna.pendienteVHaVC : totalesCuentaInterna.pendienteVCaVH })}
                    className="text-xs px-3 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-600 transition-colors"
                  >
                    Pagar todo
                  </button>
                  <button
                    onClick={() => setPagoForm({ ...pagoForm, monto: Math.floor((pagoForm.pagador === 'VH' ? totalesCuentaInterna.pendienteVHaVC : totalesCuentaInterna.pendienteVCaVH) / 2) })}
                    className="text-xs px-3 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-600 transition-colors"
                  >
                    50%
                  </button>
                </div>
              </div>

              {/* Observaciones */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Observaciones (opcional)
                </label>
                <textarea
                  value={pagoForm.observaciones}
                  onChange={(e) => setPagoForm({ ...pagoForm, observaciones: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  rows={2}
                  placeholder="Ej: Transferencia 15/01"
                />
              </div>
            </div>

            <div className="p-6 border-t border-slate-200 flex gap-3">
              <button
                onClick={() => setShowModalPago(false)}
                className="flex-1 py-3 px-4 rounded-xl font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={registrarPagoInterno}
                disabled={procesandoPago || pagoForm.monto <= 0}
                className="flex-1 py-3 px-4 rounded-xl font-semibold text-white bg-purple-600 hover:bg-purple-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {procesandoPago ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Procesando...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    Registrar Pago
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Agregar Documento (FC o NC) */}
      {showModalDocumento && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <FileText className="h-5 w-5 text-indigo-600" />
                Agregar Documento
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                Factura suma deuda, Nota de Crédito resta
              </p>
            </div>

            <div className="p-6 space-y-4">
              {/* Tipo de documento */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Tipo de documento
                </label>
                <div className="flex gap-3">
                  <button
                    onClick={() => setDocumentoForm({ ...documentoForm, tipoDocumento: 'FC' })}
                    className={`flex-1 py-3 px-4 rounded-xl font-semibold transition-all ${
                      documentoForm.tipoDocumento === 'FC'
                        ? 'bg-indigo-600 text-white shadow-lg'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    📄 Factura
                  </button>
                  <button
                    onClick={() => setDocumentoForm({ ...documentoForm, tipoDocumento: 'NC' })}
                    className={`flex-1 py-3 px-4 rounded-xl font-semibold transition-all ${
                      documentoForm.tipoDocumento === 'NC'
                        ? 'bg-red-600 text-white shadow-lg'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    📋 Nota de Crédito
                  </button>
                </div>
              </div>

              {/* Quién debe */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  ¿Quién debe? (deuda interna)
                </label>
                <div className="flex gap-3">
                  <button
                    onClick={() => setDocumentoForm({ ...documentoForm, deudor: 'VH' })}
                    className={`flex-1 py-3 px-4 rounded-xl font-semibold transition-all ${
                      documentoForm.deudor === 'VH'
                        ? 'bg-blue-600 text-white shadow-lg'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    VH debe a VC (65%)
                  </button>
                  <button
                    onClick={() => setDocumentoForm({ ...documentoForm, deudor: 'VC' })}
                    className={`flex-1 py-3 px-4 rounded-xl font-semibold transition-all ${
                      documentoForm.deudor === 'VC'
                        ? 'bg-emerald-600 text-white shadow-lg'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    VC debe a VH (35%)
                  </button>
                </div>
              </div>

              {/* Info de la acción */}
              <div className={`p-3 rounded-lg ${
                documentoForm.tipoDocumento === 'NC' ? 'bg-red-50' : 'bg-indigo-50'
              }`}>
                <p className="text-sm">
                  {documentoForm.tipoDocumento === 'FC' ? (
                    <>
                      <strong>Factura:</strong> Se <span className="text-indigo-700 font-semibold">suma</span> a la deuda de {documentoForm.deudor} a {documentoForm.deudor === 'VH' ? 'VC' : 'VH'}
                    </>
                  ) : (
                    <>
                      <strong>Nota de Crédito:</strong> Se <span className="text-red-700 font-semibold">resta</span> de la deuda de {documentoForm.deudor} a {documentoForm.deudor === 'VH' ? 'VC' : 'VH'}
                    </>
                  )}
                </p>
              </div>

              {/* Fecha y Número */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Fecha
                  </label>
                  <input
                    type="date"
                    value={documentoForm.fecha}
                    onChange={(e) => setDocumentoForm({ ...documentoForm, fecha: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    N° {documentoForm.tipoDocumento}
                  </label>
                  <input
                    type="text"
                    value={documentoForm.nroDocumento}
                    onChange={(e) => setDocumentoForm({ ...documentoForm, nroDocumento: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Ej: 12345"
                  />
                </div>
              </div>

              {/* Proveedor */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Proveedor
                </label>
                <input
                  type="text"
                  value={documentoForm.proveedor}
                  onChange={(e) => setDocumentoForm({ ...documentoForm, proveedor: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Nombre del proveedor"
                />
              </div>

              {/* Monto */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Monto Total (con IVA)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-medium">$</span>
                  <input
                    type="text"
                    value={documentoForm.monto || ''}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9.]/g, '')
                      setDocumentoForm({ ...documentoForm, monto: Number(val) })
                    }}
                    onFocus={(e) => e.target.select()}
                    className="w-full pl-8 pr-4 py-3 border border-slate-300 rounded-xl text-lg font-semibold focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="0"
                  />
                </div>
                {documentoForm.monto > 0 && (
                  <p className="text-xs text-slate-500 mt-1">
                    Deuda resultante ({documentoForm.deudor === 'VH' ? '65%' : '35%'} del neto):
                    <strong className={documentoForm.tipoDocumento === 'NC' ? 'text-red-600' : 'text-indigo-600'}>
                      {' '}{documentoForm.tipoDocumento === 'NC' ? '-' : '+'}
                      {formatMoney((documentoForm.monto / 1.21) * (documentoForm.deudor === 'VH' ? 0.65 : 0.35))}
                    </strong>
                  </p>
                )}
              </div>

              {/* Pagado al proveedor */}
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="pagadoProveedor"
                  checked={documentoForm.pagadoProveedor}
                  onChange={(e) => setDocumentoForm({ ...documentoForm, pagadoProveedor: e.target.checked })}
                  className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="pagadoProveedor" className="text-sm text-slate-700">
                  Ya se pagó al proveedor externo
                </label>
              </div>
            </div>

            <div className="p-6 border-t border-slate-200 flex gap-3">
              <button
                onClick={() => setShowModalDocumento(false)}
                className="flex-1 py-3 px-4 rounded-xl font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={guardarDocumento}
                disabled={guardandoDocumento || !documentoForm.nroDocumento || !documentoForm.proveedor || documentoForm.monto <= 0}
                className={`flex-1 py-3 px-4 rounded-xl font-semibold text-white disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 ${
                  documentoForm.tipoDocumento === 'NC'
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-indigo-600 hover:bg-indigo-700'
                }`}
              >
                {guardandoDocumento ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Guardando...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    Guardar {documentoForm.tipoDocumento === 'FC' ? 'Factura' : 'Nota de Crédito'}
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
