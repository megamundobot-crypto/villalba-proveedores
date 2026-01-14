import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const JWT_SECRET = process.env.JWT_SECRET || 'villalba-proveedores-secret-key-2025'

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json()

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Usuario y contraseña son requeridos' },
        { status: 400 }
      )
    }

    // Buscar usuario
    const { data: usuario, error } = await supabase
      .from('usuarios')
      .select('*')
      .eq('username', username.toLowerCase())
      .single()

    if (error || !usuario) {
      // Registrar intento fallido en auditoría
      await supabase.from('auditoria').insert({
        accion: 'LOGIN_FALLIDO',
        datos_nuevos: { username, motivo: 'Usuario no encontrado' },
        ip_address: request.headers.get('x-forwarded-for') || 'unknown'
      })

      return NextResponse.json(
        { error: 'Usuario o contraseña incorrectos' },
        { status: 401 }
      )
    }

    // Verificar si está bloqueado
    if (usuario.bloqueado_hasta && new Date(usuario.bloqueado_hasta) > new Date()) {
      return NextResponse.json(
        { error: 'Usuario bloqueado. Intente más tarde.' },
        { status: 403 }
      )
    }

    // Verificar si está activo
    if (!usuario.activo) {
      return NextResponse.json(
        { error: 'Usuario desactivado. Contacte al administrador.' },
        { status: 403 }
      )
    }

    // Verificar contraseña
    const passwordValid = await bcrypt.compare(password, usuario.password_hash)

    if (!passwordValid) {
      // Incrementar intentos fallidos
      const intentos = (usuario.intentos_fallidos || 0) + 1
      const updateData: Record<string, unknown> = { intentos_fallidos: intentos }

      // Bloquear después de 5 intentos
      if (intentos >= 5) {
        const bloqueadoHasta = new Date()
        bloqueadoHasta.setMinutes(bloqueadoHasta.getMinutes() + 15) // 15 minutos
        updateData.bloqueado_hasta = bloqueadoHasta.toISOString()
      }

      await supabase
        .from('usuarios')
        .update(updateData)
        .eq('id', usuario.id)

      // Registrar intento fallido
      await supabase.from('auditoria').insert({
        usuario_id: usuario.id,
        usuario_nombre: usuario.nombre_completo,
        accion: 'LOGIN_FALLIDO',
        datos_nuevos: { intentos, motivo: 'Contraseña incorrecta' },
        ip_address: request.headers.get('x-forwarded-for') || 'unknown'
      })

      return NextResponse.json(
        { error: 'Usuario o contraseña incorrectos' },
        { status: 401 }
      )
    }

    // Login exitoso - resetear intentos y actualizar último login
    await supabase
      .from('usuarios')
      .update({
        intentos_fallidos: 0,
        bloqueado_hasta: null,
        ultimo_login: new Date().toISOString()
      })
      .eq('id', usuario.id)

    // Crear token JWT
    const token = jwt.sign(
      {
        userId: usuario.id,
        username: usuario.username,
        nombre: usuario.nombre_completo,
        nivel: usuario.nivel
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    )

    // Guardar sesión en BD
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + 24)

    await supabase.from('sesiones').insert({
      usuario_id: usuario.id,
      token,
      ip_address: request.headers.get('x-forwarded-for') || 'unknown',
      user_agent: request.headers.get('user-agent') || 'unknown',
      expires_at: expiresAt.toISOString()
    })

    // Registrar login exitoso
    await supabase.from('auditoria').insert({
      usuario_id: usuario.id,
      usuario_nombre: usuario.nombre_completo,
      accion: 'LOGIN_EXITOSO',
      ip_address: request.headers.get('x-forwarded-for') || 'unknown'
    })

    // Respuesta exitosa
    const response = NextResponse.json({
      success: true,
      user: {
        id: usuario.id,
        username: usuario.username,
        nombre: usuario.nombre_completo,
        nivel: usuario.nivel
      }
    })

    // Setear cookie con el token
    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24, // 24 horas
      path: '/'
    })

    return response

  } catch (error) {
    console.error('Error en login:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
