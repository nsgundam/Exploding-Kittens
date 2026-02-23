"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// ─── Types ────────────────────────────────────────────────────────────────────

const AVATARS = [
  { id: 1, url: "https://api.dicebear.com/7.x/adventurer/svg?seed=cat" },
  { id: 2, url: "https://api.dicebear.com/7.x/adventurer/svg?seed=bomb" },
  { id: 3, url: "https://api.dicebear.com/7.x/adventurer/svg?seed=kitten" },
  { id: 4, url: "https://api.dicebear.com/7.x/adventurer/svg?seed=fire" },
  { id: 5, url: "https://api.dicebear.com/7.x/adventurer/svg?seed=explode" },
  { id: 6, url: "https://api.dicebear.com/7.x/adventurer/svg?seed=nyan" },
  { id: 7, url: "https://api.dicebear.com/7.x/adventurer/svg?seed=meow" },
] as const;

type AvatarId = (typeof AVATARS)[number]["id"];

interface PlayerData {
  name: string;
  avatarId: AvatarId;
  avatarUrl: string;
  timestamp: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const NEON = "0 0 10px #ff4500, 0 0 30px #ff2200, 0 0 70px #ff0000";
const MAX_NAME_LENGTH = 10;

// ─── Validation ───────────────────────────────────────────────────────────────

const sanitizeName = (value: string): string =>
  value.replace(/[^a-zA-Z0-9ก-๙\s]/g, "").slice(0, MAX_NAME_LENGTH);

// ─── Component ────────────────────────────────────────────────────────────────

export default function LoginPage() {
  const [name, setName]                     = useState<string>("");
  const [selectedAvatar, setSelectedAvatar] = useState<AvatarId>(1);
  const [focused, setFocused]               = useState<boolean>(false);
  const router = useRouter();

  const canSubmit: boolean   = name.trim().length > 0;
  const charCount: number    = name.length;
  const isNearLimit: boolean = charCount >= MAX_NAME_LENGTH - 2;

  const selectedUrl = AVATARS.find((a) => a.id === selectedAvatar)?.url ?? "";

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    setName(sanitizeName(e.target.value));
  };

