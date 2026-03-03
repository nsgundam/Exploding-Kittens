"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AnimatedBackground } from "@/app/components/AnimatedBackground";
import { Loader2, RefreshCw } from "lucide-react";

const AVATAR_STYLES = [
  "adventurer", "avataaars", "bottts", "fun-emoji", "lorelei", "notionists", "personas", "pixel-art"
];

export default function Home() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [avatarStyle, setAvatarStyle] = useState(AVATAR_STYLES[0]);
  const [seed, setSeed] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Generate an initial random seed for the avatar
    setSeed(Math.random().toString(36).substring(7));
    
    // Check if player already has a token and info
    const existingName = localStorage.getItem("display_name");
    const existingAvatar = localStorage.getItem("profile_picture");
    
    if (existingName) setName(existingName);
    if (existingAvatar) {
      try {
        const url = new URL(existingAvatar);
        const style = url.pathname.split("/")[4];
        const seedValue = url.pathname.split("/")[5].replace(".svg", "");
        if (AVATAR_STYLES.includes(style)) setAvatarStyle(style);
        setSeed(seedValue);
      } catch (e) {
        // Fallback to defaults generated above
      }
    }
  }, []);

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

  return (
    <div className="min-h-screen w-full relative flex items-center justify-center font-sans selection:bg-orange-500/30 overflow-hidden">
      <AnimatedBackground />
      
      {/* Floating kittens decoration */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <span className="absolute top-20 left-[10%] text-6xl opacity-20 animate-bounce" style={{ animationDuration: '3s' }}>🐱</span>
        <span className="absolute bottom-32 right-[15%] text-7xl opacity-20 animate-bounce" style={{ animationDuration: '4s', animationDelay: '1s' }}>💣</span>
        <span className="absolute top-1/3 right-[10%] text-5xl opacity-15 animate-pulse" style={{ animationDuration: '2s' }}>💥</span>
      </div>

      <Card className="z-10 w-full max-w-md bg-zinc-900/80 backdrop-blur-xl border-zinc-800 shadow-2xl relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 via-transparent to-red-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        
        <CardHeader className="text-center space-y-2 pb-6">
          <CardTitle className="text-3xl font-bungee tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-500 drop-shadow-sm">
            KITTENS
          </CardTitle>
          <CardDescription className="text-zinc-400 text-lg">
            Enter your name to join the mayhem
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleJoin} className="space-y-6">
            
            {/* Avatar Selection */}
            <div className="flex flex-col items-center space-y-3">
              <div className="relative group/avatar cursor-pointer" onClick={handleRandomizeAvatar}>
                <div className="w-28 h-28 rounded-full bg-zinc-800/80 border-2 border-zinc-700 flex items-center justify-center overflow-hidden shadow-inner relative z-10 group-hover/avatar:border-orange-500 transition-colors">
                  <Image 
                    src={currentAvatarUrl} 
                    alt="Player Avatar" 
                    width={112} 
                    height={112}
                    className="object-cover group-hover/avatar:scale-110 transition-transform duration-300"
                  />
                </div>
                
                {/* Randomize button overlay */}
                <div className="absolute -bottom-2 -right-2 bg-orange-600 hover:bg-orange-500 text-white p-2 rounded-full shadow-lg z-20 transition-transform hover:scale-110 hover:rotate-180 duration-300">
                  <RefreshCw size={16} />
                </div>
              </div>
              <p className="text-xs text-zinc-500">Tap to randomize avatar</p>
            </div>

            {/* Name Input */}
            <div className="space-y-2">
              <Input
                type="text"
                placeholder="Your Nickname"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={20}
                required
                className="bg-zinc-950/50 border-zinc-800 h-14 text-center text-xl font-bold text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-orange-500 focus-visible:border-orange-500 transition-all rounded-xl"
              />
            </div>

            {/* Submit Button */}
            <Button 
              type="submit" 
              disabled={!name.trim() || isLoading}
              className="w-full h-14 text-lg font-bungee tracking-widest bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-400 hover:to-red-500 text-white border-none shadow-[0_0_20px_rgba(249,115,22,0.3)] hover:shadow-[0_0_25px_rgba(249,115,22,0.5)] transition-all rounded-xl mt-4"
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-6 w-6 animate-spin" />
              ) : (
                <>ENTER LOBBY <span className="ml-2 text-xl">🚀</span></>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
      
    </div>
  );
}
