'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'

type HeroSlide = {
  id: string
  badge: string
  headline: string
  headlineAccent: string
  description: string
  primary: { href: string; label: string }
  secondary: { href: string; label: string }
}

const SLIDES: HeroSlide[] = [
  {
    id: 'smart-tags',
    badge: 'Digital pet identification · Built for safer reunions',
    headline: 'Help your pet find',
    headlineAccent: 'the way home',
    description:
      'Create a private digital pet ID, link an NFC/QR tag, and give finders a fast, secure way to contact you when every minute matters.',
    primary: { href: '/tags', label: 'Explore smart tags' },
    secondary: { href: '/emergency', label: 'Lost pet emergency guide' },
  },
  {
    id: 'one-roof',
    badge: 'Everything under one roof · Built for busy pet parents',
    headline: 'Stop running to',
    headlineAccent: 'two different shops',
    description:
      'Food, toys, health, and everyday essentials — all the things pet owners need in one place, so you never have to shop around town again.',
    primary: { href: '/shop?catalog=pet_animal', label: 'Shop pet products' },
    secondary: { href: '/shop', label: 'Browse the full store' },
  },
  {
    id: 'marketplace',
    badge: 'Multi-vendor marketplace · More choice, one checkout',
    headline: 'Many trusted sellers.',
    headlineAccent: 'One easy cart.',
    description:
      'Discover products from verified vendors side by side — compare options, pick what fits, and check out once. A true one-stop marketplace for pet families.',
    primary: { href: '/shop', label: 'Explore the marketplace' },
    secondary: { href: '/marketplace', label: 'See live listings' },
  },
  {
    id: 'all-in-one',
    badge: 'Shop · Protect · Care · All in KediSmart',
    headline: 'Pet life, covered',
    headlineAccent: 'from collar to cart',
    description:
      'Smart tags for safer reunions, a multi-vendor store for every need, and tools that keep care simple — because your pet deserves one platform that does it all.',
    primary: { href: '/shop?catalog=pet_animal', label: 'Start shopping' },
    secondary: { href: '/tags', label: 'Protect with smart tags' },
  },
]

const INTERVAL_MS = 6000

export default function HomeHeroSlider() {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const slide = SLIDES[index]

  const goTo = useCallback((next: number) => {
    setIndex(((next % SLIDES.length) + SLIDES.length) % SLIDES.length)
  }, [])

  useEffect(() => {
    if (paused) return
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReduced) return

    const timer = window.setInterval(() => {
      setIndex((i) => (i + 1) % SLIDES.length)
    }, INTERVAL_MS)
    return () => window.clearInterval(timer)
  }, [paused])

  return (
    <div
      className="max-w-3xl mx-auto text-center mb-8 sm:mb-10 lg:mb-12"
      role="region"
      aria-roledescription="carousel"
      aria-label="KediSmart highlights"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
          setPaused(false)
        }
      }}
    >
      <div className="relative min-h-[280px] sm:min-h-[300px] lg:min-h-[320px]">
        {SLIDES.map((s, i) => {
          const active = i === index
          return (
            <div
              key={s.id}
              id={`hero-slide-${s.id}`}
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} of ${SLIDES.length}`}
              aria-hidden={!active}
              className={`transition-all duration-500 ease-out ${
                active
                  ? 'relative opacity-100 translate-y-0'
                  : 'pointer-events-none absolute inset-x-0 top-0 opacity-0 translate-y-2'
              }`}
            >
              <p className="inline-block mb-3 sm:mb-4 px-3 sm:px-4 py-1.5 sm:py-2 bg-white/20 backdrop-blur-sm rounded-full text-xs sm:text-sm font-medium">
                {s.badge}
              </p>
              {i === 0 ? (
                <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold mb-4 sm:mb-5 leading-tight">
                  {s.headline}
                  <span className="block text-primary-100">{s.headlineAccent}</span>
                </h1>
              ) : (
                <h2
                  className={`text-3xl sm:text-5xl lg:text-6xl font-bold mb-4 sm:mb-5 leading-tight ${
                    active ? '' : 'sr-only'
                  }`}
                >
                  {s.headline}
                  <span className="block text-primary-100">{s.headlineAccent}</span>
                </h2>
              )}
              <p className="text-base sm:text-lg lg:text-xl text-primary-100 leading-relaxed mb-6 sm:mb-8 px-1">
                {s.description}
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link
                  href={s.primary.href}
                  tabIndex={active ? 0 : -1}
                  className="inline-flex items-center justify-center min-h-[48px] bg-white text-primary-700 px-6 sm:px-8 py-3.5 rounded-lg font-semibold hover:bg-primary-50 transition shadow-xl text-center"
                >
                  {s.primary.label}
                </Link>
                <Link
                  href={s.secondary.href}
                  tabIndex={active ? 0 : -1}
                  className="inline-flex items-center justify-center min-h-[48px] bg-primary-800/40 border-2 border-white/35 text-white px-6 sm:px-8 py-3.5 rounded-lg font-semibold hover:bg-primary-800/60 transition text-center"
                >
                  {s.secondary.label}
                </Link>
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-6 flex items-center justify-center gap-2" role="tablist" aria-label="Hero slides">
        {SLIDES.map((s, i) => (
          <button
            key={s.id}
            type="button"
            role="tab"
            aria-selected={i === index}
            aria-controls={`hero-slide-${s.id}`}
            aria-label={`Show slide ${i + 1}: ${s.badge.split('·')[0].trim()}`}
            onClick={() => goTo(i)}
            className={`h-2.5 rounded-full transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-primary-600 ${
              i === index ? 'w-8 bg-white' : 'w-2.5 bg-white/40 hover:bg-white/70'
            }`}
          />
        ))}
      </div>

      <p className="sr-only" aria-live="polite">
        {slide.headline} {slide.headlineAccent}
      </p>
    </div>
  )
}
