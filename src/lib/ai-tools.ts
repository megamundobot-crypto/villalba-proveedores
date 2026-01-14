import { createClient } from '@supabase/supabase-js'
import type { Tool, MessageParam } from '@anthropic-ai/sdk/resources/messages'

// Supabase client con service role para operaciones del servidor
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Definición de herramientas para Claude
export const tools: Tool[] = [
  {
    name: 'consultar_proveedores',
    description: 'Busca proveedores en el sistema. Puede buscar por nombre (búsqueda parcial) o por ID exacto. Retorna lista de proveedores con sus datos básicos.',
    input_schema: {
      type: 'object',
      properties: {
        nombre: {
          type: 'string',
          description: 'Nombre o parte del nombre del proveedor a buscar'
        },
        id: {
          type: 'number',
          description: 'ID exacto del proveedor'
        }
      }
    }
  },
  {
    name: 'consultar_facturas',
    description: 'Lista facturas pendientes de pago. Puede filtrar por proveedor y/o empresa (VH=Villalba Hermanos, VC=Villalba Cristino). Retorna facturas con estado pendiente o parcial.',
    input_schema: {
      type: 'object',
      properties: {
        proveedor_id: {
          type: 'number',
          description: 'ID del proveedor para filtrar sus facturas'
        },
        empresa: {
          type: 'string',
          enum: ['VH', 'VC'],
          description: 'Filtrar por empresa: VH (Villalba Hermanos) o VC (Villalba Cristino)'
        },
        solo_vencidas: {
          type: 'boolean',
          description: 'Si es true, solo retorna facturas con más de 30 días de antigüedad'
        }
      }
    }
  },
  {
    name: 'consultar_saldos',
    description: 'Obtiene el saldo pendiente total de un proveedor, desglosado por empresa (VH y VC). Incluye cantidad de facturas pendientes.',
    input_schema: {
      type: 'object',
      properties: {
        proveedor_id: {
          type: 'number',
          description: 'ID del proveedor'
        },
        nombre_proveedor: {
          type: 'string',
          description: 'Nombre del proveedor (se buscará primero para obtener el ID)'
        }
      }
    }
  },
  {
    name: 'registrar_pago',
    description: 'Registra un pago a una factura específica. IMPORTANTE: Siempre confirmar con el usuario antes de ejecutar. Requiere ID de factura, monto y medio de pago.',
    input_schema: {
      type: 'object',
      properties: {
        factura_id: {
          type: 'number',
          description: 'ID de la factura a pagar'
        },
        monto: {
          type: 'number',
          description: 'Monto del pago en pesos argentinos'
        },
        medio_pago: {
          type: 'string',
          enum: ['transferencia', 'cheque', 'efectivo', 'otro'],
          description: 'Medio de pago utilizado'
        },
        numero_comprobante: {
          type: 'string',
          description: 'Número de comprobante o referencia del pago'
        },
        observaciones: {
          type: 'string',
          description: 'Notas adicionales sobre el pago'
        }
      },
      required: ['factura_id', 'monto', 'medio_pago']
    }
  },
  {
    name: 'buscar_cbu',
    description: 'Obtiene el CBU y datos bancarios de un proveedor para realizar transferencias.',
    input_schema: {
      type: 'object',
      properties: {
        proveedor_id: {
          type: 'number',
          description: 'ID del proveedor'
        },
        nombre_proveedor: {
          type: 'string',
          description: 'Nombre del proveedor (se buscará primero para obtener el ID)'
        }
      }
    }
  },
  {
    name: 'resumen_general',
    description: 'Obtiene un resumen general del sistema: total de proveedores con saldo, deuda total por empresa, facturas vencidas, etc.',
    input_schema: {
      type: 'object',
      properties: {}
    }
  }
]

// Funciones que ejecutan las herramientas
export async function ejecutarTool(
  toolName: string,
  toolInput: Record<string, unknown>,
  userId: number
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  try {
    switch (toolName) {
      case 'consultar_proveedores':
        return await consultarProveedores(toolInput)
      case 'consultar_facturas':
        return await consultarFacturas(toolInput)
      case 'consultar_saldos':
        return await consultarSaldos(toolInput)
      case 'registrar_pago':
        return await registrarPago(toolInput, userId)
      case 'buscar_cbu':
        return await buscarCbu(toolInput)
      case 'resumen_general':
        return await resumenGeneral()
      default:
        return { success: false, error: `Tool desconocida: ${toolName}` }
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    }
  }
}

