'use client'

import { useEffect, useState } from 'react'
import { supabase, Factura, Proveedor, registrarAuditoria } from '@/lib/supabase'
import Link from 'next/link'
import ProtectedRoute from '@/components/ProtectedRoute'
import UserMenu from '@/components/UserMenu'
import NavRapida from '@/components/NavRapida'
import Buscador from '@/components/Buscador'

// Icons inline
const Icons = {
  arrowLeft: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
    </svg>
  ),
  plus: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  ),
  search: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  ),
  edit: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  ),
  trash: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  ),
  dollar: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  x: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  document: (
    <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  fileText: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
}

export default function FacturasPage() {
  const [facturas, setFacturas] = useState<Factura[]>([])
  const [facturasFiltradas, setFacturasFiltradas] = useState<Factura[]>([])
  const [proveedores, setProveedores] = useState<Proveedor[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingFactura, setEditingFactura] = useState<Factura | null>(null)

  // Filtros
  const [busqueda, setBusqueda] = useState('')
  const [filtroEmpresa, setFiltroEmpresa] = useState<'todos' | 'VH' | 'VC'>('todos')
  const [filtroProveedor, setFiltroProveedor] = useState('')

  // Ordenamiento por columnas
  const [ordenarPor, setOrdenarPor] = useState<'dias' | 'proveedor' | 'empresa' | 'numero' | 'fecha' | 'total' | 'saldo'>('dias')
  const [ordenAsc, setOrdenAsc] = useState(false)

  // Selección de facturas
  const [facturasSeleccionadas, setFacturasSeleccionadas] = useState<number[]>([])

  const [formData, setFormData] = useState({
    tipo_documento: 'FC' as 'FC' | 'NC',
    proveedor_id: '',
    empresa: 'VH' as 'VH' | 'VC',
    numero: '',
    fecha: new Date().toISOString().split('T')[0],
    fecha_vencimiento: '',
    monto_total: '',
    monto_neto: '',
    iva: '',
    aplica_65_35: true,
    descuento_pronto_pago: '',
    monto_descuento: '',
    fecha_limite_descuento: '',
    observaciones: ''
  })

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    let filtered = [...facturas]

    if (busqueda) {
      const search = busqueda.toLowerCase()
      filtered = filtered.filter(f =>
        f.proveedor_nombre?.toLowerCase().includes(search) ||
        f.numero.toLowerCase().includes(search)
      )
    }

    if (filtroEmpresa !== 'todos') {
      filtered = filtered.filter(f => f.empresa === filtroEmpresa)
    }

    if (filtroProveedor) {
      filtered = filtered.filter(f => f.proveedor_id === parseInt(filtroProveedor))
    }

    // Ordenamiento dinámico por columna
    filtered.sort((a, b) => {
      let comparison = 0
      switch (ordenarPor) {
        case 'dias':
          comparison = (b.dias_antiguedad || 0) - (a.dias_antiguedad || 0)
          break
        case 'proveedor':
          comparison = (a.proveedor_nombre || '').localeCompare(b.proveedor_nombre || '')
          break
        case 'empresa':
          comparison = a.empresa.localeCompare(b.empresa)
          break
        case 'numero':
          comparison = a.numero.localeCompare(b.numero)
          break
        case 'fecha':
          comparison = new Date(a.fecha).getTime() - new Date(b.fecha).getTime()
          break
        case 'total':
          comparison = b.monto_total - a.monto_total
          break
        case 'saldo':
          comparison = Number(b.saldo_pendiente || 0) - Number(a.saldo_pendiente || 0)
          break
        default:
          comparison = 0
      }
      return ordenAsc ? -comparison : comparison
    })

    setFacturasFiltradas(filtered)
  }, [facturas, busqueda, filtroEmpresa, filtroProveedor, ordenarPor, ordenAsc])

  const handleSort = (columna: 'dias' | 'proveedor' | 'empresa' | 'numero' | 'fecha' | 'total' | 'saldo') => {
    if (ordenarPor === columna) {
      setOrdenAsc(!ordenAsc)
    } else {
      setOrdenarPor(columna)
      setOrdenAsc(columna === 'proveedor' || columna === 'numero') // A-Z por defecto para texto
    }
  }

  // Funciones de selección
  const toggleFacturaSeleccionada = (facturaId: number) => {
    setFacturasSeleccionadas(prev =>
      prev.includes(facturaId)
        ? prev.filter(id => id !== facturaId)
        : [...prev, facturaId]
    )
  }

  const toggleSeleccionarTodas = () => {
    if (facturasSeleccionadas.length === facturasFiltradas.length) {
      setFacturasSeleccionadas([])
    } else {
      setFacturasSeleccionadas(facturasFiltradas.map(f => f.id))
    }
  }

  const limpiarSeleccion = () => {
    setFacturasSeleccionadas([])
  }

  // Calcular totales de facturas seleccionadas
  const totalesSeleccionados = {
    cantidad: facturasSeleccionadas.length,
    monto: facturasFiltradas
      .filter(f => facturasSeleccionadas.includes(f.id))
      .reduce((sum, f) => sum + f.monto_total, 0),
    saldo: facturasFiltradas
      .filter(f => facturasSeleccionadas.includes(f.id))
      .reduce((sum, f) => sum + Number(f.saldo_pendiente || 0), 0)
  }

  async function loadData() {
    setLoading(true)

    const { data: provData } = await supabase
      .from('proveedores')
      .select('*')
      .eq('activo', true)
      .order('nombre')

    if (provData) setProveedores(provData)

    const { data: factData } = await supabase
      .from('facturas')
      .select('*, proveedores(nombre)')
      .in('estado', ['pendiente', 'parcial'])

    const { data: pagosData } = await supabase
      .from('pagos')
      .select('factura_id, monto')

    const pagosPorFactura: Record<number, number> = {}
    if (pagosData) {
      pagosData.forEach(p => {
        pagosPorFactura[p.factura_id] = (pagosPorFactura[p.factura_id] || 0) + Number(p.monto)
      })
    }

    if (factData) {
      const hoy = new Date()
      const facturasConDatos = factData.map((f: any) => {
        const fecha = new Date(f.fecha)
        const dias = Math.floor((hoy.getTime() - fecha.getTime()) / (1000 * 60 * 60 * 24))
        const totalPagado = pagosPorFactura[f.id] || 0
        let alerta: 'verde' | 'amarillo' | 'rojo' = 'verde'
        if (dias > 40) alerta = 'rojo'
        else if (dias > 30) alerta = 'amarillo'

        return {
          ...f,
          proveedor_nombre: f.proveedores?.nombre,
          alerta,
          dias_antiguedad: dias,
          total_pagado: totalPagado,
          saldo_pendiente: f.monto_total - totalPagado
        }
      })
      setFacturas(facturasConDatos)
    }
    setLoading(false)
  }

  function openNewModal() {
    setEditingFactura(null)
    setFormData({
      tipo_documento: 'FC',
      proveedor_id: '',
      empresa: 'VH',
      numero: '',
      fecha: new Date().toISOString().split('T')[0],
      fecha_vencimiento: '',
      monto_total: '',
      monto_neto: '',
      iva: '',
      aplica_65_35: true,
      descuento_pronto_pago: '',
      monto_descuento: '',
      fecha_limite_descuento: '',
      observaciones: ''
    })
    setShowModal(true)
  }

  function openEditModal(factura: Factura) {
    setEditingFactura(factura)
    // Detectar tipo de documento por el monto (NC tiene monto negativo) o por el número
    const esNC = factura.monto_total < 0 || factura.numero.toUpperCase().startsWith('NC')
    setFormData({
      tipo_documento: esNC ? 'NC' : 'FC',
      proveedor_id: String(factura.proveedor_id),
      empresa: factura.empresa,
      numero: factura.numero,
      fecha: factura.fecha,
      fecha_vencimiento: factura.fecha_vencimiento || '',
      monto_total: String(Math.abs(factura.monto_total)),
      monto_neto: String(Math.abs(factura.monto_neto || 0) || ''),
      iva: String(Math.abs(factura.iva || 0) || ''),
      aplica_65_35: factura.aplica_65_35,
      descuento_pronto_pago: String(factura.descuento_pronto_pago || ''),
      monto_descuento: String(factura.monto_descuento || ''),
      fecha_limite_descuento: factura.fecha_limite_descuento || '',
      observaciones: factura.observaciones || ''
    })
    setShowModal(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    // Para NC, los montos son negativos (restan de la deuda)
    const multiplicador = formData.tipo_documento === 'NC' ? -1 : 1
    const montoTotal = parseFloat(formData.monto_total) * multiplicador
    const montoNeto = formData.monto_neto ? parseFloat(formData.monto_neto) * multiplicador : null
    const iva = formData.iva ? parseFloat(formData.iva) * multiplicador : null

    const dataToSave = {
      proveedor_id: parseInt(formData.proveedor_id),
      empresa: formData.empresa,
      numero: formData.numero,
      fecha: formData.fecha,
      fecha_vencimiento: formData.fecha_vencimiento || null,
      monto_total: montoTotal,
      monto_neto: montoNeto,
      iva: iva,
      aplica_65_35: formData.aplica_65_35,
      descuento_pronto_pago: formData.descuento_pronto_pago ? parseFloat(formData.descuento_pronto_pago) : null,
      monto_descuento: formData.monto_descuento ? parseFloat(formData.monto_descuento) : null,
      fecha_limite_descuento: formData.fecha_limite_descuento || null,
      observaciones: formData.observaciones || null
    }

    const proveedorNombre = proveedores.find(p => p.id === parseInt(formData.proveedor_id))?.nombre || 'Desconocido'
    const tipoDoc = formData.tipo_documento === 'NC' ? 'Nota de Crédito' : 'Factura'

    if (editingFactura) {
      await supabase.from('facturas').update(dataToSave).eq('id', editingFactura.id)
      await registrarAuditoria(
        'EDITAR_FACTURA',
        `${tipoDoc} ${formData.numero} de ${proveedorNombre} modificada`,
        { factura_id: editingFactura.id, numero: formData.numero, proveedor: proveedorNombre, empresa: formData.empresa, monto: montoTotal, tipo: formData.tipo_documento }
      )
    } else {
      const { data: nuevaFactura } = await supabase.from('facturas').insert([dataToSave]).select().single()
      await registrarAuditoria(
        'CREAR_FACTURA',
        `Nueva ${tipoDoc} ${formData.numero} de ${proveedorNombre} por $${Math.abs(parseFloat(formData.monto_total)).toLocaleString('es-AR')}`,
        { factura_id: nuevaFactura?.id, numero: formData.numero, proveedor: proveedorNombre, empresa: formData.empresa, monto: montoTotal, tipo: formData.tipo_documento }
      )

      // Si aplica regla 65/35, crear registro en cuenta_interna
      if (formData.aplica_65_35 && nuevaFactura) {
        // Calcular el monto neto (sin IVA)
        const montoNetoAbs = Math.abs(montoTotal) / 1.21

        // Determinar quién debe a quién según la empresa de la factura
        // Si FC de VH: VC debe a VH el 35%
        // Si FC de VC: VH debe a VC el 65%
        // Para NC se invierte (resta de la deuda)
        const esNC = formData.tipo_documento === 'NC'

        let pagador: 'VH' | 'VC'
        let receptor: 'VH' | 'VC'
        let porcentaje: number

        if (formData.empresa === 'VH') {
          // Factura de VH: VC debe a VH el 35%
          pagador = 'VC'
          receptor = 'VH'
          porcentaje = 0.35
        } else {
          // Factura de VC: VH debe a VC el 65%
          pagador = 'VH'
          receptor = 'VC'
          porcentaje = 0.65
        }

        const montoDeuda = montoNetoAbs * porcentaje
        // Para NC el monto es negativo (resta de la deuda)
        const montoFinal = esNC ? -montoDeuda : montoDeuda

        const tipoDocCuenta = esNC ? 'NC' : 'FC'
        const observacionesCuenta = `${tipoDocCuenta} ${formData.numero} - ${proveedorNombre.toUpperCase()}`

        const { error: errorCuentaInterna } = await supabase.from('cuenta_interna').insert({
          tipo: 'deuda_historica',
          debe_vh: pagador === 'VH' ? montoFinal : 0,
          debe_vc: pagador === 'VC' ? montoFinal : 0,
          pagador,
          receptor,
          monto: montoFinal,
          fecha: formData.fecha,
          observaciones: observacionesCuenta,
          pagado: false,
          pagado_proveedor: false,
          factura_id: nuevaFactura.id
        })

        if (errorCuentaInterna) {
          console.error('Error creando deuda interna:', errorCuentaInterna)
          alert(`⚠️ La factura se guardó pero hubo un error creando la deuda interna:\n${errorCuentaInterna.message}`)
        } else {
          console.log('Deuda interna creada:', {
            pagador,
            receptor,
            monto: montoFinal,
            observaciones: observacionesCuenta
          })
        }
      }
    }

    setShowModal(false)
    loadData()
  }

  async function handleDelete(id: number) {
    const factura = facturas.find(f => f.id === id)
    if (confirm('¿Seguro que querés anular esta factura?')) {
      await supabase.from('facturas').update({ estado: 'anulada' }).eq('id', id)
      await registrarAuditoria(
        'ANULAR_FACTURA',
        `Factura ${factura?.numero} de ${factura?.proveedor_nombre} anulada`,
        { factura_id: id, numero: factura?.numero, proveedor: factura?.proveedor_nombre, empresa: factura?.empresa }
      )
      loadData()
    }
  }

  function calcularMontos() {
    const total = parseFloat(formData.monto_total) || 0
    if (total > 0) {
      const neto = total / 1.21
      const iva = total - neto
      setFormData({ ...formData, monto_neto: neto.toFixed(2), iva: iva.toFixed(2) })
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

  const totalesFiltrados = {
    cantidad: facturasFiltradas.length,
    monto: facturasFiltradas.reduce((sum, f) => sum + f.monto_total, 0),
    saldo: facturasFiltradas.reduce((sum, f) => sum + Number(f.saldo_pendiente || 0), 0)
  }

  if (loading) {
    return (
      <div className="min-h-screen gradient-mesh flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-slate-500 font-medium">Cargando facturas...</p>
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
                  <h1 className="text-white font-semibold text-lg">Facturas</h1>
                  <p className="text-slate-400 text-xs">Gestión de facturas pendientes</p>
                </div>
              </div>
              <UserMenu />
            </div>
          </div>
        </header>
        <NavRapida />

        <main className="container-app py-8">
          {/* Panel de filtros */}
          <div className="card-premium p-5 mb-6 animate-fadeIn">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Buscador */}
              <Buscador
                value={busqueda}
                onChange={setBusqueda}
                placeholder="Buscar por proveedor o número..."
                className="flex-1"
              />

              {/* Filtro empresa */}
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

              {/* Filtro proveedor */}
              <select
                value={filtroProveedor}
                onChange={(e) => setFiltroProveedor(e.target.value)}
                className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 min-w-[180px]"
              >
                <option value="">Todos los proveedores</option>
                {proveedores.map(p => (
                  <option key={p.id} value={p.id}>{p.nombre}</option>
                ))}
              </select>

              {/* Botón nueva factura/NC */}
              <button
                onClick={openNewModal}
                className="btn-primary flex items-center gap-2"
              >
                {Icons.plus}
                Nueva FC / NC
              </button>
            </div>

            {/* Resumen de filtros */}
            <div className="flex items-center gap-6 mt-4 pt-4 border-t border-slate-100">
              <div className="flex items-center gap-2">
                <span className="text-slate-400">{Icons.fileText}</span>
                <span className="text-sm text-slate-600">
                  <strong className="text-slate-800">{totalesFiltrados.cantidad}</strong> facturas
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-600">
                  Total: <strong className="text-slate-800">{formatMoney(totalesFiltrados.monto)}</strong>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-600">
                  Saldo pendiente: <strong className="text-red-600">{formatMoney(totalesFiltrados.saldo)}</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Panel de selección */}
          {facturasSeleccionadas.length > 0 && (
            <div className="card-premium p-4 mb-6 animate-fadeIn bg-gradient-to-r from-indigo-50 to-purple-50 border-2 border-indigo-200">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-4">
                  <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-600 text-white shadow-lg">
                    <span className="text-lg font-bold">{totalesSeleccionados.cantidad}</span>
                  </div>
                  <div>
                    <p className="font-semibold text-indigo-800">
                      {totalesSeleccionados.cantidad === 1 ? 'Factura seleccionada' : 'Facturas seleccionadas'}
                    </p>
                    <div className="flex items-center gap-4 mt-1">
                      <span className="text-sm text-slate-600">
                        Total: <strong className="text-indigo-700">{formatMoney(totalesSeleccionados.monto)}</strong>
                      </span>
                      <span className="text-sm text-slate-600">
                        Saldo: <strong className="text-red-600">{formatMoney(totalesSeleccionados.saldo)}</strong>
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={limpiarSeleccion}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  {Icons.x}
                  Limpiar selección
                </button>
              </div>
            </div>
          )}

          {/* Tabla de facturas */}
          <div className="card-premium overflow-hidden animate-slideUp">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-100 border-b-2 border-slate-200">
                    <th className="px-4 py-4 w-12">
                      <input
                        type="checkbox"
                        checked={facturasFiltradas.length > 0 && facturasSeleccionadas.length === facturasFiltradas.length}
                        onChange={toggleSeleccionarTodas}
                        className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        title={facturasSeleccionadas.length === facturasFiltradas.length ? 'Deseleccionar todas' : 'Seleccionar todas'}
                      />
                    </th>
                    <th
                      className="px-5 py-4 text-left cursor-pointer hover:bg-slate-200 transition-colors group"
                      onClick={() => handleSort('dias')}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Días</span>
                        <span className={`transition-all ${ordenarPor === 'dias' ? 'text-indigo-600' : 'text-slate-300 group-hover:text-slate-400'}`}>
                          {ordenarPor === 'dias' ? (ordenAsc ? '↑' : '↓') : '↕'}
                        </span>
                      </div>
                    </th>
                    <th
                      className="px-5 py-4 text-left cursor-pointer hover:bg-slate-200 transition-colors group"
                      onClick={() => handleSort('proveedor')}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Proveedor</span>
                        <span className={`transition-all ${ordenarPor === 'proveedor' ? 'text-indigo-600' : 'text-slate-300 group-hover:text-slate-400'}`}>
                          {ordenarPor === 'proveedor' ? (ordenAsc ? '↑' : '↓') : '↕'}
                        </span>
                      </div>
                    </th>
                    <th
                      className="px-5 py-4 text-center cursor-pointer hover:bg-slate-200 transition-colors group"
                      onClick={() => handleSort('empresa')}
                    >
                      <div className="flex items-center justify-center gap-2">
                        <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Empresa</span>
                        <span className={`transition-all ${ordenarPor === 'empresa' ? 'text-indigo-600' : 'text-slate-300 group-hover:text-slate-400'}`}>
                          {ordenarPor === 'empresa' ? (ordenAsc ? '↑' : '↓') : '↕'}
                        </span>
                      </div>
                    </th>
                    <th
                      className="px-5 py-4 text-left cursor-pointer hover:bg-slate-200 transition-colors group"
                      onClick={() => handleSort('numero')}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Número</span>
                        <span className={`transition-all ${ordenarPor === 'numero' ? 'text-indigo-600' : 'text-slate-300 group-hover:text-slate-400'}`}>
                          {ordenarPor === 'numero' ? (ordenAsc ? '↑' : '↓') : '↕'}
                        </span>
                      </div>
                    </th>
                    <th
                      className="px-5 py-4 text-left cursor-pointer hover:bg-slate-200 transition-colors group"
                      onClick={() => handleSort('fecha')}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Fecha</span>
                        <span className={`transition-all ${ordenarPor === 'fecha' ? 'text-indigo-600' : 'text-slate-300 group-hover:text-slate-400'}`}>
                          {ordenarPor === 'fecha' ? (ordenAsc ? '↑' : '↓') : '↕'}
                        </span>
                      </div>
                    </th>
                    <th
                      className="px-5 py-4 text-right cursor-pointer hover:bg-slate-200 transition-colors group"
                      onClick={() => handleSort('total')}
                    >
                      <div className="flex items-center justify-end gap-2">
                        <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Total</span>
                        <span className={`transition-all ${ordenarPor === 'total' ? 'text-indigo-600' : 'text-slate-300 group-hover:text-slate-400'}`}>
                          {ordenarPor === 'total' ? (ordenAsc ? '↑' : '↓') : '↕'}
                        </span>
                      </div>
                    </th>
                    <th
                      className="px-5 py-4 text-right cursor-pointer hover:bg-slate-200 transition-colors group"
                      onClick={() => handleSort('saldo')}
                    >
                      <div className="flex items-center justify-end gap-2">
                        <span className="text-xs font-bold text-red-600 uppercase tracking-wider">Saldo</span>
                        <span className={`transition-all ${ordenarPor === 'saldo' ? 'text-red-600' : 'text-slate-300 group-hover:text-slate-400'}`}>
                          {ordenarPor === 'saldo' ? (ordenAsc ? '↑' : '↓') : '↕'}
                        </span>
                      </div>
                    </th>
                    <th className="px-5 py-4 text-center text-xs font-bold text-slate-600 uppercase tracking-wider">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {facturasFiltradas.map((factura, idx) => (
                    <tr
                      key={factura.id}
                      className={`transition-colors ${
                        facturasSeleccionadas.includes(factura.id)
                          ? 'bg-indigo-100 hover:bg-indigo-150 border-l-4 border-indigo-500'
                          : idx % 2 === 0 ? 'bg-white hover:bg-indigo-50' : 'bg-slate-100 hover:bg-indigo-100'
                      }`}
                    >
                      <td className="px-4 py-4">
                        <input
                          type="checkbox"
                          checked={facturasSeleccionadas.includes(factura.id)}
                          onChange={() => toggleFacturaSeleccionada(factura.id)}
                          className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                      </td>
                      <td className="px-5 py-4">
                        <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${
                          factura.alerta === 'verde' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' :
                          factura.alerta === 'amarillo' ? 'bg-amber-100 text-amber-700 border border-amber-200' :
                          'bg-red-100 text-red-700 border border-red-200'
                        }`}>
                          <span className={`w-2 h-2 rounded-full ${
                            factura.alerta === 'verde' ? 'bg-emerald-500' :
                            factura.alerta === 'amarillo' ? 'bg-amber-500' :
                            'bg-red-500'
                          }`}></span>
                          {factura.dias_antiguedad}d
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="font-semibold text-slate-800">{factura.proveedor_nombre}</span>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <span className={`badge ${factura.empresa === 'VH' ? 'badge-vh' : 'badge-vc'}`}>
                          {factura.empresa}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          {factura.monto_total < 0 && (
                            <span className="px-1.5 py-0.5 bg-red-100 text-red-700 text-xs font-bold rounded">NC</span>
                          )}
                          <span className={`font-mono text-sm ${factura.monto_total < 0 ? 'text-red-600' : 'text-slate-600'}`}>
                            {factura.numero}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-slate-600">
                        {new Date(factura.fecha).toLocaleDateString('es-AR')}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <span className={`font-semibold tabular-nums ${factura.monto_total < 0 ? 'text-red-600' : 'text-slate-700'}`}>
                          {factura.monto_total < 0 ? '-' : ''}{formatMoney(Math.abs(factura.monto_total))}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <span className={`font-bold tabular-nums ${Number(factura.saldo_pendiente) < 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                          {Number(factura.saldo_pendiente) < 0 ? '-' : ''}{formatMoney(Math.abs(Number(factura.saldo_pendiente)))}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex justify-center gap-1">
                          <Link
                            href={`/pagos?factura=${factura.id}`}
                            className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="Registrar pago"
                          >
                            {Icons.dollar}
                          </Link>
                          <button
                            onClick={() => openEditModal(factura)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Editar"
                          >
                            {Icons.edit}
                          </button>
                          <button
                            onClick={() => handleDelete(factura.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Anular"
                          >
                            {Icons.trash}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {facturasFiltradas.length === 0 && (
              <div className="p-16 text-center">
                <div className="text-slate-300 mx-auto mb-4">{Icons.document}</div>
                <p className="text-slate-500 font-medium">No se encontraron facturas</p>
                <p className="text-slate-400 text-sm mt-1">Probá ajustando los filtros de búsqueda</p>
              </div>
            )}
          </div>
        </main>

        {/* Modal Factura */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-scaleIn">
              <div className="p-5 border-b border-slate-200 flex justify-between items-center sticky top-0 bg-white rounded-t-2xl z-10">
                <h2 className="text-xl font-bold text-slate-800">
                  {editingFactura ? `Editar ${formData.tipo_documento === 'NC' ? 'Nota de Crédito' : 'Factura'}` : `Nueva ${formData.tipo_documento === 'NC' ? 'Nota de Crédito' : 'Factura'}`}
                </h2>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-500">
                  {Icons.x}
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-5 space-y-5">
                {/* Selector de tipo de documento */}
                <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-xl w-fit">
                  <button
                    type="button"
                    onClick={() => setFormData({...formData, tipo_documento: 'FC'})}
                    className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                      formData.tipo_documento === 'FC'
                        ? 'bg-indigo-600 text-white shadow-lg'
                        : 'text-slate-600 hover:text-slate-800 hover:bg-slate-200'
                    }`}
                  >
                    📄 Factura (FC)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({...formData, tipo_documento: 'NC'})}
                    className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                      formData.tipo_documento === 'NC'
                        ? 'bg-red-600 text-white shadow-lg'
                        : 'text-slate-600 hover:text-slate-800 hover:bg-slate-200'
                    }`}
                  >
                    📋 Nota de Crédito (NC)
                  </button>
                </div>

                {formData.tipo_documento === 'NC' && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                    <strong>Nota de Crédito:</strong> El monto se restará de la deuda del proveedor
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Proveedor *</label>
                    <select
                      required
                      value={formData.proveedor_id}
                      onChange={e => setFormData({...formData, proveedor_id: e.target.value})}
                      className="w-full border border-slate-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50 focus:bg-white transition-all"
                    >
                      <option value="">Seleccionar...</option>
                      {proveedores.map(p => (
                        <option key={p.id} value={p.id}>{p.nombre}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Empresa *</label>
                    <select
                      required
                      value={formData.empresa}
                      onChange={e => setFormData({...formData, empresa: e.target.value as 'VH' | 'VC'})}
                      className="w-full border border-slate-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50 focus:bg-white transition-all"
                    >
                      <option value="VH">Villalba Hermanos SRL</option>
                      <option value="VC">Villalba Cristino</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Número *</label>
                    <input
                      type="text"
                      required
                      value={formData.numero}
                      onChange={e => setFormData({...formData, numero: e.target.value})}
                      className="w-full border border-slate-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50 focus:bg-white transition-all"
                      placeholder="0001-00012345"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Fecha *</label>
                    <input
                      type="date"
                      required
                      value={formData.fecha}
                      onChange={e => setFormData({...formData, fecha: e.target.value})}
                      className="w-full border border-slate-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50 focus:bg-white transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Vencimiento</label>
                    <input
                      type="date"
                      value={formData.fecha_vencimiento}
                      onChange={e => setFormData({...formData, fecha_vencimiento: e.target.value})}
                      className="w-full border border-slate-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50 focus:bg-white transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Monto Total *</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-medium">$</span>
                      <input
                        type="text"
                        inputMode="decimal"
                        required
                        value={formData.monto_total}
                        onChange={e => {
                          // Permitir números, punto y coma
                          let val = e.target.value.replace(/[^0-9.,]/g, '')
                          // Reemplazar coma por punto para decimales
                          val = val.replace(',', '.')
                          setFormData({...formData, monto_total: val})
                        }}
                        onBlur={calcularMontos}
                        placeholder="56024073.50"
                        className="w-full pl-8 border border-slate-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50 focus:bg-white transition-all text-lg font-semibold"
                      />
                    </div>
                    {formData.monto_total && parseFloat(formData.monto_total) > 0 && (
                      <p className="text-sm text-indigo-600 font-semibold mt-1">
                        = {new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(parseFloat(formData.monto_total))}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Monto Neto</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-medium">$</span>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={formData.monto_neto}
                        onChange={e => {
                          let val = e.target.value.replace(/[^0-9.,]/g, '').replace(',', '.')
                          setFormData({...formData, monto_neto: val})
                        }}
                        className="w-full pl-8 border border-slate-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50 focus:bg-white transition-all"
                      />
                    </div>
                    {formData.monto_neto && parseFloat(formData.monto_neto) > 0 && (
                      <p className="text-xs text-slate-500 mt-1">
                        {new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(parseFloat(formData.monto_neto))}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">IVA</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-medium">$</span>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={formData.iva}
                        onChange={e => {
                          let val = e.target.value.replace(/[^0-9.,]/g, '').replace(',', '.')
                          setFormData({...formData, iva: val})
                        }}
                        className="w-full pl-8 border border-slate-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50 focus:bg-white transition-all"
                      />
                    </div>
                    {formData.iva && parseFloat(formData.iva) > 0 && (
                      <p className="text-xs text-slate-500 mt-1">
                        {new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(parseFloat(formData.iva))}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
                  <input
                    type="checkbox"
                    id="aplica_65_35"
                    checked={formData.aplica_65_35}
                    onChange={e => setFormData({...formData, aplica_65_35: e.target.checked})}
                    className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <label htmlFor="aplica_65_35" className="text-sm text-slate-700 font-medium">
                    Aplica regla 65/35 (mercadería compartida entre VH y VC)
                  </label>
                </div>

                <div className="border-t border-slate-200 pt-5">
                  <h3 className="font-bold text-slate-800 mb-4">Descuento por pronto pago</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">% Descuento</label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.descuento_pronto_pago}
                        onChange={e => setFormData({...formData, descuento_pronto_pago: e.target.value})}
                        className="w-full border border-slate-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50 focus:bg-white transition-all"
                        placeholder="Ej: 5"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">Monto descuento</label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.monto_descuento}
                        onChange={e => setFormData({...formData, monto_descuento: e.target.value})}
                        className="w-full border border-slate-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50 focus:bg-white transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">Fecha límite</label>
                      <input
                        type="date"
                        value={formData.fecha_limite_descuento}
                        onChange={e => setFormData({...formData, fecha_limite_descuento: e.target.value})}
                        className="w-full border border-slate-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50 focus:bg-white transition-all"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Observaciones</label>
                  <textarea
                    value={formData.observaciones}
                    onChange={e => setFormData({...formData, observaciones: e.target.value})}
                    className="w-full border border-slate-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50 focus:bg-white transition-all"
                    rows={2}
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 px-5 py-3.5 border border-slate-300 rounded-xl font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 btn-primary py-3.5"
                  >
                    Guardar
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  )
}
