'use client'

import Image from 'next/image'
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
  /** Prefer true for LCP heroes. */
  priority?: boolean
  sizes?: string
  width?: number
  height?: number
  /** Opt-in next/image fill mode (parent must be position: relative). */
  fill?: boolean
  /** Force next/image even without width/height/fill (uses intrinsic 800x600). */
  optimize?: boolean
}

export default function PetImage({
  src,
  alt,
  className = '',
  fallbackClassName = '',
  fit = 'cover',
  priority = false,
  sizes = '(max-width: 768px) 100vw, 50vw',
  width,
  height,
  fill = false,
  optimize = false,
}: PetImageProps) {
  const [imageError, setImageError] = useState(false)
  const hasObjectFit = /\bobject-(contain|cover|fill|none|scale-down)\b/.test(className)
  const fitClass = hasObjectFit ? '' : fit === 'contain' ? 'object-contain' : 'object-cover'
  const useNextImage = fill || optimize || (typeof width === 'number' && typeof height === 'number')

  if (imageError || !src) {
    return (
      <div
        role="img"
        aria-label={alt || 'Image unavailable'}
        className={`flex items-center justify-center bg-gradient-to-br from-gray-200 to-gray-300 ${fallbackClassName || className}`}
      >
        <svg className="w-12 h-12 text-gray-400" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
        </svg>
      </div>
    )
  }

  if (useNextImage) {
    if (fill) {
      return (
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          priority={priority}
          className={`${fitClass} ${className}`}
          onError={() => setImageError(true)}
        />
      )
    }
    return (
      <Image
        src={src}
        alt={alt}
        width={width || 800}
        height={height || 600}
        sizes={sizes}
        priority={priority}
        className={`${fitClass} ${className}`}
        onError={() => setImageError(true)}
      />
    )
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      className={`${fitClass} ${className}`}
      onError={() => setImageError(true)}
    />
  )
}