  const handleSubmit = (): void => {
    if (!canSubmit) return;
    const data: PlayerData = {
      name: name.trim(),
      avatarId: selectedAvatar,
      avatarUrl: selectedUrl,
      timestamp: Date.now(),
    };
    localStorage.setItem("explodingKittensPlayer", JSON.stringify(data));
    router.push("/Lobby");
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#000",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        overflow: "hidden",
        fontFamily: "'Impact', 'Arial Black', sans-serif",
      }}
    >
      {/* ── Keyframes ── */}
      <style>{`
        @keyframes flicker-exploding {
          0%,100% { opacity:1;   text-shadow:${NEON}; }
          3%      { opacity:0.2; text-shadow:none; }
          5%      { opacity:1;   text-shadow:${NEON}; }
          7%      { opacity:0.8; text-shadow:0 0 4px #ff4500; }
          9%      { opacity:1;   text-shadow:${NEON}; }
          42%     { opacity:1;   text-shadow:${NEON}; }
          44%     { opacity:0;   text-shadow:none; }
          45%     { opacity:1;   text-shadow:${NEON}; }
        }
        @keyframes flicker-kittens {
          0%,100% { opacity:1;   text-shadow:${NEON}; }
          18%     { opacity:0;   text-shadow:none; }
          19%     { opacity:0.5; text-shadow:0 0 4px #ff4500; }
          20%     { opacity:0;   text-shadow:none; }
          21%     { opacity:1;   text-shadow:${NEON}; }
          62%     { opacity:0.1; text-shadow:none; }
          63%     { opacity:1;   text-shadow:${NEON}; }
        }
        @keyframes flicker-bomb {
          0%,100% { box-shadow:0 0 20px #ff4500,0 0 60px #ff220066,inset 0 0 20px #ff220022; border-color:#ff4500; }
          27%     { box-shadow:none; border-color:#550000; }
          28%     { box-shadow:0 0 8px #ff4500; border-color:#ff4500; }
          29%     { box-shadow:none; border-color:#550000; }
          30%     { box-shadow:0 0 20px #ff4500,0 0 60px #ff220066,inset 0 0 20px #ff220022; border-color:#ff4500; }
          71%     { box-shadow:none; border-color:#550000; }
          72%     { box-shadow:0 0 20px #ff4500,0 0 60px #ff220066,inset 0 0 20px #ff220022; border-color:#ff4500; }
        }
        @keyframes flicker-ray {
          0%,30%,72%,100% { opacity:1; }
          27%,29%,71%     { opacity:0; }
          28%             { opacity:0.6; }
        }
        @keyframes glow-avatar {
          0%,100% { box-shadow: 0 0 16px #ff4500, 0 0 40px #ff220066; }
          50%     { box-shadow: 0 0 28px #ff6600, 0 0 70px #ff4400aa; }
        }
        .neon-exploding {
          color: transparent;
          -webkit-text-stroke: 3px #ff4500;
          text-shadow: ${NEON};
          letter-spacing: 0.18em;
          font-size: clamp(2.8rem, 7vw, 5.5rem);
          line-height: 1;
          user-select: none;
          animation: flicker-exploding 4s infinite;
        }
        .neon-kittens {
          color: transparent;
          -webkit-text-stroke: 3px #ff4500;
          text-shadow: ${NEON};
          letter-spacing: 0.18em;
          font-size: clamp(2.8rem, 7vw, 5.5rem);
          line-height: 1;
          user-select: none;
          animation: flicker-kittens 5s infinite 0.6s;
        }
        .bomb-circle    { animation: flicker-bomb 4s infinite 0.2s; }
        .bomb-ray       { animation: flicker-ray 4s infinite 0.2s; }
        .avatar-preview { animation: glow-avatar 2.5s ease-in-out infinite; }
        .avatar-btn     { transition: transform 0.12s ease; }
        .avatar-btn:hover  { transform: scale(1.12); }
        .avatar-btn:active { transform: scale(0.95); }
      `}</style>

      {/* Radial glow */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "radial-gradient(ellipse at 50% 35%, #250800 0%, #0d0000 45%, #000 70%)",
          pointerEvents: "none",
        }}
      />

      {/* ── Content ── */}
      <div
        style={{
          position: "relative",
          zIndex: 10,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "18px",
          padding: "32px 16px",
        }}
      >

        {/* EXPLODING */}
        <div className="neon-exploding">EXPLODING</div>

        {/* Bomb with rays */}
        <div style={{ position: "relative", width: "110px", height: "110px", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <span
              key={i}
              className="bomb-ray"
              style={{
                position: "absolute",
                width: 16, height: 3,
                background: "#ff4500",
                boxShadow: "0 0 8px #ff4500, 0 0 16px #ff2200",
                borderRadius: "2px",
                top: "50%", left: "50%",
                transformOrigin: "0 50%",
                transform: `translateY(-50%) rotate(${i * 45}deg) translateX(50px)`,
                animationDelay: `${0.2 + i * 0.03}s`,
              }}
            />
          ))}
          <div
            className="bomb-circle"
            style={{
              width: "76px", height: "76px",
              borderRadius: "50%",
              border: "3px solid #ff4500",
              background: "radial-gradient(circle, #1a0500 40%, #000 100%)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "2.2rem",
            }}
          >
            💣
          </div>
        </div>

        {/* KITTENS */}
        <div className="neon-kittens" style={{ marginTop: "-8px" }}>KITTENS</div>

        {/* Avatar preview */}
        <div
          className="avatar-preview"
          style={{
            width: "88px", height: "88px",
            borderRadius: "50%",
            border: "3px solid #ff5020",
            background: "radial-gradient(circle, #1a0500 40%, #000 100%)",
            overflow: "hidden",
          }}
        >
          <img
            src={selectedUrl}
            alt="selected avatar"
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </div>

        {/* Avatar picker */}
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "10px", maxWidth: "320px" }}>
          {AVATARS.map((av) => {
            const isSelected = selectedAvatar === av.id;
            return (
              <button
                key={av.id}
                type="button"
                className="avatar-btn"
                onClick={() => setSelectedAvatar(av.id)}
                style={{
                  width: "52px", height: "52px",
                  borderRadius: "50%",
                  border: isSelected ? "3px solid #ff4500" : "2px solid rgba(100,30,0,0.5)",
                  boxShadow: isSelected ? "0 0 14px #ff4500, 0 0 30px #ff220055" : "none",
                  background: "#120200",
                  padding: 0,
                  cursor: "pointer",
                  overflow: "hidden",
                }}
              >
                <img
                  src={av.url}
                  alt={`avatar-${av.id}`}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              </button>
            );
          })}
        </div>

        {/* Name input + counter */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
          <input
            type="text"
            value={name}
            onChange={handleChange}
            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === "Enter" && handleSubmit()}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder="ENTER NAME HERE"
            maxLength={MAX_NAME_LENGTH}
            style={{
              width: "300px",
              padding: "14px 20px",
              borderRadius: "6px",
              background: "#120200",
              border: focused ? "2px solid #ff4500" : "2px solid rgba(200,60,0,0.45)",
              boxShadow: focused
                ? "0 0 20px rgba(255,68,0,0.45), inset 0 0 10px rgba(255,34,0,0.1)"
                : "0 0 8px rgba(255,34,0,0.1)",
              color: "#fff",
              fontSize: "1.05rem",
              textAlign: "center",
              outline: "none",
              fontFamily: "'Impact', sans-serif",
              letterSpacing: "0.1em",
              transition: "border-color 0.2s, box-shadow 0.2s",
              boxSizing: "border-box",
            }}
          />
          <span
            style={{
              fontSize: "0.75rem",
              letterSpacing: "0.12em",
              color: isNearLimit ? "#ff4500" : "rgba(255,100,50,0.45)",
              fontFamily: "'Courier New', monospace",
              transition: "color 0.2s",
            }}
          >
            {charCount}/{MAX_NAME_LENGTH}
          </span>
        </div>

        {/* Submit button */}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit}
          style={{
            width: "300px",
            padding: "14px 0",
            borderRadius: "6px",
            background: canSubmit ? "linear-gradient(135deg, #881500, #cc3300)" : "#1a0500",
            border: canSubmit ? "2px solid #ff4400" : "2px solid rgba(200,60,0,0.3)",
            boxShadow: canSubmit
              ? "0 0 20px rgba(255,68,0,0.5), 0 0 50px rgba(255,34,0,0.25)"
              : "none",
            color: canSubmit ? "#fff" : "rgba(255,100,50,0.35)",
            fontFamily: "'Impact', 'Arial Black', sans-serif",
            fontSize: "1.15rem",
            letterSpacing: "0.18em",
            cursor: canSubmit ? "pointer" : "not-allowed",
            transition: "transform 0.12s ease, box-shadow 0.2s",
            boxSizing: "border-box",
          }}
          onMouseEnter={(e) => { if (canSubmit) (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.03)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)"; }}
          onMouseDown={(e)  => { if (canSubmit) (e.currentTarget as HTMLButtonElement).style.transform = "scale(0.97)"; }}
          onMouseUp={(e)    => { if (canSubmit) (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)"; }}
        >
          START →
        </button>

      </div>
    </div>
  );
}