import Link from 'next/link'
import { api } from '@/lib/api'
import PetImage from '@/components/PetImage'
import KediSmartLogo from '@/components/KediSmartLogo'
import FeaturedProductGrid from '@/components/FeaturedProductGrid'

export const metadata = {
  title: 'Kedi Smart - World-Class Pet & Animal Platform',
  description: 'Your all-in-one platform for pet care, knowledge, e-commerce, veterinary services, and more',
}

async function getFeatured() {
  try {
    const [petProducts, generalProducts, posts] = await Promise.all([
      api.get('/shop/products?limit=4&catalog=pet_animal').catch(() => ({ items: [] })),
      api.get('/shop/products?limit=4&catalog=general').catch(() => ({ items: [] })),
      api.get('/blog/posts?limit=3').catch(() => ({ items: [] }))
    ])
    return {
      petProducts: petProducts.items || [],
      generalProducts: generalProducts.items || [],
      posts: posts.items || []
    }
  } catch {
    return { petProducts: [], generalProducts: [], posts: [] }
  }
}

export default async function HomePage() {
  const { petProducts, generalProducts, posts } = await getFeatured()

  return (
    <main className="min-h-screen">
      {/* Hero Section - Enhanced with Emotional Appeal */}
      <section className="relative bg-gradient-to-br from-primary-500 via-primary-600 to-primary-800 text-white py-24 lg:py-32 overflow-hidden">
        {/* Decorative Background Elements */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-72 h-72 bg-white rounded-full blur-3xl"></div>
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-white rounded-full blur-3xl"></div>
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left: Content */}
            <div className="text-center lg:text-left">
              <div className="inline-block bg-white rounded-xl px-4 py-3 mb-6 shadow-lg mx-auto lg:mx-0">
                <KediSmartLogo variant="compact" size="md" link={false} />
              </div>
              <div className="inline-block mb-4 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full text-sm font-medium">
                Trusted by Pets, Loved by Owners
              </div>
              <h1 className="text-5xl lg:text-6xl font-bold mb-6 leading-tight">
                Your Pet&apos;s Journey
                <span className="block text-primary-100">Starts Here with KediSmart</span>
              </h1>
              <p className="text-xl lg:text-2xl mb-8 text-primary-100 leading-relaxed">
                Everything you need to care for, protect, and connect with your beloved pets. 
                From expert guidance to premium products, we're here for every step of your pet's journey.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Link
                  href="/register"
                  className="bg-white text-primary-600 px-8 py-4 rounded-lg font-semibold hover:bg-primary-50 transition-all duration-300 transform hover:scale-105 shadow-xl hover:shadow-2xl text-lg"
                >
                  Start Your Journey
                </Link>
                <Link
                  href="/shop"
                  className="bg-primary-700/50 backdrop-blur-sm border-2 border-white/30 text-white px-8 py-4 rounded-lg font-semibold hover:bg-primary-700/70 transition-all duration-300 text-lg"
                >
                  Shop Marketplace
                </Link>
                <Link
                  href="/shop?catalog=general"
                  className="bg-white/10 backdrop-blur-sm border-2 border-white/20 text-white px-8 py-4 rounded-lg font-semibold hover:bg-white/20 transition-all duration-300 text-lg"
                >
                  General Products
                </Link>
              </div>
              
              {/* Trust Indicators */}
              <div className="mt-12 flex flex-wrap gap-8 justify-center lg:justify-start text-sm">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-primary-200" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>Expert Vetted</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-primary-200" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  <span>Premium Quality</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-primary-200" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                  </svg>
                  <span>Loved by Pets</span>
                </div>
              </div>
            </div>

            {/* Right: Hero Pet Images */}
            <div className="relative hidden lg:block">
              <div className="grid grid-cols-2 gap-4">
                {/* Cat Image */}
                <div className="relative h-48 rounded-2xl overflow-hidden shadow-2xl transform hover:scale-105 transition-transform duration-300">
                  <PetImage
                    src="/samples/cat-persian.jpg"
                    alt="Happy cat"
                    className="w-full h-full object-cover"
                  />
                </div>
                
                {/* Dog Image */}
                <div className="relative h-64 rounded-2xl overflow-hidden shadow-2xl transform hover:scale-105 transition-transform duration-300 mt-8">
                  <PetImage
                    src="/samples/dog-golden.jpg"
                    alt="Happy dog"
                    className="w-full h-full object-cover"
                  />
                </div>
                
                {/* Small Pet Image */}
                <div className="relative h-32 rounded-2xl overflow-hidden shadow-2xl transform hover:scale-105 transition-transform duration-300 col-span-2">
                  <PetImage
                    src="/samples/dog-lab.jpg"
                    alt="Pet care"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-primary-600 mb-2">10K+</div>
              <div className="text-gray-600">Happy Pets</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-primary-600 mb-2">500+</div>
              <div className="text-gray-600">Expert Vets</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-primary-600 mb-2">5K+</div>
              <div className="text-gray-600">Products</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-primary-600 mb-2">98%</div>
              <div className="text-gray-600">Satisfaction</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section - Enhanced with Pet Icons */}
      <section className="py-20 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
              Everything Your Pet Needs
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              A comprehensive platform designed with love and care for every aspect of your pet's wellbeing
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
              <p className="text-gray-600 leading-relaxed">Premium products, supplies, and everything your pet needs delivered to your door</p>
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
            <div className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 group border border-gray-100">
              <div className="w-16 h-16 bg-gradient-to-br from-primary-100 to-primary-200 rounded-2xl flex items-center justify-center mb-6 transition-all duration-300 group-hover:scale-110 group-hover:bg-gradient-to-br group-hover:from-primary-500 group-hover:to-primary-600">
                <svg className="w-8 h-8 text-primary-600 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3 text-gray-900">NFC & QR Tags</h3>
              <p className="text-gray-600 leading-relaxed">Protect your pet with smart tags. Instant profile access when found</p>
            </div>

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

      {/* Why Choose Us Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
              Why Pet Parents Trust Us
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              We're more than a platform—we're your partner in giving your pet the best life possible
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
                Every feature is designed with your pet's wellbeing and your peace of mind at the center
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
                Trusted by Pets, Loved by Owners
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
                href="/shop"
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
                className="inline-block bg-purple-600 text-white px-8 py-4 rounded-lg font-semibold hover:bg-purple-700 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
              >
                Shop General Products →
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Pet Gallery Section */}
      <section className="py-20 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
              Our Beloved Pets
            </h2>
            <p className="text-xl text-gray-600">
              Join thousands of happy pets and their families on Kedi Smart
            </p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
            {/* Pet Image 1 */}
            <div className="relative h-48 md:h-64 rounded-xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-105 group">
              <PetImage
                src="/samples/dog-golden.jpg"
                alt="Happy golden retriever"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
            </div>
            
            {/* Pet Image 2 */}
            <div className="relative h-48 md:h-64 rounded-xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-105 group">
              <PetImage
                src="/samples/cat-siamese.jpg"
                alt="Cute cat"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
            </div>
            
            {/* Pet Image 3 */}
            <div className="relative h-48 md:h-64 rounded-xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-105 group">
              <PetImage
                src="/samples/dog-shepherd.jpg"
                alt="Playful puppy"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
            </div>
            
            {/* Pet Image 4 */}
            <div className="relative h-48 md:h-64 rounded-xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-105 group">
              <PetImage
                src="/samples/cat-domestic.jpg"
                alt="Beautiful cat"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
            </div>
          </div>
          
          <div className="text-center">
            <Link
              href="/register"
              className="inline-block bg-primary-600 text-white px-8 py-4 rounded-lg font-semibold hover:bg-primary-700 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
            >
              Create Your Pet's Profile →
            </Link>
          </div>
        </div>
      </section>

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
      <section className="py-20 bg-gradient-to-r from-primary-500 to-primary-700 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl lg:text-5xl font-bold mb-6">
            Ready to Give Your Pet the Best?
          </h2>
          <p className="text-xl text-primary-100 mb-8 leading-relaxed">
            Join thousands of pet parents who trust Kedi Smart for their pet's care, health, and happiness
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/register"
              className="bg-white text-primary-600 px-8 py-4 rounded-lg font-semibold hover:bg-primary-50 transition-all duration-300 transform hover:scale-105 shadow-xl text-lg"
            >
              Get Started Free
            </Link>
            <Link
              href="/shop"
              className="bg-primary-700/50 backdrop-blur-sm border-2 border-white/30 text-white px-8 py-4 rounded-lg font-semibold hover:bg-primary-700/70 transition-all duration-300 text-lg"
            >
              Browse Products
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
