import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const JWT_SECRET = process.env.JWT_SECRET || 'villalba-proveedores-secret-key-2025'

// Verificar que el usuario sea admin
async function verifyAdmin(request: NextRequest) {
  const token = request.cookies.get('auth_token')?.value
  if (!token) return null

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number; nivel: string }
    if (decoded.nivel !== 'admin') return null
    return decoded
  } catch {
    return null
  }
}

// GET - Listar usuarios
export async function GET(request: NextRequest) {
  const admin = await verifyAdmin(request)
  if (!admin) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const { data, error } = await supabase
    .from('usuarios')
    .select('id, username, nombre_completo, nivel, activo, ultimo_login, created_at')
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ usuarios: data })
}

// POST - Crear usuario
export async function POST(request: NextRequest) {
  const admin = await verifyAdmin(request)
  if (!admin) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  try {
    const { username, password, nombre_completo, nivel } = await request.json()

    if (!username || !password || !nombre_completo || !nivel) {
      return NextResponse.json({ error: 'Todos los campos son requeridos' }, { status: 400 })
    }

    // Verificar que el usuario no exista
    const { data: existing } = await supabase
      .from('usuarios')
      .select('id')
      .eq('username', username.toLowerCase())
      .single()

    if (existing) {
      return NextResponse.json({ error: 'El usuario ya existe' }, { status: 400 })
    }

    // Hashear contraseña
    const password_hash = await bcrypt.hash(password, 10)

    // Crear usuario
    const { data, error } = await supabase
      .from('usuarios')
      .insert({
        username: username.toLowerCase(),
        password_hash,
        nombre_completo,
        nivel
      })
      .select('id, username, nombre_completo, nivel, activo, created_at')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Registrar en auditoría
    await supabase.from('auditoria').insert({
      usuario_id: admin.userId,
      accion: 'CREAR_USUARIO',
      tabla_afectada: 'usuarios',
      registro_id: data.id,
      datos_nuevos: { username: data.username, nombre: data.nombre_completo, nivel: data.nivel },
      ip_address: request.headers.get('x-forwarded-for') || 'unknown'
    })

    return NextResponse.json({ usuario: data })

  } catch (error) {
    console.error('Error creando usuario:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

// PUT - Actualizar usuario
export async function PUT(request: NextRequest) {
  const admin = await verifyAdmin(request)
  if (!admin) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  try {
    const { id, nombre_completo, nivel, activo, password } = await request.json()

    if (!id) {
      return NextResponse.json({ error: 'ID de usuario requerido' }, { status: 400 })
    }

    // Obtener datos actuales para auditoría
    const { data: anterior } = await supabase
      .from('usuarios')
      .select('*')
      .eq('id', id)
      .single()

    // Preparar actualización
    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (nombre_completo) updateData.nombre_completo = nombre_completo
    if (nivel) updateData.nivel = nivel
    if (typeof activo === 'boolean') updateData.activo = activo
    if (password) updateData.password_hash = await bcrypt.hash(password, 10)

    const { data, error } = await supabase
      .from('usuarios')
      .update(updateData)
      .eq('id', id)
      .select('id, username, nombre_completo, nivel, activo')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Registrar en auditoría
    await supabase.from('auditoria').insert({
      usuario_id: admin.userId,
      accion: 'ACTUALIZAR_USUARIO',
      tabla_afectada: 'usuarios',
      registro_id: id,
      datos_anteriores: anterior,
      datos_nuevos: updateData,
      ip_address: request.headers.get('x-forwarded-for') || 'unknown'
    })

    return NextResponse.json({ usuario: data })

  } catch (error) {
    console.error('Error actualizando usuario:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

// DELETE - Eliminar usuario
export async function DELETE(request: NextRequest) {
  const admin = await verifyAdmin(request)
  if (!admin) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID de usuario requerido' }, { status: 400 })
    }

    // No permitir eliminar al propio admin
    if (parseInt(id) === admin.userId) {
      return NextResponse.json({ error: 'No puedes eliminarte a ti mismo' }, { status: 400 })
    }

    // Obtener datos para auditoría
    const { data: usuario } = await supabase
      .from('usuarios')
      .select('*')
      .eq('id', id)
      .single()

    const { error } = await supabase
      .from('usuarios')
      .delete()
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Registrar en auditoría
    await supabase.from('auditoria').insert({
      usuario_id: admin.userId,
      accion: 'ELIMINAR_USUARIO',
      tabla_afectada: 'usuarios',
      registro_id: parseInt(id),
      datos_anteriores: usuario,
      ip_address: request.headers.get('x-forwarded-for') || 'unknown'
    })

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error eliminando usuario:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