// Implementación de cada tool

async function consultarProveedores(input: Record<string, unknown>) {
  let query = supabase
    .from('proveedores')
    .select('id, nombre, cuit, email, telefono, activo')
    .eq('activo', true)

  if (input.id) {
    query = query.eq('id', input.id)
  } else if (input.nombre) {
    query = query.ilike('nombre', `%${input.nombre}%`)
  }

  const { data, error } = await query.order('nombre').limit(10)

  if (error) return { success: false, error: error.message }

  return {
    success: true,
    data: {
      proveedores: data,
      cantidad: data?.length || 0
    }
  }
}

async function consultarFacturas(input: Record<string, unknown>) {
  let query = supabase
    .from('facturas')
    .select(`
      id,
      numero,
      fecha,
      monto_total,
      estado,
      empresa,
      proveedor_id,
      proveedores(nombre)
    `)
    .in('estado', ['pendiente', 'parcial'])

  if (input.proveedor_id) {
    query = query.eq('proveedor_id', input.proveedor_id)
  }
  if (input.empresa) {
    query = query.eq('empresa', input.empresa)
  }

  const { data: facturas, error } = await query.order('fecha', { ascending: true }).limit(50)

  if (error) return { success: false, error: error.message }

  // Calcular saldo pendiente y días de antigüedad
  const hoy = new Date()
  const facturasConSaldo = await Promise.all((facturas || []).map(async (f) => {
    // Obtener pagos de esta factura
    const { data: pagos } = await supabase
      .from('pagos')
      .select('monto')
      .eq('factura_id', f.id)

    const totalPagado = pagos?.reduce((sum, p) => sum + Number(p.monto), 0) || 0
    const saldoPendiente = f.monto_total - totalPagado
    const diasAntiguedad = Math.floor((hoy.getTime() - new Date(f.fecha).getTime()) / (1000 * 60 * 60 * 24))

    return {
      ...f,
      total_pagado: totalPagado,
      saldo_pendiente: saldoPendiente,
      dias_antiguedad: diasAntiguedad,
      proveedor_nombre: (f.proveedores as unknown as { nombre: string })?.nombre
    }
  }))

  // Filtrar solo vencidas si se solicita
  let resultado = facturasConSaldo
  if (input.solo_vencidas) {
    resultado = facturasConSaldo.filter(f => f.dias_antiguedad > 30)
  }

  return {
    success: true,
    data: {
      facturas: resultado,
      cantidad: resultado.length,
      total_saldo: resultado.reduce((sum, f) => sum + f.saldo_pendiente, 0)
    }
  }
}

async function consultarSaldos(input: Record<string, unknown>) {
  let proveedorId = input.proveedor_id as number | undefined

  // Si se pasó nombre, buscar primero el ID
  if (!proveedorId && input.nombre_proveedor) {
    const { data: provs } = await supabase
      .from('proveedores')
      .select('id, nombre')
      .ilike('nombre', `%${input.nombre_proveedor}%`)
      .eq('activo', true)
      .limit(1)

    if (!provs || provs.length === 0) {
      return { success: false, error: `No se encontró proveedor con nombre "${input.nombre_proveedor}"` }
    }
    proveedorId = provs[0].id
  }

  if (!proveedorId) {
    return { success: false, error: 'Se requiere proveedor_id o nombre_proveedor' }
  }

  // Obtener datos del proveedor
  const { data: proveedor } = await supabase
    .from('proveedores')
    .select('id, nombre')
    .eq('id', proveedorId)
    .single()

  // Obtener facturas pendientes
  const { data: facturas } = await supabase
    .from('facturas')
    .select('id, monto_total, empresa')
    .eq('proveedor_id', proveedorId)
    .in('estado', ['pendiente', 'parcial'])

  if (!facturas) {
    return {
      success: true,
      data: {
        proveedor: proveedor?.nombre,
        saldo_vh: 0,
        saldo_vc: 0,
        saldo_total: 0,
        cantidad_facturas: 0
      }
    }
  }

  // Calcular saldos por empresa
  let saldoVH = 0
  let saldoVC = 0

  for (const f of facturas) {
    const { data: pagos } = await supabase
      .from('pagos')
      .select('monto')
      .eq('factura_id', f.id)

    const totalPagado = pagos?.reduce((sum, p) => sum + Number(p.monto), 0) || 0
    const saldo = f.monto_total - totalPagado

    if (f.empresa === 'VH') {
      saldoVH += saldo
    } else {
      saldoVC += saldo
    }
  }

  return {
    success: true,
    data: {
      proveedor: proveedor?.nombre,
      proveedor_id: proveedorId,
      saldo_vh: saldoVH,
      saldo_vc: saldoVC,
      saldo_total: saldoVH + saldoVC,
      cantidad_facturas: facturas.length
    }
  }
}

