/** @type {import('next').NextConfig} */
const nextConfig = {
  // Static security headers applied to every response.
  // The per-request Content-Security-Policy (with nonce) is set in middleware.ts.
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), payment=()',
          },
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
        ],
      },
      // Long-lived cache for immutable Next.js build chunks
      {
        source: '/_next/static/(.*)',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
      // Cache PWA manifest + icons
      {
        source: '/manifest.json',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=86400' }],
      },
      {
        source: '/(icon-192|icon-512|icon-badge).png',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=86400' }],
      },
    ]
  },

  images: {
    remotePatterns: [
      {
        // Supabase Storage public bucket assets (org logos, etc.)
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },

  // Disable the X-Powered-By: Next.js header
  poweredByHeader: false,

  // Strict mode catches side-effects in dev
  reactStrictMode: true,
}

module.exports = nextConfig
