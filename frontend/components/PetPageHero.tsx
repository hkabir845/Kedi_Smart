import { BRAND_TAGLINE } from '@/lib/pet-theme'
import KediSmartLogo from '@/components/KediSmartLogo'

type Props = {
  title: string
  description?: string
  children?: React.ReactNode
}

export default function PetPageHero({ title, description, children }: Props) {
  return (
    <section className="bg-gradient-to-br from-primary-500 via-primary-600 to-primary-700 text-white py-12 md:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="inline-block bg-white rounded-lg px-3 py-2 mb-6 shadow-sm">
          <KediSmartLogo variant="compact" size="md" link={false} />
        </div>
        <p className="text-primary-100 text-xs sm:text-sm font-semibold uppercase tracking-widest mb-3">
          {BRAND_TAGLINE}
        </p>
        <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-3 tracking-tight">{title}</h1>
        {description && (
          <p className="text-lg text-primary-50 max-w-2xl leading-relaxed">{description}</p>
        )}
        {children}
      </div>
    </section>
  )
}