async function registrarPago(input: Record<string, unknown>, userId: number) {
  const facturaId = input.factura_id as number
  const monto = input.monto as number
  const medioPago = input.medio_pago as string

  // Verificar que la factura existe
  const { data: factura, error: facturaError } = await supabase
    .from('facturas')
    .select('*, proveedores(nombre)')
    .eq('id', facturaId)
    .single()

  if (facturaError || !factura) {
    return { success: false, error: `Factura ${facturaId} no encontrada` }
  }

  // Calcular saldo actual
  const { data: pagosExistentes } = await supabase
    .from('pagos')
    .select('monto')
    .eq('factura_id', facturaId)

  const totalPagado = pagosExistentes?.reduce((sum, p) => sum + Number(p.monto), 0) || 0
  const saldoActual = factura.monto_total - totalPagado

  if (monto > saldoActual) {
    return {
      success: false,
      error: `El monto ($${monto.toLocaleString()}) supera el saldo pendiente ($${saldoActual.toLocaleString()})`
    }
  }

  // Registrar el pago
  const { data: nuevoPago, error: pagoError } = await supabase
    .from('pagos')
    .insert({
      factura_id: facturaId,
      fecha: new Date().toISOString().split('T')[0],
      monto: monto,
      medio_pago: medioPago,
      numero_comprobante: input.numero_comprobante || null,
      observaciones: input.observaciones || `Pago registrado via asistente IA`
    })
    .select()
    .single()

  if (pagoError) {
    return { success: false, error: `Error al registrar pago: ${pagoError.message}` }
  }

  // Actualizar estado de la factura si corresponde
  const nuevoSaldo = saldoActual - monto
  const nuevoEstado = nuevoSaldo <= 0 ? 'pagada' : 'parcial'

  await supabase
    .from('facturas')
    .update({ estado: nuevoEstado })
    .eq('id', facturaId)

  // Registrar en auditoría
  await supabase.from('auditoria').insert({
    usuario_id: userId,
    accion: 'pago_registrado_ia',
    tabla_afectada: 'pagos',
    registro_id: nuevoPago.id,
    datos_nuevos: {
      factura_id: facturaId,
      monto,
      medio_pago: medioPago,
      proveedor: (factura.proveedores as { nombre: string })?.nombre
    },
    ip_address: 'asistente-ia'
  })

  return {
    success: true,
    data: {
      pago_id: nuevoPago.id,
      factura_numero: factura.numero,
      proveedor: (factura.proveedores as { nombre: string })?.nombre,
      monto_pagado: monto,
      saldo_restante: nuevoSaldo,
      estado_factura: nuevoEstado,
      mensaje: nuevoSaldo <= 0
        ? `Factura ${factura.numero} PAGADA completamente`
        : `Pago parcial registrado. Saldo restante: $${nuevoSaldo.toLocaleString()}`
    }
  }
}

