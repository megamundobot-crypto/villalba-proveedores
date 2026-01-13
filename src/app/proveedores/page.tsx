'use client'

import { useEffect, useState } from 'react'
import { supabase, Proveedor, CBUProveedor } from '@/lib/supabase'
import { Plus, Edit, Trash2, CreditCard, ArrowLeft, X } from 'lucide-react'
import Link from 'next/link'

export default function ProveedoresPage() {
  const [proveedores, setProveedores] = useState<Proveedor[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showCBUModal, setShowCBUModal] = useState(false)
  const [editingProveedor, setEditingProveedor] = useState<Proveedor | null>(null)
  const [selectedProveedor, setSelectedProveedor] = useState<Proveedor | null>(null)
  const [cbus, setCbus] = useState<CBUProveedor[]>([])
  const [formData, setFormData] = useState({
    nombre: '',
    cuit: '',
    email: '',
    telefono: '',
    notas: ''
  })
  const [cbuFormData, setCbuFormData] = useState({
    cbu: '',
    banco: '',
    titular: '',
    principal: false
  })

  useEffect(() => {
    loadProveedores()
  }, [])

  async function loadProveedores() {
    setLoading(true)
    const { data } = await supabase
      .from('proveedores')
      .select('*')
      .eq('activo', true)
      .order('nombre')

    if (data) setProveedores(data)
    setLoading(false)
  }

  async function loadCBUs(proveedorId: number) {
    const { data } = await supabase
      .from('cbus_proveedores')
      .select('*')
      .eq('proveedor_id', proveedorId)
      .eq('activo', true)

    if (data) setCbus(data)
  }

  function openNewModal() {
    setEditingProveedor(null)
    setFormData({ nombre: '', cuit: '', email: '', telefono: '', notas: '' })
    setShowModal(true)
  }

  function openEditModal(proveedor: Proveedor) {
    setEditingProveedor(proveedor)
    setFormData({
      nombre: proveedor.nombre,
      cuit: proveedor.cuit || '',
      email: proveedor.email || '',
      telefono: proveedor.telefono || '',
      notas: proveedor.notas || ''
    })
    setShowModal(true)
  }

  async function openCBUModal(proveedor: Proveedor) {
    setSelectedProveedor(proveedor)
    await loadCBUs(proveedor.id)
    setShowCBUModal(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (editingProveedor) {
      await supabase
        .from('proveedores')
        .update(formData)
        .eq('id', editingProveedor.id)
    } else {
      await supabase
        .from('proveedores')
        .insert([formData])
    }

    setShowModal(false)
    loadProveedores()
  }

  async function handleDelete(id: number) {
    if (confirm('¿Seguro que querés eliminar este proveedor?')) {
      await supabase
        .from('proveedores')
        .update({ activo: false })
        .eq('id', id)
      loadProveedores()
    }
  }

  async function handleAddCBU(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedProveedor) return

    await supabase
      .from('cbus_proveedores')
      .insert([{
        proveedor_id: selectedProveedor.id,
        ...cbuFormData
      }])

    setCbuFormData({ cbu: '', banco: '', titular: '', principal: false })
    loadCBUs(selectedProveedor.id)
  }

  async function handleDeleteCBU(id: number) {
    await supabase
      .from('cbus_proveedores')
      .update({ activo: false })
      .eq('id', id)

    if (selectedProveedor) loadCBUs(selectedProveedor.id)
  }

  async function handleSetPrincipal(id: number) {
    if (!selectedProveedor) return

    // Primero quitar principal de todos
    await supabase
      .from('cbus_proveedores')
      .update({ principal: false })
      .eq('proveedor_id', selectedProveedor.id)

    // Luego marcar el seleccionado
    await supabase
      .from('cbus_proveedores')
      .update({ principal: true })
      .eq('id', id)

    loadCBUs(selectedProveedor.id)
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
            <h1 className="text-2xl font-bold">Proveedores</h1>
            <p className="text-blue-200">Gestión de proveedores y CBUs</p>
          </div>
        </div>
      </header>

      <main className="container mx-auto p-4">
        {/* Botón agregar */}
        <div className="mb-4">
          <button
            onClick={openNewModal}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700"
          >
            <Plus className="h-5 w-5" />
            Nuevo Proveedor
          </button>
        </div>

        {/* Lista de proveedores */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Nombre</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 hidden md:table-cell">CUIT</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 hidden lg:table-cell">Email</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {proveedores.map((prov) => (
                <tr key={prov.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{prov.nombre}</td>
                  <td className="px-4 py-3 hidden md:table-cell">{prov.cuit || '-'}</td>
                  <td className="px-4 py-3 hidden lg:table-cell">{prov.email || '-'}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-center gap-2">
                      <button
                        onClick={() => openCBUModal(prov)}
                        className="p-2 text-green-600 hover:bg-green-50 rounded"
                        title="Ver CBUs"
                      >
                        <CreditCard className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => openEditModal(prov)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                        title="Editar"
                      >
                        <Edit className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(prov.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded"
                        title="Eliminar"
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
      </main>

      {/* Modal Proveedor */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="p-4 border-b flex justify-between items-center">
              <h2 className="text-lg font-semibold">
                {editingProveedor ? 'Editar Proveedor' : 'Nuevo Proveedor'}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 rounded">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                <input
                  type="text"
                  required
                  value={formData.nombre}
                  onChange={e => setFormData({...formData, nombre: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">CUIT</label>
                <input
                  type="text"
                  value={formData.cuit}
                  onChange={e => setFormData({...formData, cuit: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="XX-XXXXXXXX-X"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                <input
                  type="text"
                  value={formData.telefono}
                  onChange={e => setFormData({...formData, telefono: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
                <textarea
                  value={formData.notas}
                  onChange={e => setFormData({...formData, notas: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2"
                  rows={3}
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

      {/* Modal CBUs */}
      {showCBUModal && selectedProveedor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b flex justify-between items-center sticky top-0 bg-white">
              <h2 className="text-lg font-semibold">
                CBUs de {selectedProveedor.nombre}
              </h2>
              <button onClick={() => setShowCBUModal(false)} className="p-1 hover:bg-gray-100 rounded">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Lista de CBUs existentes */}
            <div className="p-4">
              {cbus.length > 0 ? (
                <div className="space-y-2 mb-6">
                  {cbus.map((cbu) => (
                    <div key={cbu.id} className={`p-3 rounded-lg border ${cbu.principal ? 'border-green-500 bg-green-50' : 'border-gray-200'}`}>
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-mono text-lg">{cbu.cbu}</p>
                          <p className="text-sm text-gray-600">{cbu.titular || 'Sin titular'}</p>
                          <p className="text-sm text-gray-500">{cbu.banco || 'Banco no especificado'}</p>
                        </div>
                        <div className="flex gap-2">
                          {!cbu.principal && (
                            <button
                              onClick={() => handleSetPrincipal(cbu.id)}
                              className="text-sm px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200"
                            >
                              Marcar Principal
                            </button>
                          )}
                          {cbu.principal && (
                            <span className="text-sm px-2 py-1 bg-green-500 text-white rounded">
                              Principal
                            </span>
                          )}
                          <button
                            onClick={() => handleDeleteCBU(cbu.id)}
                            className="p-1 text-red-600 hover:bg-red-50 rounded"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">No hay CBUs registrados</p>
              )}

              {/* Formulario agregar CBU */}
              <div className="border-t pt-4">
                <h3 className="font-medium mb-3">Agregar nuevo CBU</h3>
                <form onSubmit={handleAddCBU} className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">CBU *</label>
                    <input
                      type="text"
                      required
                      maxLength={22}
                      value={cbuFormData.cbu}
                      onChange={e => setCbuFormData({...cbuFormData, cbu: e.target.value.replace(/\D/g, '')})}
                      className="w-full border rounded-lg px-3 py-2 font-mono"
                      placeholder="22 dígitos"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Banco</label>
                      <input
                        type="text"
                        value={cbuFormData.banco}
                        onChange={e => setCbuFormData({...cbuFormData, banco: e.target.value})}
                        className="w-full border rounded-lg px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Titular</label>
                      <input
                        type="text"
                        value={cbuFormData.titular}
                        onChange={e => setCbuFormData({...cbuFormData, titular: e.target.value})}
                        className="w-full border rounded-lg px-3 py-2"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="principal"
                      checked={cbuFormData.principal}
                      onChange={e => setCbuFormData({...cbuFormData, principal: e.target.checked})}
                      className="rounded"
                    />
                    <label htmlFor="principal" className="text-sm">Marcar como CBU principal</label>
                  </div>
                  <button
                    type="submit"
                    className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    Agregar CBU
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
