'use client'

import { useState } from 'react'

interface PetImageProps {
  src: string
  alt: string
  className?: string
  fallbackClassName?: string
  /**
   * contain — fit inside frame, keep original shape (no crop/stretch).
   * cover — fill frame (may crop edges). Default for legacy call sites.
   */
  fit?: 'contain' | 'cover'
}

export default function PetImage({
  src,
  alt,
  className = '',
  fallbackClassName = '',
  fit = 'cover',
}: PetImageProps) {
  const [imageError, setImageError] = useState(false)
  const hasObjectFit = /\bobject-(contain|cover|fill|none|scale-down)\b/.test(className)
  const fitClass = hasObjectFit ? '' : fit === 'contain' ? 'object-contain' : 'object-cover'

  if (imageError) {
    return (
      <div
        className={`flex items-center justify-center bg-gradient-to-br from-gray-200 to-gray-300 ${fallbackClassName || className}`}
      >
        <svg className="w-12 h-12 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
        </svg>
      </div>
    )
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className={`${fitClass} ${className}`}
      onError={() => setImageError(true)}
    />
  )
}
