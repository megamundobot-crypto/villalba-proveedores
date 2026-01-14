import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import jwt from 'jsonwebtoken'
import { tools, ejecutarTool, SYSTEM_PROMPT } from '@/lib/ai-tools'

const JWT_SECRET = process.env.JWT_SECRET || 'villalba-proveedores-secret-key-2025'

// Tipos para los mensajes
interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface ToolUse {
  type: 'tool_use'
  id: string
  name: string
  input: Record<string, unknown>
}

interface ToolResult {
  type: 'tool_result'
  tool_use_id: string
  content: string
}

// Verificar autenticación
async function verifyAuth(request: NextRequest) {
  const token = request.cookies.get('auth_token')?.value

  if (!token) {
    return null
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      userId: number
      username: string
      nombre: string
      nivel: string
    }
    return decoded
  } catch {
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación
    const user = await verifyAuth(request)
    if (!user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    // Verificar API key de Anthropic
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'API de IA no configurada. Contactá al administrador.' },
        { status: 500 }
      )
    }

    // Parsear body
    const body = await request.json()
    const { message, conversationHistory = [] } = body as {
      message: string
      conversationHistory: Message[]
    }

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Mensaje requerido' },
        { status: 400 }
      )
    }

    // Inicializar cliente de Anthropic
    const anthropic = new Anthropic({
      apiKey: apiKey
    })

    // Construir historial de mensajes para la API
    const messages: Anthropic.MessageParam[] = [
      ...conversationHistory.map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content
      })),
      {
        role: 'user' as const,
        content: message
      }
    ]

    // Array para guardar las acciones ejecutadas
    const actionsExecuted: Array<{
      tool: string
      input: Record<string, unknown>
      result: unknown
    }> = []

    // Llamar a Claude
    let response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: `${SYSTEM_PROMPT}

INFORMACIÓN DEL USUARIO ACTUAL:
- Nombre: ${user.nombre}
- Usuario: ${user.username}
- Nivel: ${user.nivel}
${user.nivel === 'consulta' ? '\n⚠️ Este usuario solo tiene permisos de CONSULTA, no puede registrar pagos.' : ''}`,
      tools: tools,
      messages: messages
    })

    // Procesar tool calls en un loop
    while (response.stop_reason === 'tool_use') {
      const toolUseBlocks = response.content.filter(
        (block): block is Anthropic.ContentBlockParam & { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> } =>
          block.type === 'tool_use'
      )

      const toolResults: Anthropic.ToolResultBlockParam[] = []

      for (const toolUse of toolUseBlocks) {
        // Verificar permisos para registrar pagos
        if (toolUse.name === 'registrar_pago' && user.nivel === 'consulta') {
          toolResults.push({
            type: 'tool_result',
            tool_use_id: toolUse.id,
            content: JSON.stringify({
              success: false,
              error: 'No tenés permisos para registrar pagos. Tu nivel de acceso es solo consulta.'
            })
          })
          continue
        }

        // Ejecutar la tool
        const result = await ejecutarTool(
          toolUse.name,
          toolUse.input,
          user.userId
        )

        actionsExecuted.push({
          tool: toolUse.name,
          input: toolUse.input,
          result: result
        })

        toolResults.push({
          type: 'tool_result',
          tool_use_id: toolUse.id,
          content: JSON.stringify(result)
        })
      }

      // Continuar la conversación con los resultados
      response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        tools: tools,
        messages: [
          ...messages,
          { role: 'assistant', content: response.content },
          { role: 'user', content: toolResults }
        ]
      })
    }

    // Extraer texto de la respuesta final
    const textContent = response.content.find(block => block.type === 'text')
    const responseText = textContent && 'text' in textContent ? textContent.text : 'Lo siento, no pude procesar tu solicitud.'

    return NextResponse.json({
      response: responseText,
      actions: actionsExecuted.length > 0 ? actionsExecuted : undefined
    })

  } catch (error) {
    console.error('Error en chat API:', error)

    // Manejar errores específicos de Anthropic
    if (error instanceof Anthropic.APIError) {
      if (error.status === 401) {
        return NextResponse.json(
          { error: 'API key de Anthropic inválida' },
          { status: 500 }
        )
      }
      if (error.status === 429) {
        return NextResponse.json(
          { error: 'Límite de uso de IA alcanzado. Intentá de nuevo en unos minutos.' },
          { status: 429 }
        )
      }
    }

    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
