'use client'

import { useState, useEffect } from 'react'
import { Locale, locales, getLocale, setLocale } from '@/lib/i18n'

export default function LanguageSelector() {
  const [currentLocale, setCurrentLocale] = useState<Locale>('en')
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    setCurrentLocale(getLocale())
  }, [])

  const handleLocaleChange = (locale: Locale) => {
    setCurrentLocale(locale)
    setLocale(locale)
    setIsOpen(false)
  }

  const currentConfig = locales[currentLocale]

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        aria-label="Select language"
      >
        <span className="text-sm font-medium">{currentConfig.nativeName}</span>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-xl z-20">
            {Object.values(locales).map((config) => (
              <button
                key={config.code}
                onClick={() => handleLocaleChange(config.code)}
                className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors first:rounded-t-lg last:rounded-b-lg ${
                  currentLocale === config.code ? 'bg-primary-50 text-primary-700 font-semibold' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{config.nativeName}</div>
                    <div className="text-sm text-gray-500">{config.name}</div>
                  </div>
                  {currentLocale === config.code && (
                    <svg className="w-5 h-5 text-primary-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
