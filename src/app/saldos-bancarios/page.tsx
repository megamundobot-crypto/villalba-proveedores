'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import {
  ArrowLeft, Building2, Save, RefreshCw, Plus, Trash2,
  Settings, Copy, Landmark, Check, Download
} from 'lucide-react'
import Link from 'next/link'
import NavRapida from '@/components/NavRapida'
import html2canvas from 'html2canvas'

interface CuentaBancaria {
  id: number
  banco: string
  empresa: 'VH' | 'VC' | 'MEGA' | 'CRICNOGAP'
  icono?: string
  orden: number
  activa: boolean
  moneda?: 'ARS' | 'USD'
}

// Configuración de empresas con colores
const EMPRESAS_CONFIG = {
  VH: { nombre: 'Villalba Hermanos SRL', color: 'bg-blue-600', colorLight: 'bg-blue-100', colorText: 'text-blue-800', colorBorder: 'border-blue-300' },
  VC: { nombre: 'Villalba Cristino', color: 'bg-emerald-600', colorLight: 'bg-emerald-100', colorText: 'text-emerald-800', colorBorder: 'border-emerald-300' },
  MEGA: { nombre: 'Megamundo SA', color: 'bg-purple-600', colorLight: 'bg-purple-100', colorText: 'text-purple-800', colorBorder: 'border-purple-300' },
  CRICNOGAP: { nombre: 'Cricnogap SRL', color: 'bg-amber-600', colorLight: 'bg-amber-100', colorText: 'text-amber-800', colorBorder: 'border-amber-300' }
}

