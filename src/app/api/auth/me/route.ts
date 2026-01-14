import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import jwt from 'jsonwebtoken'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const JWT_SECRET = process.env.JWT_SECRET || 'villalba-proveedores-secret-key-2025'

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth_token')?.value

    if (!token) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      )
    }

    // Verificar token
    let decoded: { userId: number; username: string; nombre: string; nivel: string }
    try {
      decoded = jwt.verify(token, JWT_SECRET) as typeof decoded
    } catch {
      return NextResponse.json(
        { error: 'Token inválido o expirado' },
        { status: 401 }
      )
    }

    // Verificar que la sesión exista en BD
    const { data: sesion } = await supabase
      .from('sesiones')
      .select('*')
      .eq('token', token)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (!sesion) {
      return NextResponse.json(
        { error: 'Sesión expirada' },
        { status: 401 }
      )
    }

    // Verificar que el usuario siga activo
    const { data: usuario } = await supabase
      .from('usuarios')
      .select('id, username, nombre_completo, nivel, activo')
      .eq('id', decoded.userId)
      .single()

    if (!usuario || !usuario.activo) {
      return NextResponse.json(
        { error: 'Usuario desactivado' },
        { status: 403 }
      )
    }

    return NextResponse.json({
      user: {
        id: usuario.id,
        username: usuario.username,
        nombre: usuario.nombre_completo,
        nivel: usuario.nivel
      }
    })

  } catch (error) {
    console.error('Error en verificación:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
