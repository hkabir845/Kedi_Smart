import Link from 'next/link'
import { Fraunces, Source_Sans_3 } from 'next/font/google'
import FaqSection from '@/components/FaqSection'
import JsonLd from '@/components/JsonLd'
import PetImage from '@/components/PetImage'
import { breadcrumbList, faqPageSchema, type FaqEntry } from '@/lib/schema'
import { buildPageMetadata } from '@/lib/seo'

const TAG_FAQS: FaqEntry[] = [
  {
    question: 'How does a KediSmart NFC pet tag work?',
    answer:
      'Each tag links to a private pet profile. When someone taps NFC or scans the QR code, they can message you anonymously if your pet is lost — without seeing your personal phone number by default.',
  },
  {
    question: 'Do I need a special phone to use the tag?',
    answer:
      'Most modern smartphones support NFC tap or QR scanning with the built-in camera. Finders without NFC can still use the QR code printed on the tag.',
  },
  {
    question: 'Is my personal information visible to strangers?',
    answer:
      'Profiles are privacy-controlled. You choose what finders see. Lost mode enables anonymous messaging so you can arrange a safe reunion.',
  },
]

const display = Fraunces({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
})

const body = Source_Sans_3({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
})

export const metadata = buildPageMetadata({
  title: 'NFC & QR Smart Pet Tags',
  description:
    'KediSmart smart tags: tap NFC or scan QR for a private pet profile, lost-mode alerts, and anonymous finder messaging — so lost pets come home faster.',
  path: '/tags',
  keywords: ['NFC pet tag', 'QR pet tag Bangladesh', 'lost pet tag', 'KediSmart smart tag'],
})

