"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const AVATARS = [
  { id: 1, seed: "Leo" },
  { id: 2, seed: "Milo" },
  { id: 3, seed: "Luna" },
  { id: 4, seed: "Coco" },
  { id: 5, seed: "Max" },
  { id: 6, seed: "Zoe" },
  { id: 7, seed: "Nova" },
];

export default function LoginPage() {
  const [name, setName] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState(1);
  const router = useRouter();

  const selectedSeed =
    AVATARS.find((a) => a.id === selectedAvatar)?.seed || "Leo";

  const selectedAvatarUrl = `https://api.dicebear.com/7.x/adventurer/svg?seed=${selectedSeed}`;

  const handleSubmit = () => {
    if (!name.trim()) return;

    localStorage.setItem(
      "explodingKittensPlayer",
      JSON.stringify({
        name: name.trim(),
        avatarSeed: selectedSeed,
        avatarUrl: selectedAvatarUrl,
        timestamp: Date.now(),
      })
    );

    router.push("/lobby");
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[url('/bg.gif')] bg-cover bg-center"
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/60" />

      <div className="relative z-10 flex flex-col items-center gap-6">

        {/* Avatar Preview */}
        <div className="w-24 h-24 rounded-full border-4 border-orange-500 bg-black/70 shadow-[0_0_20px_rgba(255,68,0,0.8)] overflow-hidden">
          <img
            src={selectedAvatarUrl}
            alt="avatar"
            className="w-full h-full"
          />
        </div>

        {/* Avatar Picker */}
        <div className="flex flex-wrap justify-center gap-3 max-w-xs">
          {AVATARS.map((av) => {
            const avatarUrl = `https://api.dicebear.com/7.x/adventurer/svg?seed=${av.seed}`;

            return (
              <button
                key={av.id}
                onClick={() => setSelectedAvatar(av.id)}
                className={`
                  w-14 h-14 rounded-full overflow-hidden
                  transition-all duration-150
                  ${selectedAvatar === av.id
                    ? "border-4 border-orange-500 shadow-[0_0_15px_rgba(255,68,0,0.8)]"
                    : "border-2 border-orange-900"}
                  bg-black/70 hover:scale-110 active:scale-95
                `}
              >
                <img src={avatarUrl} alt="avatar-option" />
              </button>
            );
          })}
        </div>

        {/* Name Input */}
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          placeholder="Pleas Enter Name"
          maxLength={20}
          className="
            w-64 px-4 py-3 rounded-md text-center text-white
            bg-black/70 border-2 border-orange-500/50
            focus:border-orange-500
            focus:shadow-[0_0_18px_rgba(255,68,0,0.6)]
            outline-none transition-all
          "
        />

        {/* Submit Button */}
        <button
          onClick={handleSubmit}
          disabled={!name.trim()}
          className={`
            w-64 py-3 rounded-md font-black tracking-widest text-white
            transition-all duration-150
            ${name.trim()
              ? "bg-gradient-to-r from-orange-600 to-orange-400 border-2 border-orange-500 shadow-[0_0_20px_rgba(255,68,0,0.8)] hover:scale-105 active:scale-95"
              : "bg-black/40 border-2 border-orange-900 opacity-40 cursor-not-allowed"}
          `}
        >
          Continue →
        </button>

      </div>
    </div>
  );
}
