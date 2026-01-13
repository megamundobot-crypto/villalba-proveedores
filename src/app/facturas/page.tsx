'use client'

import { useEffect, useState } from 'react'
import { supabase, Factura, Proveedor } from '@/lib/supabase'
import { Plus, Edit, Trash2, ArrowLeft, X, Search, DollarSign, Calendar, ArrowUpDown, FileText } from 'lucide-react'
import Link from 'next/link'

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
  const [filtroEstado, setFiltroEstado] = useState<'todos' | 'pendiente' | 'parcial'>('todos')
  const [filtroProveedor, setFiltroProveedor] = useState('')
  const [ordenar, setOrdenar] = useState<'fecha_asc' | 'fecha_desc' | 'monto_desc' | 'monto_asc' | 'proveedor'>('fecha_asc')

  const [formData, setFormData] = useState({
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

    // Filtro por búsqueda
    if (busqueda) {
      const search = busqueda.toLowerCase()
      filtered = filtered.filter(f =>
        f.proveedor_nombre?.toLowerCase().includes(search) ||
        f.numero.toLowerCase().includes(search)
      )
    }

    // Filtro por empresa
    if (filtroEmpresa !== 'todos') {
      filtered = filtered.filter(f => f.empresa === filtroEmpresa)
    }

    // Filtro por estado
    if (filtroEstado !== 'todos') {
      filtered = filtered.filter(f => f.estado === filtroEstado)
    }

    // Filtro por proveedor
    if (filtroProveedor) {
      filtered = filtered.filter(f => f.proveedor_id === parseInt(filtroProveedor))
    }

    // Ordenamiento
    filtered.sort((a, b) => {
      switch (ordenar) {
        case 'fecha_asc': return new Date(a.fecha).getTime() - new Date(b.fecha).getTime()
        case 'fecha_desc': return new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
        case 'monto_desc': return b.monto_total - a.monto_total
        case 'monto_asc': return a.monto_total - b.monto_total
        case 'proveedor': return (a.proveedor_nombre || '').localeCompare(b.proveedor_nombre || '')
        default: return 0
      }
    })

    setFacturasFiltradas(filtered)
  }, [facturas, busqueda, filtroEmpresa, filtroEstado, filtroProveedor, ordenar])

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
    setFormData({
      proveedor_id: String(factura.proveedor_id),
      empresa: factura.empresa,
      numero: factura.numero,
      fecha: factura.fecha,
      fecha_vencimiento: factura.fecha_vencimiento || '',
      monto_total: String(factura.monto_total),
      monto_neto: String(factura.monto_neto || ''),
      iva: String(factura.iva || ''),
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

    const dataToSave = {
      proveedor_id: parseInt(formData.proveedor_id),
      empresa: formData.empresa,
      numero: formData.numero,
      fecha: formData.fecha,
      fecha_vencimiento: formData.fecha_vencimiento || null,
      monto_total: parseFloat(formData.monto_total),
      monto_neto: formData.monto_neto ? parseFloat(formData.monto_neto) : null,
      iva: formData.iva ? parseFloat(formData.iva) : null,
      aplica_65_35: formData.aplica_65_35,
      descuento_pronto_pago: formData.descuento_pronto_pago ? parseFloat(formData.descuento_pronto_pago) : null,
      monto_descuento: formData.monto_descuento ? parseFloat(formData.monto_descuento) : null,
      fecha_limite_descuento: formData.fecha_limite_descuento || null,
      observaciones: formData.observaciones || null
    }

    if (editingFactura) {
      await supabase.from('facturas').update(dataToSave).eq('id', editingFactura.id)
    } else {
      await supabase.from('facturas').insert([dataToSave])
    }

    setShowModal(false)
    loadData()
  }

  async function handleDelete(id: number) {
    if (confirm('¿Seguro que querés anular esta factura?')) {
      await supabase.from('facturas').update({ estado: 'anulada' }).eq('id', id)
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

  // Calcular totales filtrados
  const totalesFiltrados = {
    cantidad: facturasFiltradas.length,
    monto: facturasFiltradas.reduce((sum, f) => sum + f.monto_total, 0),
    saldo: facturasFiltradas.reduce((sum, f) => sum + Number(f.saldo_pendiente || 0), 0)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-600 font-medium">Cargando facturas...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header Premium */}
      <header className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white shadow-xl">
        <div className="container mx-auto px-6 py-5">
          <div className="flex items-center gap-4">
            <Link href="/" className="p-2 hover:bg-white/10 rounded-lg transition-colors">
              <ArrowLeft className="h-6 w-6" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Facturas</h1>
              <p className="text-slate-400 text-sm">Gestión de facturas pendientes</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        {/* Panel de filtros */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-5 mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Buscador */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por proveedor o número..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white transition-all"
              />
            </div>

            {/* Filtro empresa */}
            <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
              <button
                onClick={() => setFiltroEmpresa('todos')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  filtroEmpresa === 'todos' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-600 hover:text-slate-800'
                }`}
              >
                Todas
              </button>
              <button
                onClick={() => setFiltroEmpresa('VH')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  filtroEmpresa === 'VH' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-blue-600'
                }`}
              >
                VH
              </button>
              <button
                onClick={() => setFiltroEmpresa('VC')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  filtroEmpresa === 'VC' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:text-emerald-600'
                }`}
              >
                VC
              </button>
            </div>

            {/* Filtro proveedor */}
            <select
              value={filtroProveedor}
              onChange={(e) => setFiltroProveedor(e.target.value)}
              className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 min-w-[180px]"
            >
              <option value="">Todos los proveedores</option>
              {proveedores.map(p => (
                <option key={p.id} value={p.id}>{p.nombre}</option>
              ))}
            </select>

            {/* Ordenar */}
            <select
              value={ordenar}
              onChange={(e) => setOrdenar(e.target.value as any)}
              className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="fecha_asc">Más antiguas primero</option>
              <option value="fecha_desc">Más recientes primero</option>
              <option value="monto_desc">Mayor importe</option>
              <option value="monto_asc">Menor importe</option>
              <option value="proveedor">Proveedor A-Z</option>
            </select>

            {/* Botón nueva factura */}
            <button
              onClick={openNewModal}
              className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-medium flex items-center gap-2 hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg shadow-blue-500/25"
            >
              <Plus className="h-5 w-5" />
              Nueva Factura
            </button>
          </div>

          {/* Resumen de filtros */}
          <div className="flex items-center gap-6 mt-4 pt-4 border-t border-slate-100">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-slate-400" />
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

        {/* Tabla de facturas */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-5 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Estado</th>
                  <th className="px-5 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Proveedor</th>
                  <th className="px-5 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Empresa</th>
                  <th className="px-5 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Número</th>
                  <th className="px-5 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Fecha</th>
                  <th className="px-5 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Total</th>
                  <th className="px-5 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Saldo</th>
                  <th className="px-5 py-4 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {facturasFiltradas.map((factura) => (
                  <tr key={factura.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-4">
                      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                        factura.alerta === 'verde' ? 'bg-emerald-100 text-emerald-700' :
                        factura.alerta === 'amarillo' ? 'bg-amber-100 text-amber-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          factura.alerta === 'verde' ? 'bg-emerald-500' :
                          factura.alerta === 'amarillo' ? 'bg-amber-500' :
                          'bg-red-500'
                        }`}></span>
                        {factura.dias_antiguedad}d
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="font-medium text-slate-800">{factura.proveedor_nombre}</span>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${
                        factura.empresa === 'VH' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        {factura.empresa}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-slate-600">{factura.numero}</td>
                    <td className="px-5 py-4 text-slate-600">
                      {new Date(factura.fecha).toLocaleDateString('es-AR')}
                    </td>
                    <td className="px-5 py-4 text-right text-slate-700">
                      {formatMoney(factura.monto_total)}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <span className="font-bold text-red-600">{formatMoney(Number(factura.saldo_pendiente))}</span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex justify-center gap-1">
                        <Link
                          href={`/pagos?factura=${factura.id}`}
                          className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                          title="Registrar pago"
                        >
                          <DollarSign className="h-4 w-4" />
                        </Link>
                        <button
                          onClick={() => openEditModal(factura)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Editar"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(factura.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Anular"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {facturasFiltradas.length === 0 && (
            <div className="p-12 text-center">
              <FileText className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">No se encontraron facturas</p>
              <p className="text-slate-400 text-sm mt-1">Probá ajustando los filtros de búsqueda</p>
            </div>
          )}
        </div>
      </main>

      {/* Modal Factura */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-slate-200 flex justify-between items-center sticky top-0 bg-white rounded-t-2xl">
              <h2 className="text-xl font-bold text-slate-800">
                {editingFactura ? 'Editar Factura' : 'Nueva Factura'}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                <X className="h-5 w-5 text-slate-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Proveedor *</label>
                  <select
                    required
                    value={formData.proveedor_id}
                    onChange={e => setFormData({...formData, proveedor_id: e.target.value})}
                    className="w-full border border-slate-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Seleccionar...</option>
                    {proveedores.map(p => (
                      <option key={p.id} value={p.id}>{p.nombre}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Empresa *</label>
                  <select
                    required
                    value={formData.empresa}
                    onChange={e => setFormData({...formData, empresa: e.target.value as 'VH' | 'VC'})}
                    className="w-full border border-slate-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="VH">Villalba Hermanos SRL</option>
                    <option value="VC">Villalba Cristino</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Número *</label>
                  <input
                    type="text"
                    required
                    value={formData.numero}
                    onChange={e => setFormData({...formData, numero: e.target.value})}
                    className="w-full border border-slate-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0001-00012345"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Fecha *</label>
                  <input
                    type="date"
                    required
                    value={formData.fecha}
                    onChange={e => setFormData({...formData, fecha: e.target.value})}
                    className="w-full border border-slate-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Vencimiento</label>
                  <input
                    type="date"
                    value={formData.fecha_vencimiento}
                    onChange={e => setFormData({...formData, fecha_vencimiento: e.target.value})}
                    className="w-full border border-slate-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Monto Total *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.monto_total}
                    onChange={e => setFormData({...formData, monto_total: e.target.value})}
                    onBlur={calcularMontos}
                    className="w-full border border-slate-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Monto Neto</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.monto_neto}
                    onChange={e => setFormData({...formData, monto_neto: e.target.value})}
                    className="w-full border border-slate-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">IVA</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.iva}
                    onChange={e => setFormData({...formData, iva: e.target.value})}
                    className="w-full border border-slate-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-xl border border-blue-200">
                <input
                  type="checkbox"
                  id="aplica_65_35"
                  checked={formData.aplica_65_35}
                  onChange={e => setFormData({...formData, aplica_65_35: e.target.checked})}
                  className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="aplica_65_35" className="text-sm text-slate-700">
                  Aplica regla 65/35 (mercadería compartida entre VH y VC)
                </label>
              </div>

              <div className="border-t border-slate-200 pt-5">
                <h3 className="font-semibold text-slate-800 mb-4">Descuento por pronto pago</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">% Descuento</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.descuento_pronto_pago}
                      onChange={e => setFormData({...formData, descuento_pronto_pago: e.target.value})}
                      className="w-full border border-slate-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Ej: 5"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Monto descuento</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.monto_descuento}
                      onChange={e => setFormData({...formData, monto_descuento: e.target.value})}
                      className="w-full border border-slate-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Fecha límite</label>
                    <input
                      type="date"
                      value={formData.fecha_limite_descuento}
                      onChange={e => setFormData({...formData, fecha_limite_descuento: e.target.value})}
                      className="w-full border border-slate-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Observaciones</label>
                <textarea
                  value={formData.observaciones}
                  onChange={e => setFormData({...formData, observaciones: e.target.value})}
                  className="w-full border border-slate-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={2}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-5 py-3 border border-slate-300 rounded-xl font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-5 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-medium hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg shadow-blue-500/25"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
