'use client'

import { getBancoFromCBU, getInicialesBanco, type BancoInfo } from '@/lib/bancos-argentina'
import { useState } from 'react'

interface BancoLogoProps {
  cbu: string
  size?: 'sm' | 'md' | 'lg'
  showName?: boolean
  className?: string
}

const sizeClasses = {
  sm: 'w-6 h-6 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-14 h-14 text-base'
}

const nameSizeClasses = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base'
}

export default function BancoLogo({ cbu, size = 'md', showName = true, className = '' }: BancoLogoProps) {
  const [imageError, setImageError] = useState(false)
  const banco = getBancoFromCBU(cbu)

  if (!banco) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div
          className={`${sizeClasses[size]} rounded-lg bg-gray-200 flex items-center justify-center font-semibold text-gray-500`}
        >
          ?
        </div>
        {showName && (
          <span className={`${nameSizeClasses[size]} text-gray-500`}>
            Banco desconocido
          </span>
        )}
      </div>
    )
  }

  const iniciales = getInicialesBanco(banco.nombreCorto)

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {banco.logo && !imageError ? (
        <img
          src={banco.logo}
          alt={banco.nombreCorto}
          className={`${sizeClasses[size]} object-contain rounded`}
          onError={() => setImageError(true)}
        />
      ) : (
        <div
          className={`${sizeClasses[size]} rounded-lg flex items-center justify-center font-bold text-white`}
          style={{ backgroundColor: banco.colorPrimario }}
          title={banco.nombre}
        >
          {iniciales}
        </div>
      )}
      {showName && (
        <div className="flex flex-col">
          <span className={`${nameSizeClasses[size]} font-medium text-gray-800`}>
            {banco.nombreCorto}
          </span>
          {size === 'lg' && (
            <span className="text-xs text-gray-500 truncate max-w-[200px]">
              {banco.nombre}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

// Componente compacto solo para mostrar el ícono
export function BancoIcon({ cbu, size = 'sm' }: { cbu: string; size?: 'sm' | 'md' | 'lg' }) {
  const [imageError, setImageError] = useState(false)
  const banco = getBancoFromCBU(cbu)

  if (!banco) {
    return (
      <div
        className={`${sizeClasses[size]} rounded bg-gray-200 flex items-center justify-center font-semibold text-gray-500`}
        title="Banco desconocido"
      >
        ?
      </div>
    )
  }

  const iniciales = getInicialesBanco(banco.nombreCorto)

  if (banco.logo && !imageError) {
    return (
      <img
        src={banco.logo}
        alt={banco.nombreCorto}
        className={`${sizeClasses[size]} object-contain rounded`}
        title={banco.nombre}
        onError={() => setImageError(true)}
      />
    )
  }

  return (
    <div
      className={`${sizeClasses[size]} rounded flex items-center justify-center font-bold text-white`}
      style={{ backgroundColor: banco.colorPrimario }}
      title={banco.nombre}
    >
      {iniciales}
    </div>
  )
}

// Componente para mostrar CBU con logo del banco
export function CBUConBanco({ cbu, className = '' }: { cbu: string; className?: string }) {
  const banco = getBancoFromCBU(cbu)

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <BancoLogo cbu={cbu} size="md" showName={false} />
      <div className="flex flex-col">
        <span className="text-sm font-medium text-gray-800">
          {banco?.nombreCorto || 'Banco desconocido'}
        </span>
        <span className="text-xs text-gray-500 font-mono">
          {cbu.replace(/(.{4})/g, '$1 ').trim()}
        </span>
      </div>
    </div>
  )
}

// Badge compacto con color del banco
export function BancoBadge({ cbu, size = 'md' }: { cbu: string, size?: 'sm' | 'md' | 'lg' }) {
  const banco = getBancoFromCBU(cbu)

  const sizeStyles = {
    sm: 'px-1.5 py-0.5 text-[10px]',
    md: 'px-2 py-0.5 text-xs',
    lg: 'px-3 py-1 text-sm'
  }

  if (!banco) {
    return (
      <span className={`inline-flex items-center rounded font-medium bg-gray-100 text-gray-600 ${sizeStyles[size]}`}>
        ?
      </span>
    )
  }

  return (
    <span
      className={`inline-flex items-center rounded font-medium text-white ${sizeStyles[size]}`}
      style={{ backgroundColor: banco.colorPrimario }}
      title={banco.nombre}
    >
      {banco.nombreCorto}
    </span>
  )
}