export default function SaldosBancariosPage() {
  const [cuentas, setCuentas] = useState<CuentaBancaria[]>([])
  const [saldos, setSaldos] = useState<Record<number, string>>({})
  const [saldosEditando, setSaldosEditando] = useState<Record<number, boolean>>({}) // Track which inputs are being edited
  const [loading, setLoading] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [guardadoOk, setGuardadoOk] = useState(false)
  const [mostrarConfig, setMostrarConfig] = useState(false)
  const [descargando, setDescargando] = useState(false)
  const [copiado, setCopiado] = useState(false)

  // Para agregar nueva cuenta
  const [nuevaCuenta, setNuevaCuenta] = useState({
    banco: '',
    empresa: 'VH' as 'VH' | 'VC' | 'MEGA' | 'CRICNOGAP',
    icono: '',
    moneda: 'ARS' as 'ARS' | 'USD'
  })

  const reporteRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)

    const { data: cuentasData } = await supabase
      .from('cuentas_bancarias')
      .select('*')
      .eq('activa', true)
      .order('empresa')
      .order('orden')

    if (cuentasData) {
      setCuentas(cuentasData)

      const saldosMap: Record<number, string> = {}
      cuentasData.forEach((c: any) => {
        const saldo = c.saldo_actual || 0
        saldosMap[c.id] = saldo > 0 ? formatNumberForDisplay(saldo) : ''
      })
      setSaldos(saldosMap)
    }

    setLoading(false)
  }

  async function guardarSaldos() {
    setGuardando(true)

    try {
      for (const [cuentaId, saldoStr] of Object.entries(saldos)) {
        const saldo = parseNumber(saldoStr)
        await supabase
          .from('cuentas_bancarias')
          .update({ saldo_actual: saldo, updated_at: new Date().toISOString() })
          .eq('id', Number(cuentaId))
      }

      setGuardadoOk(true)
      setTimeout(() => setGuardadoOk(false), 2000)
    } catch (error) {
      console.error('Error guardando saldos:', error)
    }

    setGuardando(false)
  }

  async function agregarCuenta() {
    if (!nuevaCuenta.banco) {
      alert('Ingresá el nombre del banco')
      return
    }

    try {
      const maxOrden = cuentas.filter(c => c.empresa === nuevaCuenta.empresa).length

      const { error } = await supabase
        .from('cuentas_bancarias')
        .insert({
          banco: nuevaCuenta.banco,
          empresa: nuevaCuenta.empresa,
          icono: nuevaCuenta.icono || null,
          orden: maxOrden + 1,
          activa: true,
          saldo_actual: 0,
          moneda: nuevaCuenta.moneda
        })

      if (error) throw error

      setNuevaCuenta({ banco: '', empresa: 'VH', icono: '', moneda: 'ARS' })
      loadData()
    } catch (error) {
      console.error('Error agregando cuenta:', error)
    }
  }

  async function eliminarCuenta(id: number) {
    if (!confirm('¿Seguro que querés eliminar esta cuenta?')) return

    try {
      await supabase
        .from('cuentas_bancarias')
        .update({ activa: false })
        .eq('id', id)

      loadData()
    } catch (error) {
      console.error('Error eliminando cuenta:', error)
    }
  }

  // Descargar imagen PNG (método simple que siempre funciona)
  async function descargarImagen() {
    if (!reporteRef.current) return

    setDescargando(true)

    try {
      const canvas = await html2canvas(reporteRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
        allowTaint: true
      })

      const fecha = new Date().toLocaleDateString('es-AR').replace(/\//g, '-')
      const nombreArchivo = `saldos-bancarios-${fecha}.png`

      // Método simple: crear link y descargar
      const link = document.createElement('a')
      link.download = nombreArchivo
      link.href = canvas.toDataURL('image/png')
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } catch (error) {
      console.error('Error descargando:', error)
      alert('Error al generar la imagen. Intentá de nuevo.')
    }

    setDescargando(false)
  }

  // Parsear número desde formato argentino
  function parseNumber(str: string): number {
    if (!str) return 0
    // Remover puntos de miles, reemplazar coma decimal por punto
    return parseFloat(str.replace(/\./g, '').replace(',', '.')) || 0
  }

  // Formatear número para mostrar (formato argentino)
  function formatNumberForDisplay(num: number): string {
    if (!num) return ''
    return num.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  function handleSaldoChange(cuentaId: number, valor: string) {
    // Solo permitir números, puntos y comas
    const limpio = valor.replace(/[^\d.,]/g, '')
    setSaldos(prev => ({
      ...prev,
      [cuentaId]: limpio
    }))
  }

  function handleSaldoFocus(cuentaId: number) {
    setSaldosEditando(prev => ({ ...prev, [cuentaId]: true }))
    // Al entrar, mostrar número sin formato para editar fácil
    const valorActual = saldos[cuentaId] || ''
    if (valorActual) {
      // Convertir a número simple para editar
      const num = parseNumber(valorActual)
      if (num > 0) {
        setSaldos(prev => ({
          ...prev,
          [cuentaId]: num.toString().replace('.', ',')
        }))
      }
    }
  }

  function handleSaldoBlur(cuentaId: number) {
    setSaldosEditando(prev => ({ ...prev, [cuentaId]: false }))
    // Al salir, formatear el número
    const valorActual = saldos[cuentaId] || ''
    if (valorActual) {
      const num = parseNumber(valorActual)
      if (num > 0) {
        setSaldos(prev => ({
          ...prev,
          [cuentaId]: formatNumberForDisplay(num)
        }))
      }
    }
  }

  function formatMoney(amount: number, currency: string = 'ARS') {
    const symbol = currency === 'USD' ? 'USD ' : '$ '
    return symbol + amount.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  // Calcular totales por empresa (solo ARS)
  function calcularTotalEmpresa(empresa: string) {
    return cuentas
      .filter(c => c.empresa === empresa && (c.moneda || 'ARS') === 'ARS')
      .reduce((sum, c) => sum + parseNumber(saldos[c.id] || ''), 0)
  }

  // Calcular total USD por empresa
  function calcularTotalUSD(empresa: string) {
    return cuentas
      .filter(c => c.empresa === empresa && c.moneda === 'USD')
      .reduce((sum, c) => sum + parseNumber(saldos[c.id] || ''), 0)
  }

  // Agrupar cuentas por empresa
  const cuentasPorEmpresa = cuentas.reduce((acc, cuenta) => {
    if (!acc[cuenta.empresa]) acc[cuenta.empresa] = []
    acc[cuenta.empresa].push(cuenta)
    return acc
  }, {} as Record<string, CuentaBancaria[]>)

  const fechaHoy = new Date().toLocaleDateString('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })

  const horaActual = new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-600 font-medium">Cargando saldos...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-indigo-800 via-indigo-700 to-indigo-800 text-white shadow-xl">
        <div className="container mx-auto px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/" className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                <ArrowLeft className="h-6 w-6" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                  <Landmark className="h-7 w-7" />
                  Saldos Bancarios
                </h1>
                <p className="text-indigo-200 text-sm mt-0.5">Control de disponibilidad</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setMostrarConfig(!mostrarConfig)}
                className={`p-2 rounded-lg transition-colors ${mostrarConfig ? 'bg-white/20' : 'hover:bg-white/10'}`}
                title="Configuración"
              >
                <Settings className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </header>
      <NavRapida />

      <main className="container mx-auto px-6 py-6">
        {/* Botones de acción */}
        <div className="flex flex-wrap items-center justify-end gap-3 mb-6">
          {/* Descargar imagen PNG */}
          <button
            onClick={descargarImagen}
            disabled={descargando}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 ${
              copiado
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-700 hover:bg-slate-800 text-white'
            }`}
            title="Descargar imagen para WhatsApp"
          >
            {descargando ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : copiado ? (
              <Check className="h-4 w-4" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            {copiado ? '¡Descargado!' : 'Descargar PNG'}
          </button>

          {/* Guardar saldos en la base de datos */}
          <button
            onClick={guardarSaldos}
            disabled={guardando}
            className={`flex items-center gap-2 px-5 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 ${
              guardadoOk
                ? 'bg-emerald-600 text-white'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white'
            }`}
            title="Guardar los saldos en el sistema"
          >
            {guardando ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : guardadoOk ? (
              <Check className="h-4 w-4" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {guardadoOk ? '¡Guardado!' : 'Guardar Saldos'}
          </button>
        </div>

        {/* Panel de configuración */}
        {mostrarConfig && (
          <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6 mb-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Agregar Nueva Cuenta</h3>

            <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 mb-6">
              <input
                type="text"
                placeholder="Nombre del banco"
                value={nuevaCuenta.banco}
                onChange={(e) => setNuevaCuenta({ ...nuevaCuenta, banco: e.target.value })}
                className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
              <select
                value={nuevaCuenta.empresa}
                onChange={(e) => setNuevaCuenta({ ...nuevaCuenta, empresa: e.target.value as any })}
                className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              >
                <option value="VH">Villalba Hermanos SRL</option>
                <option value="VC">Villalba Cristino</option>
                <option value="MEGA">Megamundo SA</option>
                <option value="CRICNOGAP">Cricnogap SRL</option>
              </select>
              <select
                value={nuevaCuenta.moneda}
                onChange={(e) => setNuevaCuenta({ ...nuevaCuenta, moneda: e.target.value as any })}
                className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              >
                <option value="ARS">Pesos (ARS)</option>
                <option value="USD">Dólares (USD)</option>
              </select>
              <input
                type="text"
                placeholder="Icono (ej: rio.png)"
                value={nuevaCuenta.icono}
                onChange={(e) => setNuevaCuenta({ ...nuevaCuenta, icono: e.target.value })}
                className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
              <button
                onClick={agregarCuenta}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium"
              >
                <Plus className="h-4 w-4" />
                Agregar
              </button>
            </div>

            <h4 className="text-sm font-medium text-slate-600 mb-3">Cuentas existentes</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {cuentas.map(cuenta => (
                <div key={cuenta.id} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded ${EMPRESAS_CONFIG[cuenta.empresa].colorLight} ${EMPRESAS_CONFIG[cuenta.empresa].colorText}`}>
                      {cuenta.empresa}
                    </span>
                    <span className="text-sm text-slate-700">{cuenta.banco}</span>
                    {cuenta.moneda === 'USD' && (
                      <span className="text-xs px-1.5 py-0.5 bg-green-100 text-green-700 rounded">USD</span>
                    )}
                  </div>
                  <button
                    onClick={() => eliminarCuenta(cuenta.id)}
                    className="p-1 text-red-500 hover:bg-red-100 rounded"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* REPORTE PARA EXPORTAR */}
        <div ref={reporteRef} className="bg-white rounded-xl shadow-xl border-2 border-slate-300 overflow-hidden">
          {/* Header del reporte */}
          <div className="bg-slate-800 text-white p-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold tracking-tight">Bancos</h2>
                <p className="text-slate-300 capitalize mt-1">{fechaHoy}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-400 uppercase tracking-wider">Actualizado</p>
                <p className="text-2xl font-bold">{horaActual}</p>
              </div>
            </div>
          </div>

          {/* Contenido del reporte */}
          <div className="p-5">
            {(['VH', 'VC', 'MEGA', 'CRICNOGAP'] as const).map((empresaKey) => {
              const config = EMPRESAS_CONFIG[empresaKey]
              const cuentasEmpresa = cuentasPorEmpresa[empresaKey] || []
              if (cuentasEmpresa.length === 0) return null

              const totalEmpresa = calcularTotalEmpresa(empresaKey)
              const totalUSD = calcularTotalUSD(empresaKey)
              const esCricnogap = empresaKey === 'CRICNOGAP'

              return (
                <div key={empresaKey} className="mb-5 last:mb-0">
                  {/* Cuentas */}
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <table className="w-full">
                      <tbody>
                        {cuentasEmpresa.map((cuenta, idx) => {
                          const esUSD = cuenta.moneda === 'USD'
                          return (
                            <tr key={cuenta.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                              <td className="py-3 px-4 border-b border-slate-100">
                                <div className="flex items-center gap-3">
                                  {cuenta.icono ? (
                                    <img
                                      src={`/bancos/${cuenta.icono}`}
                                      alt={cuenta.banco}
                                      className="w-7 h-7 object-contain"
                                      onError={(e) => {
                                        (e.target as HTMLImageElement).style.display = 'none'
                                      }}
                                    />
                                  ) : (
                                    <div className={`w-7 h-7 ${esUSD ? 'bg-green-600' : config.color} rounded flex items-center justify-center`}>
                                      <Building2 className="h-4 w-4 text-white" />
                                    </div>
                                  )}
                                  <span className="font-semibold text-slate-800">{cuenta.banco}</span>
                                </div>
                              </td>
                              <td className="py-3 px-4 text-right border-b border-slate-100 w-52">
                                <div className="flex items-center justify-end gap-1">
                                  <span className={`text-sm font-medium ${esUSD ? 'text-green-600' : 'text-slate-500'}`}>
                                    {esUSD ? 'USD' : '$'}
                                  </span>
                                  <input
                                    type="text"
                                    inputMode="decimal"
                                    value={saldos[cuenta.id] || ''}
                                    onChange={(e) => handleSaldoChange(cuenta.id, e.target.value)}
                                    onFocus={() => handleSaldoFocus(cuenta.id)}
                                    onBlur={() => handleSaldoBlur(cuenta.id)}
                                    className={`w-40 px-3 py-2 text-right font-bold text-lg border rounded-lg focus:ring-2 focus:border-indigo-500 bg-white ${
                                      esUSD ? 'border-green-300 focus:ring-green-500' : 'border-slate-300 focus:ring-indigo-500'
                                    }`}
                                    placeholder="0,00"
                                  />
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Total de la empresa - Solo si NO es Cricnogap o si tiene más de una cuenta ARS */}
                  {!esCricnogap && (
                    <div className={`flex items-center justify-between py-3 px-4 mt-2 rounded-lg ${config.colorLight} border-2 ${config.colorBorder}`}>
                      <span className={`font-bold text-lg ${config.colorText}`}>
                        Total {config.nombre}
                      </span>
                      <div className="text-right">
                        <span className={`text-2xl font-bold ${config.colorText}`}>
                          {formatMoney(totalEmpresa)}
                        </span>
                        {totalUSD > 0 && (
                          <p className="text-sm text-green-700 font-semibold">
                            {formatMoney(totalUSD, 'USD')}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Para Cricnogap: mostrar totales separados si hay varias cuentas */}
                  {esCricnogap && cuentasEmpresa.length > 1 && (
                    <div className={`flex items-center justify-between py-3 px-4 mt-2 rounded-lg ${config.colorLight} border-2 ${config.colorBorder}`}>
                      <span className={`font-bold text-lg ${config.colorText}`}>
                        Total {config.nombre}
                      </span>
                      <div className="text-right">
                        {totalEmpresa > 0 && (
                          <p className={`text-xl font-bold ${config.colorText}`}>
                            {formatMoney(totalEmpresa)}
                          </p>
                        )}
                        {totalUSD > 0 && (
                          <p className="text-xl font-bold text-green-700">
                            {formatMoney(totalUSD, 'USD')}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </main>
    </div>
  )
}
