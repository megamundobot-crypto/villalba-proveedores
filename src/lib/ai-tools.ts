import { createClient } from '@supabase/supabase-js'
import type { Tool } from '@anthropic-ai/sdk/resources/messages'

// Supabase client con service role para operaciones del servidor
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Definición de herramientas para Claude
export const tools: Tool[] = [
  // ==================== CONSULTAS ====================
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
        },
        incluir_inactivos: {
          type: 'boolean',
          description: 'Si es true, incluye proveedores inactivos'
        }
      }
    }
  },
  {
    name: 'consultar_facturas',
    description: 'Lista facturas. Puede filtrar por proveedor, empresa (VH/VC) y estado. Retorna facturas con saldo calculado.',
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
        estado: {
          type: 'string',
          enum: ['pendiente', 'parcial', 'pagada', 'todos'],
          description: 'Estado de las facturas. Por defecto muestra pendientes y parciales.'
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
    description: 'Obtiene el saldo pendiente total de un proveedor, desglosado por empresa (VH y VC).',
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
          description: 'Nombre del proveedor'
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
  },
  {
    name: 'consultar_pagos',
    description: 'Lista los pagos realizados. Puede filtrar por factura, proveedor o rango de fechas.',
    input_schema: {
      type: 'object',
      properties: {
        factura_id: {
          type: 'number',
          description: 'ID de la factura'
        },
        proveedor_id: {
          type: 'number',
          description: 'ID del proveedor'
        },
        fecha_desde: {
          type: 'string',
          description: 'Fecha desde (YYYY-MM-DD)'
        },
        fecha_hasta: {
          type: 'string',
          description: 'Fecha hasta (YYYY-MM-DD)'
        }
      }
    }
  },

  // ==================== PROVEEDORES ====================
  {
    name: 'crear_proveedor',
    description: 'Crea un nuevo proveedor en el sistema.',
    input_schema: {
      type: 'object',
      properties: {
        nombre: {
          type: 'string',
          description: 'Nombre del proveedor (requerido)'
        },
        cuit: {
          type: 'string',
          description: 'CUIT del proveedor'
        },
        email: {
          type: 'string',
          description: 'Email de contacto'
        },
        telefono: {
          type: 'string',
          description: 'Teléfono de contacto'
        },
        direccion: {
          type: 'string',
          description: 'Dirección'
        }
      },
      required: ['nombre']
    }
  },
  {
    name: 'actualizar_proveedor',
    description: 'Actualiza los datos de un proveedor existente. Puede actualizar nombre, CUIT, email, teléfono, dirección y estado activo.',
    input_schema: {
      type: 'object',
      properties: {
        proveedor_id: {
          type: 'number',
          description: 'ID del proveedor a actualizar (requerido)'
        },
        nombre: {
          type: 'string',
          description: 'Nuevo nombre'
        },
        cuit: {
          type: 'string',
          description: 'Nuevo CUIT'
        },
        email: {
          type: 'string',
          description: 'Nuevo email'
        },
        telefono: {
          type: 'string',
          description: 'Nuevo teléfono'
        },
        direccion: {
          type: 'string',
          description: 'Nueva dirección'
        },
        activo: {
          type: 'boolean',
          description: 'Estado activo/inactivo'
        }
      },
      required: ['proveedor_id']
    }
  },
  {
    name: 'eliminar_proveedor',
    description: 'Elimina (desactiva) un proveedor del sistema. No elimina físicamente, solo marca como inactivo.',
    input_schema: {
      type: 'object',
      properties: {
        proveedor_id: {
          type: 'number',
          description: 'ID del proveedor a eliminar'
        },
        nombre_proveedor: {
          type: 'string',
          description: 'Nombre del proveedor (para confirmar)'
        }
      },
      required: ['proveedor_id']
    }
  },

  // ==================== CBU / DATOS BANCARIOS ====================
  {
    name: 'agregar_cbu',
    description: 'Agrega un CBU/datos bancarios a un proveedor.',
    input_schema: {
      type: 'object',
      properties: {
        proveedor_id: {
          type: 'number',
          description: 'ID del proveedor'
        },
        nombre_proveedor: {
          type: 'string',
          description: 'Nombre del proveedor (si no se tiene el ID)'
        },
        cbu: {
          type: 'string',
          description: 'Número de CBU (22 dígitos)'
        },
        banco: {
          type: 'string',
          description: 'Nombre del banco'
        },
        titular: {
          type: 'string',
          description: 'Titular de la cuenta'
        },
        alias: {
          type: 'string',
          description: 'Alias de la cuenta'
        },
        cuit_titular: {
          type: 'string',
          description: 'CUIT del titular'
        },
        principal: {
          type: 'boolean',
          description: 'Si es la cuenta principal del proveedor'
        }
      },
      required: ['cbu']
    }
  },
  {
    name: 'actualizar_cbu',
    description: 'Actualiza un CBU existente de un proveedor.',
    input_schema: {
      type: 'object',
      properties: {
        cbu_id: {
          type: 'number',
          description: 'ID del registro CBU a actualizar'
        },
        cbu: {
          type: 'string',
          description: 'Nuevo CBU'
        },
        banco: {
          type: 'string',
          description: 'Nuevo banco'
        },
        titular: {
          type: 'string',
          description: 'Nuevo titular'
        },
        alias: {
          type: 'string',
          description: 'Nuevo alias'
        },
        principal: {
          type: 'boolean',
          description: 'Si es la cuenta principal'
        },
        activo: {
          type: 'boolean',
          description: 'Estado activo/inactivo'
        }
      },
      required: ['cbu_id']
    }
  },
  {
    name: 'eliminar_cbu',
    description: 'Elimina (desactiva) un CBU de un proveedor.',
    input_schema: {
      type: 'object',
      properties: {
        cbu_id: {
          type: 'number',
          description: 'ID del registro CBU a eliminar'
        }
      },
      required: ['cbu_id']
    }
  },

  // ==================== FACTURAS ====================
  {
    name: 'crear_factura',
    description: 'Crea una nueva factura en el sistema.',
    input_schema: {
      type: 'object',
      properties: {
        proveedor_id: {
          type: 'number',
          description: 'ID del proveedor'
        },
        nombre_proveedor: {
          type: 'string',
          description: 'Nombre del proveedor (si no se tiene el ID)'
        },
        numero: {
          type: 'string',
          description: 'Número de factura'
        },
        fecha: {
          type: 'string',
          description: 'Fecha de la factura (YYYY-MM-DD). Por defecto es hoy.'
        },
        monto_total: {
          type: 'number',
          description: 'Monto total de la factura'
        },
        empresa: {
          type: 'string',
          enum: ['VH', 'VC'],
          description: 'Empresa: VH (Villalba Hermanos) o VC (Villalba Cristino)'
        },
        descripcion: {
          type: 'string',
          description: 'Descripción o detalle de la factura'
        }
      },
      required: ['numero', 'monto_total', 'empresa']
    }
  },
  {
    name: 'actualizar_factura',
    description: 'Actualiza una factura existente.',
    input_schema: {
      type: 'object',
      properties: {
        factura_id: {
          type: 'number',
          description: 'ID de la factura a actualizar'
        },
        numero: {
          type: 'string',
          description: 'Nuevo número'
        },
        fecha: {
          type: 'string',
          description: 'Nueva fecha'
        },
        monto_total: {
          type: 'number',
          description: 'Nuevo monto total'
        },
        empresa: {
          type: 'string',
          enum: ['VH', 'VC'],
          description: 'Nueva empresa'
        },
        estado: {
          type: 'string',
          enum: ['pendiente', 'parcial', 'pagada'],
          description: 'Nuevo estado'
        },
        descripcion: {
          type: 'string',
          description: 'Nueva descripción'
        }
      },
      required: ['factura_id']
    }
  },
  {
    name: 'eliminar_factura',
    description: 'Elimina una factura del sistema. CUIDADO: También elimina los pagos asociados.',
    input_schema: {
      type: 'object',
      properties: {
        factura_id: {
          type: 'number',
          description: 'ID de la factura a eliminar'
        }
      },
      required: ['factura_id']
    }
  },

  // ==================== PAGOS ====================
  {
    name: 'registrar_pago',
    description: 'Registra un pago a una factura específica.',
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
        fecha: {
          type: 'string',
          description: 'Fecha del pago (YYYY-MM-DD). Por defecto es hoy.'
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
    name: 'actualizar_pago',
    description: 'Actualiza un pago existente.',
    input_schema: {
      type: 'object',
      properties: {
        pago_id: {
          type: 'number',
          description: 'ID del pago a actualizar'
        },
        monto: {
          type: 'number',
          description: 'Nuevo monto'
        },
        medio_pago: {
          type: 'string',
          enum: ['transferencia', 'cheque', 'efectivo', 'otro'],
          description: 'Nuevo medio de pago'
        },
        fecha: {
          type: 'string',
          description: 'Nueva fecha'
        },
        numero_comprobante: {
          type: 'string',
          description: 'Nuevo número de comprobante'
        },
        observaciones: {
          type: 'string',
          description: 'Nuevas observaciones'
        }
      },
      required: ['pago_id']
    }
  },
  {
    name: 'eliminar_pago',
    description: 'Elimina un pago del sistema. La factura volverá a mostrar el saldo pendiente.',
    input_schema: {
      type: 'object',
      properties: {
        pago_id: {
          type: 'number',
          description: 'ID del pago a eliminar'
        }
      },
      required: ['pago_id']
    }
  },

  // ==================== OPERACIONES MASIVAS ====================
  {
    name: 'pago_masivo_proveedor',
    description: 'Registra un pago que se distribuye automáticamente entre las facturas pendientes de un proveedor, empezando por las más antiguas.',
    input_schema: {
      type: 'object',
      properties: {
        proveedor_id: {
          type: 'number',
          description: 'ID del proveedor'
        },
        nombre_proveedor: {
          type: 'string',
          description: 'Nombre del proveedor'
        },
        monto_total: {
          type: 'number',
          description: 'Monto total a distribuir'
        },
        medio_pago: {
          type: 'string',
          enum: ['transferencia', 'cheque', 'efectivo', 'otro'],
          description: 'Medio de pago'
        },
        empresa: {
          type: 'string',
          enum: ['VH', 'VC'],
          description: 'Filtrar solo facturas de esta empresa'
        }
      },
      required: ['monto_total', 'medio_pago']
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
      // Consultas
      case 'consultar_proveedores':
        return await consultarProveedores(toolInput)
      case 'consultar_facturas':
        return await consultarFacturas(toolInput)
      case 'consultar_saldos':
        return await consultarSaldos(toolInput)
      case 'buscar_cbu':
        return await buscarCbu(toolInput)
      case 'resumen_general':
        return await resumenGeneral()
      case 'consultar_pagos':
        return await consultarPagos(toolInput)

      // Proveedores
      case 'crear_proveedor':
        return await crearProveedor(toolInput, userId)
      case 'actualizar_proveedor':
        return await actualizarProveedor(toolInput, userId)
      case 'eliminar_proveedor':
        return await eliminarProveedor(toolInput, userId)

      // CBU
      case 'agregar_cbu':
        return await agregarCbu(toolInput, userId)
      case 'actualizar_cbu':
        return await actualizarCbu(toolInput, userId)
      case 'eliminar_cbu':
        return await eliminarCbu(toolInput, userId)

      // Facturas
      case 'crear_factura':
        return await crearFactura(toolInput, userId)
      case 'actualizar_factura':
        return await actualizarFactura(toolInput, userId)
      case 'eliminar_factura':
        return await eliminarFactura(toolInput, userId)

      // Pagos
      case 'registrar_pago':
        return await registrarPago(toolInput, userId)
      case 'actualizar_pago':
        return await actualizarPago(toolInput, userId)
      case 'eliminar_pago':
        return await eliminarPago(toolInput, userId)
      case 'pago_masivo_proveedor':
        return await pagoMasivoProveedor(toolInput, userId)

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

// ==================== IMPLEMENTACIÓN DE CONSULTAS ====================

async function consultarProveedores(input: Record<string, unknown>) {
  let query = supabase
    .from('proveedores')
    .select('id, nombre, cuit, email, telefono, direccion, activo')

  if (!input.incluir_inactivos) {
    query = query.eq('activo', true)
  }

  if (input.id) {
    query = query.eq('id', input.id)
  } else if (input.nombre) {
    query = query.ilike('nombre', `%${input.nombre}%`)
  }

  const { data, error } = await query.order('nombre').limit(20)

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
      descripcion,
      proveedor_id,
      proveedores(nombre)
    `)

  // Filtrar por estado
  if (input.estado && input.estado !== 'todos') {
    query = query.eq('estado', input.estado)
  } else if (!input.estado) {
    query = query.in('estado', ['pendiente', 'parcial'])
  }

  if (input.proveedor_id) {
    query = query.eq('proveedor_id', input.proveedor_id)
  }
  if (input.empresa) {
    query = query.eq('empresa', input.empresa)
  }

  const { data: facturas, error } = await query.order('fecha', { ascending: true }).limit(50)

  if (error) return { success: false, error: error.message }

  // Calcular saldo pendiente
  const hoy = new Date()
  const facturasConSaldo = await Promise.all((facturas || []).map(async (f) => {
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

  const { data: proveedor } = await supabase
    .from('proveedores')
    .select('id, nombre')
    .eq('id', proveedorId)
    .single()

  const { data: facturas } = await supabase
    .from('facturas')
    .select('id, monto_total, empresa')
    .eq('proveedor_id', proveedorId)
    .in('estado', ['pendiente', 'parcial'])

  if (!facturas || facturas.length === 0) {
    return {
      success: true,
      data: {
        proveedor: proveedor?.nombre,
        proveedor_id: proveedorId,
        saldo_vh: 0,
        saldo_vc: 0,
        saldo_total: 0,
        cantidad_facturas: 0
      }
    }
  }

  let saldoVH = 0
  let saldoVC = 0

  for (const f of facturas) {
    const { data: pagos } = await supabase
      .from('pagos')
      .select('monto')
      .eq('factura_id', f.id)

    const totalPagado = pagos?.reduce((sum, p) => sum + Number(p.monto), 0) || 0
    const saldo = f.monto_total - totalPagado

    if (f.empresa === 'VH') saldoVH += saldo
    else saldoVC += saldo
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

async function buscarCbu(input: Record<string, unknown>) {
  let proveedorId = input.proveedor_id as number | undefined

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

  const { data: proveedor } = await supabase
    .from('proveedores')
    .select('id, nombre')
    .eq('id', proveedorId)
    .single()

  const { data: cbus, error } = await supabase
    .from('cbu_proveedores')
    .select('*')
    .eq('proveedor_id', proveedorId)
    .eq('activo', true)
    .order('principal', { ascending: false })

  if (error) return { success: false, error: error.message }

  return {
    success: true,
    data: {
      proveedor: proveedor?.nombre,
      proveedor_id: proveedorId,
      cbus: cbus?.map(c => ({
        id: c.id,
        cbu: c.cbu,
        banco: c.banco,
        titular: c.titular,
        alias: c.alias,
        principal: c.principal
      })) || [],
      tiene_cbu: cbus && cbus.length > 0
    }
  }
}

async function resumenGeneral() {
  const { data: facturas } = await supabase
    .from('facturas')
    .select('id, monto_total, empresa, proveedor_id, fecha')
    .in('estado', ['pendiente', 'parcial'])

  if (!facturas) {
    return { success: true, data: { mensaje: 'No hay facturas pendientes' } }
  }

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

async function consultarPagos(input: Record<string, unknown>) {
  let query = supabase
    .from('pagos')
    .select(`
      id,
      fecha,
      monto,
      medio_pago,
      numero_comprobante,
      observaciones,
      factura_id,
      facturas(numero, empresa, proveedores(nombre))
    `)

  if (input.factura_id) {
    query = query.eq('factura_id', input.factura_id)
  }
  if (input.fecha_desde) {
    query = query.gte('fecha', input.fecha_desde)
  }
  if (input.fecha_hasta) {
    query = query.lte('fecha', input.fecha_hasta)
  }

  const { data: pagos, error } = await query.order('fecha', { ascending: false }).limit(50)

  if (error) return { success: false, error: error.message }

  // Filtrar por proveedor si se especificó
  let resultado = pagos || []
  if (input.proveedor_id) {
    resultado = resultado.filter((p) => {
      const factura = p.facturas as unknown as { proveedores: { nombre: string } }
      return factura?.proveedores
    })
  }

  return {
    success: true,
    data: {
      pagos: resultado.map(p => {
        const factura = p.facturas as unknown as { numero: string; empresa: string; proveedores: { nombre: string } }
        return {
          id: p.id,
          fecha: p.fecha,
          monto: p.monto,
          medio_pago: p.medio_pago,
          numero_comprobante: p.numero_comprobante,
          factura_numero: factura?.numero,
          empresa: factura?.empresa,
          proveedor: factura?.proveedores?.nombre
        }
      }),
      cantidad: resultado.length,
      total: resultado.reduce((sum, p) => sum + Number(p.monto), 0)
    }
  }
}

// ==================== IMPLEMENTACIÓN DE PROVEEDORES ====================

async function crearProveedor(input: Record<string, unknown>, userId: number) {
  const { data: nuevo, error } = await supabase
    .from('proveedores')
    .insert({
      nombre: input.nombre,
      cuit: input.cuit || null,
      email: input.email || null,
      telefono: input.telefono || null,
      direccion: input.direccion || null,
      activo: true
    })
    .select()
    .single()

  if (error) return { success: false, error: error.message }

  // Auditoría
  await supabase.from('auditoria').insert({
    usuario_id: userId,
    accion: 'crear_proveedor_ia',
    tabla_afectada: 'proveedores',
    registro_id: nuevo.id,
    datos_nuevos: nuevo,
    ip_address: 'asistente-ia'
  })

  return {
    success: true,
    data: {
      proveedor: nuevo,
      mensaje: `Proveedor "${nuevo.nombre}" creado con ID ${nuevo.id}`
    }
  }
}

async function actualizarProveedor(input: Record<string, unknown>, userId: number) {
  const proveedorId = input.proveedor_id as number

  // Obtener datos actuales
  const { data: actual } = await supabase
    .from('proveedores')
    .select('*')
    .eq('id', proveedorId)
    .single()

  if (!actual) {
    return { success: false, error: `Proveedor ID ${proveedorId} no encontrado` }
  }

  // Preparar actualización
  const updates: Record<string, unknown> = {}
  if (input.nombre !== undefined) updates.nombre = input.nombre
  if (input.cuit !== undefined) updates.cuit = input.cuit
  if (input.email !== undefined) updates.email = input.email
  if (input.telefono !== undefined) updates.telefono = input.telefono
  if (input.direccion !== undefined) updates.direccion = input.direccion
  if (input.activo !== undefined) updates.activo = input.activo

  if (Object.keys(updates).length === 0) {
    return { success: false, error: 'No se especificaron campos para actualizar' }
  }

  const { data: actualizado, error } = await supabase
    .from('proveedores')
    .update(updates)
    .eq('id', proveedorId)
    .select()
    .single()

  if (error) return { success: false, error: error.message }

  // Auditoría
  await supabase.from('auditoria').insert({
    usuario_id: userId,
    accion: 'actualizar_proveedor_ia',
    tabla_afectada: 'proveedores',
    registro_id: proveedorId,
    datos_anteriores: actual,
    datos_nuevos: actualizado,
    ip_address: 'asistente-ia'
  })

  return {
    success: true,
    data: {
      proveedor: actualizado,
      cambios: updates,
      mensaje: `Proveedor "${actualizado.nombre}" actualizado correctamente`
    }
  }
}

async function eliminarProveedor(input: Record<string, unknown>, userId: number) {
  const proveedorId = input.proveedor_id as number

  const { data: proveedor } = await supabase
    .from('proveedores')
    .select('*')
    .eq('id', proveedorId)
    .single()

  if (!proveedor) {
    return { success: false, error: `Proveedor ID ${proveedorId} no encontrado` }
  }

  // Solo desactivar, no eliminar físicamente
  const { error } = await supabase
    .from('proveedores')
    .update({ activo: false })
    .eq('id', proveedorId)

  if (error) return { success: false, error: error.message }

  // Auditoría
  await supabase.from('auditoria').insert({
    usuario_id: userId,
    accion: 'eliminar_proveedor_ia',
    tabla_afectada: 'proveedores',
    registro_id: proveedorId,
    datos_anteriores: proveedor,
    ip_address: 'asistente-ia'
  })

  return {
    success: true,
    data: {
      mensaje: `Proveedor "${proveedor.nombre}" desactivado correctamente`
    }
  }
}

// ==================== IMPLEMENTACIÓN DE CBU ====================

async function agregarCbu(input: Record<string, unknown>, userId: number) {
  let proveedorId = input.proveedor_id as number | undefined

  // Buscar proveedor por nombre si no se tiene ID
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

  // Verificar proveedor existe
  const { data: proveedor } = await supabase
    .from('proveedores')
    .select('id, nombre')
    .eq('id', proveedorId)
    .single()

  if (!proveedor) {
    return { success: false, error: `Proveedor ID ${proveedorId} no encontrado` }
  }

  // Si es principal, desmarcar otros como no principal
  if (input.principal) {
    await supabase
      .from('cbu_proveedores')
      .update({ principal: false })
      .eq('proveedor_id', proveedorId)
  }

  const { data: nuevoCbu, error } = await supabase
    .from('cbu_proveedores')
    .insert({
      proveedor_id: proveedorId,
      cbu: input.cbu,
      banco: input.banco || null,
      titular: input.titular || null,
      alias: input.alias || null,
      cuit_titular: input.cuit_titular || null,
      principal: input.principal || false,
      activo: true
    })
    .select()
    .single()

  if (error) return { success: false, error: error.message }

  // Auditoría
  await supabase.from('auditoria').insert({
    usuario_id: userId,
    accion: 'agregar_cbu_ia',
    tabla_afectada: 'cbu_proveedores',
    registro_id: nuevoCbu.id,
    datos_nuevos: { ...nuevoCbu, proveedor_nombre: proveedor.nombre },
    ip_address: 'asistente-ia'
  })

  return {
    success: true,
    data: {
      cbu: nuevoCbu,
      proveedor: proveedor.nombre,
      mensaje: `CBU agregado a "${proveedor.nombre}"`
    }
  }
}

async function actualizarCbu(input: Record<string, unknown>, userId: number) {
  const cbuId = input.cbu_id as number

  const { data: actual } = await supabase
    .from('cbu_proveedores')
    .select('*, proveedores(nombre)')
    .eq('id', cbuId)
    .single()

  if (!actual) {
    return { success: false, error: `CBU ID ${cbuId} no encontrado` }
  }

  const updates: Record<string, unknown> = {}
  if (input.cbu !== undefined) updates.cbu = input.cbu
  if (input.banco !== undefined) updates.banco = input.banco
  if (input.titular !== undefined) updates.titular = input.titular
  if (input.alias !== undefined) updates.alias = input.alias
  if (input.principal !== undefined) updates.principal = input.principal
  if (input.activo !== undefined) updates.activo = input.activo

  if (Object.keys(updates).length === 0) {
    return { success: false, error: 'No se especificaron campos para actualizar' }
  }

  // Si se marca como principal, desmarcar otros
  if (updates.principal) {
    await supabase
      .from('cbu_proveedores')
      .update({ principal: false })
      .eq('proveedor_id', actual.proveedor_id)
      .neq('id', cbuId)
  }

  const { data: actualizado, error } = await supabase
    .from('cbu_proveedores')
    .update(updates)
    .eq('id', cbuId)
    .select()
    .single()

  if (error) return { success: false, error: error.message }

  await supabase.from('auditoria').insert({
    usuario_id: userId,
    accion: 'actualizar_cbu_ia',
    tabla_afectada: 'cbu_proveedores',
    registro_id: cbuId,
    datos_anteriores: actual,
    datos_nuevos: actualizado,
    ip_address: 'asistente-ia'
  })

  return {
    success: true,
    data: {
      cbu: actualizado,
      mensaje: `CBU actualizado correctamente`
    }
  }
}

async function eliminarCbu(input: Record<string, unknown>, userId: number) {
  const cbuId = input.cbu_id as number

  const { data: cbu } = await supabase
    .from('cbu_proveedores')
    .select('*, proveedores(nombre)')
    .eq('id', cbuId)
    .single()

  if (!cbu) {
    return { success: false, error: `CBU ID ${cbuId} no encontrado` }
  }

  const { error } = await supabase
    .from('cbu_proveedores')
    .update({ activo: false })
    .eq('id', cbuId)

  if (error) return { success: false, error: error.message }

  await supabase.from('auditoria').insert({
    usuario_id: userId,
    accion: 'eliminar_cbu_ia',
    tabla_afectada: 'cbu_proveedores',
    registro_id: cbuId,
    datos_anteriores: cbu,
    ip_address: 'asistente-ia'
  })

  return {
    success: true,
    data: {
      mensaje: `CBU eliminado correctamente`
    }
  }
}

// ==================== IMPLEMENTACIÓN DE FACTURAS ====================

async function crearFactura(input: Record<string, unknown>, userId: number) {
  let proveedorId = input.proveedor_id as number | undefined

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

  const { data: proveedor } = await supabase
    .from('proveedores')
    .select('id, nombre')
    .eq('id', proveedorId)
    .single()

  if (!proveedor) {
    return { success: false, error: `Proveedor ID ${proveedorId} no encontrado` }
  }

  const { data: nueva, error } = await supabase
    .from('facturas')
    .insert({
      proveedor_id: proveedorId,
      numero: input.numero,
      fecha: input.fecha || new Date().toISOString().split('T')[0],
      monto_total: input.monto_total,
      empresa: input.empresa,
      descripcion: input.descripcion || null,
      estado: 'pendiente'
    })
    .select()
    .single()

  if (error) return { success: false, error: error.message }

  await supabase.from('auditoria').insert({
    usuario_id: userId,
    accion: 'crear_factura_ia',
    tabla_afectada: 'facturas',
    registro_id: nueva.id,
    datos_nuevos: { ...nueva, proveedor_nombre: proveedor.nombre },
    ip_address: 'asistente-ia'
  })

  return {
    success: true,
    data: {
      factura: nueva,
      proveedor: proveedor.nombre,
      mensaje: `Factura ${nueva.numero} creada para "${proveedor.nombre}" por $${Number(input.monto_total).toLocaleString()}`
    }
  }
}

async function actualizarFactura(input: Record<string, unknown>, userId: number) {
  const facturaId = input.factura_id as number

  const { data: actual } = await supabase
    .from('facturas')
    .select('*, proveedores(nombre)')
    .eq('id', facturaId)
    .single()

  if (!actual) {
    return { success: false, error: `Factura ID ${facturaId} no encontrada` }
  }

  const updates: Record<string, unknown> = {}
  if (input.numero !== undefined) updates.numero = input.numero
  if (input.fecha !== undefined) updates.fecha = input.fecha
  if (input.monto_total !== undefined) updates.monto_total = input.monto_total
  if (input.empresa !== undefined) updates.empresa = input.empresa
  if (input.estado !== undefined) updates.estado = input.estado
  if (input.descripcion !== undefined) updates.descripcion = input.descripcion

  if (Object.keys(updates).length === 0) {
    return { success: false, error: 'No se especificaron campos para actualizar' }
  }

  const { data: actualizada, error } = await supabase
    .from('facturas')
    .update(updates)
    .eq('id', facturaId)
    .select()
    .single()

  if (error) return { success: false, error: error.message }

  await supabase.from('auditoria').insert({
    usuario_id: userId,
    accion: 'actualizar_factura_ia',
    tabla_afectada: 'facturas',
    registro_id: facturaId,
    datos_anteriores: actual,
    datos_nuevos: actualizada,
    ip_address: 'asistente-ia'
  })

  return {
    success: true,
    data: {
      factura: actualizada,
      cambios: updates,
      mensaje: `Factura ${actualizada.numero} actualizada correctamente`
    }
  }
}

async function eliminarFactura(input: Record<string, unknown>, userId: number) {
  const facturaId = input.factura_id as number

  const { data: factura } = await supabase
    .from('facturas')
    .select('*, proveedores(nombre)')
    .eq('id', facturaId)
    .single()

  if (!factura) {
    return { success: false, error: `Factura ID ${facturaId} no encontrada` }
  }

  // Primero eliminar pagos asociados
  await supabase
    .from('pagos')
    .delete()
    .eq('factura_id', facturaId)

  // Luego eliminar la factura
  const { error } = await supabase
    .from('facturas')
    .delete()
    .eq('id', facturaId)

  if (error) return { success: false, error: error.message }

  await supabase.from('auditoria').insert({
    usuario_id: userId,
    accion: 'eliminar_factura_ia',
    tabla_afectada: 'facturas',
    registro_id: facturaId,
    datos_anteriores: factura,
    ip_address: 'asistente-ia'
  })

  return {
    success: true,
    data: {
      mensaje: `Factura ${factura.numero} eliminada correctamente`
    }
  }
}

// ==================== IMPLEMENTACIÓN DE PAGOS ====================

async function registrarPago(input: Record<string, unknown>, userId: number) {
  const facturaId = input.factura_id as number
  const monto = input.monto as number
  const medioPago = input.medio_pago as string

  const { data: factura, error: facturaError } = await supabase
    .from('facturas')
    .select('*, proveedores(nombre)')
    .eq('id', facturaId)
    .single()

  if (facturaError || !factura) {
    return { success: false, error: `Factura ${facturaId} no encontrada` }
  }

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

  const { data: nuevoPago, error: pagoError } = await supabase
    .from('pagos')
    .insert({
      factura_id: facturaId,
      fecha: input.fecha || new Date().toISOString().split('T')[0],
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

  const nuevoSaldo = saldoActual - monto
  const nuevoEstado = nuevoSaldo <= 0 ? 'pagada' : 'parcial'

  await supabase
    .from('facturas')
    .update({ estado: nuevoEstado })
    .eq('id', facturaId)

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

async function actualizarPago(input: Record<string, unknown>, userId: number) {
  const pagoId = input.pago_id as number

  const { data: actual } = await supabase
    .from('pagos')
    .select('*, facturas(numero, proveedores(nombre))')
    .eq('id', pagoId)
    .single()

  if (!actual) {
    return { success: false, error: `Pago ID ${pagoId} no encontrado` }
  }

  const updates: Record<string, unknown> = {}
  if (input.monto !== undefined) updates.monto = input.monto
  if (input.medio_pago !== undefined) updates.medio_pago = input.medio_pago
  if (input.fecha !== undefined) updates.fecha = input.fecha
  if (input.numero_comprobante !== undefined) updates.numero_comprobante = input.numero_comprobante
  if (input.observaciones !== undefined) updates.observaciones = input.observaciones

  if (Object.keys(updates).length === 0) {
    return { success: false, error: 'No se especificaron campos para actualizar' }
  }

  const { data: actualizado, error } = await supabase
    .from('pagos')
    .update(updates)
    .eq('id', pagoId)
    .select()
    .single()

  if (error) return { success: false, error: error.message }

  await supabase.from('auditoria').insert({
    usuario_id: userId,
    accion: 'actualizar_pago_ia',
    tabla_afectada: 'pagos',
    registro_id: pagoId,
    datos_anteriores: actual,
    datos_nuevos: actualizado,
    ip_address: 'asistente-ia'
  })

  // Recalcular estado de factura
  const { data: factura } = await supabase
    .from('facturas')
    .select('id, monto_total')
    .eq('id', actual.factura_id)
    .single()

  if (factura) {
    const { data: todosPagos } = await supabase
      .from('pagos')
      .select('monto')
      .eq('factura_id', factura.id)

    const totalPagado = todosPagos?.reduce((sum, p) => sum + Number(p.monto), 0) || 0
    const nuevoEstado = totalPagado >= factura.monto_total ? 'pagada' : totalPagado > 0 ? 'parcial' : 'pendiente'

    await supabase
      .from('facturas')
      .update({ estado: nuevoEstado })
      .eq('id', factura.id)
  }

  return {
    success: true,
    data: {
      pago: actualizado,
      mensaje: `Pago actualizado correctamente`
    }
  }
}

async function eliminarPago(input: Record<string, unknown>, userId: number) {
  const pagoId = input.pago_id as number

  const { data: pago } = await supabase
    .from('pagos')
    .select('*, facturas(id, numero, monto_total, proveedores(nombre))')
    .eq('id', pagoId)
    .single()

  if (!pago) {
    return { success: false, error: `Pago ID ${pagoId} no encontrado` }
  }

  const { error } = await supabase
    .from('pagos')
    .delete()
    .eq('id', pagoId)

  if (error) return { success: false, error: error.message }

  // Recalcular estado de factura
  const factura = pago.facturas as unknown as { id: number; numero: string; monto_total: number }
  if (factura) {
    const { data: pagosRestantes } = await supabase
      .from('pagos')
      .select('monto')
      .eq('factura_id', factura.id)

    const totalPagado = pagosRestantes?.reduce((sum, p) => sum + Number(p.monto), 0) || 0
    const nuevoEstado = totalPagado >= factura.monto_total ? 'pagada' : totalPagado > 0 ? 'parcial' : 'pendiente'

    await supabase
      .from('facturas')
      .update({ estado: nuevoEstado })
      .eq('id', factura.id)
  }

  await supabase.from('auditoria').insert({
    usuario_id: userId,
    accion: 'eliminar_pago_ia',
    tabla_afectada: 'pagos',
    registro_id: pagoId,
    datos_anteriores: pago,
    ip_address: 'asistente-ia'
  })

  return {
    success: true,
    data: {
      mensaje: `Pago eliminado correctamente. La factura vuelve a mostrar el saldo pendiente.`
    }
  }
}

async function pagoMasivoProveedor(input: Record<string, unknown>, userId: number) {
  let proveedorId = input.proveedor_id as number | undefined
  const montoTotal = input.monto_total as number
  const medioPago = input.medio_pago as string

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

  const { data: proveedor } = await supabase
    .from('proveedores')
    .select('id, nombre')
    .eq('id', proveedorId)
    .single()

  // Obtener facturas pendientes ordenadas por fecha (antiguas primero)
  let query = supabase
    .from('facturas')
    .select('id, numero, monto_total, empresa')
    .eq('proveedor_id', proveedorId)
    .in('estado', ['pendiente', 'parcial'])
    .order('fecha', { ascending: true })

  if (input.empresa) {
    query = query.eq('empresa', input.empresa)
  }

  const { data: facturas } = await query

  if (!facturas || facturas.length === 0) {
    return { success: false, error: 'No hay facturas pendientes para este proveedor' }
  }

  // Calcular saldos de cada factura
  const facturasConSaldo = await Promise.all(facturas.map(async (f) => {
    const { data: pagos } = await supabase
      .from('pagos')
      .select('monto')
      .eq('factura_id', f.id)

    const totalPagado = pagos?.reduce((sum, p) => sum + Number(p.monto), 0) || 0
    return {
      ...f,
      saldo: f.monto_total - totalPagado
    }
  }))

  // Distribuir el pago
  let montoRestante = montoTotal
  const pagosRealizados: Array<{ factura: string; monto: number; saldo_restante: number }> = []

  for (const factura of facturasConSaldo) {
    if (montoRestante <= 0 || factura.saldo <= 0) continue

    const montoAPagar = Math.min(montoRestante, factura.saldo)

    const { data: nuevoPago, error } = await supabase
      .from('pagos')
      .insert({
        factura_id: factura.id,
        fecha: new Date().toISOString().split('T')[0],
        monto: montoAPagar,
        medio_pago: medioPago,
        observaciones: `Pago masivo via asistente IA`
      })
      .select()
      .single()

    if (error) continue

    const nuevoSaldo = factura.saldo - montoAPagar
    const nuevoEstado = nuevoSaldo <= 0 ? 'pagada' : 'parcial'

    await supabase
      .from('facturas')
      .update({ estado: nuevoEstado })
      .eq('id', factura.id)

    pagosRealizados.push({
      factura: factura.numero,
      monto: montoAPagar,
      saldo_restante: nuevoSaldo
    })

    montoRestante -= montoAPagar

    // Auditoría
    await supabase.from('auditoria').insert({
      usuario_id: userId,
      accion: 'pago_masivo_ia',
      tabla_afectada: 'pagos',
      registro_id: nuevoPago.id,
      datos_nuevos: { factura_id: factura.id, monto: montoAPagar, proveedor: proveedor?.nombre },
      ip_address: 'asistente-ia'
    })
  }

  return {
    success: true,
    data: {
      proveedor: proveedor?.nombre,
      monto_distribuido: montoTotal - montoRestante,
      monto_sobrante: montoRestante,
      pagos_realizados: pagosRealizados,
      cantidad_facturas_afectadas: pagosRealizados.length,
      mensaje: montoRestante > 0
        ? `Se distribuyeron $${(montoTotal - montoRestante).toLocaleString()} en ${pagosRealizados.length} facturas. Sobraron $${montoRestante.toLocaleString()}`
        : `Se distribuyeron $${montoTotal.toLocaleString()} en ${pagosRealizados.length} facturas`
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

TUS CAPACIDADES COMPLETAS:

📋 CONSULTAS:
- Consultar proveedores y sus datos
- Ver facturas (pendientes, parciales, pagadas)
- Consultar saldos adeudados
- Buscar CBUs para transferencias
- Ver historial de pagos
- Resúmenes generales

👥 PROVEEDORES:
- Crear nuevos proveedores
- Actualizar datos de proveedores
- Eliminar (desactivar) proveedores

🏦 CBU / DATOS BANCARIOS:
- Agregar CBUs a proveedores
- Actualizar CBUs existentes
- Eliminar CBUs

📄 FACTURAS:
- Crear nuevas facturas
- Actualizar facturas existentes
- Eliminar facturas

💰 PAGOS:
- Registrar pagos individuales
- Actualizar pagos
- Eliminar pagos
- Pagos masivos (distribuir automáticamente entre facturas)

REGLAS IMPORTANTES:
- "10M" = 10.000.000 pesos
- "5 palos" = 5.000.000
- "500 lucas" = 500.000
- Antes de acciones importantes (crear, eliminar), confirmá los datos con el usuario
- Si buscás un proveedor y no lo encontrás exacto, mostrá alternativas similares
- Formateá los montos con separadores de miles
- Sé conciso pero amable, usá un tono informal pero profesional

FORMATO DE RESPUESTAS:
- Usá bullets y tablas cuando sea apropiado
- Confirmá siempre cuando ejecutes una acción
- Si hubo error, explicá claramente qué pasó`
