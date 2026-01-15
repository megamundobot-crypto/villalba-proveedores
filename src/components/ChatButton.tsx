'use client'

import { useChat } from '@/contexts/ChatContext'
import { useAuth } from '@/contexts/AuthContext'

export default function ChatButton() {
  const { toggleChat, isOpen, messages, loading } = useChat()
  const { user } = useAuth()

  // IA desactivada temporalmente por costos
  return null

  // No mostrar si no hay usuario logueado
  if (!user) return null

  // Contar mensajes no leídos (los últimos del asistente)
  const unreadCount = messages.filter(
    m => m.role === 'assistant' && Date.now() - m.timestamp.getTime() < 60000
  ).length

  return (
    <button
      onClick={toggleChat}
      className={`
        fixed bottom-6 right-6 z-50
        w-16 h-16 rounded-full
        flex items-center justify-center
        shadow-2xl
        transition-all duration-300 ease-out
        ${isOpen
          ? 'bg-slate-700 hover:bg-slate-600 rotate-0 scale-95'
          : 'gradient-primary hover:scale-110 hover:shadow-indigo-500/50'
        }
        ${loading ? 'animate-pulse' : ''}
      `}
      title={isOpen ? 'Cerrar asistente' : 'Abrir asistente IA'}
    >
      {isOpen ? (
        // Icono X para cerrar
        <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      ) : (
        // Icono de chat/robot
        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      )}

      {/* Badge de mensajes no leídos */}
      {!isOpen && unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center animate-bounce">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}

      {/* Indicador de loading */}
      {loading && !isOpen && (
        <span className="absolute -top-1 -right-1 w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center">
          <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
        </span>
      )}

      {/* Pulso de atención (solo si está cerrado y no hay mensajes) */}
      {!isOpen && messages.length === 0 && (
        <span className="absolute inset-0 rounded-full animate-ping bg-indigo-400 opacity-30"></span>
      )}
    </button>
  )
}
