import type { Metadata, Viewport } from 'next'
import { Plus_Jakarta_Sans, Inter, Rajdhani } from 'next/font/google'
import { headers } from 'next/headers'
import { ThemeProvider } from '@/components/providers/theme-provider'
import './globals.css'

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-jakarta',
  weight: ['400', '500', '600', '700'],
  display: 'swap',
})

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  weight: ['300', '400', '500', '600'],
  display: 'swap',
})

const rajdhani = Rajdhani({
  subsets: ['latin'],
  variable: '--font-rajdhani',
  weight: ['400', '500', '600', '700'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Nano Spaces',
  description: 'Nano Spaces — precision space management for your team.',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/assets/logos/logo-sm-transparent-dark.png', sizes: '32x32', type: 'image/png' },
      { url: '/assets/logos/logo-md-transparent-dark.png', sizes: '64x64', type: 'image/png' },
      { url: '/assets/icons/favicon.ico', type: 'image/x-icon' },
    ],
    apple: [{ url: '/assets/icons/icon-180x180.png', sizes: '180x180' }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Nano Spaces',
  },
  formatDetection: { telephone: false },
  openGraph: {
    siteName: 'Nano Spaces',
    images: [{ url: '/assets/logos/og-image.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    images: ['/assets/logos/og-image.png'],
  },
}

export const viewport: Viewport = {
  themeColor: '#FA5D0C',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const nonce = headers().get('x-nonce') ?? ''
  return (
    <html lang="en" className={`${jakarta.variable} ${inter.variable} ${rajdhani.variable}`}>
      <head>
        <link
          rel="apple-touch-icon"
          sizes="180x180"
          href="/assets/logos/logo-md-transparent-dark.png"
        />
        {/* Apply stored theme before paint to prevent flash */}
        <script
          nonce={nonce}
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('ns-theme')||(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');document.documentElement.classList.toggle('dark',t==='dark')}catch(e){}})()`,
          }}
        />
      </head>
      <body>
        {/* Expose nonce to the page so Script components can use it */}
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: '' }} />
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  )
}
