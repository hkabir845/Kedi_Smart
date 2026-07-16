import Link from 'next/link'
import Breadcrumbs from '@/components/Breadcrumbs'
import FaqSection from '@/components/FaqSection'
import JsonLd from '@/components/JsonLd'
import { automatePageSeo } from '@/lib/seo-automation'

const path = '/emergency'
const faqs = [
  {
    question: 'My pet just went missing — what first?',
    answer:
      'Search the immediate area, alert neighbors and security, enable lost mode on your KediSmart pet profile, and keep your phone charged for finder messages.',
  },
  {
    question: 'I found someone else’s pet — what should I do?',
    answer:
      'Scan the NFC/QR tag if present, contact the owner through the profile, keep the animal safe and calm, and avoid posting the owner’s private details publicly.',
  },
  {
    question: 'Is this a substitute for a vet emergency?',
    answer:
      'No. For bleeding, heatstroke, toxin ingestion, or seizures, go to a veterinarian immediately — use /vets to find clinics.',
  },
]

const seo = automatePageSeo({
  kind: 'landing',
  title: 'Lost Pet Emergency Center',
  description:
    'Immediate steps for lost pets in Bangladesh — search checklist, smart tag lost mode, finder guidance, and vet links. Not a medical emergency substitute.',
  path,
  keywords: ['lost pet emergency', 'find lost dog Bangladesh', 'lost cat what to do'],
  faqs,
  clusterId: 'lost-pet-recovery',
  crumbs: [
    { name: 'Home', path: '/' },
    { name: 'Emergency', path },
  ],
})

export const metadata = seo.metadata

const STEPS = [
  {
    title: 'Secure the scene',
    body: 'Check rooms, balconies, rooftops, stairwells, and the nearest street calmly. Call with familiar cues.',
  },
  {
    title: 'Enable digital lost mode',
    body: 'Open your KediSmart pet profile and turn on lost mode so finders who tap/scan the tag can reach you.',
  },
  {
    title: 'Alert humans nearby',
    body: 'Tell neighbors, guards, and shopkeepers. Share one clear photo and last-seen location.',
  },
  {
    title: 'Widen the search',
    body: 'Visit nearby vets and shelters with a photo. Continue morning/evening sweeps in hot weather.',
  },
]

export default function EmergencyPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-orange-50/80 via-white to-white">
      <JsonLd data={seo.schemas} />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <Breadcrumbs items={seo.breadcrumbs} />
        <p className="text-sm font-medium text-orange-800 mb-2">Lost Pet Network · Emergency Center</p>
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
          If your pet is missing
        </h1>
        <p className="text-gray-600 mb-8 leading-relaxed">
          Act fast, stay calm. Smart tags help finders contact you — they do not replace searching and
          community alerts.
        </p>

        <ol className="space-y-4 mb-10">
          {STEPS.map((step, i) => (
            <li key={step.title} className="flex gap-4 rounded-xl border border-orange-100 bg-white p-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-600 text-white text-sm font-bold">
                {i + 1}
              </span>
              <div>
                <h2 className="font-semibold text-gray-900">{step.title}</h2>
                <p className="text-sm text-gray-600 mt-1 leading-relaxed">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>

        <div className="flex flex-col sm:flex-row gap-3 mb-10">
          <Link
            href="/tags"
            className="inline-flex justify-center items-center min-h-[44px] px-5 rounded-lg bg-orange-600 text-white font-semibold hover:bg-orange-700"
          >
            Smart tags
          </Link>
          <Link
            href="/guides/what-to-do-if-your-pet-is-lost"
            className="inline-flex justify-center items-center min-h-[44px] px-5 rounded-lg border border-gray-300 text-gray-900 font-semibold hover:bg-gray-50"
          >
            Full checklist guide
          </Link>
          <Link
            href="/vets"
            className="inline-flex justify-center items-center min-h-[44px] px-5 rounded-lg border border-gray-300 text-gray-900 font-semibold hover:bg-gray-50"
          >
            Find a vet
          </Link>
        </div>

        <FaqSection faqs={faqs} title="Emergency FAQs" />

        <p className="mt-8 text-sm text-gray-500">
          Medical emergency? Contact a clinic now — this page is for lost-pet recovery, not clinical
          triage.
        </p>
      </div>
    </main>
  )
}
