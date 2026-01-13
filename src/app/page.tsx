'use client'

import { useEffect, useState } from 'react'
import { supabase, SaldoProveedor, CuentaInternaResumen } from '@/lib/supabase'
import { Building2, Users, AlertTriangle, TrendingDown, ArrowRightLeft } from 'lucide-react'
import Link from 'next/link'

export default function Dashboard() {
  const [saldos, setSaldos] = useState<SaldoProveedor[]>([])
  const [cuentaInterna, setCuentaInterna] = useState<CuentaInternaResumen[]>([])
  const [loading, setLoading] = useState(true)
  const [totales, setTotales] = useState({ vh: 0, vc: 0, total: 0 })
  const [alertas, setAlertas] = useState({ verde: 0, amarillo: 0, rojo: 0 })

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)

    // Cargar facturas y calcular saldos manualmente
    const { data: facturasData } = await supabase
      .from('facturas')
      .select('*, proveedores(nombre)')
      .in('estado', ['pendiente', 'parcial'])

    const { data: pagosData } = await supabase
      .from('pagos')
      .select('factura_id, monto')

    if (facturasData) {
      // Calcular pagos por factura
      const pagosPorFactura: Record<number, number> = {}
      if (pagosData) {
        pagosData.forEach(p => {
          pagosPorFactura[p.factura_id] = (pagosPorFactura[p.factura_id] || 0) + Number(p.monto)
        })
      }

      // Calcular saldos por proveedor
      const saldosPorProveedor: Record<number, { id: number, nombre: string, saldo_vh: number, saldo_vc: number, saldo_total: number }> = {}

      facturasData.forEach((f: any) => {
        const pagado = pagosPorFactura[f.id] || 0
        const saldo = f.monto_total - pagado
        const provId = f.proveedor_id
        const provNombre = f.proveedores?.nombre || 'Sin nombre'

        if (!saldosPorProveedor[provId]) {
          saldosPorProveedor[provId] = { id: provId, nombre: provNombre, saldo_vh: 0, saldo_vc: 0, saldo_total: 0 }
        }

        if (f.empresa === 'VH') {
          saldosPorProveedor[provId].saldo_vh += saldo
        } else {
          saldosPorProveedor[provId].saldo_vc += saldo
        }
        saldosPorProveedor[provId].saldo_total += saldo
      })

      const saldosArray = Object.values(saldosPorProveedor).sort((a, b) => b.saldo_total - a.saldo_total)
      setSaldos(saldosArray)

      const vh = saldosArray.reduce((sum, s) => sum + s.saldo_vh, 0)
      const vc = saldosArray.reduce((sum, s) => sum + s.saldo_vc, 0)
      setTotales({ vh, vc, total: vh + vc })

      // Calcular alertas
      const hoy = new Date()
      let verde = 0, amarillo = 0, rojo = 0
      facturasData.forEach((f: any) => {
        const fecha = new Date(f.fecha)
        const dias = Math.floor((hoy.getTime() - fecha.getTime()) / (1000 * 60 * 60 * 24))
        if (dias <= 30) verde++
        else if (dias <= 40) amarillo++
        else rojo++
      })
      setAlertas({ verde, amarillo, rojo })
    }

    // Cargar cuenta interna
    const { data: cuentaData } = await supabase
      .from('cuenta_interna')
      .select('*')

    if (cuentaData) {
      const vhDebeVc = cuentaData.reduce((sum, c) => sum + (c.pagado ? 0 : Number(c.debe_vh)), 0)
      const vcDebeVh = cuentaData.reduce((sum, c) => sum + (c.pagado ? 0 : Number(c.debe_vc)), 0)
      const vhPagado = cuentaData.reduce((sum, c) => sum + (c.pagado ? Number(c.debe_vh) : 0), 0)
      const vcPagado = cuentaData.reduce((sum, c) => sum + (c.pagado ? Number(c.debe_vc) : 0), 0)

      setCuentaInterna([
        { concepto: 'VH debe a VC', monto_pendiente: vhDebeVc, monto_pagado: vhPagado, monto_total: vhDebeVc + vhPagado },
        { concepto: 'VC debe a VH', monto_pendiente: vcDebeVh, monto_pagado: vcPagado, monto_total: vcDebeVh + vcPagado }
      ])
    }

    setLoading(false)
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
        <div className="container mx-auto">
          <h1 className="text-2xl font-bold">Sistema de Proveedores</h1>
          <p className="text-blue-200">Villalba Hermanos SRL / Villalba Cristino</p>
        </div>
      </header>

      <main className="container mx-auto p-4">
        {/* Cards de resumen */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Total General */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Deuda Total</p>
                <p className="text-2xl font-bold text-gray-800">{formatMoney(totales.total)}</p>
              </div>
              <TrendingDown className="h-10 w-10 text-red-500" />
            </div>
          </div>

          {/* VH */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Villalba Hermanos</p>
                <p className="text-2xl font-bold text-blue-600">{formatMoney(totales.vh)}</p>
              </div>
              <Building2 className="h-10 w-10 text-blue-500" />
            </div>
          </div>

          {/* VC */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Villalba Cristino</p>
                <p className="text-2xl font-bold text-green-600">{formatMoney(totales.vc)}</p>
              </div>
              <Building2 className="h-10 w-10 text-green-500" />
            </div>
          </div>

          {/* Alertas */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Facturas Pendientes</p>
                <div className="flex gap-2 mt-1">
                  <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-sm">{alertas.verde}</span>
                  <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-sm">{alertas.amarillo}</span>
                  <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-sm">{alertas.rojo}</span>
                </div>
              </div>
              <AlertTriangle className="h-10 w-10 text-yellow-500" />
            </div>
          </div>
        </div>

        {/* Cuenta Interna */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5" />
            Cuenta Interna entre Empresas
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {cuentaInterna.map((cuenta, idx) => (
              <div key={idx} className={`p-4 rounded-lg ${cuenta.concepto.includes('VH debe') ? 'bg-blue-50' : 'bg-green-50'}`}>
                <p className="font-medium">{cuenta.concepto}</p>
                <p className="text-2xl font-bold">{formatMoney(Number(cuenta.monto_pendiente))}</p>
                <p className="text-sm text-gray-500">Pagado: {formatMoney(Number(cuenta.monto_pagado))}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Navegación rápida */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Link href="/proveedores" className="bg-white rounded-lg shadow p-4 text-center hover:bg-gray-50 transition">
            <Users className="h-8 w-8 mx-auto mb-2 text-blue-600" />
            <span className="font-medium">Proveedores</span>
          </Link>
          <Link href="/facturas" className="bg-white rounded-lg shadow p-4 text-center hover:bg-gray-50 transition">
            <svg className="h-8 w-8 mx-auto mb-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="font-medium">Facturas</span>
          </Link>
          <Link href="/pagos" className="bg-white rounded-lg shadow p-4 text-center hover:bg-gray-50 transition">
            <svg className="h-8 w-8 mx-auto mb-2 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <span className="font-medium">Pagos</span>
          </Link>
          <Link href="/generar-txt" className="bg-white rounded-lg shadow p-4 text-center hover:bg-gray-50 transition">
            <svg className="h-8 w-8 mx-auto mb-2 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span className="font-medium">Generar TXT</span>
          </Link>
        </div>

        {/* Top 10 Proveedores con más deuda */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b">
            <h2 className="text-lg font-semibold">Top 10 Proveedores con Mayor Deuda</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Proveedor</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">Saldo VH</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">Saldo VC</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {saldos.slice(0, 10).map((proveedor) => (
                  <tr key={proveedor.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{proveedor.nombre}</td>
                    <td className="px-4 py-3 text-right text-blue-600">{formatMoney(Number(proveedor.saldo_vh))}</td>
                    <td className="px-4 py-3 text-right text-green-600">{formatMoney(Number(proveedor.saldo_vc))}</td>
                    <td className="px-4 py-3 text-right font-bold">{formatMoney(Number(proveedor.saldo_total))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  )
}
