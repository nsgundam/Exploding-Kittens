import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Exploding Kittens - Lobby',
  description: 'Join or create a game room',
}

export default function LobbyLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div
      style={{
        fontFamily: "'Bungee', cursive",
        background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%)',
        color: 'white',
        height: '100vh',
        overflow: 'hidden',
        width: '100%',
        display: 'flex',
        alignItems: 'stretch',
        justifyContent: 'center',
      }}
    >
      {children}
    </div>
  )
}
