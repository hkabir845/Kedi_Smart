/** @type {import('next').NextConfig} */
const backendOrigin = process.env.BACKEND_URL || 'http://127.0.0.1:8000'

const nextConfig = {
  reactStrictMode: true,
  // Local / single-origin: browser calls /api/* and Next proxies to Django.
  // On the VPS, nginx (:82) usually handles this; rewrites still help for next start without nginx.
  async rewrites() {
    return [
      { source: '/api/:path*', destination: `${backendOrigin}/api/:path*` },
      { source: '/health', destination: `${backendOrigin}/health` },
      { source: '/uploads/:path*', destination: `${backendOrigin}/uploads/:path*` },
    ]
  },
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
      },
      {
        protocol: 'http',
        hostname: '127.0.0.1',
      },
      {
        protocol: 'http',
        hostname: '192.168.68.105',
      },
      {
        protocol: 'https',
        hostname: 'kedismart.sascorporationbd.com',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'images.pexels.com',
      },
    ],
  },
}

module.exports = nextConfig