async function buscarCbu(input: Record<string, unknown>) {
  let proveedorId = input.proveedor_id as number | undefined

  // Si se pasó nombre, buscar primero el ID
  if (!proveedorId && input.nombre_proveedor) {
    const { data: provs } = await supabase
      .from('proveedores')
      .select('id, nombre')
      .ilike('nombre', `%${input.nombre_proveedor}%`)
      .eq('activo', true)
      .limit(1)

    if (!provs || provs.length === 0) {
      return { success: false, error: `No se encontró proveedor con nombre "${input.nombre_proveedor}"` }
    }
    proveedorId = provs[0].id
  }

  if (!proveedorId) {
    return { success: false, error: 'Se requiere proveedor_id o nombre_proveedor' }
  }

  // Obtener proveedor
  const { data: proveedor } = await supabase
    .from('proveedores')
    .select('id, nombre')
    .eq('id', proveedorId)
    .single()

  // Obtener CBUs
  const { data: cbus, error } = await supabase
    .from('cbu_proveedores')
    .select('*')
    .eq('proveedor_id', proveedorId)
    .eq('activo', true)
    .order('principal', { ascending: false })

  if (error) return { success: false, error: error.message }

  if (!cbus || cbus.length === 0) {
    return {
      success: true,
      data: {
        proveedor: proveedor?.nombre,
        mensaje: 'Este proveedor no tiene CBU registrado',
        cbus: []
      }
    }
  }

  return {
    success: true,
    data: {
      proveedor: proveedor?.nombre,
      cbus: cbus.map(c => ({
        cbu: c.cbu,
        banco: c.banco,
        titular: c.titular,
        alias: c.alias,
        principal: c.principal
      }))
    }
  }
}

async function resumenGeneral() {
  // Obtener todas las facturas pendientes
  const { data: facturas } = await supabase
    .from('facturas')
    .select('id, monto_total, empresa, proveedor_id, fecha')
    .in('estado', ['pendiente', 'parcial'])

  if (!facturas) {
    return { success: true, data: { mensaje: 'No hay facturas pendientes' } }
  }

  // Calcular saldos
  let totalVH = 0
  let totalVC = 0
  let facturasVencidas = 0
  const proveedoresConSaldo = new Set()
  const hoy = new Date()

  for (const f of facturas) {
    const { data: pagos } = await supabase
      .from('pagos')
      .select('monto')
      .eq('factura_id', f.id)

    const totalPagado = pagos?.reduce((sum, p) => sum + Number(p.monto), 0) || 0
    const saldo = f.monto_total - totalPagado
    const dias = Math.floor((hoy.getTime() - new Date(f.fecha).getTime()) / (1000 * 60 * 60 * 24))

    if (saldo > 0) {
      proveedoresConSaldo.add(f.proveedor_id)
      if (f.empresa === 'VH') totalVH += saldo
      else totalVC += saldo
      if (dias > 30) facturasVencidas++
    }
  }

  return {
    success: true,
    data: {
      proveedores_con_saldo: proveedoresConSaldo.size,
      facturas_pendientes: facturas.length,
      facturas_vencidas: facturasVencidas,
      deuda_vh: totalVH,
      deuda_vc: totalVC,
      deuda_total: totalVH + totalVC
    }
  }
}

// System prompt para Claude
export const SYSTEM_PROMPT = `Sos el asistente virtual del Sistema Villalba, una aplicación para gestionar proveedores, facturas y pagos.

CONTEXTO DEL NEGOCIO:
- Villalba Hermanos SRL (VH) y Villalba Cristino (VC) son dos empresas relacionadas
- Comparten proveedores pero llevan contabilidades separadas
- Cada factura pertenece a VH o VC
- Los pagos se registran contra facturas específicas

TUS CAPACIDADES:
1. Consultar proveedores y sus datos
2. Ver facturas pendientes de pago
3. Consultar saldos adeudados
4. Registrar pagos (SIEMPRE confirmar antes)
5. Buscar CBUs para transferencias
6. Dar resúmenes generales

REGLAS IMPORTANTES:
- Cuando el usuario mencione un monto como "10M", interpretá como 10.000.000 de pesos
- "5 palos" = 5.000.000
- "500 lucas" = 500.000
- Antes de registrar un pago, SIEMPRE mostrá el resumen y pedí confirmación
- Si hay múltiples facturas, preguntá a cuál aplicar el pago
- Sé conciso pero amable, usá un tono informal pero profesional
- Si no encontrás un proveedor, sugerí alternativas similares
- Formateá los montos con separadores de miles

FORMATO DE RESPUESTAS:
- Usá bullets para listas
- Mostrá los montos claramente
- Si ejecutaste una acción, confirmá que se realizó
- Si hubo error, explicá claramente qué pasó`
