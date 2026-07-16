import type { Intent } from './topic-clusters'

export type GuideSection = {
  heading: string
  body: string
  bullets?: string[]
}

export type Guide = {
  slug: string
  title: string
  intent: Intent
  summary: string
  definition: string
  clusterId: string
  keywords: string[]
  relatedCompareSlugs?: string[]
  relatedPaths?: { label: string; path: string }[]
  sections: GuideSection[]
  faqs: { question: string; answer: string }[]
  lastReviewed: string
}

export const GUIDES: Guide[] = [
  {
    slug: 'what-is-an-nfc-pet-tag',
    title: 'What Is an NFC Pet Tag?',
    intent: 'informational',
    summary:
      'An NFC pet tag is a small wearable chip that opens a digital pet profile when tapped with a phone — helping finders contact owners quickly.',
    definition:
      'NFC (Near Field Communication) pet tags store a link to a private online profile. When someone taps a compatible phone or scans a backup QR code, they see emergency pet information and can message the owner without needing a public phone number.',
    clusterId: 'nfc-pet-tags',
    keywords: ['what is NFC pet tag', 'NFC dog tag', 'digital pet ID'],
    relatedCompareSlugs: ['nfc-vs-qr-pet-tags', 'nfc-vs-microchip'],
    relatedPaths: [
      { label: 'KediSmart Smart Tags', path: '/tags' },
      { label: 'Lost pet emergency steps', path: '/emergency' },
    ],
    lastReviewed: '2026-07-01',
    sections: [
      {
        heading: 'How it helps in real life',
        body: 'If a dog or cat slips out, a finder may not know who to call. An NFC or QR tag turns the collar into a contact channel: tap or scan, then send a message through the profile.',
        bullets: [
          'Works with most modern smartphones',
          'QR backup for phones without NFC',
          'Owner controls what details are visible',
          'Lost mode can enable anonymous messaging',
        ],
      },
      {
        heading: 'What an NFC tag is not',
        body: 'It is not a GPS tracker and does not replace a microchip. NFC tags help when a person finds your pet; microchips help when a clinic or shelter scans your pet.',
      },
      {
        heading: 'Best practice for Bangladesh pet owners',
        body: 'Combine a readable collar tag, a KediSmart NFC/QR profile, and a microchip when available. Keep vaccination and emergency contacts updated in the digital profile.',
      },
    ],
    faqs: [
      {
        question: 'Do finders need an app?',
        answer:
          'No. NFC taps and QR scans open a web profile in the phone browser. No special app is required for the finder.',
      },
      {
        question: 'Is NFC waterproof?',
        answer:
          'Quality pet tags are designed for daily wear, including rain and baths. Always check the product rating and replace damaged hardware.',
      },
    ],
  },
  {
    slug: 'how-nfc-pet-tags-work',
    title: 'How NFC Pet Tags Work',
    intent: 'informational',
    summary:
      'NFC pet tags use a short-range wireless chip linked to a secure web profile. A tap or QR scan opens owner-controlled pet details.',
    definition:
      'An NFC pet tag contains a passive chip powered by the phone’s magnetic field. The chip returns a URL; the phone opens the pet’s digital ID page.',
    clusterId: 'nfc-pet-tags',
    keywords: ['how NFC works', 'NFC pet tag how to', 'scan pet tag'],
    relatedPaths: [
      { label: 'Shop smart tags', path: '/tags' },
      { label: 'NFC vs QR', path: '/compare/nfc-vs-qr-pet-tags' },
    ],
    lastReviewed: '2026-07-01',
    sections: [
      {
        heading: 'Step-by-step',
        body: 'From setup to reunion, the flow is simple.',
        bullets: [
          'Owner creates a pet profile on KediSmart',
          'Tag is linked to that profile (NFC + QR)',
          'Finder taps or scans the tag',
          'Finder sees allowed details and can message the owner',
          'Owner arranges a safe meetup',
        ],
      },
      {
        heading: 'Privacy controls',
        body: 'You choose what finders see — pet name, photo, medical notes, or anonymous contact only. Personal home address should stay private.',
      },
    ],
    faqs: [
      {
        question: 'What if NFC does not work on a phone?',
        answer:
          'Use the printed QR code. Camera apps on Android and iPhone can open the same profile URL.',
      },
    ],
  },
  {
    slug: 'waterproof-nfc-pet-tags',
    title: 'Waterproof NFC Pet Tags',
    intent: 'commercial',
    summary:
      'Waterproof NFC pet tags are built for rain, baths, and muddy walks so the digital ID stays readable outdoors.',
    definition:
      'A waterproof NFC pet tag seals the chip in a durable housing rated for moisture so everyday weather does not destroy the link to your pet’s profile.',
    clusterId: 'nfc-pet-tags',
    keywords: ['waterproof NFC pet tag', 'durable dog tag', 'swim safe pet tag'],
    relatedPaths: [{ label: 'Smart tags', path: '/tags' }],
    lastReviewed: '2026-07-01',
    sections: [
      {
        heading: 'What to look for',
        bullets: [
          'Sealed housing (not paper stickers)',
          'Strong ring or slider that resists snagging',
          'QR printed or laser-etched as backup',
          'Comfortable weight for cats and small dogs',
        ],
        body: 'Durability matters more than novelty designs. Prioritize seal quality and a scannable backup.',
      },
    ],
    faqs: [
      {
        question: 'Can my pet swim with an NFC tag?',
        answer:
          'Many sealed tags tolerate swimming and baths, but inspect after salt water or heavy wear and replace if the QR becomes unreadable.',
      },
    ],
  },
  {
    slug: 'lost-pet-recovery-with-smart-tags',
    title: 'Lost Pet Recovery with Smart Tags',
    intent: 'informational',
    summary:
      'Smart tags speed lost pet recovery by giving finders an instant, private way to contact you.',
    definition:
      'Smart-tag recovery means a finder uses NFC or QR on the collar to open a digital profile and message the owner, reducing delays caused by missing phone numbers.',
    clusterId: 'lost-pet-recovery',
    keywords: ['lost pet recovery', 'find lost dog with NFC', 'QR pet tag lost'],
    relatedPaths: [
      { label: 'Emergency center', path: '/emergency' },
      { label: 'Smart tags', path: '/tags' },
    ],
    lastReviewed: '2026-07-01',
    sections: [
      {
        heading: 'Why minutes matter',
        body: 'Most reunions happen when a neighbor finds the pet nearby. A working tag converts that moment into a contact — before the pet wanders farther.',
      },
      {
        heading: 'Pair with classic steps',
        bullets: [
          'Search the immediate area calmly',
          'Ask neighbors and building staff',
          'Post clear photos locally',
          'Check shelters and vets',
          'Keep the digital profile in lost mode',
        ],
        body: 'Smart tags complement — they do not replace — neighborhood search and shelter checks.',
      },
    ],
    faqs: [
      {
        question: 'Should I turn on lost mode?',
        answer:
          'Yes. Lost mode signals that the pet is missing and can unlock anonymous messaging for finders while limiting unnecessary personal data.',
      },
    ],
  },
  {
    slug: 'pet-emergency-information-on-tags',
    title: 'Pet Emergency Information on Tags',
    intent: 'informational',
    summary:
      'Emergency fields on a digital pet ID — allergies, medications, vet contact — help finders and clinics act safely.',
    definition:
      'Pet emergency information is the set of medical and contact details shared through a tag profile so helpers can care for a found animal without guessing.',
    clusterId: 'nfc-pet-tags',
    keywords: ['pet emergency info', 'medical alert pet tag', 'allergy pet ID'],
    relatedPaths: [
      { label: 'Health records guide', path: '/guides/pet-health-records-explained' },
      { label: 'Smart tags', path: '/tags' },
    ],
    lastReviewed: '2026-07-01',
    sections: [
      {
        heading: 'Recommended fields',
        bullets: [
          'Pet name and photo',
          'Species, breed, age, sex',
          'Known allergies and medications',
          'Microchip number (optional)',
          'Preferred vet clinic',
          'Anonymous owner contact channel',
        ],
        body: 'Share what helpers need; withhold home address and private documents.',
      },
    ],
    faqs: [
      {
        question: 'Should vaccination PDFs be public?',
        answer:
          'Usually no. Keep documents private and share only summaries or unlock them when speaking with a vet or shelter.',
      },
    ],
  },
  {
    slug: 'what-to-do-if-your-pet-is-lost',
    title: 'What to Do If Your Pet Is Lost',
    intent: 'informational',
    summary:
      'Act fast but calmly: search nearby, alert neighbors, enable lost mode on your digital tag, and check clinics.',
    definition:
      'A lost-pet action plan is a prioritized checklist owners follow in the first hours after a cat or dog goes missing.',
    clusterId: 'lost-pet-recovery',
    keywords: ['pet lost what to do', 'missing dog steps', 'missing cat checklist'],
    relatedPaths: [{ label: 'Emergency center', path: '/emergency' }],
    lastReviewed: '2026-07-01',
    sections: [
      {
        heading: 'First 30 minutes',
        bullets: [
          'Search rooms, balconies, rooftops, and nearby alleys',
          'Call the pet with familiar cues',
          'Ask security guards and shopkeepers',
          'Enable lost mode on the KediSmart profile',
        ],
        body: 'Most pets are close by at first. Exhaust the immediate radius before driving farther.',
      },
      {
        heading: 'Next few hours',
        bullets: [
          'Share a clear photo and last-seen location',
          'Visit nearby vets and shelters with a photo',
          'Leave food/water near the exit point for cats',
          'Keep your phone charged for finder messages',
        ],
        body: 'Consistency beats panic posts. Update one accurate flyer and profile.',
      },
    ],
    faqs: [
      {
        question: 'Should I wait overnight before searching?',
        answer:
          'No. Start immediately. Cats may hide and return later, but early neighbor alerts still help.',
      },
    ],
  },
  {
    slug: 'how-to-prepare-for-pet-emergencies',
    title: 'How to Prepare for Pet Emergencies',
    intent: 'informational',
    summary:
      'Prepare a go-bag, digital ID, vet contacts, and transport plan before an emergency happens.',
    definition:
      'Pet emergency preparedness means organizing identification, medical summaries, carriers, and contacts so you can respond under stress.',
    clusterId: 'lost-pet-recovery',
    keywords: ['pet emergency prep', 'pet go bag', 'disaster plan pets'],
    relatedPaths: [
      { label: 'Emergency center', path: '/emergency' },
      { label: 'Find a vet', path: '/vets' },
    ],
    lastReviewed: '2026-07-01',
    sections: [
      {
        heading: 'Preparedness checklist',
        bullets: [
          'Working collar + NFC/QR tag',
          'Updated digital pet profile',
          'Carrier and leash ready',
          'Printed vet number',
          '3–7 days of food and medication',
        ],
        body: 'Review the kit every six months and after any medication change.',
      },
    ],
    faqs: [],
  },
  {
    slug: 'pet-identification-methods',
    title: 'Pet Identification Methods Explained',
    intent: 'informational',
    summary:
      'Collar tags, QR/NFC smart tags, and microchips solve different parts of pet identification — best results come from combining them.',
    definition:
      'Pet identification methods are tools that link an animal to an owner or medical record when the pet is found or treated.',
    clusterId: 'pet-identification',
    keywords: ['pet ID methods', 'microchip vs tag', 'dog identification'],
    relatedCompareSlugs: ['nfc-vs-microchip', 'nfc-vs-qr-pet-tags'],
    relatedPaths: [{ label: 'Learn hub', path: '/learn' }],
    lastReviewed: '2026-07-01',
    sections: [
      {
        heading: 'Quick comparison',
        body: 'Visual tags help people. Microchips help clinics. Smart tags help both by connecting a finder to a private digital profile.',
        bullets: [
          'Engraved tag: immediate phone number, no battery',
          'QR/NFC: rich profile + privacy controls',
          'Microchip: permanent ID when scanned professionally',
        ],
      },
    ],
    faqs: [
      {
        question: 'Is one method enough?',
        answer:
          'One method is better than none, but layered identification (collar + smart profile + microchip) is the gold standard.',
      },
    ],
  },
  {
    slug: 'digital-pet-id-explained',
    title: 'Digital Pet ID Explained',
    intent: 'informational',
    summary:
      'A digital pet ID is an online profile linked to a tag that stores emergency details and contact channels.',
    definition:
      'Digital pet ID is a secure web profile for a specific animal, accessed via NFC, QR, or account login, used for recovery and care coordination.',
    clusterId: 'pet-identification',
    keywords: ['digital pet ID', 'online pet profile', 'smart pet identity'],
    relatedPaths: [{ label: 'Smart tags', path: '/tags' }],
    lastReviewed: '2026-07-01',
    sections: [
      {
        heading: 'What belongs in a digital ID',
        bullets: [
          'Identity (name, photo, species)',
          'Medical notes relevant to first aid',
          'Owner contact preferences',
          'Lost/found status',
        ],
        body: 'Think of it as a living ID card — update it when medications or phone numbers change.',
      },
    ],
    faqs: [],
  },
  {
    slug: 'cat-safety-essentials',
    title: 'Cat Safety Essentials',
    intent: 'informational',
    summary:
      'Cat safety starts with secure windows, identification, toxin awareness, and a plan if your cat slips outside.',
    definition:
      'Cat safety essentials are the core habits and tools that reduce preventable injuries and lost-cat incidents.',
    clusterId: 'cat-safety',
    keywords: ['cat safety', 'keep indoor cat safe', 'cat collar tag'],
    relatedPaths: [
      { label: 'Cat care guides', path: '/pets' },
      { label: 'Smart tags', path: '/tags' },
    ],
    lastReviewed: '2026-07-01',
    sections: [
      {
        heading: 'High-impact habits',
        bullets: [
          'Screen balconies and open windows',
          'Use a breakaway collar with ID',
          'Keep toxic plants and chemicals out of reach',
          'Maintain a current digital profile',
        ],
        body: 'Indoor cats still need identification — they escape more often than owners expect.',
      },
    ],
    faqs: [
      {
        question: 'Should cats wear collars?',
        answer:
          'Yes, if using a breakaway (safety) collar sized correctly. Pair with a microchip and digital tag profile.',
      },
    ],
  },
  {
    slug: 'indoor-vs-outdoor-cats',
    title: 'Indoor vs Outdoor Cats',
    intent: 'informational',
    summary:
      'Indoor living generally lowers traffic and disease risk; outdoor access needs supervised strategies and strong ID.',
    definition:
      'Indoor vs outdoor is a lifestyle choice balancing enrichment against exposure to traffic, fights, parasites, and getting lost.',
    clusterId: 'cat-safety',
    keywords: ['indoor cat', 'outdoor cat risks', 'cat lifestyle'],
    relatedPaths: [{ label: 'Cat safety', path: '/guides/cat-safety-essentials' }],
    lastReviewed: '2026-07-01',
    sections: [
      {
        heading: 'Safer outdoor options',
        bullets: ['Harness walks', 'Catio / enclosed balcony', 'Supervised garden time'],
        body: 'If your cat goes outside, identification and vaccination status become non-negotiable.',
      },
    ],
    faqs: [],
  },
  {
    slug: 'dog-safety-essentials',
    title: 'Dog Safety Essentials',
    intent: 'informational',
    summary:
      'Dog safety focuses on leash control, heat awareness, visible ID, and training that reduces bolt risk.',
    definition:
      'Dog safety essentials are daily practices that prevent escapes, heatstroke, and road accidents.',
    clusterId: 'dog-safety',
    keywords: ['dog safety', 'dog leash safety', 'dog ID tag'],
    relatedPaths: [
      { label: 'Smart tags', path: '/tags' },
      { label: 'Find a vet', path: '/vets' },
    ],
    lastReviewed: '2026-07-01',
    sections: [
      {
        heading: 'Daily checklist',
        bullets: [
          'Secure collar + smart tag',
          'Leash before opening exterior doors',
          'Water on warm-weather walks',
          'Avoid peak midday heat in Bangladesh summers',
        ],
        body: 'Most preventable incidents happen at doorways and during hot walks.',
      },
    ],
    faqs: [],
  },
  {
    slug: 'heat-safety-for-dogs',
    title: 'Heat Safety for Dogs',
    intent: 'informational',
    summary:
      'Dogs overheat quickly. Walk early or late, provide water, and never leave a dog in a parked vehicle.',
    definition:
      'Heat safety for dogs means managing exercise, shade, hydration, and vehicle risk during hot and humid weather.',
    clusterId: 'dog-safety',
    keywords: ['dog heatstroke', 'summer dog care', 'hot weather dogs Bangladesh'],
    relatedPaths: [{ label: 'Find a vet', path: '/vets' }],
    lastReviewed: '2026-07-01',
    sections: [
      {
        heading: 'Warning signs',
        bullets: ['Heavy panting', 'Drooling', 'Weakness', 'Bright red gums', 'Collapse'],
        body: 'Heatstroke is an emergency — cool gradually and contact a veterinarian immediately.',
      },
    ],
    faqs: [],
  },
  {
    slug: 'pet-health-records-explained',
    title: 'Pet Health Records Explained',
    intent: 'informational',
    summary:
      'Organized pet health records speed vet visits and help finders share critical allergies or medications.',
    definition:
      'Pet health records are the chronological medical history of an animal: vaccines, diagnoses, prescriptions, and clinic notes.',
    clusterId: 'pet-health-records',
    keywords: ['pet health records', 'vaccination record dog', 'cat medical history'],
    relatedPaths: [
      { label: 'My Pets dashboard', path: '/dashboard/pets' },
      { label: 'Emergency info guide', path: '/guides/what-to-include-in-pet-emergency-info' },
    ],
    lastReviewed: '2026-07-01',
    sections: [
      {
        heading: 'Keep both paper and digital',
        body: 'Store clinic papers safely and mirror key facts in your KediSmart pet profile for emergencies.',
        bullets: ['Vaccines + dates', 'Chronic conditions', 'Current medications', 'Allergies', 'Clinic phone'],
      },
    ],
    faqs: [],
  },
  {
    slug: 'what-to-include-in-pet-emergency-info',
    title: 'What to Include in Pet Emergency Info',
    intent: 'informational',
    summary:
      'Emergency info should answer: Who is this pet? What medical risks matter now? How do I reach the owner safely?',
    definition:
      'Pet emergency info is a short, high-signal summary designed for strangers and clinicians under time pressure.',
    clusterId: 'pet-health-records',
    keywords: ['pet emergency card', 'pet medical alert', 'first aid pet info'],
    relatedPaths: [{ label: 'Smart tags', path: '/tags' }],
    lastReviewed: '2026-07-01',
    sections: [
      {
        heading: 'Template',
        bullets: [
          'Name + photo',
          '“Friendly / nervous / bites when scared” temperament note',
          'Allergies',
          'Daily medications',
          'Owner contact via secure channel',
        ],
        body: 'Avoid publishing your home address on a public-facing tag page.',
      },
    ],
    faqs: [],
  },
  {
    slug: 'pet-travel-checklist',
    title: 'Pet Travel Checklist',
    intent: 'informational',
    summary:
      'Before traveling with a pet, confirm ID tags, carrier fit, water, medications, and destination pet rules.',
    definition:
      'A pet travel checklist is a pre-trip list covering identification, comfort, documents, and safety for cars, buses, or flights.',
    clusterId: 'pet-travel',
    keywords: ['pet travel checklist', 'travel with pets Bangladesh', 'dog car trip'],
    relatedPaths: [
      { label: 'Car travel guide', path: '/guides/car-travel-with-pets' },
      { label: 'Shop travel gear', path: '/shop?catalog=pet_animal' },
    ],
    lastReviewed: '2026-07-01',
    sections: [
      {
        heading: 'Before you leave',
        bullets: [
          'Secure collar + digital tag profile',
          'Carrier sized for standing and turning',
          'Water bottle and foldable bowl',
          'Medications + dosing notes',
          'Vet contact and recent photo',
        ],
        body: 'Update the digital profile with a temporary travel contact if needed.',
      },
    ],
    faqs: [],
  },
  {
    slug: 'car-travel-with-pets',
    title: 'Car Travel with Pets',
    intent: 'informational',
    summary:
      'Secure pets in a carrier or harness, never leave them in a hot car, and schedule cool-hour stops.',
    definition:
      'Car travel with pets means transporting animals in vehicles with restraint, ventilation, hydration, and heat safeguards.',
    clusterId: 'pet-travel',
    keywords: ['dog in car', 'cat carrier car', 'pet road trip'],
    relatedPaths: [{ label: 'Pet travel checklist', path: '/guides/pet-travel-checklist' }],
    lastReviewed: '2026-07-01',
    sections: [
      {
        heading: 'Non-negotiables',
        bullets: [
          'Never leave pets in parked cars in heat',
          'Use a carrier or crash-aware harness',
          'Keep windows safe — no full-body hanging out',
        ],
        body: 'Unrestrained pets become projectiles in sudden stops.',
      },
    ],
    faqs: [],
  },
  {
    slug: 'responsible-pet-ownership',
    title: 'Responsible Pet Ownership',
    intent: 'informational',
    summary:
      'Responsible ownership means lifelong care: nutrition, vet visits, identification, enrichment, and planning for absences.',
    definition:
      'Responsible pet ownership is the ethical commitment to meet an animal’s physical, medical, and emotional needs for its entire life.',
    clusterId: 'pet-ownership',
    keywords: ['responsible pet ownership', 'pet parent duties', 'first pet tips'],
    relatedPaths: [
      { label: 'Care guides', path: '/pets' },
      { label: 'Marketplace', path: '/marketplace' },
    ],
    lastReviewed: '2026-07-01',
    sections: [
      {
        heading: 'Core responsibilities',
        bullets: [
          'Appropriate food and clean water',
          'Preventive veterinary care',
          'Identification (tag + digital ID ± microchip)',
          'Safe housing and enrichment',
          'Budget for emergencies',
        ],
        body: 'If you cannot commit long-term, consider fostering or supporting shelters instead of buying.',
      },
    ],
    faqs: [],
  },
  {
    slug: 'first-week-with-a-new-pet',
    title: 'First Week with a New Pet',
    intent: 'informational',
    summary:
      'Keep the first week calm: set a routine, schedule a vet check, set up ID tags, and introduce the home gradually.',
    definition:
      'The first week with a new pet is a settling period focused on safety, bonding, health screening, and environment familiarization.',
    clusterId: 'pet-ownership',
    keywords: ['new puppy first week', 'new kitten checklist', 'bringing pet home'],
    relatedPaths: [
      { label: 'Find a vet', path: '/vets' },
      { label: 'Smart tags', path: '/tags' },
    ],
    lastReviewed: '2026-07-01',
    sections: [
      {
        heading: 'Day-one priorities',
        bullets: [
          'Quiet space with water, litter/pad, and bed',
          'Book a wellness exam',
          'Fit a collar and activate a digital tag',
          'Puppy/kitten-proof cables and toxins',
        ],
        body: 'Avoid overwhelming social visits until the pet eats and rests normally.',
      },
    ],
    faqs: [],
  },
]

export function getGuide(slug: string): Guide | undefined {
  return GUIDES.find((g) => g.slug === slug)
}

export function allGuideSlugs(): string[] {
  return GUIDES.map((g) => g.slug)
}
