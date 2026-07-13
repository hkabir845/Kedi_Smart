import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // KediSmart brand orange — Jahura Satter / business card palette
        primary: {
          50: '#fff5f0',
          100: '#ffe8dc',
          200: '#ffd0b8',
          300: '#ffb088',
          400: '#ff8855',
          500: '#f26522',
          600: '#e04e0f',
          700: '#c43d0a',
          800: '#9a3109',
          900: '#7c2808',
        },
        accent: {
          500: '#c43d0a',
          600: '#9a3109',
        },
        brand: {
          black: '#1a1a1a',
        },
      },
    },
  },
  plugins: [],
}
export default config
