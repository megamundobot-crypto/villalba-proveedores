import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import jwt from 'jsonwebtoken'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const JWT_SECRET = process.env.JWT_SECRET || 'villalba-proveedores-secret-key-2025'

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('auth_token')?.value

    if (token) {
      // Decodificar token para obtener info del usuario
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as { userId: number; nombre: string }

        // Eliminar sesión de la BD
        await supabase
          .from('sesiones')
          .delete()
          .eq('token', token)

        // Registrar logout
        await supabase.from('auditoria').insert({
          usuario_id: decoded.userId,
          usuario_nombre: decoded.nombre,
          accion: 'LOGOUT',
          ip_address: request.headers.get('x-forwarded-for') || 'unknown'
        })
      } catch {
        // Token inválido, igual procedemos con el logout
      }
    }

    // Eliminar cookie
    const response = NextResponse.json({ success: true })
    response.cookies.delete('auth_token')

    return response

  } catch (error) {
    console.error('Error en logout:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
