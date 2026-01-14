'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, ArrowRightLeft, Building2, FileText, Download, Check, X, Calendar, DollarSign, Receipt, History, ChevronDown, ChevronRight } from 'lucide-react'
import Link from 'next/link'

interface DeudaInterna {
  id: number
  factura_id: number
  proveedor_id: number
  proveedor_nombre: string
  factura_numero: string
  factura_fecha: string
  empresa_origen: 'VH' | 'VC'  // Quien recibió la factura
  monto_deuda: number          // 65% o 35% del neto
  saldo_pendiente: number      // Lo que queda por pagar internamente
  pagado_proveedor: boolean    // Si ya se pagó al proveedor
  fecha_pago_proveedor?: string
}

interface PagoInterno {
  id: number
  fecha: string
  pagador: 'VH' | 'VC'         // Quien paga
  receptor: 'VH' | 'VC'        // Quien recibe
  monto: number
  observaciones?: string
  facturas_imputadas?: number[]
}

interface ResumenDeudaInterna {
  vh_debe_vc: number
  vc_debe_vh: number
  balance_neto: number  // Positivo = VH debe a VC, Negativo = VC debe a VH
}

export default function CuentaInternaPage() {
  const [deudasVhAVc, setDeudasVhAVc] = useState<DeudaInterna[]>([])
  const [deudasVcAVh, setDeudasVcAVh] = useState<DeudaInterna[]>([])
  const [pagosInternos, setPagosInternos] = useState<PagoInterno[]>([])
  const [resumen, setResumen] = useState<ResumenDeudaInterna>({ vh_debe_vc: 0, vc_debe_vh: 0, balance_neto: 0 })
  const [loading, setLoading] = useState(true)

  // Tabs
  const [activeTab, setActiveTab] = useState<'resumen' | 'vh_vc' | 'vc_vh' | 'nuevo_pago' | 'historial'>('resumen')

  // Nuevo pago
  const [nuevoPago, setNuevoPago] = useState({
    pagador: 'VH' as 'VH' | 'VC',
    monto: 0,
    fecha: new Date().toISOString().split('T')[0],
    observaciones: ''
  })
  const [guardandoPago, setGuardandoPago] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [facturasImputadas, setFacturasImputadas] = useState<DeudaInterna[]>([])

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)

    // Cargar facturas pagadas (donde aplica 65/35)
    const { data: facturasData } = await supabase
      .from('facturas')
      .select('*, proveedores(nombre)')
      .eq('aplica_65_35', true)
      .order('fecha', { ascending: true })

    // Cargar pagos a proveedores
    const { data: pagosData } = await supabase
      .from('pagos')
      .select('factura_id, monto, fecha')

    // Cargar cuenta_interna (deudas y pagos internos)
    const { data: cuentaData } = await supabase
      .from('cuenta_interna')
      .select('*')
      .order('created_at', { ascending: true })

    // Procesar datos
    const pagosPorFactura: Record<number, { total: number, fecha?: string }> = {}
    if (pagosData) {
      pagosData.forEach(p => {
        if (!pagosPorFactura[p.factura_id]) {
          pagosPorFactura[p.factura_id] = { total: 0 }
        }
        pagosPorFactura[p.factura_id].total += Number(p.monto)
        pagosPorFactura[p.factura_id].fecha = p.fecha
      })
    }

    const deudasVH: DeudaInterna[] = []
    const deudasVC: DeudaInterna[] = []

    if (facturasData) {
      facturasData.forEach((f: any) => {
        const montoNeto = f.monto_neto || (f.monto_total / 1.21)  // Aproximar neto si no está
        const pagoInfo = pagosPorFactura[f.id]
        const pagadoAlProveedor = pagoInfo && pagoInfo.total >= f.monto_total

        if (f.empresa === 'VH') {
          // VH recibió la factura, VC debe el 35% del neto a VH
          const montoDeuda = montoNeto * 0.35
          deudasVC.push({
            id: f.id,
            factura_id: f.id,
            proveedor_id: f.proveedor_id,
            proveedor_nombre: f.proveedores?.nombre || 'Sin nombre',
            factura_numero: f.numero,
            factura_fecha: f.fecha,
            empresa_origen: 'VH',
            monto_deuda: montoDeuda,
            saldo_pendiente: montoDeuda,  // Por ahora igual, después descontamos pagos internos
            pagado_proveedor: pagadoAlProveedor,
            fecha_pago_proveedor: pagoInfo?.fecha
          })
        } else {
          // VC recibió la factura, VH debe el 65% del neto a VC
          const montoDeuda = montoNeto * 0.65
          deudasVH.push({
            id: f.id,
            factura_id: f.id,
            proveedor_id: f.proveedor_id,
            proveedor_nombre: f.proveedores?.nombre || 'Sin nombre',
            factura_numero: f.numero,
            factura_fecha: f.fecha,
            empresa_origen: 'VC',
            monto_deuda: montoDeuda,
            saldo_pendiente: montoDeuda,
            pagado_proveedor: pagadoAlProveedor,
            fecha_pago_proveedor: pagoInfo?.fecha
          })
        }
      })
    }

    // Procesar pagos internos desde cuenta_interna
    const pagosInternosArr: PagoInterno[] = []
    if (cuentaData) {
      cuentaData.forEach((c: any) => {
        if (c.tipo === 'pago_interno') {
          pagosInternosArr.push({
            id: c.id,
            fecha: c.fecha,
            pagador: c.pagador,
            receptor: c.receptor,
            monto: Number(c.monto),
            observaciones: c.observaciones,
            facturas_imputadas: c.facturas_imputadas
          })
        }
      })

      // Descontar pagos internos de las deudas
      // VH pagó a VC: descontar de deudasVH
      // VC pagó a VH: descontar de deudasVC
      let montoDescontadoVH = 0
      let montoDescontadoVC = 0

      pagosInternosArr.forEach(pago => {
        if (pago.pagador === 'VH') {
          montoDescontadoVH += pago.monto
        } else {
          montoDescontadoVC += pago.monto
        }
      })

      // Aplicar descuento FIFO a las deudas
      let restanteVH = montoDescontadoVH
      for (const deuda of deudasVH) {
        if (restanteVH <= 0) break
        const descuento = Math.min(restanteVH, deuda.saldo_pendiente)
        deuda.saldo_pendiente -= descuento
        restanteVH -= descuento
      }

      let restanteVC = montoDescontadoVC
      for (const deuda of deudasVC) {
        if (restanteVC <= 0) break
        const descuento = Math.min(restanteVC, deuda.saldo_pendiente)
        deuda.saldo_pendiente -= descuento
        restanteVC -= descuento
      }
    }

    // Filtrar solo las que tienen saldo pendiente
    const deudasVHPendientes = deudasVH.filter(d => d.saldo_pendiente > 0.01)
    const deudasVCPendientes = deudasVC.filter(d => d.saldo_pendiente > 0.01)

    setDeudasVhAVc(deudasVHPendientes)
    setDeudasVcAVh(deudasVCPendientes)
    setPagosInternos(pagosInternosArr)

    // Calcular resumen
    const totalVhDebeVc = deudasVHPendientes.reduce((sum, d) => sum + d.saldo_pendiente, 0)
    const totalVcDebeVh = deudasVCPendientes.reduce((sum, d) => sum + d.saldo_pendiente, 0)

    setResumen({
      vh_debe_vc: totalVhDebeVc,
      vc_debe_vh: totalVcDebeVh,
      balance_neto: totalVhDebeVc - totalVcDebeVh
    })

    setLoading(false)
  }

  function calcularImputacion(monto: number, pagador: 'VH' | 'VC'): DeudaInterna[] {
    // FIFO: imputar a las facturas más viejas primero
    const deudas = pagador === 'VH' ? [...deudasVhAVc] : [...deudasVcAVh]
    const imputadas: DeudaInterna[] = []
    let restante = monto

    for (const deuda of deudas) {
      if (restante <= 0) break
      const imputar = Math.min(restante, deuda.saldo_pendiente)
      if (imputar > 0) {
        imputadas.push({ ...deuda, saldo_pendiente: imputar })
        restante -= imputar
      }
    }

    return imputadas
  }

  function handleMontoChange(monto: number) {
    setNuevoPago(prev => ({ ...prev, monto }))
    if (monto > 0) {
      const imputadas = calcularImputacion(monto, nuevoPago.pagador)
      setFacturasImputadas(imputadas)
    } else {
      setFacturasImputadas([])
    }
  }

  function handlePagadorChange(pagador: 'VH' | 'VC') {
    setNuevoPago(prev => ({ ...prev, pagador }))
    if (nuevoPago.monto > 0) {
      const imputadas = calcularImputacion(nuevoPago.monto, pagador)
      setFacturasImputadas(imputadas)
    }
  }

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
        observaciones: nuevoPago.observaciones || `Pago interno ${nuevoPago.pagador} a ${receptor}`,
        facturas_imputadas: facturasImputadas.map(f => f.factura_id)
      }])

    if (!error) {
      // Resetear formulario
      setNuevoPago({
        pagador: 'VH',
        monto: 0,
        fecha: new Date().toISOString().split('T')[0],
        observaciones: ''
      })
      setFacturasImputadas([])
      setShowConfirmModal(false)
      setActiveTab('historial')

      // Recargar datos
      loadData()
    }

    setGuardandoPago(false)
  }

  function generarReciboPDF() {
    // TODO: Generar PDF del recibo
    // Por ahora generamos un TXT simple
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
                    IMPUTACIÓN A FACTURAS
───────────────────────────────────────────────────────────
`

    facturasImputadas.forEach((f, idx) => {
      contenido += `
${idx + 1}. FC ${f.factura_numero} - ${f.proveedor_nombre}
   Fecha: ${formatDate(f.factura_fecha)}
   Imputado: ${formatMoney(f.saldo_pendiente)}
`
    })

    contenido += `
───────────────────────────────────────────────────────────
Total Imputado: ${formatMoney(facturasImputadas.reduce((s, f) => s + f.saldo_pendiente, 0))}
═══════════════════════════════════════════════════════════
`

    if (nuevoPago.observaciones) {
      contenido += `\nObservaciones: ${nuevoPago.observaciones}\n`
    }

    // Descargar
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
    const date = new Date(dateStr)
    return date.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' })
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
              <p className="text-purple-200 text-sm mt-0.5">Deudas y pagos entre VH y VC (65% / 35%)</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-6">
        {/* Cards de resumen */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl p-5 text-white shadow-lg">
            <div className="flex items-center gap-2 mb-2">
              <Building2 className="h-5 w-5 text-blue-200" />
              <p className="text-blue-200 text-sm font-medium">VH debe a VC</p>
            </div>
            <p className="text-3xl font-bold">{formatMoney(resumen.vh_debe_vc)}</p>
            <p className="text-blue-200 text-xs mt-1">{deudasVhAVc.length} facturas pendientes</p>
          </div>

          <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-xl p-5 text-white shadow-lg">
            <div className="flex items-center gap-2 mb-2">
              <Building2 className="h-5 w-5 text-emerald-200" />
              <p className="text-emerald-200 text-sm font-medium">VC debe a VH</p>
            </div>
            <p className="text-3xl font-bold">{formatMoney(resumen.vc_debe_vh)}</p>
            <p className="text-emerald-200 text-xs mt-1">{deudasVcAVh.length} facturas pendientes</p>
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
              <p className="text-sm font-medium opacity-80">Balance Neto</p>
            </div>
            <p className="text-3xl font-bold">{formatMoney(Math.abs(resumen.balance_neto))}</p>
            <p className="text-xs mt-1 opacity-80">
              {resumen.balance_neto > 0
                ? 'VH debe a VC'
                : resumen.balance_neto < 0
                  ? 'VC debe a VH'
                  : 'Cuentas equilibradas'}
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
              onClick={() => setActiveTab('vh_vc')}
              className={`px-6 py-4 font-medium text-sm whitespace-nowrap transition-colors ${
                activeTab === 'vh_vc'
                  ? 'text-blue-700 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              VH debe a VC ({deudasVhAVc.length})
            </button>
            <button
              onClick={() => setActiveTab('vc_vh')}
              className={`px-6 py-4 font-medium text-sm whitespace-nowrap transition-colors ${
                activeTab === 'vc_vh'
                  ? 'text-emerald-700 border-b-2 border-emerald-600 bg-emerald-50'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              VC debe a VH ({deudasVcAVh.length})
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
                Historial
              </span>
            </button>
          </div>

          {/* Contenido de tabs */}
          <div className="p-6">
            {activeTab === 'resumen' && (
              <ResumenPorProveedor deudasVH={deudasVhAVc} deudasVC={deudasVcAVh} formatMoney={formatMoney} />
            )}

            {activeTab === 'vh_vc' && (
              <TablaDeudas deudas={deudasVhAVc} titulo="VH debe a VC" color="blue" formatMoney={formatMoney} formatDate={formatDate} />
            )}

            {activeTab === 'vc_vh' && (
              <TablaDeudas deudas={deudasVcAVh} titulo="VC debe a VH" color="emerald" formatMoney={formatMoney} formatDate={formatDate} />
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
                        onClick={() => handlePagadorChange('VH')}
                        className={`flex-1 p-4 rounded-xl border-2 transition-all ${
                          nuevoPago.pagador === 'VH'
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <Building2 className={`h-6 w-6 mx-auto mb-2 ${nuevoPago.pagador === 'VH' ? 'text-blue-600' : 'text-slate-400'}`} />
                        <p className={`font-semibold ${nuevoPago.pagador === 'VH' ? 'text-blue-700' : 'text-slate-600'}`}>VH paga a VC</p>
                        <p className="text-sm text-slate-500 mt-1">Deuda actual: {formatMoney(resumen.vh_debe_vc)}</p>
                      </button>
                      <button
                        onClick={() => handlePagadorChange('VC')}
                        className={`flex-1 p-4 rounded-xl border-2 transition-all ${
                          nuevoPago.pagador === 'VC'
                            ? 'border-emerald-500 bg-emerald-50'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <Building2 className={`h-6 w-6 mx-auto mb-2 ${nuevoPago.pagador === 'VC' ? 'text-emerald-600' : 'text-slate-400'}`} />
                        <p className={`font-semibold ${nuevoPago.pagador === 'VC' ? 'text-emerald-700' : 'text-slate-600'}`}>VC paga a VH</p>
                        <p className="text-sm text-slate-500 mt-1">Deuda actual: {formatMoney(resumen.vc_debe_vh)}</p>
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
                          onChange={(e) => handleMontoChange(parseFloat(e.target.value) || 0)}
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

                  {/* Preview de imputación */}
                  {facturasImputadas.length > 0 && (
                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                      <h4 className="font-medium text-slate-700 mb-3 flex items-center gap-2">
                        <Receipt className="h-4 w-4" />
                        Se imputará a las siguientes facturas (FIFO):
                      </h4>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {facturasImputadas.map((f, idx) => (
                          <div key={f.id} className="flex items-center justify-between p-2 bg-white rounded-lg">
                            <div>
                              <span className="text-xs text-slate-500">{idx + 1}.</span>
                              <span className="font-medium text-slate-700 ml-2">FC {f.factura_numero}</span>
                              <span className="text-slate-500 text-sm ml-2">- {f.proveedor_nombre}</span>
                            </div>
                            <span className="font-semibold text-slate-800">{formatMoney(f.saldo_pendiente)}</span>
                          </div>
                        ))}
                      </div>
                      <div className="mt-3 pt-3 border-t border-slate-200 flex justify-between">
                        <span className="font-medium text-slate-600">Total a imputar:</span>
                        <span className="font-bold text-slate-800">
                          {formatMoney(facturasImputadas.reduce((s, f) => s + f.saldo_pendiente, 0))}
                        </span>
                      </div>
                    </div>
                  )}

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
                        {pago.facturas_imputadas && pago.facturas_imputadas.length > 0 && (
                          <p className="text-xs text-slate-500 mt-2 pl-11">
                            Imputado a {pago.facturas_imputadas.length} factura(s)
                          </p>
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
                Se imputará a <strong>{facturasImputadas.length}</strong> factura(s) en orden cronológico (FIFO).
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

// Componente para Resumen por Proveedor
function ResumenPorProveedor({ deudasVH, deudasVC, formatMoney }: {
  deudasVH: DeudaInterna[],
  deudasVC: DeudaInterna[],
  formatMoney: (n: number) => string
}) {
  // Agrupar por proveedor
  const proveedores: Record<number, {
    nombre: string
    vh_debe: number  // Lo que VH le debe al proveedor (facturas recibidas por VH)
    vc_debe: number  // Lo que VC le debe al proveedor (facturas recibidas por VC)
    total_general: number
    deuda_real_vh: number  // 65% del total
    deuda_real_vc: number  // 35% del total
  }> = {}

  // Nota: deudasVH = VH debe a VC (por facturas recibidas en VC)
  // deudasVC = VC debe a VH (por facturas recibidas en VH)

  // Para el resumen por proveedor necesitamos:
  // - VH debe: facturas recibidas por VH
  // - VC debe: facturas recibidas por VC

  // En deudasVH están las facturas que VC recibió (VH debe el 65% a VC)
  // En deudasVC están las facturas que VH recibió (VC debe el 35% a VH)

  deudasVH.forEach(d => {
    // d.empresa_origen = 'VC' (VC recibió la factura)
    // El monto_deuda es 65% del neto
    // Deuda real al proveedor sería el 100% = monto_deuda / 0.65
    if (!proveedores[d.proveedor_id]) {
      proveedores[d.proveedor_id] = {
        nombre: d.proveedor_nombre,
        vh_debe: 0,
        vc_debe: 0,
        total_general: 0,
        deuda_real_vh: 0,
        deuda_real_vc: 0
      }
    }
    // La factura llegó a VC, VC debe al proveedor
    const deudaTotal = d.monto_deuda / 0.65  // Recuperar 100%
    proveedores[d.proveedor_id].vc_debe += deudaTotal
    proveedores[d.proveedor_id].total_general += deudaTotal
  })

  deudasVC.forEach(d => {
    // d.empresa_origen = 'VH' (VH recibió la factura)
    // El monto_deuda es 35% del neto
    if (!proveedores[d.proveedor_id]) {
      proveedores[d.proveedor_id] = {
        nombre: d.proveedor_nombre,
        vh_debe: 0,
        vc_debe: 0,
        total_general: 0,
        deuda_real_vh: 0,
        deuda_real_vc: 0
      }
    }
    // La factura llegó a VH, VH debe al proveedor
    const deudaTotal = d.monto_deuda / 0.35  // Recuperar 100%
    proveedores[d.proveedor_id].vh_debe += deudaTotal
    proveedores[d.proveedor_id].total_general += deudaTotal
  })

  // Calcular deuda real (65/35 del total general)
  Object.values(proveedores).forEach(p => {
    p.deuda_real_vh = p.total_general * 0.65
    p.deuda_real_vc = p.total_general * 0.35
  })

  const proveedoresArray = Object.values(proveedores).sort((a, b) => b.total_general - a.total_general)

  // Totales
  const totales = proveedoresArray.reduce((acc, p) => ({
    vh_debe: acc.vh_debe + p.vh_debe,
    vc_debe: acc.vc_debe + p.vc_debe,
    total_general: acc.total_general + p.total_general,
    deuda_real_vh: acc.deuda_real_vh + p.deuda_real_vh,
    deuda_real_vc: acc.deuda_real_vc + p.deuda_real_vc
  }), { vh_debe: 0, vc_debe: 0, total_general: 0, deuda_real_vh: 0, deuda_real_vc: 0 })

  return (
    <div>
      <h3 className="text-lg font-semibold text-slate-800 mb-4">Resumen por Proveedor</h3>
      <p className="text-sm text-slate-500 mb-4">
        Muestra la distribución real de deudas aplicando la regla 65% VH / 35% VC
      </p>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-100">
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Proveedor</th>
              <th className="px-4 py-3 text-right font-semibold text-blue-600">VH debe</th>
              <th className="px-4 py-3 text-right font-semibold text-emerald-600">VC debe</th>
              <th className="px-4 py-3 text-right font-semibold text-slate-700">Total General</th>
              <th className="px-4 py-3 text-right font-semibold text-blue-700 bg-blue-50">Deuda Real VH (65%)</th>
              <th className="px-4 py-3 text-right font-semibold text-emerald-700 bg-emerald-50">Deuda Real VC (35%)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {proveedoresArray.map((p) => (
              <tr key={p.nombre} className="hover:bg-slate-50">
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
  )
}

// Componente para tabla de deudas
function TablaDeudas({ deudas, titulo, color, formatMoney, formatDate }: {
  deudas: DeudaInterna[]
  titulo: string
  color: 'blue' | 'emerald'
  formatMoney: (n: number) => string
  formatDate: (s: string) => string
}) {
  const [expanded, setExpanded] = useState<Set<number>>(new Set())

  // Agrupar por proveedor
  const porProveedor: Record<number, DeudaInterna[]> = {}
  deudas.forEach(d => {
    if (!porProveedor[d.proveedor_id]) {
      porProveedor[d.proveedor_id] = []
    }
    porProveedor[d.proveedor_id].push(d)
  })

  const proveedoresOrdenados = Object.entries(porProveedor)
    .map(([id, facturas]) => ({
      id: Number(id),
      nombre: facturas[0].proveedor_nombre,
      facturas,
      total: facturas.reduce((s, f) => s + f.saldo_pendiente, 0)
    }))
    .sort((a, b) => b.total - a.total)

  return (
    <div>
      <h3 className="text-lg font-semibold text-slate-800 mb-4">{titulo}</h3>

      {proveedoresOrdenados.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="h-12 w-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">No hay deudas pendientes</p>
        </div>
      ) : (
        <div className="space-y-3">
          {proveedoresOrdenados.map((prov) => (
            <div key={prov.id} className="border border-slate-200 rounded-xl overflow-hidden">
              <div
                className={`p-4 cursor-pointer transition-colors ${
                  expanded.has(prov.id) ? `bg-${color}-50` : 'hover:bg-slate-50'
                }`}
                onClick={() => {
                  const newExpanded = new Set(expanded)
                  if (newExpanded.has(prov.id)) {
                    newExpanded.delete(prov.id)
                  } else {
                    newExpanded.add(prov.id)
                  }
                  setExpanded(newExpanded)
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {expanded.has(prov.id) ? (
                      <ChevronDown className={`h-5 w-5 text-${color}-600`} />
                    ) : (
                      <ChevronRight className="h-5 w-5 text-slate-400" />
                    )}
                    <div>
                      <h4 className="font-semibold text-slate-800">{prov.nombre}</h4>
                      <p className="text-xs text-slate-500">{prov.facturas.length} factura(s)</p>
                    </div>
                  </div>
                  <p className={`text-xl font-bold text-${color}-700`}>{formatMoney(prov.total)}</p>
                </div>
              </div>

              {expanded.has(prov.id) && (
                <div className="border-t border-slate-200">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-100">
                      <tr>
                        <th className="px-4 py-2 text-left font-semibold text-slate-600">Factura</th>
                        <th className="px-4 py-2 text-left font-semibold text-slate-600">Fecha</th>
                        <th className="px-4 py-2 text-right font-semibold text-slate-600">Deuda Original</th>
                        <th className="px-4 py-2 text-right font-semibold text-slate-600">Saldo Pendiente</th>
                        <th className="px-4 py-2 text-center font-semibold text-slate-600">Pagado Prov.</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {prov.facturas.map((f) => (
                        <tr key={f.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 font-medium text-slate-800">{f.factura_numero}</td>
                          <td className="px-4 py-3 text-slate-600">{formatDate(f.factura_fecha)}</td>
                          <td className="px-4 py-3 text-right text-slate-600">{formatMoney(f.monto_deuda)}</td>
                          <td className={`px-4 py-3 text-right font-semibold text-${color}-700`}>
                            {formatMoney(f.saldo_pendiente)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {f.pagado_proveedor ? (
                              <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium">
                                Sí
                              </span>
                            ) : (
                              <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">
                                No
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
