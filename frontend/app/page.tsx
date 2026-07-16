import Link from 'next/link'
import { api } from '@/lib/api'
import PetImage from '@/components/PetImage'
import FeaturedProductGrid from '@/components/FeaturedProductGrid'
import SmartTagsPromo from '@/components/SmartTagsPromo'
import { buildPageMetadata } from '@/lib/seo'

export const metadata = buildPageMetadata({
  title: 'KediSmart — Pet & Animal and General Products',
  description:
    'One marketplace for Pet & Animal care and General Products — shop, care, connect, and get everyday essentials on KediSmart.',
  path: '/',
})

/** Curated lifestyle photos — pets/animals must show real animals, not product packaging. */
const PET_ANIMAL_PHOTOS = [
  { src: '/samples/dog-golden.jpg', alt: 'Happy golden retriever', label: 'Dogs' },
  { src: '/samples/cat-persian.jpg', alt: 'Persian cat', label: 'Cats' },
  { src: '/samples/bird-budgie.jpg', alt: 'Budgie bird', label: 'Birds' },
  { src: '/samples/rabbit.jpg', alt: 'Pet rabbit', label: 'Rabbits' },
  { src: '/samples/dog-lab.jpg', alt: 'Labrador dog', label: 'Dogs' },
  { src: '/samples/cat-siamese.jpg', alt: 'Siamese cat', label: 'Cats' },
] as const

const GENERAL_PHOTOS = [
  { src: '/samples/backpack.jpg', alt: 'Travel backpack', label: 'Bags' },
  { src: '/samples/earbuds.jpg', alt: 'Wireless earbuds', label: 'Electronics' },
  { src: '/samples/shoes.jpg', alt: 'Fashion shoes', label: 'Fashion' },
  { src: '/samples/lamp.jpg', alt: 'Home lamp', label: 'Home' },
  { src: '/samples/speaker.jpg', alt: 'Bluetooth speaker', label: 'Audio' },
  { src: '/samples/tshirt.jpg', alt: 'Casual t-shirt', label: 'Apparel' },
] as const

async function getFeatured() {
  try {
    const [petProducts, generalProducts, posts] = await Promise.all([
      api.get('/shop/products?limit=4&catalog=pet_animal').catch(() => ({ items: [] })),
      api.get('/shop/products?limit=4&catalog=general').catch(() => ({ items: [] })),
      api.get('/blog/posts?limit=3').catch(() => ({ items: [] })),
    ])
    return {
      petProducts: petProducts.items || [],
      generalProducts: generalProducts.items || [],
      posts: posts.items || [],
    }
  } catch {
    return { petProducts: [], generalProducts: [], posts: [] }
  }
}

