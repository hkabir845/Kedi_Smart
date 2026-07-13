import Image from 'next/image'
import Link from 'next/link'

export const LOGO_SRC = '/brand/kedismart-logo.png'
export const MARK_SRC = '/brand/kedismart-mark.png'

type Props = {
  className?: string
  /** full = complete logo, compact = icon + KEDISMART, mark = icon only */
  variant?: 'full' | 'compact' | 'mark' | 'watermark'
  size?: '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  link?: boolean
  priority?: boolean
}

/** Total visible height of the logo box (Tailwind class). */
const boxHeight: Record<NonNullable<Props['variant']>, Record<NonNullable<Props['size']>, string>> = {
  full: {
    '2xs': 'h-[56px]',
    xs: 'h-[72px]',
    sm: 'h-[88px]',
    md: 'h-[100px]',
    lg: 'h-[112px]',
    xl: 'h-[128px]',
  },
  compact: {
    '2xs': 'h-[40px]',
    xs: 'h-[52px]',
    sm: 'h-[64px]',
    md: 'h-[72px]',
    lg: 'h-[80px]',
    xl: 'h-[92px]',
  },
  mark: {
    '2xs': 'h-[32px]',
    xs: 'h-[40px]',
    sm: 'h-[48px]',
    md: 'h-[52px]',
    lg: 'h-[60px]',
    xl: 'h-[68px]',
  },
  watermark: {
    '2xs': 'h-[32px]',
    xs: 'h-[40px]',
    sm: 'h-[48px]',
    md: 'h-[52px]',
    lg: 'h-[60px]',
    xl: 'h-[68px]',
  },
}

/** Image scale inside box — tight-cropped logo asset fills the box naturally. */
const imageScale: Record<NonNullable<Props['variant']>, string> = {
  full: 'h-full w-auto max-w-none',
  compact: 'h-full w-auto max-w-none',
  mark: 'h-full w-auto max-w-none',
  watermark: 'h-full w-auto max-w-none',
}

const logoSrc: Record<NonNullable<Props['variant']>, string> = {
  full: LOGO_SRC,
  compact: LOGO_SRC,
  mark: MARK_SRC,
  watermark: MARK_SRC,
}

export default function KediSmartLogo({
  className = '',
  variant = 'compact',
  size = 'sm',
  link = true,
  priority = false,
}: Props) {
  const heightClass = boxHeight[variant][size]
  const scaleClass = imageScale[variant]
  const src = logoSrc[variant]
  const isMark = variant === 'mark' || variant === 'watermark'
  const imageWidth = isMark ? 302 : 365
  const imageHeight = isMark ? 180 : 536
  const objectClass = isMark ? 'object-center' : variant === 'compact' ? 'object-top' : 'object-center'

  const image = (
    <span className={`inline-flex items-center justify-center shrink-0 ${className}`}>
      <span className={`relative inline-flex items-center justify-center ${isMark ? '' : 'overflow-hidden'} ${heightClass}`}>
        <Image
          src={src}
          alt="KediSmart — Trusted by Pets, Loved by Owners"
          width={imageWidth}
          height={imageHeight}
          priority={priority}
          className={`${scaleClass} object-contain ${objectClass} select-none`}
          sizes={isMark ? `${size === '2xs' ? 48 : 64}px` : '(max-width: 768px) 120px, 160px'}
        />
      </span>
    </span>
  )

  if (link) {
    return (
      <Link href="/" className="inline-flex hover:opacity-90 transition-opacity" aria-label="KediSmart home">
        {image}
      </Link>
    )
  }

  return image
}
