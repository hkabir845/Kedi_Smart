import type { Intent } from './topic-clusters'

export type CompareRow = { aspect: string; a: string; b: string }

export type Comparison = {
  slug: string
  title: string
  intent: Intent
  summary: string
  definition: string
  optionA: string
  optionB: string
  clusterId: string
  keywords: string[]
  rows: CompareRow[]
  verdict: string
  prosA: string[]
  prosB: string[]
  consA: string[]
  consB: string[]
  relatedGuideSlugs: string[]
  relatedPaths: { label: string; path: string }[]
  faqs: { question: string; answer: string }[]
  lastReviewed: string
}

export const COMPARISONS: Comparison[] = [
  {
    slug: 'nfc-vs-qr-pet-tags',
    title: 'NFC vs QR Pet Tags',
    intent: 'commercial',
    summary:
      'NFC taps open a profile with one touch; QR codes work on any camera phone. The best smart tags include both.',
    definition:
      'NFC pet tags use near-field wireless chips; QR pet tags encode a URL as a scannable square. Dual NFC+QR tags cover more finders.',
    optionA: 'NFC',
    optionB: 'QR code',
    clusterId: 'nfc-pet-tags',
    keywords: ['NFC vs QR pet tag', 'QR dog tag', 'NFC collar tag'],
    lastReviewed: '2026-07-01',
    rows: [
      { aspect: 'How it opens', a: 'Phone tap (1–2 cm)', b: 'Camera scan' },
      { aspect: 'Phone support', a: 'Most modern NFC phones', b: 'Almost all smartphones' },
      { aspect: 'Speed', a: 'Usually fastest', b: 'Fast with practice' },
      { aspect: 'Wear durability', a: 'Chip sealed in housing', b: 'Print/etch must stay readable' },
      { aspect: 'Best for', a: 'Quick tap reunions', b: 'Universal finder access' },
    ],
    verdict:
      'Choose a dual NFC + QR tag when possible. NFC is convenient; QR is the universal fallback — KediSmart tags are designed around both.',
    prosA: ['One-tap open', 'No camera framing needed', 'Feels premium and fast'],
    prosB: ['Works without NFC hardware', 'Easy to understand for any finder', 'Can be reprinted if damaged'],
    consA: ['Some older phones lack NFC', 'Requires close proximity'],
    consB: ['Needs line-of-sight scan', 'Can wear off if poorly printed'],
    relatedGuideSlugs: ['what-is-an-nfc-pet-tag', 'how-nfc-pet-tags-work'],
    relatedPaths: [{ label: 'Smart tags', path: '/tags' }],
    faqs: [
      {
        question: 'Which is better for Bangladesh?',
        answer:
          'Dual tags. Finder phones vary widely — QR ensures almost anyone can open the profile, while NFC helps when available.',
      },
    ],
  },
  {
    slug: 'nfc-vs-microchip',
    title: 'NFC Pet Tag vs Microchip',
    intent: 'informational',
    summary:
      'Microchips are permanent clinic IDs; NFC tags help everyday finders. They solve different problems and work best together.',
    definition:
      'A microchip is an implanted RFID device scanned by shelters/vets. An NFC pet tag is a wearable link to a digital profile for the public.',
    optionA: 'NFC / smart collar tag',
    optionB: 'Microchip',
    clusterId: 'pet-identification',
    keywords: ['NFC vs microchip', 'microchip or tag', 'dog microchip Bangladesh'],
    lastReviewed: '2026-07-01',
    rows: [
      { aspect: 'Who can read it', a: 'Any person with a phone', b: 'Clinics/shelters with a scanner' },
      { aspect: 'Removable?', a: 'Yes (collar/tag)', b: 'Implanted under skin' },
      { aspect: 'Public contact', a: 'Designed for finders', b: 'Not for street finders' },
      { aspect: 'Permanence', a: 'Can be lost with collar', b: 'Stays with the animal' },
      { aspect: 'Profile richness', a: 'Photos, notes, messaging', b: 'Registry ID + contact on file' },
    ],
    verdict:
      'Use both. Microchips protect when the collar is gone; NFC/QR tags help the neighbor who finds your pet today.',
    prosA: ['Public-friendly', 'Rich emergency profile', 'Easy to update'],
    prosB: ['Cannot fall off', 'Industry standard at clinics', 'Long-term proof of ID'],
    consA: ['Relies on collar remaining on', 'Hardware can wear'],
    consB: ['Public cannot scan it', 'Requires registry contact accuracy'],
    relatedGuideSlugs: ['pet-identification-methods', 'what-is-an-nfc-pet-tag'],
    relatedPaths: [
      { label: 'Smart tags', path: '/tags' },
      { label: 'Find a vet', path: '/vets' },
    ],
    faqs: [
      {
        question: 'Does an NFC tag replace a microchip?',
        answer:
          'No. Keep the microchip for permanent ID and add a smart tag for finder contact.',
      },
    ],
  },
  {
    slug: 'smart-tag-vs-engraved-collar',
    title: 'Smart Tag vs Engraved Collar Tag',
    intent: 'commercial',
    summary:
      'Engraved tags show a phone number instantly; smart tags add privacy controls, medical notes, and lost-mode messaging.',
    definition:
      'Engraved collar tags permanently display contact text. Smart tags open a controllable digital profile via NFC/QR.',
    optionA: 'Smart NFC/QR tag',
    optionB: 'Engraved metal tag',
    clusterId: 'pet-identification',
    keywords: ['smart tag vs engraved', 'metal dog tag vs QR', 'best pet ID tag'],
    lastReviewed: '2026-07-01',
    rows: [
      { aspect: 'Immediate readability', a: 'Needs phone', b: 'Readable by eye' },
      { aspect: 'Privacy', a: 'Hide phone; use messaging', b: 'Phone number is public' },
      { aspect: 'Update details', a: 'Edit online anytime', b: 'Must remake the tag' },
      { aspect: 'Medical notes', a: 'Supported', b: 'Limited space' },
      { aspect: 'Power/battery', a: 'None (passive)', b: 'None' },
    ],
    verdict:
      'Ideal setup: engraved first name + “Scan for contact” plus a smart profile — or a dual smart tag with a short visible cue.',
    prosA: ['Privacy + rich data', 'Lost mode', 'Easy updates'],
    prosB: ['Works with zero tech', 'Cheap and simple', 'Always visible'],
    consA: ['Requires a phone to open details'],
    consB: ['Public phone number', 'Hard to update', 'No medical depth'],
    relatedGuideSlugs: ['digital-pet-id-explained', 'pet-identification-methods'],
    relatedPaths: [{ label: 'Smart tags', path: '/tags' }],
    faqs: [],
  },
]

export function getComparison(slug: string): Comparison | undefined {
  return COMPARISONS.find((c) => c.slug === slug)
}

export function allCompareSlugs(): string[] {
  return COMPARISONS.map((c) => c.slug)
}