export default async function HomePage() {
  const { petProducts, generalProducts, posts } = await getFeatured()

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative bg-gradient-to-br from-primary-500 via-primary-600 to-primary-800 text-white overflow-hidden">
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute top-10 left-10 w-72 h-72 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-white rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 sm:pt-16 lg:pt-20 pb-8 sm:pb-10">
          <div className="max-w-3xl mx-auto text-center mb-8 sm:mb-10 lg:mb-12">
            <p className="inline-block mb-3 sm:mb-4 px-3 sm:px-4 py-1.5 sm:py-2 bg-white/20 backdrop-blur-sm rounded-full text-xs sm:text-sm font-medium">
              Pets &amp; Animals · General Products
            </p>
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold mb-4 sm:mb-5 leading-tight">
              Care for your pets
              <span className="block text-primary-100">and shop for your home</span>
            </h1>
            <p className="text-base sm:text-lg lg:text-xl text-primary-100 leading-relaxed mb-6 sm:mb-8 px-1">
              Dogs, cats, birds, rabbits — plus electronics, fashion, and everyday essentials.
              One trusted KediSmart marketplace.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/shop?catalog=pet_animal"
                className="inline-flex items-center justify-center min-h-[48px] bg-white text-primary-700 px-6 sm:px-8 py-3.5 rounded-lg font-semibold hover:bg-primary-50 transition shadow-xl text-center"
              >
                Shop Pets &amp; Animals
              </Link>
              <Link
                href="/shop?catalog=general"
                className="inline-flex items-center justify-center min-h-[48px] bg-primary-800/40 border-2 border-white/35 text-white px-6 sm:px-8 py-3.5 rounded-lg font-semibold hover:bg-primary-800/60 transition text-center"
              >
                Shop General Products
              </Link>
            </div>
          </div>

          {/* Equal split visual — pets/animals vs general */}
          <div className="grid md:grid-cols-2 gap-4 lg:gap-5 max-w-6xl mx-auto">
            <Link
              href="/shop?catalog=pet_animal"
              className="group relative min-h-[280px] sm:min-h-[340px] rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/20"
            >
              <PetImage
                src={PET_ANIMAL_PHOTOS[0].src}
                alt={PET_ANIMAL_PHOTOS[0].alt}
                className="absolute inset-0 w-full h-full object-cover transition duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
                <p className="text-xs font-bold uppercase tracking-widest text-primary-200 mb-1">
                  Catalog
                </p>
                <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">Pets &amp; Animals</h2>
                <p className="text-sm text-white/85 mb-3 max-w-sm">
                  Dogs, cats, birds, rabbits — food, care, vets, and live animals
                </p>
                <span className="inline-flex text-sm font-semibold text-white underline underline-offset-4">
                  Browse Pet &amp; Animal →
                </span>
              </div>
              {/* Mini animal strip */}
              <div className="absolute top-3 right-3 flex -space-x-2">
                {PET_ANIMAL_PHOTOS.slice(1, 4).map((p) => (
                  <span
                    key={p.src}
                    className="w-11 h-11 rounded-full overflow-hidden ring-2 ring-white/80 shadow"
                  >
                    <PetImage src={p.src} alt={p.alt} className="w-full h-full object-cover" />
                  </span>
                ))}
              </div>
            </Link>

            <Link
              href="/shop?catalog=general"
              className="group relative min-h-[280px] sm:min-h-[340px] rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/20"
            >
              <PetImage
                src={GENERAL_PHOTOS[0].src}
                alt={GENERAL_PHOTOS[0].alt}
                className="absolute inset-0 w-full h-full object-cover transition duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
                <p className="text-xs font-bold uppercase tracking-widest text-stone-200 mb-1">
                  Catalog
                </p>
                <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">General Products</h2>
                <p className="text-sm text-white/85 mb-3 max-w-sm">
                  Electronics, fashion, home, beauty — everyday essentials for your household
                </p>
                <span className="inline-flex text-sm font-semibold text-white underline underline-offset-4">
                  Browse General Products →
                </span>
              </div>
              <div className="absolute top-3 right-3 flex -space-x-2">
                {GENERAL_PHOTOS.slice(1, 4).map((p) => (
                  <span
                    key={p.src}
                    className="w-11 h-11 rounded-full overflow-hidden ring-2 ring-white/80 shadow"
                  >
                    <PetImage src={p.src} alt={p.alt} className="w-full h-full object-cover" />
                  </span>
                ))}
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* Quick animal + general routes */}
      <section className="bg-white border-b border-gray-200 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-8">
            <p className="text-xs font-bold uppercase tracking-widest text-gray-500 shrink-0">
              Explore
            </p>
            <div className="flex flex-wrap gap-2">
              {[
                { href: '/shop?catalog=pet_animal', label: 'Dogs', img: '/samples/dog-golden.jpg' },
                { href: '/shop?catalog=pet_animal', label: 'Cats', img: '/samples/cat-persian.jpg' },
                { href: '/shop?catalog=pet_animal', label: 'Birds', img: '/samples/bird-budgie.jpg' },
                { href: '/shop?catalog=pet_animal', label: 'Rabbits', img: '/samples/rabbit.jpg' },
                { href: '/shop?catalog=general', label: 'Electronics', img: '/samples/earbuds.jpg' },
                { href: '/shop?catalog=general', label: 'Home', img: '/samples/lamp.jpg' },
                { href: '/shop?catalog=general', label: 'Fashion', img: '/samples/shoes.jpg' },
                { href: '/shop?catalog=general', label: 'Beauty', img: '/samples/serum.jpg' },
              ].map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 hover:border-primary-300 hover:bg-primary-50 px-3 py-1.5 text-sm font-medium text-gray-800 transition"
                >
                  <span className="w-7 h-7 rounded-full overflow-hidden shrink-0 bg-gray-200">
                    <PetImage src={item.img} alt={item.label} className="w-full h-full object-cover" />
                  </span>
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-10 bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div>
              <div className="text-3xl font-bold text-primary-600 mb-1">10K+</div>
              <div className="text-gray-600 text-sm">Happy Pets</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary-600 mb-1">500+</div>
              <div className="text-gray-600 text-sm">Expert Vets</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary-600 mb-1">5K+</div>
              <div className="text-gray-600 text-sm">Products</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary-600 mb-1">98%</div>
              <div className="text-gray-600 text-sm">Satisfaction</div>
            </div>
          </div>
        </div>
      </section>

      {/* Photo showcase — animals vs general side by side */}
      <section className="py-16 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-3">
              See both sides of KediSmart
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Real pets and animals on one side — stylish everyday products on the other.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            <div>
              <div className="flex items-end justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900">Pets &amp; Animals</h3>
                <Link href="/shop?catalog=pet_animal" className="text-sm font-semibold text-primary-700 hover:underline">
                  Shop all →
                </Link>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {PET_ANIMAL_PHOTOS.slice(0, 4).map((photo) => (
                  <Link
                    key={photo.src}
                    href="/shop?catalog=pet_animal"
                    className="relative aspect-square rounded-xl overflow-hidden shadow-md group"
                  >
                    <PetImage
                      src={photo.src}
                      alt={photo.alt}
                      className="w-full h-full object-cover transition group-hover:scale-105"
                    />
                    <span className="absolute bottom-2 left-2 text-xs font-bold uppercase tracking-wide bg-white/95 text-primary-800 px-2 py-1 rounded">
                      {photo.label}
                    </span>
                  </Link>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-end justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900">General Products</h3>
                <Link href="/shop?catalog=general" className="text-sm font-semibold text-stone-700 hover:underline">
                  Shop all →
                </Link>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {GENERAL_PHOTOS.slice(0, 4).map((photo) => (
                  <Link
                    key={photo.src}
                    href="/shop?catalog=general"
                    className="relative aspect-square rounded-xl overflow-hidden shadow-md group"
                  >
                    <PetImage
                      src={photo.src}
                      alt={photo.alt}
                      className="w-full h-full object-cover transition group-hover:scale-105"
                    />
                    <span className="absolute bottom-2 left-2 text-xs font-bold uppercase tracking-wide bg-white/95 text-stone-800 px-2 py-1 rounded">
                      {photo.label}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
              Everything in One Platform
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Pet care tools plus a full general store — for modern families in Bangladesh
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            {/* Knowledge Hub */}
            <div className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 group border border-gray-100">
              <div className="w-16 h-16 bg-gradient-to-br from-primary-100 to-primary-200 rounded-2xl flex items-center justify-center mb-6 transition-all duration-300 group-hover:scale-110 group-hover:bg-gradient-to-br group-hover:from-primary-500 group-hover:to-primary-600">
                <svg className="w-8 h-8 text-primary-600 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3 text-gray-900">Knowledge Hub</h3>
              <p className="text-gray-600 leading-relaxed">Expert guides and trusted advice on pet care, nutrition, health, and wellness</p>
            </div>

            {/* E-commerce */}
            <div className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 group border border-gray-100">
              <div className="w-16 h-16 bg-gradient-to-br from-primary-100 to-primary-200 rounded-2xl flex items-center justify-center mb-6 transition-all duration-300 group-hover:scale-110 group-hover:bg-gradient-to-br group-hover:from-primary-500 group-hover:to-primary-600">
                <svg className="w-8 h-8 text-primary-600 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3 text-gray-900">E-commerce</h3>
              <p className="text-gray-600 leading-relaxed">Pet supplies and general products — premium shopping for home and pets</p>
            </div>

            {/* Veterinary Services */}
            <div className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 group border border-gray-100">
              <div className="w-16 h-16 bg-gradient-to-br from-primary-100 to-primary-200 rounded-2xl flex items-center justify-center mb-6 transition-all duration-300 group-hover:scale-110 group-hover:bg-gradient-to-br group-hover:from-primary-500 group-hover:to-primary-600">
                <svg className="w-8 h-8 text-primary-600 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3 text-gray-900">Veterinary Services</h3>
              <p className="text-gray-600 leading-relaxed">Connect with qualified veterinarians for consultations, appointments, and expert care</p>
            </div>

            {/* NFC & QR Tag Scanning */}
            <Link
              href="/tags"
              className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 group border border-gray-100 block"
            >
              <div className="w-16 h-16 bg-gradient-to-br from-primary-100 to-primary-200 rounded-2xl flex items-center justify-center mb-6 transition-all duration-300 group-hover:scale-110 group-hover:bg-gradient-to-br group-hover:from-primary-500 group-hover:to-primary-600">
                <svg className="w-8 h-8 text-primary-600 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3 text-gray-900">NFC &amp; QR Tags</h3>
              <p className="text-gray-600 leading-relaxed mb-3">
                Protect your pet with smart tags. Instant profile access when found
              </p>
              <span className="text-sm font-semibold text-primary-600 group-hover:underline">
                Learn how it works →
              </span>
            </Link>

            {/* Community Engagement */}
            <div className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 group border border-gray-100">
              <div className="w-16 h-16 bg-gradient-to-br from-primary-100 to-primary-200 rounded-2xl flex items-center justify-center mb-6 transition-all duration-300 group-hover:scale-110 group-hover:bg-gradient-to-br group-hover:from-primary-500 group-hover:to-primary-600">
                <svg className="w-8 h-8 text-primary-600 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3 text-gray-900">Community</h3>
              <p className="text-gray-600 leading-relaxed">Join a vibrant community of pet lovers, share experiences, and learn together</p>
            </div>
          </div>
        </div>
      </section>

      <SmartTagsPromo />

      {/* Why Choose Us Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
              Why Families Trust Us
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              We&apos;re your partner for pet wellbeing and reliable everyday shopping
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center p-6">
              <div className="w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold mb-4 text-gray-900">Expert Verified</h3>
              <p className="text-gray-600 leading-relaxed">
                All content and products are reviewed by certified veterinarians and pet care specialists
              </p>
            </div>

            <div className="text-center p-6">
              <div className="w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold mb-4 text-gray-900">Care First</h3>
              <p className="text-gray-600 leading-relaxed">
                Pet care, general essentials, and family needs — designed with trust at the center
              </p>
            </div>

            <div className="text-center p-6">
              <div className="w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold mb-4 text-gray-900">Always Evolving</h3>
              <p className="text-gray-600 leading-relaxed">
                We continuously improve based on feedback from pet parents and the latest in pet care science
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Pet Products */}
      {petProducts.length > 0 && (
        <section className="py-20 bg-gradient-to-b from-primary-50 to-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <p className="text-primary-600 text-sm font-semibold uppercase tracking-widest mb-2">
                Catalog · Pet &amp; Animal
              </p>
              <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
                Pet &amp; Animal Products
              </h2>
              <p className="text-xl text-gray-600">
                Food, health, toys, and accessories for every pet
              </p>
            </div>
            
            <FeaturedProductGrid products={petProducts} />
            
            <div className="text-center">
              <Link
                href="/shop?catalog=pet_animal"
                className="inline-block bg-primary-600 text-white px-8 py-4 rounded-lg font-semibold hover:bg-primary-700 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
              >
                Shop Pet Products →
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Featured General Products */}
      {generalProducts.length > 0 && (
        <section className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <p className="text-stone-600 text-sm font-semibold uppercase tracking-widest mb-2">
                Catalog · General
              </p>
              <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
                General Products
              </h2>
              <p className="text-xl text-gray-600">
                Electronics, fashion, home, beauty, and everyday essentials
              </p>
            </div>

            <div className="mb-12">
              <FeaturedProductGrid products={generalProducts} accent="general" />
            </div>

            <div className="text-center">
              <Link
                href="/shop?catalog=general"
                className="inline-block bg-stone-800 text-white px-8 py-4 rounded-lg font-semibold hover:bg-stone-900 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
              >
                Shop General Products →
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Blog Posts */}
      {posts.length > 0 && (
        <section className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
                Latest from Our Community
              </h2>
              <p className="text-xl text-gray-600">
                Insights, stories, and tips from pet care experts and fellow pet parents
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
              {posts.map((post: any) => (
                <Link
                  key={post.id}
                  href={`/blog/${post.slug}`}
                  className="bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 overflow-hidden border border-gray-100 group"
                >
                  <div className="h-48 bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center relative overflow-hidden">
                    <PetImage
                      src={post.cover_image_url || '/samples/dog-indie.jpg'}
                      alt="Pet care"
                      className="w-full h-full object-cover opacity-50"
                    />
                    <svg className="absolute w-16 h-16 text-primary-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                  <div className="p-6">
                    <h3 className="text-xl font-bold mb-3 text-gray-900 group-hover:text-primary-600 transition-colors line-clamp-2">
                      {post.title}
                    </h3>
                    {post.excerpt && (
                      <p className="text-gray-600 leading-relaxed line-clamp-3">
                        {post.excerpt}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
            
            <div className="text-center">
              <Link
                href="/blog"
                className="inline-block bg-gray-900 text-white px-8 py-4 rounded-lg font-semibold hover:bg-gray-800 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
              >
                Read More Stories →
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="py-20 bg-white text-gray-900 border-t border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl lg:text-5xl font-bold mb-6 text-gray-900">
            Ready to Shop with KediSmart?
          </h2>
          <p className="text-xl text-gray-600 mb-8 leading-relaxed">
            Explore Pet &amp; Animal care and General Products — one trusted platform for your home
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/shop?catalog=pet_animal"
              className="bg-white border-2 border-primary-600 text-primary-600 px-8 py-4 rounded-lg font-semibold hover:bg-primary-600 hover:text-white active:bg-primary-700 transition-all duration-300 text-lg"
            >
              Shop Pet &amp; Animal
            </Link>
            <Link
              href="/shop?catalog=general"
              className="bg-white border-2 border-primary-600 text-primary-600 px-8 py-4 rounded-lg font-semibold hover:bg-primary-600 hover:text-white active:bg-primary-700 transition-all duration-300 text-lg"
            >
              Shop General Products
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