export default function SmartTagsPage() {
  const crumbs = breadcrumbList([
    { name: 'Home', path: '/' },
    { name: 'Smart Tags', path: '/tags' },
  ])
  const faqLd = faqPageSchema(TAG_FAQS)

  return (
    <div className={`${body.className} tags-landing min-h-screen bg-[#0f1f18] text-white`}>
      <JsonLd data={[crumbs, faqLd].filter(Boolean) as Record<string, unknown>[]} />
      {/* Hero — full-bleed, brand first */}
      <section className="relative min-h-[100svh] flex flex-col justify-end overflow-hidden">
        <div className="absolute inset-0">
          <PetImage
            src="/samples/dog-golden.jpg"
            alt="Golden retriever outdoors — KediSmart smart tag protection"
            className="absolute inset-0 w-full h-full object-cover scale-105 tags-hero-ken"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0f1f18] via-[#0f1f18]/75 to-[#0f1f18]/25" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0f1f18]/80 via-transparent to-transparent" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pb-16 sm:pb-20 pt-28">
          <p
            className={`${display.className} tags-fade-up text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight text-white mb-5 sm:mb-6`}
            style={{ animationDelay: '0.05s' }}
          >
            KediSmart
          </p>
          <h1
            className={`${display.className} tags-fade-up text-[2.35rem] leading-[1.1] sm:text-5xl lg:text-6xl font-semibold max-w-3xl text-white mb-4 sm:mb-5`}
            style={{ animationDelay: '0.18s' }}
          >
            A tag that helps bring them home
          </h1>
          <p
            className="tags-fade-up text-base sm:text-lg text-white/85 max-w-xl mb-8 leading-relaxed"
            style={{ animationDelay: '0.32s' }}
          >
            NFC tap or QR scan opens a private pet profile — with lost-mode alerts and anonymous
            messages for finders.
          </p>
          <div className="tags-fade-up flex flex-col sm:flex-row gap-3" style={{ animationDelay: '0.45s' }}>
            <Link
              href="/register"
              className="inline-flex items-center justify-center min-h-[48px] px-7 py-3.5 rounded-lg bg-[#f26522] text-white font-semibold hover:bg-[#e05818] transition-colors"
            >
              Create free account
            </Link>
            <Link
              href="/shop?catalog=pet_animal"
              className="inline-flex items-center justify-center min-h-[48px] px-7 py-3.5 rounded-lg border border-white/40 text-white font-semibold hover:bg-white/10 transition-colors"
            >
              Shop pet products
            </Link>
          </div>
        </div>
      </section>

      <section className="relative py-20 sm:py-28 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className={`${display.className} text-3xl sm:text-4xl font-semibold tracking-tight mb-3`}>
            How a KediSmart tag works
          </h2>
          <p className="text-white/70 text-lg max-w-2xl mb-14">
            One physical tag. Two ways in. The same trusted profile every time.
          </p>

          <ol className="grid md:grid-cols-3 gap-10 md:gap-12">
            {[
              {
                n: '01',
                title: 'Link the tag',
                body: 'Activate your NFC / QR UID on a pet profile in your dashboard. The public link is ready in seconds.',
              },
              {
                n: '02',
                title: 'Someone finds them',
                body: 'A tap or scan opens the privacy-filtered profile — name, photo, and the contact options you allow.',
              },
              {
                n: '03',
                title: 'You reconnect',
                body: 'Finders can call, WhatsApp, send a private message, or file a found report — without exposing your full address.',
              },
            ].map((step) => (
              <li key={step.n} className="tags-rise border-t border-white/15 pt-6">
                <p className="text-[#f26522] text-sm font-bold tracking-widest mb-3">{step.n}</p>
                <h3 className={`${display.className} text-2xl font-semibold mb-3`}>{step.title}</h3>
                <p className="text-white/70 leading-relaxed">{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="relative py-20 sm:py-24 bg-[#142820]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div className="relative min-h-[320px] sm:min-h-[420px] overflow-hidden">
            <PetImage
              src="/brand/kedismart-nfc-tag-kitten.png"
              alt="Kitten wearing a KediSmart NFC tag on its collar"
              className="absolute inset-0 w-full h-full object-cover object-[center_35%]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#142820]/85 via-[#142820]/15 to-transparent" />
            <div className="absolute bottom-5 left-5 right-5">
              <p className="inline-block text-xs font-bold uppercase tracking-wider bg-red-600 text-white px-2.5 py-1 mb-2">
                Lost mode on
              </p>
              <p className="text-sm text-white/90">Last seen · Gulshan 2 — reward note optional</p>
            </div>
          </div>
          <div>
            <h2 className={`${display.className} text-3xl sm:text-4xl font-semibold tracking-tight mb-4`}>
              Lost mode when every minute matters
            </h2>
            <p className="text-white/75 text-lg leading-relaxed mb-6">
              Flip lost mode from your dashboard. The next person who scans sees an urgent alert,
              last-seen details, and — if you choose — a reward note.
            </p>
            <Link
              href="/login?next=/dashboard/pets/tags"
              className="inline-flex font-semibold text-[#f26522] hover:text-[#ff7a3d] underline underline-offset-4"
            >
              Sign in to manage tags &amp; lost mode →
            </Link>
          </div>
        </div>
      </section>

      <section className="py-20 sm:py-28">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <h2 className={`${display.className} text-3xl sm:text-4xl font-semibold tracking-tight mb-4`}>
            You control what strangers see
          </h2>
          <p className="text-white/70 text-lg leading-relaxed mb-10">
            Show name and photo — or keep it minimal. Allow call, WhatsApp, or anonymous chat.
            City-only location. Masked messages so your number stays private until you decide.
          </p>
          <ul className="grid sm:grid-cols-2 gap-4 text-left text-white/85">
            {[
              'Public fields you choose',
              'Anonymous finder chat',
              'Optional call & WhatsApp',
              'City-level location privacy',
            ].map((item) => (
              <li
                key={item}
                className="flex items-start gap-3 border border-white/10 bg-white/[0.03] px-4 py-3"
              >
                <span className="mt-1.5 h-2 w-2 rounded-full bg-[#f26522] shrink-0" aria-hidden />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="py-16 sm:py-20 border-t border-white/10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 [&_summary]:text-white [&_h2]:text-white [&_p]:text-white/75 [&_details]:bg-white/5 [&_details]:border-white/15">
          <FaqSection faqs={TAG_FAQS} title="Smart tag FAQ" />
        </div>
      </section>

      <section className="py-16 sm:py-20 border-t border-white/10 bg-[#0c1914]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8">
          <div className="max-w-xl">
            <h2 className={`${display.className} text-3xl sm:text-4xl font-semibold tracking-tight mb-3`}>
              Ready to protect your pet?
            </h2>
            <p className="text-white/70 text-lg">
              Register, add a pet, link your tag UID, and share the QR. Finders already know what to
              do when they scan.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 shrink-0">
            <Link
              href="/register"
              className="inline-flex items-center justify-center min-h-[48px] px-7 py-3.5 rounded-lg bg-[#f26522] text-white font-semibold hover:bg-[#e05818] transition-colors"
            >
              Get started free
            </Link>
            <Link
              href="/login?next=/dashboard/pets/tags"
              className="inline-flex items-center justify-center min-h-[48px] px-7 py-3.5 rounded-lg border border-white/35 text-white font-semibold hover:bg-white/10 transition-colors"
            >
              I already have an account
            </Link>
          </div>
        </div>
      </section>

      <style>{`
        .tags-landing .tags-fade-up {
          opacity: 0;
          transform: translateY(18px);
          animation: tagsFadeUp 0.9s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
        .tags-landing .tags-hero-ken {
          animation: tagsKen 18s ease-out forwards;
        }
        .tags-landing .tags-rise {
          opacity: 0;
          transform: translateY(16px);
          animation: tagsFadeUp 0.8s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
        .tags-landing .tags-rise:nth-child(1) { animation-delay: 0.1s; }
        .tags-landing .tags-rise:nth-child(2) { animation-delay: 0.25s; }
        .tags-landing .tags-rise:nth-child(3) { animation-delay: 0.4s; }
        @keyframes tagsFadeUp {
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes tagsKen {
          from { transform: scale(1.08); }
          to { transform: scale(1); }
        }
        @media (prefers-reduced-motion: reduce) {
          .tags-landing .tags-fade-up,
          .tags-landing .tags-rise,
          .tags-landing .tags-hero-ken {
            animation: none !important;
            opacity: 1 !important;
            transform: none !important;
          }
        }
      `}</style>
    </div>
  )
}
