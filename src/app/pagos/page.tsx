'use client'

import { useEffect, useState, Suspense } from 'react'
import { supabase, Pago, Factura } from '@/lib/supabase'
import { Plus, ArrowLeft, X, Receipt } from 'lucide-react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

interface PagoExtendido extends Pago {
  factura_numero?: string
  proveedor_nombre?: string
  empresa?: string
}

function PagosContent() {
  const searchParams = useSearchParams()
  const facturaIdParam = searchParams.get('factura')

  const [pagos, setPagos] = useState<PagoExtendido[]>([])
  const [facturasPendientes, setFacturasPendientes] = useState<Factura[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [selectedFactura, setSelectedFactura] = useState<Factura | null>(null)

  const [formData, setFormData] = useState({
    factura_id: '',
    fecha: new Date().toISOString().split('T')[0],
    monto: '',
    medio_pago: 'transferencia',
    referencia_banco: '',
    observaciones: ''
  })

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (facturaIdParam && facturasPendientes.length > 0) {
      const factura = facturasPendientes.find(f => f.id === parseInt(facturaIdParam))
      if (factura) {
        openNewModalForFactura(factura)
      }
    }
  }, [facturaIdParam, facturasPendientes])

  async function loadData() {
    setLoading(true)

    // Cargar pagos recientes con datos de factura
    const { data: pagosData } = await supabase
      .from('pagos')
      .select(`
        *,
        facturas (
          numero,
          empresa,
          proveedores (
            nombre
          )
        )
      `)
      .order('fecha', { ascending: false })
      .limit(50)

    if (pagosData) {
      const pagosFormateados = pagosData.map((p: any) => ({
        ...p,
        factura_numero: p.facturas?.numero,
        empresa: p.facturas?.empresa,
        proveedor_nombre: p.facturas?.proveedores?.nombre
      }))
      setPagos(pagosFormateados)
    }

    // Cargar facturas pendientes
    const { data: facturasData } = await supabase
      .from('v_facturas_pendientes')
      .select('*')
      .order('proveedor_nombre')

    if (facturasData) setFacturasPendientes(facturasData)

    setLoading(false)
  }

  function openNewModal() {
    setSelectedFactura(null)
    setFormData({
      factura_id: '',
      fecha: new Date().toISOString().split('T')[0],
      monto: '',
      medio_pago: 'transferencia',
      referencia_banco: '',
      observaciones: ''
    })
    setShowModal(true)
  }

  function openNewModalForFactura(factura: Factura) {
    setSelectedFactura(factura)
    setFormData({
      factura_id: String(factura.id),
      fecha: new Date().toISOString().split('T')[0],
      monto: String(factura.saldo_pendiente || factura.monto_total),
      medio_pago: 'transferencia',
      referencia_banco: '',
      observaciones: ''
    })
    setShowModal(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const dataToSave = {
      factura_id: parseInt(formData.factura_id),
      fecha: formData.fecha,
      monto: parseFloat(formData.monto),
      medio_pago: formData.medio_pago,
      referencia_banco: formData.referencia_banco || null,
      observaciones: formData.observaciones || null
    }

    await supabase
      .from('pagos')
      .insert([dataToSave])

    setShowModal(false)
    loadData()
  }

  function handleFacturaChange(facturaId: string) {
    const factura = facturasPendientes.find(f => f.id === parseInt(facturaId))
    setSelectedFactura(factura || null)
    setFormData({
      ...formData,
      factura_id: facturaId,
      monto: factura ? String(factura.saldo_pendiente || factura.monto_total) : ''
    })
  }

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
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
            <h1 className="text-2xl font-bold">Pagos</h1>
            <p className="text-blue-200">Registro de pagos a proveedores</p>
          </div>
        </div>
      </header>

      <main className="container mx-auto p-4">
        {/* Botón agregar */}
        <div className="mb-4">
          <button
            onClick={openNewModal}
            className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-green-700"
          >
            <Plus className="h-5 w-5" />
            Registrar Pago
          </button>
        </div>

        {/* Lista de pagos recientes */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-4 border-b">
            <h2 className="text-lg font-semibold">Últimos 50 Pagos</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Fecha</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Proveedor</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Factura</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Empresa</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">Monto</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Medio</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Referencia</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {pagos.map((pago) => (
                  <tr key={pago.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">{new Date(pago.fecha).toLocaleDateString('es-AR')}</td>
                    <td className="px-4 py-3 font-medium">{pago.proveedor_nombre || '-'}</td>
                    <td className="px-4 py-3">{pago.factura_numero || '-'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs ${pago.empresa === 'VH' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
                        {pago.empresa || '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-green-600">
                      {formatMoney(pago.monto)}
                    </td>
                    <td className="px-4 py-3 capitalize">{pago.medio_pago}</td>
                    <td className="px-4 py-3 text-gray-500">{pago.referencia_banco || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {pagos.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              No hay pagos registrados
            </div>
          )}
        </div>
      </main>

      {/* Modal Pago */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
            <div className="p-4 border-b flex justify-between items-center">
              <h2 className="text-lg font-semibold">Registrar Pago</h2>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 rounded">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Factura *</label>
                <select
                  required
                  value={formData.factura_id}
                  onChange={e => handleFacturaChange(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2"
                >
                  <option value="">Seleccionar factura...</option>
                  {facturasPendientes.map(f => (
                    <option key={f.id} value={f.id}>
                      {f.proveedor_nombre} - {f.numero} ({f.empresa}) - Saldo: {formatMoney(Number(f.saldo_pendiente))}
                    </option>
                  ))}
                </select>
              </div>

              {selectedFactura && (
                <div className="p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Receipt className="h-5 w-5 text-blue-600" />
                    <span className="font-medium">{selectedFactura.proveedor_nombre}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-gray-500">Factura:</span> {selectedFactura.numero}
                    </div>
                    <div>
                      <span className="text-gray-500">Empresa:</span> {selectedFactura.empresa}
                    </div>
                    <div>
                      <span className="text-gray-500">Total:</span> {formatMoney(selectedFactura.monto_total)}
                    </div>
                    <div>
                      <span className="text-gray-500">Saldo:</span>
                      <span className="font-bold text-red-600"> {formatMoney(Number(selectedFactura.saldo_pendiente))}</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Monto *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.monto}
                    onChange={e => setFormData({...formData, monto: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Medio de pago</label>
                <select
                  value={formData.medio_pago}
                  onChange={e => setFormData({...formData, medio_pago: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2"
                >
                  <option value="transferencia">Transferencia bancaria</option>
                  <option value="cheque">Cheque</option>
                  <option value="efectivo">Efectivo</option>
                  <option value="otro">Otro</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Referencia bancaria</label>
                <input
                  type="text"
                  value={formData.referencia_banco}
                  onChange={e => setFormData({...formData, referencia_banco: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="Número de operación o comprobante"
                />
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
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Guardar Pago
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default function PagosPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-xl text-gray-600">Cargando...</div>
      </div>
    }>
      <PagosContent />
    </Suspense>
  )
}
