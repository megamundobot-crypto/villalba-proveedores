import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Tipos para TypeScript
export interface Proveedor {
  id: number
  nombre: string
  cuit?: string
  email?: string
  telefono?: string
  whatsapp?: string
  notas?: string
  activo: boolean
  created_at: string
}

export interface CBUProveedor {
  id: number
  proveedor_id: number
  cbu: string
  banco?: string
  titular?: string
  principal: boolean
  activo: boolean
}

export interface Factura {
  id: number
  proveedor_id: number
  empresa: 'VH' | 'VC'
  numero: string
  fecha: string
  fecha_vencimiento?: string
  monto_total: number
  monto_neto?: number
  iva?: number
  aplica_65_35: boolean
  descuento_pronto_pago?: number
  monto_descuento?: number
  fecha_limite_descuento?: string
  estado: 'pendiente' | 'parcial' | 'pagada' | 'anulada'
  observaciones?: string
  // Campos de la vista
  proveedor_nombre?: string
  alerta?: 'verde' | 'amarillo' | 'rojo'
  dias_antiguedad?: number
  total_pagado?: number
  saldo_pendiente?: number
}

export interface Pago {
  id: number
  factura_id: number
  fecha: string
  monto: number
  medio_pago: string
  archivo_txt?: string
  referencia_banco?: string
  observaciones?: string
}

export interface SaldoProveedor {
  id: number
  nombre: string
  saldo_vh: number
  saldo_vc: number
  saldo_total: number
}

export interface CuentaInternaResumen {
  concepto: string
  monto_pendiente: number
  monto_pagado: number
  monto_total: number
}

export interface CuentaInterna {
  id: number
  tipo: 'deuda' | 'pago_interno'
  factura_id?: number
  proveedor_id?: number
  pagador?: 'VH' | 'VC'
  receptor?: 'VH' | 'VC'
  debe_vh: number
  debe_vc: number
  monto?: number
  fecha?: string
  pagado: boolean
  observaciones?: string
  facturas_imputadas?: number[]
  created_at: string
}

// Función para registrar auditoría
export async function registrarAuditoria(
  accion: string,
  descripcion: string,
  detalles?: Record<string, any>
) {
  try {
    // Obtener usuario actual del localStorage
    const userStr = typeof window !== 'undefined' ? localStorage.getItem('user') : null
    const user = userStr ? JSON.parse(userStr) : null

    await supabase.from('auditoria').insert({
      accion,
      descripcion,
      detalles: detalles ? JSON.stringify(detalles) : null,
      usuario_id: user?.id || null,
      usuario_nombre: user?.nombre || 'Sistema',
      ip: null // No podemos obtener IP del cliente fácilmente
    })
  } catch (error) {
    console.error('Error registrando auditoría:', error)
  }
}
