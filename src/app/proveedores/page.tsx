'use client'

import { useEffect, useState } from 'react'
import { supabase, Proveedor, CBUProveedor } from '@/lib/supabase'
import Link from 'next/link'
import ProtectedRoute from '@/components/ProtectedRoute'
import UserMenu from '@/components/UserMenu'

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
  creditCard: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
    </svg>
  ),
  x: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  users: (
    <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  search: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  ),
  check: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ),
}

export default function ProveedoresPage() {
  const [proveedores, setProveedores] = useState<Proveedor[]>([])
  const [proveedoresFiltrados, setProveedoresFiltrados] = useState<Proveedor[]>([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
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

  useEffect(() => {
    if (busqueda) {
      setProveedoresFiltrados(proveedores.filter(p =>
        p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        p.cuit?.toLowerCase().includes(busqueda.toLowerCase())
      ))
    } else {
      setProveedoresFiltrados(proveedores)
    }
  }, [proveedores, busqueda])

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
      await supabase.from('proveedores').update(formData).eq('id', editingProveedor.id)
    } else {
      await supabase.from('proveedores').insert([formData])
    }
    setShowModal(false)
    loadProveedores()
  }

  async function handleDelete(id: number) {
    if (confirm('¿Seguro que querés eliminar este proveedor?')) {
      await supabase.from('proveedores').update({ activo: false }).eq('id', id)
      loadProveedores()
    }
  }

  async function handleAddCBU(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedProveedor) return
    await supabase.from('cbus_proveedores').insert([{
      proveedor_id: selectedProveedor.id,
      ...cbuFormData
    }])
    setCbuFormData({ cbu: '', banco: '', titular: '', principal: false })
    loadCBUs(selectedProveedor.id)
  }

  async function handleDeleteCBU(id: number) {
    await supabase.from('cbus_proveedores').update({ activo: false }).eq('id', id)
    if (selectedProveedor) loadCBUs(selectedProveedor.id)
  }

  async function handleSetPrincipal(id: number) {
    if (!selectedProveedor) return
    await supabase.from('cbus_proveedores').update({ principal: false }).eq('proveedor_id', selectedProveedor.id)
    await supabase.from('cbus_proveedores').update({ principal: true }).eq('id', id)
    loadCBUs(selectedProveedor.id)
  }

  if (loading) {
    return (
      <div className="min-h-screen gradient-mesh flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-slate-500 font-medium">Cargando proveedores...</p>
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
                  <h1 className="text-white font-semibold text-lg">Proveedores</h1>
                  <p className="text-slate-400 text-xs">Gestión de proveedores y CBUs</p>
                </div>
              </div>
              <UserMenu />
            </div>
          </div>
        </header>

        <main className="container-app py-8">
          {/* Stats */}
          <div className="card-stat p-5 mb-6 animate-fadeIn">
            <div className="flex items-center justify-between">
              <div>
                <p className="stat-label">Total Proveedores</p>
                <p className="text-3xl font-bold text-slate-800 mt-1">{proveedores.length}</p>
              </div>
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white">
                {Icons.users}
              </div>
            </div>
          </div>

          {/* Filtros y acciones */}
          <div className="card-premium p-5 mb-6 animate-fadeIn" style={{animationDelay: '0.1s'}}>
            <div className="flex flex-col sm:flex-row gap-4">
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
              <button
                onClick={openNewModal}
                className="btn-primary flex items-center justify-center gap-2"
              >
                {Icons.plus}
                Nuevo Proveedor
              </button>
            </div>
            <p className="text-sm text-slate-500 mt-4">
              Mostrando <strong className="text-slate-700">{proveedoresFiltrados.length}</strong> de {proveedores.length} proveedores
            </p>
          </div>

          {/* Lista de proveedores */}
          <div className="card-premium overflow-hidden animate-slideUp" style={{animationDelay: '0.2s'}}>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-100 border-b-2 border-slate-200">
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Nombre</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider hidden md:table-cell">CUIT</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider hidden lg:table-cell">Email</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider hidden lg:table-cell">Teléfono</th>
                    <th className="px-6 py-4 text-center text-xs font-bold text-slate-600 uppercase tracking-wider">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {proveedoresFiltrados.map((prov, idx) => (
                    <tr
                      key={prov.id}
                      className={`transition-colors ${
                        idx % 2 === 0 ? 'bg-white hover:bg-slate-100' : 'bg-slate-100 hover:bg-slate-200'
                      }`}
                    >
                      <td className="px-6 py-4">
                        <span className="font-semibold text-slate-800">{prov.nombre}</span>
                      </td>
                      <td className="px-6 py-4 hidden md:table-cell">
                        <span className="font-mono text-sm text-slate-600">{prov.cuit || '—'}</span>
                      </td>
                      <td className="px-6 py-4 hidden lg:table-cell">
                        <span className="text-sm text-slate-600">{prov.email || '—'}</span>
                      </td>
                      <td className="px-6 py-4 hidden lg:table-cell">
                        <span className="text-sm text-slate-600">{prov.telefono || '—'}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-center gap-1">
                          <button
                            onClick={() => openCBUModal(prov)}
                            className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="Ver CBUs"
                          >
                            {Icons.creditCard}
                          </button>
                          <button
                            onClick={() => openEditModal(prov)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Editar"
                          >
                            {Icons.edit}
                          </button>
                          <button
                            onClick={() => handleDelete(prov.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Eliminar"
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

            {proveedoresFiltrados.length === 0 && (
              <div className="p-16 text-center">
                <div className="text-slate-300 mx-auto mb-4">{Icons.users}</div>
                <p className="text-slate-500 font-medium">No se encontraron proveedores</p>
                <p className="text-slate-400 text-sm mt-1">Probá ajustando la búsqueda</p>
              </div>
            )}
          </div>
        </main>

        {/* Modal Proveedor */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-scaleIn">
              <div className="p-5 border-b border-slate-200 flex justify-between items-center">
                <h2 className="text-xl font-bold text-slate-800">
                  {editingProveedor ? 'Editar Proveedor' : 'Nuevo Proveedor'}
                </h2>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-500">
                  {Icons.x}
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-5 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Nombre *</label>
                  <input
                    type="text"
                    required
                    value={formData.nombre}
                    onChange={e => setFormData({...formData, nombre: e.target.value})}
                    className="w-full border border-slate-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50 focus:bg-white transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">CUIT</label>
                  <input
                    type="text"
                    value={formData.cuit}
                    onChange={e => setFormData({...formData, cuit: e.target.value})}
                    className="w-full border border-slate-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50 focus:bg-white transition-all font-mono"
                    placeholder="XX-XXXXXXXX-X"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={e => setFormData({...formData, email: e.target.value})}
                    className="w-full border border-slate-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50 focus:bg-white transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Teléfono</label>
                  <input
                    type="text"
                    value={formData.telefono}
                    onChange={e => setFormData({...formData, telefono: e.target.value})}
                    className="w-full border border-slate-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50 focus:bg-white transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Notas</label>
                  <textarea
                    value={formData.notas}
                    onChange={e => setFormData({...formData, notas: e.target.value})}
                    className="w-full border border-slate-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50 focus:bg-white transition-all"
                    rows={3}
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 px-5 py-3 border border-slate-300 rounded-xl font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 btn-primary py-3"
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
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-scaleIn">
              <div className="p-5 border-b border-slate-200 flex justify-between items-center sticky top-0 bg-white z-10 rounded-t-2xl">
                <div>
                  <h2 className="text-xl font-bold text-slate-800">CBUs de {selectedProveedor.nombre}</h2>
                  <p className="text-sm text-slate-500 mt-0.5">Gestionar cuentas bancarias</p>
                </div>
                <button onClick={() => setShowCBUModal(false)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-500">
                  {Icons.x}
                </button>
              </div>

              <div className="p-5">
                {/* Lista de CBUs existentes */}
                {cbus.length > 0 ? (
                  <div className="space-y-3 mb-6">
                    {cbus.map((cbu) => (
                      <div
                        key={cbu.id}
                        className={`p-4 rounded-xl border-2 transition-all ${
                          cbu.principal
                            ? 'border-emerald-400 bg-gradient-to-r from-emerald-50 to-green-50'
                            : 'border-slate-200 bg-slate-50 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-mono text-lg font-semibold text-slate-800">{cbu.cbu}</p>
                            <p className="text-sm text-slate-600 mt-1">{cbu.titular || 'Sin titular'}</p>
                            <p className="text-sm text-slate-500">{cbu.banco || 'Banco no especificado'}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            {cbu.principal ? (
                              <span className="px-3 py-1.5 bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1">
                                {Icons.check} Principal
                              </span>
                            ) : (
                              <button
                                onClick={() => handleSetPrincipal(cbu.id)}
                                className="px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-lg text-xs font-semibold hover:bg-emerald-200 transition-colors"
                              >
                                Marcar Principal
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteCBU(cbu.id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              {Icons.trash}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center bg-slate-50 rounded-xl mb-6">
                    <span className="text-slate-300 block mb-2">{Icons.creditCard}</span>
                    <p className="text-slate-500 font-medium">No hay CBUs registrados</p>
                    <p className="text-slate-400 text-sm mt-1">Agregá uno para poder generar pagos</p>
                  </div>
                )}

                {/* Formulario agregar CBU */}
                <div className="border-t border-slate-200 pt-5">
                  <h3 className="font-bold text-slate-800 mb-4">Agregar nuevo CBU</h3>
                  <form onSubmit={handleAddCBU} className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">CBU *</label>
                      <input
                        type="text"
                        required
                        maxLength={22}
                        value={cbuFormData.cbu}
                        onChange={e => setCbuFormData({...cbuFormData, cbu: e.target.value.replace(/\D/g, '')})}
                        className="w-full border border-slate-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50 focus:bg-white transition-all font-mono text-lg tracking-wider"
                        placeholder="22 dígitos"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Banco</label>
                        <input
                          type="text"
                          value={cbuFormData.banco}
                          onChange={e => setCbuFormData({...cbuFormData, banco: e.target.value})}
                          className="w-full border border-slate-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50 focus:bg-white transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Titular</label>
                        <input
                          type="text"
                          value={cbuFormData.titular}
                          onChange={e => setCbuFormData({...cbuFormData, titular: e.target.value})}
                          className="w-full border border-slate-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50 focus:bg-white transition-all"
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                      <input
                        type="checkbox"
                        id="principal"
                        checked={cbuFormData.principal}
                        onChange={e => setCbuFormData({...cbuFormData, principal: e.target.checked})}
                        className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <label htmlFor="principal" className="text-sm font-medium text-slate-700">
                        Marcar como CBU principal
                      </label>
                    </div>
                    <button
                      type="submit"
                      className="w-full bg-gradient-to-r from-emerald-500 to-green-600 text-white font-semibold py-3 rounded-xl hover:from-emerald-600 hover:to-green-700 transition-all shadow-lg shadow-emerald-500/25"
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
    </ProtectedRoute>
  )
}
