import type { Metadata } from 'next'
import { Bungee } from 'next/font/google'
import './globals.css'

const bungee = Bungee({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-bungee',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Exploding Kittens',
  description: 'Exploding Kittens Game',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="th" className={bungee.variable}>
      <body>{children}</body>
    </html>
  )
}
