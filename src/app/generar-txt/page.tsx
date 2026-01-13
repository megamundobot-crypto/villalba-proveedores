'use client'

import { useEffect, useState } from 'react'
import { supabase, Factura } from '@/lib/supabase'
import { ArrowLeft, Download, Plus, Trash2, CheckCircle } from 'lucide-react'
import Link from 'next/link'

interface TransferenciaItem {
  id: number
  proveedor_nombre: string
  factura_numero: string
  factura_id: number
  cbu: string
  titular: string
  banco: string
  monto: number
  referencia: string
}

interface CBUData {
  cbu: string
  titular: string
  banco: string
}

const MOTIVOS = [
  { codigo: 'VAR', descripcion: 'Varios' },
  { codigo: 'FAC', descripcion: 'Factura' },
  { codigo: 'ALQ', descripcion: 'Alquiler' },
  { codigo: 'CUO', descripcion: 'Cuota' },
  { codigo: 'EXP', descripcion: 'Expensas' },
  { codigo: 'PRE', descripcion: 'Préstamo' },
  { codigo: 'SEG', descripcion: 'Seguro' },
  { codigo: 'HON', descripcion: 'Honorarios' },
]

export default function GenerarTXTPage() {
  const [facturasPendientes, setFacturasPendientes] = useState<Factura[]>([])
  const [transferencias, setTransferencias] = useState<TransferenciaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [empresaOrigen, setEmpresaOrigen] = useState<'VH' | 'VC'>('VH')
  const [motivoGlobal, setMotivoGlobal] = useState('FAC')
  const [generando, setGenerando] = useState(false)
  const [txtGenerado, setTxtGenerado] = useState<string | null>(null)
  const [cbuOrigen, setCbuOrigen] = useState({
    VH: '3110030211000006923105',
    VC: '3110003611000000296085'
  })

  useEffect(() => {
    loadData()
  }, [empresaOrigen])

  async function loadData() {
    setLoading(true)

    // Cargar facturas pendientes de la empresa seleccionada (usando tabla directa)
    const { data: facturasData } = await supabase
      .from('facturas')
      .select('*, proveedores(nombre)')
      .eq('empresa', empresaOrigen)
      .in('estado', ['pendiente', 'parcial'])

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

    if (facturasData) {
      const facturasConSaldo = facturasData.map((f: any) => ({
        ...f,
        proveedor_nombre: f.proveedores?.nombre,
        saldo_pendiente: f.monto_total - (pagosPorFactura[f.id] || 0)
      })).sort((a: any, b: any) => (a.proveedor_nombre || '').localeCompare(b.proveedor_nombre || ''))
      setFacturasPendientes(facturasConSaldo)
    }

    // Cargar configuración de CBU origen
    const { data: configData } = await supabase
      .from('configuracion')
      .select('clave, valor')
      .in('clave', ['cbu_origen_vh', 'cbu_origen_vc'])

    if (configData) {
      const vh = configData.find(c => c.clave === 'cbu_origen_vh')?.valor
      const vc = configData.find(c => c.clave === 'cbu_origen_vc')?.valor
      if (vh || vc) {
        setCbuOrigen({
          VH: vh || cbuOrigen.VH,
          VC: vc || cbuOrigen.VC
        })
      }
    }

    setLoading(false)
  }

  async function agregarTransferencia(factura: Factura) {
    // Obtener CBU principal del proveedor
    const { data: cbuData } = await supabase
      .from('cbus_proveedores')
      .select('cbu, titular, banco')
      .eq('proveedor_id', factura.proveedor_id)
      .eq('activo', true)
      .eq('principal', true)
      .single()

    if (!cbuData) {
      // Si no hay principal, buscar el primero activo
      const { data: cbuAlt } = await supabase
        .from('cbus_proveedores')
        .select('cbu, titular, banco')
        .eq('proveedor_id', factura.proveedor_id)
        .eq('activo', true)
        .limit(1)
        .single()

      if (!cbuAlt) {
        alert(`No hay CBU registrado para ${factura.proveedor_nombre}`)
        return
      }
      addToList(factura, cbuAlt)
    } else {
      addToList(factura, cbuData)
    }
  }

  function addToList(factura: Factura, cbu: CBUData) {
    // Verificar si ya está agregada
    if (transferencias.find(t => t.factura_id === factura.id)) {
      alert('Esta factura ya está en la lista')
      return
    }

    const nuevaTransferencia: TransferenciaItem = {
      id: Date.now(),
      proveedor_nombre: factura.proveedor_nombre || '',
      factura_numero: factura.numero,
      factura_id: factura.id,
      cbu: cbu.cbu,
      titular: cbu.titular || '',
      banco: cbu.banco || '',
      monto: Number(factura.saldo_pendiente) || factura.monto_total,
      referencia: `${motivoGlobal} ${factura.numero}`
    }

    setTransferencias([...transferencias, nuevaTransferencia])
  }

  function eliminarTransferencia(id: number) {
    setTransferencias(transferencias.filter(t => t.id !== id))
  }

  function actualizarMonto(id: number, monto: number) {
    setTransferencias(transferencias.map(t =>
      t.id === id ? { ...t, monto } : t
    ))
  }

  function actualizarReferencia(id: number, referencia: string) {
    setTransferencias(transferencias.map(t =>
      t.id === id ? { ...t, referencia } : t
    ))
  }

  function generarTXT() {
    if (transferencias.length === 0) {
      alert('No hay transferencias para generar')
      return
    }

    setGenerando(true)

    try {
      const cbuDebito = cbuOrigen[empresaOrigen]
      let lineas: string[] = []

      // Generar líneas de detalle
      for (const trans of transferencias) {
        // CBU_DEBITO: 22 chars
        const cbuDeb = cbuDebito.padEnd(22, ' ')
        // CBU_CREDITO: 22 chars
        const cbuCred = trans.cbu.padEnd(22, ' ')
        // ALIAS: 44 chars (vacío)
        const alias = ''.padEnd(44, ' ')
        // IMPORTE: 12 chars, entero en centavos
        const importeCentavos = Math.round(trans.monto * 100)
        const importe = String(importeCentavos).padStart(12, '0')
        // CONCEPTO: 50 chars
        const concepto = trans.titular.substring(0, 50).padEnd(50, ' ')
        // REFERENCIA: 30 chars (incluye MOTIVO al inicio)
        const refTexto = trans.referencia.substring(0, 30).padEnd(30, ' ')
        // EMAIL: 35 chars (vacío)
        const email = ''.padEnd(35, ' ')
        // TITULARES: 1 char
        const titulares = '0'

        const linea = cbuDeb + cbuCred + alias + importe + concepto + refTexto + email + titulares
        lineas.push(linea)
      }

      // Línea de totales
      const cantTransf = transferencias.length + 1 // Incluye la línea de totales
      const totalCentavos = transferencias.reduce((sum, t) => sum + Math.round(t.monto * 100), 0)
      const lineaTotales = String(cantTransf).padStart(5, '0') + String(totalCentavos).padStart(17, '0')
      lineas.push(lineaTotales)

      // Unir con CR+LF (Windows)
      const txt = lineas.join('\r\n')
      setTxtGenerado(txt)

    } catch (error) {
      console.error('Error generando TXT:', error)
      alert('Error al generar el archivo')
    }

    setGenerando(false)
  }

  function descargarTXT() {
    if (!txtGenerado) return

    const blob = new Blob([txtGenerado], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const fecha = new Date().toISOString().split('T')[0].replace(/-/g, '')
    a.download = `transferencias_${empresaOrigen}_${fecha}.txt`
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

  const totalTransferencias = transferencias.reduce((sum, t) => sum + t.monto, 0)

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
            <h1 className="text-2xl font-bold">Generar TXT Homebanking</h1>
            <p className="text-blue-200">NBCH - Transferencias masivas</p>
          </div>
        </div>
      </header>

      <main className="container mx-auto p-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Panel izquierdo - Facturas disponibles */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b">
              <h2 className="text-lg font-semibold mb-3">Facturas Pendientes</h2>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Empresa origen</label>
                  <select
                    value={empresaOrigen}
                    onChange={e => {
                      setEmpresaOrigen(e.target.value as 'VH' | 'VC')
                      setTransferencias([])
                      setTxtGenerado(null)
                    }}
                    className="w-full border rounded-lg px-3 py-2"
                  >
                    <option value="VH">Villalba Hermanos SRL</option>
                    <option value="VC">Villalba Cristino</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Motivo</label>
                  <select
                    value={motivoGlobal}
                    onChange={e => setMotivoGlobal(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2"
                  >
                    {MOTIVOS.map(m => (
                      <option key={m.codigo} value={m.codigo}>{m.codigo} - {m.descripcion}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <div className="max-h-[500px] overflow-y-auto">
              {facturasPendientes.map(factura => (
                <div
                  key={factura.id}
                  className={`p-3 border-b hover:bg-gray-50 ${
                    transferencias.find(t => t.factura_id === factura.id) ? 'bg-green-50' : ''
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="font-medium">{factura.proveedor_nombre}</p>
                      <p className="text-sm text-gray-500">{factura.numero}</p>
                      <p className="text-sm font-bold text-red-600">
                        Saldo: {formatMoney(Number(factura.saldo_pendiente))}
                      </p>
                    </div>
                    <button
                      onClick={() => agregarTransferencia(factura)}
                      disabled={!!transferencias.find(t => t.factura_id === factura.id)}
                      className={`p-2 rounded ${
                        transferencias.find(t => t.factura_id === factura.id)
                          ? 'text-green-600'
                          : 'text-blue-600 hover:bg-blue-50'
                      }`}
                    >
                      {transferencias.find(t => t.factura_id === factura.id) ? (
                        <CheckCircle className="h-5 w-5" />
                      ) : (
                        <Plus className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>
              ))}
              {facturasPendientes.length === 0 && (
                <div className="p-8 text-center text-gray-500">
                  No hay facturas pendientes para {empresaOrigen}
                </div>
              )}
            </div>
          </div>

          {/* Panel derecho - Transferencias a generar */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b flex justify-between items-center">
              <div>
                <h2 className="text-lg font-semibold">Transferencias a Generar</h2>
                <p className="text-sm text-gray-500">
                  CBU Origen: <span className="font-mono">{cbuOrigen[empresaOrigen]}</span>
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">Total</p>
                <p className="text-xl font-bold text-green-600">{formatMoney(totalTransferencias)}</p>
              </div>
            </div>
            <div className="max-h-[400px] overflow-y-auto">
              {transferencias.map(trans => (
                <div key={trans.id} className="p-3 border-b">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-medium">{trans.proveedor_nombre}</p>
                      <p className="text-xs text-gray-500 font-mono">{trans.cbu}</p>
                      <p className="text-xs text-gray-400">{trans.banco}</p>
                    </div>
                    <button
                      onClick={() => eliminarTransferencia(trans.id)}
                      className="p-1 text-red-600 hover:bg-red-50 rounded"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs text-gray-500">Monto</label>
                      <input
                        type="number"
                        value={trans.monto}
                        onChange={e => actualizarMonto(trans.id, parseFloat(e.target.value) || 0)}
                        className="w-full border rounded px-2 py-1 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500">Referencia</label>
                      <input
                        type="text"
                        maxLength={30}
                        value={trans.referencia}
                        onChange={e => actualizarReferencia(trans.id, e.target.value)}
                        className="w-full border rounded px-2 py-1 text-sm"
                      />
                    </div>
                  </div>
                </div>
              ))}
              {transferencias.length === 0 && (
                <div className="p-8 text-center text-gray-500">
                  Agregá facturas desde el panel izquierdo
                </div>
              )}
            </div>
            {transferencias.length > 0 && (
              <div className="p-4 border-t space-y-3">
                <button
                  onClick={generarTXT}
                  disabled={generando}
                  className="w-full bg-orange-600 text-white px-4 py-3 rounded-lg flex items-center justify-center gap-2 hover:bg-orange-700 disabled:opacity-50"
                >
                  {generando ? 'Generando...' : 'Generar TXT'}
                </button>

                {txtGenerado && (
                  <>
                    <button
                      onClick={descargarTXT}
                      className="w-full bg-green-600 text-white px-4 py-3 rounded-lg flex items-center justify-center gap-2 hover:bg-green-700"
                    >
                      <Download className="h-5 w-5" />
                      Descargar TXT
                    </button>
                    <div className="bg-gray-100 p-3 rounded-lg">
                      <p className="text-xs text-gray-500 mb-2">Vista previa:</p>
                      <pre className="text-xs font-mono overflow-x-auto whitespace-pre">
                        {txtGenerado.split('\r\n').slice(0, 3).join('\n')}
                        {transferencias.length > 2 && '\n...'}
                      </pre>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
