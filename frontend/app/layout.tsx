import type { Metadata, Viewport } from 'next'
import { Bungee } from 'next/font/google'
import './globals.css'

const bungee = Bungee({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-bungee',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Exploding Kittens Online',
  description: 'Play Exploding Kittens online with friends in real-time. A highly strategic, kitty-powered version of Russian roulette.',
  keywords: ['exploding kittens', 'card game', 'online game', 'multiplayer', 'board game', 'web game'],
  openGraph: {
    title: 'Exploding Kittens Online',
    description: 'A highly strategic, kitty-powered version of Russian roulette.',
    type: 'website',
  }
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="th" className={bungee.variable}>
      <body>
        <div className="app-shell">{children}</div>
      </body>
    </html>
  )
}
