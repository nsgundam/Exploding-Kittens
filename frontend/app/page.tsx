"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AnimatedBackground } from "@/components/lobby/AnimatedBackground";
import { Loader2 } from "lucide-react";

const AVATAR_STYLES = [
  "adventurer", "avataaars", "bottts", "fun-emoji", "lorelei", "notionists", "personas", "pixel-art"
];

// Token duration: 12 hours = 43200000 ms
const TOKEN_EXPIRY_MS = 12 * 60 * 60 * 1000;

export default function Home() {
  const router = useRouter();
  
  const [name, setName] = useState("");
  const [avatarStyle, setAvatarStyle] = useState(AVATAR_STYLES[0]);
  const [seed, setSeed] = useState("default-seed"); 
  const [isLoading, setIsLoading] = useState(false);
  const [isMounted, setIsMounted] = useState(false); 

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsMounted(true); 

    try {
      // Manage token expiry
      const tokenAge = localStorage.getItem("token_created_at");
      if (tokenAge && Date.now() - parseInt(tokenAge, 10) > TOKEN_EXPIRY_MS) {
        console.log("Token expired, clearing local storage");
        localStorage.removeItem("player_token");
        localStorage.removeItem("token_created_at");
        // Keep name and avatar around for UX
      }

      // Restore session data
      const existingName = localStorage.getItem("display_name");
      if (existingName) setName(existingName);

      const existingAvatar = localStorage.getItem("profile_picture");
      if (existingAvatar) {
        try {
          const url = new URL(existingAvatar);
          const parts = url.pathname.split("/");
          const style = parts[parts.length - 2];
          const seedValue = parts[parts.length - 1];
          
          if (AVATAR_STYLES.includes(style)) setAvatarStyle(style);
          if (seedValue) setSeed(seedValue.replace(".svg", ""));
        } catch {
           setSeed(Math.random().toString(36).substring(7));
        }
      } else {
        setSeed(Math.random().toString(36).substring(7));
      }

      // Auto-reconnect
      const token = localStorage.getItem("player_token");
      if (token) {
        fetch("/api/rooms/current", {
          headers: { "x-player-token": token }
        })
        .then(res => res.json())
        .then(data => {
          if (data && data.roomId) {
            router.push(`/room/${data.roomId}`);
          }
        })
        .catch(err => console.error("Auto-reconnect failed:", err));
      }
    } catch (e) {
      console.error(e);
      setSeed(Math.random().toString(36).substring(7));
    }
  }, [router]);

  const currentAvatarUrl = `https://api.dicebear.com/9.x/${avatarStyle}/svg?seed=${seed}&backgroundColor=transparent`;

  const handleRandomizeAvatar = () => {
    setSeed(Math.random().toString(36).substring(7));
    const randomStyle = AVATAR_STYLES[Math.floor(Math.random() * AVATAR_STYLES.length)];
    setAvatarStyle(randomStyle);
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsLoading(true);

    try {
      let playerToken = localStorage.getItem("player_token");
      if (!playerToken) {
        playerToken = crypto.randomUUID();
        localStorage.setItem("player_token", playerToken);
        localStorage.setItem("token_created_at", Date.now().toString());
      }
      
      localStorage.setItem("display_name", name.trim());
      localStorage.setItem("profile_picture", currentAvatarUrl);
      
      await new Promise(resolve => setTimeout(resolve, 800));
      
      router.push("/Lobby");
    } catch (error) {
      console.error("Failed to join:", error);
      setIsLoading(false);
    }
  };

  if (!isMounted) return null;

  return (
    <div className="min-h-screen w-full relative flex flex-col items-center justify-between p-8 md:p-16 font-sans selection:bg-orange-500/30 overflow-hidden">
      <AnimatedBackground />

      <div className="text-center space-y-4 z-10 pt-10 mt-10">
        <h1 className="text-5xl md:text-7xl font-bungee tracking-wider text-transparent bg-clip-text bg-linear-to-r from-orange-400 to-red-600 drop-shadow-[0_8px_8px_rgba(0,0,0,0.8)]">
          EXPLODING KITTENS
        </h1>
        <p className="text-zinc-200 text-xl md:text-2xl font-bold drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)]">
          Enter your name to join the game
        </p>
      </div>
      
      <div className="flex-1 flex items-center justify-center z-10">
        <div className="flex flex-col items-center space-y-4">
          <div className="relative group/avatar cursor-pointer" onClick={handleRandomizeAvatar}>
            <div className="w-36 h-36 md:w-48 md:h-48 rounded-full bg-zinc-900/90 border-4 border-zinc-700 flex items-center justify-center overflow-hidden shadow-[0_0_30px_rgba(0,0,0,0.8)] relative z-10 group-hover/avatar:border-orange-500 transition-colors">
              <Image 
                src={currentAvatarUrl} 
                alt="Player Avatar" 
                width={192} 
                height={192}
                className="object-cover group-hover/avatar:scale-110 transition-transform duration-300"
              />
            </div>
          </div>
          <p className="text-sm text-zinc-300 font-bold bg-black/50 px-4 py-1 rounded-full backdrop-blur-sm">
            Tap to randomize avatar
          </p>
        </div>
      </div>

      <form onSubmit={handleJoin} className="w-full max-w-sm z-10 flex flex-col gap-6 pb-10">
        <div className="w-full drop-shadow-xl">
          <Input
            type="text"
            placeholder="Your Nickname"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={20}
            required
            className="bg-zinc-950/80 border-2 border-zinc-700 h-16 text-center text-2xl font-bold text-zinc-100 placeholder:text-zinc-500 focus-visible:ring-orange-500 focus-visible:border-orange-500 transition-all rounded-2xl w-full"
          />
        </div>

        <Button 
          type="submit" 
          disabled={!name.trim() || isLoading}
          className="w-full h-16 text-xl font-bungee tracking-widest bg-linear-to-r from-orange-500 to-red-600 hover:from-orange-400 hover:to-red-500 text-white border-2 border-orange-400/50 shadow-[0_0_20px_rgba(249,115,22,0.4)] hover:shadow-[0_0_30px_rgba(249,115,22,0.6)] transition-all rounded-2xl"
        >
          {isLoading ? (
            <Loader2 className="mr-2 h-8 w-8 animate-spin" />
          ) : (
            <span className="ml-2 text-2xl">ENTER LOBBY</span>
          )}
        </Button>
      </form>

    </div>
  );
}
