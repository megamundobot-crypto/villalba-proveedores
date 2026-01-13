'use client'

import { useEffect, useState } from 'react'
import { supabase, Factura, Proveedor } from '@/lib/supabase'
import { Plus, Edit, Trash2, ArrowLeft, X, Filter, DollarSign } from 'lucide-react'
import Link from 'next/link'

export default function FacturasPage() {
  const [facturas, setFacturas] = useState<Factura[]>([])
  const [proveedores, setProveedores] = useState<Proveedor[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingFactura, setEditingFactura] = useState<Factura | null>(null)
  const [filtroEmpresa, setFiltroEmpresa] = useState<string>('')
  const [filtroEstado, setFiltroEstado] = useState<string>('')
  const [filtroProveedor, setFiltroProveedor] = useState<string>('')

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
  }, [filtroEmpresa, filtroEstado, filtroProveedor])

  async function loadData() {
    setLoading(true)

    // Cargar proveedores
    const { data: provData } = await supabase
      .from('proveedores')
      .select('*')
      .eq('activo', true)
      .order('nombre')

    if (provData) setProveedores(provData)

    // Cargar facturas con filtros (usando tabla directa en lugar de vista)
    let query = supabase
      .from('facturas')
      .select('*, proveedores(nombre)')
      .in('estado', ['pendiente', 'parcial'])

    if (filtroEmpresa) {
      query = query.eq('empresa', filtroEmpresa)
    }
    if (filtroEstado) {
      query = query.eq('estado', filtroEstado)
    }
    if (filtroProveedor) {
      query = query.eq('proveedor_id', filtroProveedor)
    }

    query = query.order('fecha', { ascending: true })

    const { data: factData } = await query

    // Cargar pagos para calcular saldos
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
      await supabase
        .from('facturas')
        .update(dataToSave)
        .eq('id', editingFactura.id)
    } else {
      await supabase
        .from('facturas')
        .insert([dataToSave])
    }

    setShowModal(false)
    loadData()
  }

  async function handleDelete(id: number) {
    if (confirm('¿Seguro que querés anular esta factura?')) {
      await supabase
        .from('facturas')
        .update({ estado: 'anulada' })
        .eq('id', id)
      loadData()
    }
  }

  function calcularMontos() {
    const total = parseFloat(formData.monto_total) || 0
    if (total > 0) {
      const neto = total / 1.21
      const iva = total - neto
      setFormData({
        ...formData,
        monto_neto: neto.toFixed(2),
        iva: iva.toFixed(2)
      })
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

  const getAlertColor = (alerta: string | undefined) => {
    switch (alerta) {
      case 'verde': return 'bg-green-100 text-green-800'
      case 'amarillo': return 'bg-yellow-100 text-yellow-800'
      case 'rojo': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-xl text-gray-600">Cargando...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-blue-900 text-white p-4 shadow-lg">
        <div className="container mx-auto flex items-center gap-4">
          <Link href="/" className="hover:bg-blue-800 p-2 rounded">
            <ArrowLeft className="h-6 w-6" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Facturas</h1>
            <p className="text-blue-200">Gestión de facturas pendientes</p>
          </div>
        </div>
      </header>

      <main className="container mx-auto p-4">
        {/* Filtros y botón agregar */}
        <div className="bg-white rounded-lg shadow p-4 mb-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Filter className="h-4 w-4 inline mr-1" />
                Empresa
              </label>
              <select
                value={filtroEmpresa}
                onChange={e => setFiltroEmpresa(e.target.value)}
                className="w-full border rounded-lg px-3 py-2"
              >
                <option value="">Todas</option>
                <option value="VH">Villalba Hermanos</option>
                <option value="VC">Villalba Cristino</option>
              </select>
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
              <select
                value={filtroEstado}
                onChange={e => setFiltroEstado(e.target.value)}
                className="w-full border rounded-lg px-3 py-2"
              >
                <option value="">Todos</option>
                <option value="pendiente">Pendiente</option>
                <option value="parcial">Parcial</option>
              </select>
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">Proveedor</label>
              <select
                value={filtroProveedor}
                onChange={e => setFiltroProveedor(e.target.value)}
                className="w-full border rounded-lg px-3 py-2"
              >
                <option value="">Todos</option>
                {proveedores.map(p => (
                  <option key={p.id} value={p.id}>{p.nombre}</option>
                ))}
              </select>
            </div>
            <button
              onClick={openNewModal}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700"
            >
              <Plus className="h-5 w-5" />
              Nueva Factura
            </button>
          </div>
        </div>

        {/* Lista de facturas */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Alerta</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Proveedor</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Empresa</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Número</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Fecha</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">Total</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">Saldo</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">65/35</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {facturas.map((factura) => (
                  <tr key={factura.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getAlertColor(factura.alerta)}`}>
                        {factura.dias_antiguedad}d
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium">{factura.proveedor_nombre}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs ${factura.empresa === 'VH' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
                        {factura.empresa}
                      </span>
                    </td>
                    <td className="px-4 py-3">{factura.numero}</td>
                    <td className="px-4 py-3">{new Date(factura.fecha).toLocaleDateString('es-AR')}</td>
                    <td className="px-4 py-3 text-right">{formatMoney(factura.monto_total)}</td>
                    <td className="px-4 py-3 text-right font-bold text-red-600">
                      {formatMoney(Number(factura.saldo_pendiente))}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {factura.aplica_65_35 ? '✓' : '-'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-center gap-2">
                        <Link
                          href={`/pagos?factura=${factura.id}`}
                          className="p-2 text-green-600 hover:bg-green-50 rounded"
                          title="Registrar pago"
                        >
                          <DollarSign className="h-5 w-5" />
                        </Link>
                        <button
                          onClick={() => openEditModal(factura)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                          title="Editar"
                        >
                          <Edit className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(factura.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded"
                          title="Anular"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {facturas.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              No hay facturas pendientes con los filtros seleccionados
            </div>
          )}
        </div>
      </main>

      {/* Modal Factura */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b flex justify-between items-center sticky top-0 bg-white">
              <h2 className="text-lg font-semibold">
                {editingFactura ? 'Editar Factura' : 'Nueva Factura'}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 rounded">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Proveedor *</label>
                  <select
                    required
                    value={formData.proveedor_id}
                    onChange={e => setFormData({...formData, proveedor_id: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2"
                  >
                    <option value="">Seleccionar...</option>
                    {proveedores.map(p => (
                      <option key={p.id} value={p.id}>{p.nombre}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Empresa *</label>
                  <select
                    required
                    value={formData.empresa}
                    onChange={e => setFormData({...formData, empresa: e.target.value as 'VH' | 'VC'})}
                    className="w-full border rounded-lg px-3 py-2"
                  >
                    <option value="VH">Villalba Hermanos SRL</option>
                    <option value="VC">Villalba Cristino</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Número *</label>
                  <input
                    type="text"
                    required
                    value={formData.numero}
                    onChange={e => setFormData({...formData, numero: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2"
                    placeholder="0001-00012345"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha *</label>
                  <input
                    type="date"
                    required
                    value={formData.fecha}
                    onChange={e => setFormData({...formData, fecha: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vencimiento</label>
                  <input
                    type="date"
                    value={formData.fecha_vencimiento}
                    onChange={e => setFormData({...formData, fecha_vencimiento: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Monto Total *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.monto_total}
                    onChange={e => setFormData({...formData, monto_total: e.target.value})}
                    onBlur={calcularMontos}
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Monto Neto</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.monto_neto}
                    onChange={e => setFormData({...formData, monto_neto: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">IVA</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.iva}
                    onChange={e => setFormData({...formData, iva: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
                <input
                  type="checkbox"
                  id="aplica_65_35"
                  checked={formData.aplica_65_35}
                  onChange={e => setFormData({...formData, aplica_65_35: e.target.checked})}
                  className="rounded"
                />
                <label htmlFor="aplica_65_35" className="text-sm">
                  Aplica regla 65/35 (mercadería compartida entre VH y VC)
                </label>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-medium mb-3">Descuento por pronto pago (opcional)</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">% Descuento</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.descuento_pronto_pago}
                      onChange={e => setFormData({...formData, descuento_pronto_pago: e.target.value})}
                      className="w-full border rounded-lg px-3 py-2"
                      placeholder="Ej: 5"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Monto descuento</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.monto_descuento}
                      onChange={e => setFormData({...formData, monto_descuento: e.target.value})}
                      className="w-full border rounded-lg px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Fecha límite</label>
                    <input
                      type="date"
                      value={formData.fecha_limite_descuento}
                      onChange={e => setFormData({...formData, fecha_limite_descuento: e.target.value})}
                      className="w-full border rounded-lg px-3 py-2"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones</label>
                <textarea
                  value={formData.observaciones}
                  onChange={e => setFormData({...formData, observaciones: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2"
                  rows={2}
                />
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
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
