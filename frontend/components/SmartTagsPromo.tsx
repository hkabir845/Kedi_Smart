import Link from 'next/link'
import PetImage from '@/components/PetImage'

/** Homepage band — points visitors to the public Smart Tags story. */
export default function SmartTagsPromo() {
  return (
    <section className="relative overflow-hidden bg-[#0f1f18] text-white">
      <div className="absolute inset-0 opacity-40">
        <PetImage
          src="/samples/dog-lab.jpg"
          alt=""
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0f1f18] via-[#0f1f18]/92 to-[#0f1f18]/70" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
        <p className="text-[#f26522] text-xs font-bold uppercase tracking-[0.2em] mb-3">
          Smart protection
        </p>
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight max-w-2xl mb-4 leading-tight">
          NFC &amp; QR tags that reunite pets with families
        </h2>
        <p className="text-base sm:text-lg text-white/80 max-w-xl mb-8 leading-relaxed">
          Tap or scan for a private profile, lost-mode alerts, and anonymous finder chat — built into
          KediSmart.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href="/tags"
            className="inline-flex items-center justify-center min-h-[48px] px-7 py-3.5 rounded-lg bg-[#f26522] text-white font-semibold hover:bg-[#e05818] transition-colors"
          >
            See how Smart Tags work
          </Link>
          <Link
            href="/register"
            className="inline-flex items-center justify-center min-h-[48px] px-7 py-3.5 rounded-lg border border-white/35 text-white font-semibold hover:bg-white/10 transition-colors"
          >
            Get started
          </Link>
        </div>
      </div>
    </section>
  )
}
