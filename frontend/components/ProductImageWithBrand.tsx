import Image from 'next/image'

import { LOGO_SRC } from '@/components/KediSmartLogo'



type Props = {

  children: React.ReactNode

  className?: string

  watermark?: boolean

  watermarkPosition?: 'bottom-right' | 'bottom-left' | 'top-right'

  /** Product-image only — does not affect site header logo. */

  watermarkSize?: 'xs' | 'sm'

}



const positionClass = {

  'bottom-right': 'bottom-2 right-2',

  'bottom-left': 'bottom-2 left-2',

  'top-right': 'top-2 right-2',

}



/** Fixed badge size — small but legible; sits in reserved corner space. */

const badgeSize: Record<NonNullable<Props['watermarkSize']>, string> = {

  xs: 'w-10 h-10 p-1',

  sm: 'w-12 h-12 p-1.5',

}



/** Inset for product content so the badge never overlaps the photo. */

const contentInset: Record<NonNullable<Props['watermarkSize']>, string> = {

  xs: 'pr-11 pt-10',

  sm: 'pr-14 pt-12',

}



function ProductWatermark({ size }: { size: NonNullable<Props['watermarkSize']> }) {

  return (

    <div

      className={`${badgeSize[size]} rounded-md bg-white shadow-sm ring-1 ring-black/8 flex items-center justify-center overflow-hidden`}

      aria-hidden

    >

      <Image

        src={LOGO_SRC}

        alt=""

        width={365}

        height={536}

        className="w-full h-full object-contain object-top select-none"

        sizes="48px"

      />

    </div>

  )

}



/** Wraps product imagery with a corner watermark — separate from the main site logo. */

export default function ProductImageWithBrand({

  children,

  className = '',

  watermark = true,

  watermarkPosition = 'top-right',

  watermarkSize = 'xs',

}: Props) {

  const reserveCorner = watermark && watermarkPosition === 'top-right'



  return (

    <div className={`relative overflow-hidden ${className}`}>

      <div

        className={`relative w-full h-full min-h-0 ${

          reserveCorner ? contentInset[watermarkSize] : ''

        } [&_img]:object-contain`}

      >

        {children}

      </div>

      {watermark && (

        <div

          className={`absolute ${positionClass[watermarkPosition]} z-20 pointer-events-none`}

          aria-hidden

        >

          <ProductWatermark size={watermarkSize} />

        </div>

      )}

    </div>

  )

}


