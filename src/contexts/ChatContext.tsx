'use client'

import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  actions?: Array<{
    tool: string
    input: Record<string, unknown>
    result: unknown
  }>
}

interface ChatContextType {
  messages: Message[]
  isOpen: boolean
  loading: boolean
  error: string | null
  toggleChat: () => void
  openChat: () => void
  closeChat: () => void
  sendMessage: (message: string) => Promise<void>
  clearHistory: () => void
}

const ChatContext = createContext<ChatContextType | undefined>(undefined)

export function ChatProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<Message[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Cargar historial de localStorage al montar
  useEffect(() => {
    const saved = localStorage.getItem('villalba-chat-history')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        // Convertir timestamps de string a Date
        const messagesWithDates = parsed.map((m: Message & { timestamp: string }) => ({
          ...m,
          timestamp: new Date(m.timestamp)
        }))
        // Mantener solo los últimos 50 mensajes
        setMessages(messagesWithDates.slice(-50))
      } catch {
        // Si hay error, empezar con historial vacío
      }
    }
  }, [])

  // Guardar historial en localStorage cuando cambia
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('villalba-chat-history', JSON.stringify(messages.slice(-50)))
    }
  }, [messages])

  const toggleChat = useCallback(() => {
    setIsOpen(prev => !prev)
    setError(null)
  }, [])

  const openChat = useCallback(() => {
    setIsOpen(true)
    setError(null)
  }, [])

  const closeChat = useCallback(() => {
    setIsOpen(false)
  }, [])

  const sendMessage = useCallback(async (message: string) => {
    if (!message.trim()) return

    setLoading(true)
    setError(null)

    // Agregar mensaje del usuario
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: message.trim(),
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])

    try {
      // Preparar historial para la API (sin acciones ni timestamps)
      const conversationHistory = messages.slice(-10).map(m => ({
        role: m.role,
        content: m.content
      }))

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: message.trim(),
          conversationHistory
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al comunicarse con el asistente')
      }

      // Agregar respuesta del asistente
      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
        actions: data.actions
      }

      setMessages(prev => [...prev, assistantMessage])

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido'
      setError(errorMessage)

      // Agregar mensaje de error como respuesta del asistente
      const errorResponse: Message = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: `❌ ${errorMessage}`,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorResponse])
    } finally {
      setLoading(false)
    }
  }, [messages])

  const clearHistory = useCallback(() => {
    setMessages([])
    localStorage.removeItem('villalba-chat-history')
    setError(null)
  }, [])

  return (
    <ChatContext.Provider
      value={{
        messages,
        isOpen,
        loading,
        error,
        toggleChat,
        openChat,
        closeChat,
        sendMessage,
        clearHistory
      }}
    >
      {children}
    </ChatContext.Provider>
  )
}

export function useChat() {
  const context = useContext(ChatContext)
  if (context === undefined) {
    throw new Error('useChat debe usarse dentro de un ChatProvider')
  }
  return context
}
