/**
 * Topic clusters for topical authority.
 * Each cluster: cornerstone → supporting guides → comparisons → FAQs → products.
 */

export type Intent = 'informational' | 'commercial' | 'transactional' | 'navigational'

export type TopicCluster = {
  id: string
  name: string
  slug: string
  intent: Intent
  definition: string
  cornerstonePath: string
  keywords: string[]
  relatedProductPath: string
  guideSlugs: string[]
  compareSlugs: string[]
  faqIds: string[]
}

export const TOPIC_CLUSTERS: TopicCluster[] = [
  {
    id: 'nfc-pet-tags',
    name: 'NFC Pet Tags',
    slug: 'nfc-pet-tags',
    intent: 'commercial',
    definition:
      'An NFC pet tag is a wearable identifier that opens a digital pet profile when tapped with a smartphone, helping lost pets return home faster.',
    cornerstonePath: '/guides/what-is-an-nfc-pet-tag',
    keywords: ['NFC pet tag', 'smart pet tag', 'digital pet ID', 'lost pet recovery'],
    relatedProductPath: '/tags',
    guideSlugs: [
      'what-is-an-nfc-pet-tag',
      'how-nfc-pet-tags-work',
      'waterproof-nfc-pet-tags',
      'lost-pet-recovery-with-smart-tags',
      'pet-emergency-information-on-tags',
    ],
    compareSlugs: ['nfc-vs-qr-pet-tags', 'nfc-vs-microchip', 'smart-tag-vs-engraved-collar'],
    faqIds: ['nfc-how', 'nfc-privacy', 'nfc-phone'],
  },
  {
    id: 'lost-pet-recovery',
    name: 'Lost Pet Recovery',
    slug: 'lost-pet-recovery',
    intent: 'informational',
    definition:
      'Lost pet recovery is the process of finding and reuniting a missing cat or dog using identification, neighborhood alerts, shelters, and digital profiles.',
    cornerstonePath: '/emergency',
    keywords: ['lost pet', 'find lost dog', 'find lost cat', 'pet recovery Bangladesh'],
    relatedProductPath: '/tags',
    guideSlugs: [
      'lost-pet-recovery-with-smart-tags',
      'what-to-do-if-your-pet-is-lost',
      'how-to-prepare-for-pet-emergencies',
    ],
    compareSlugs: ['nfc-vs-microchip'],
    faqIds: ['lost-first-steps', 'lost-tag-scan'],
  },
  {
    id: 'pet-identification',
    name: 'Pet Identification',
    slug: 'pet-identification',
    intent: 'informational',
    definition:
      'Pet identification includes microchips, collar tags, QR codes, and NFC smart tags that help strangers and clinics contact owners quickly.',
    cornerstonePath: '/learn',
    keywords: ['pet ID', 'pet identification', 'dog ID tag', 'cat ID tag'],
    relatedProductPath: '/tags',
    guideSlugs: ['pet-identification-methods', 'digital-pet-id-explained'],
    compareSlugs: ['nfc-vs-qr-pet-tags', 'nfc-vs-microchip', 'smart-tag-vs-engraved-collar'],
    faqIds: ['id-methods'],
  },
  {
    id: 'cat-safety',
    name: 'Cat Safety',
    slug: 'cat-safety',
    intent: 'informational',
    definition:
      'Cat safety covers indoor/outdoor risks, identification, toxic plants, traffic, and emergency contacts for feline owners.',
    cornerstonePath: '/guides/cat-safety-essentials',
    keywords: ['cat safety', 'keep cats safe', 'outdoor cat risks'],
    relatedProductPath: '/shop?catalog=pet_animal',
    guideSlugs: ['cat-safety-essentials', 'indoor-vs-outdoor-cats'],
    compareSlugs: [],
    faqIds: ['cat-collar'],
  },
  {
    id: 'dog-safety',
    name: 'Dog Safety',
    slug: 'dog-safety',
    intent: 'informational',
    definition:
      'Dog safety includes leash habits, heat risk, identification tags, traffic awareness, and emergency preparedness for canine owners.',
    cornerstonePath: '/guides/dog-safety-essentials',
    keywords: ['dog safety', 'keep dogs safe', 'dog walking safety'],
    relatedProductPath: '/shop?catalog=pet_animal',
    guideSlugs: ['dog-safety-essentials', 'heat-safety-for-dogs'],
    compareSlugs: [],
    faqIds: ['dog-tag'],
  },
  {
    id: 'pet-health-records',
    name: 'Pet Health Records',
    slug: 'pet-health-records',
    intent: 'informational',
    definition:
      'Pet health records store vaccination history, medications, allergies, and vet contacts so caregivers can act quickly in emergencies.',
    cornerstonePath: '/guides/pet-health-records-explained',
    keywords: ['pet health records', 'vaccination card', 'pet medical history'],
    relatedProductPath: '/dashboard/pets',
    guideSlugs: ['pet-health-records-explained', 'what-to-include-in-pet-emergency-info'],
    compareSlugs: [],
    faqIds: ['health-records'],
  },
  {
    id: 'pet-travel',
    name: 'Pet Travel',
    slug: 'pet-travel',
    intent: 'informational',
    definition:
      'Pet travel planning covers carriers, identification, vaccinations, heat, rest stops, and documents needed for trips with cats or dogs.',
    cornerstonePath: '/guides/pet-travel-checklist',
    keywords: ['pet travel', 'travel with dog', 'travel with cat Bangladesh'],
    relatedProductPath: '/shop?catalog=pet_animal',
    guideSlugs: ['pet-travel-checklist', 'car-travel-with-pets'],
    compareSlugs: [],
    faqIds: ['travel-id'],
  },
  {
    id: 'pet-ownership',
    name: 'Pet Ownership',
    slug: 'pet-ownership',
    intent: 'informational',
    definition:
      'Responsible pet ownership means providing food, shelter, veterinary care, identification, enrichment, and lifelong commitment.',
    cornerstonePath: '/guides/responsible-pet-ownership',
    keywords: ['pet ownership', 'first time pet owner', 'responsible pet care'],
    relatedProductPath: '/pets',
    guideSlugs: ['responsible-pet-ownership', 'first-week-with-a-new-pet'],
    compareSlugs: [],
    faqIds: ['ownership-basics'],
  },
]

export function getClusterBySlug(slug: string): TopicCluster | undefined {
  return TOPIC_CLUSTERS.find((c) => c.slug === slug)
}
