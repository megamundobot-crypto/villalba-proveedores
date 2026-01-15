'use client'

import { useEffect, useRef } from 'react'

interface BuscadorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export default function Buscador({
  value,
  onChange,
  placeholder = 'Buscar...',
  className = ''
}: BuscadorProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  // Autofocus al montar el componente
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }, [])

  // Atajo F2 para enfocar el buscador
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault()
        if (inputRef.current) {
          inputRef.current.focus()
          inputRef.current.select()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Seleccionar todo al hacer clic
  const handleClick = () => {
    if (inputRef.current) {
      inputRef.current.select()
    }
  }

  return (
    <div className={`relative ${className}`}>
      <svg
        className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onClick={handleClick}
        placeholder={placeholder}
        className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50 focus:bg-white transition-all"
      />
      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 bg-slate-200 px-1.5 py-0.5 rounded">
        F2
      </span>
    </div>
  )
}
