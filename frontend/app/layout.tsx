import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Exploding Kittens - Lobby',
  description: 'Join or create a game room',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  )
}
