import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Exploding Kittens - Lobby",
  description: "Join or create a game room",
};

export default function LobbyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="font-bungee bg-gradient-to-br from-[#0a0a0a] via-[#1a1a2e] to-[#16213e] text-white h-full w-full overflow-hidden flex items-stretch justify-center">
      {children}
    </div>
  );
}
