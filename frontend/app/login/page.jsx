"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const AVATARS = [
  { id: 1, emoji: "👩‍🦰" },
  { id: 2, emoji: "🕶️" },
  { id: 3, emoji: "👴🏽" },
  { id: 4, emoji: "🐸" },
  { id: 5, emoji: "👧🏾" },
  { id: 6, emoji: "🧑" },
  { id: 7, emoji: "🐱" },
];

export default function LoginPage() {
  const [name, setName] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState(1);
  const [focused, setFocused] = useState(false);
  const router = useRouter();

  const handleSubmit = () => {
    if (!name.trim()) return;
    localStorage.setItem(
      "explodingKittensPlayer",
      JSON.stringify({
        name: name.trim(),
        avatarId: selectedAvatar,
        timestamp: Date.now(),
      })
    );
    router.push("/lobby");
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
        fontFamily: "sans-serif",
      }}
    >
      <style>{`
        @keyframes flicker-exploding {
          0%   { opacity: 1;   text-shadow: 0 0 10px #ff4500, 0 0 30px #ff2200, 0 0 70px #ff0000; }
          3%   { opacity: 0.2; text-shadow: none; }
          5%   { opacity: 1;   text-shadow: 0 0 10px #ff4500, 0 0 30px #ff2200, 0 0 70px #ff0000; }
          7%   { opacity: 0.8; text-shadow: 0 0 4px #ff4500; }
          9%   { opacity: 1;   text-shadow: 0 0 10px #ff4500, 0 0 30px #ff2200, 0 0 70px #ff0000; }
          40%  { opacity: 1;   text-shadow: 0 0 10px #ff4500, 0 0 30px #ff2200, 0 0 70px #ff0000; }
          42%  { opacity: 0;   text-shadow: none; }
          43%  { opacity: 1;   text-shadow: 0 0 10px #ff4500, 0 0 30px #ff2200, 0 0 70px #ff0000; }
          100% { opacity: 1;   text-shadow: 0 0 10px #ff4500, 0 0 30px #ff2200, 0 0 70px #ff0000; }
        }

        @keyframes flicker-kittens {
          0%   { opacity: 1;   text-shadow: 0 0 10px #ff4500, 0 0 30px #ff2200, 0 0 70px #ff0000; }
          15%  { opacity: 1;   text-shadow: 0 0 10px #ff4500, 0 0 30px #ff2200, 0 0 70px #ff0000; }
          17%  { opacity: 0;   text-shadow: none; }
          18%  { opacity: 0.5; text-shadow: 0 0 4px #ff4500; }
          19%  { opacity: 0;   text-shadow: none; }
          20%  { opacity: 1;   text-shadow: 0 0 10px #ff4500, 0 0 30px #ff2200, 0 0 70px #ff0000; }
          60%  { opacity: 1;   text-shadow: 0 0 10px #ff4500, 0 0 30px #ff2200, 0 0 70px #ff0000; }
          61%  { opacity: 0.1; text-shadow: none; }
          62%  { opacity: 1;   text-shadow: 0 0 10px #ff4500, 0 0 30px #ff2200, 0 0 70px #ff0000; }
          100% { opacity: 1;   text-shadow: 0 0 10px #ff4500, 0 0 30px #ff2200, 0 0 70px #ff0000; }
        }

        @keyframes flicker-bomb {
          0%   { box-shadow: 0 0 20px #ff4500, 0 0 60px #ff220066, inset 0 0 20px #ff220022; border-color: #ff4500; }
          25%  { box-shadow: 0 0 20px #ff4500, 0 0 60px #ff220066, inset 0 0 20px #ff220022; border-color: #ff4500; }
          27%  { box-shadow: none; border-color: #550000; }
          28%  { box-shadow: 0 0 8px #ff4500; border-color: #ff4500; }
          29%  { box-shadow: none; border-color: #550000; }
          30%  { box-shadow: 0 0 20px #ff4500, 0 0 60px #ff220066, inset 0 0 20px #ff220022; border-color: #ff4500; }
          70%  { box-shadow: 0 0 20px #ff4500, 0 0 60px #ff220066, inset 0 0 20px #ff220022; border-color: #ff4500; }
          71%  { box-shadow: none; border-color: #550000; }
          72%  { box-shadow: 0 0 20px #ff4500, 0 0 60px #ff220066, inset 0 0 20px #ff220022; border-color: #ff4500; }
          100% { box-shadow: 0 0 20px #ff4500, 0 0 60px #ff220066, inset 0 0 20px #ff220022; border-color: #ff4500; }
        }

        @keyframes flicker-ray {
          0%,100% { opacity: 1; }
          27%     { opacity: 0; }
          28%     { opacity: 0.6; }
          29%     { opacity: 0; }
          30%     { opacity: 1; }
          71%     { opacity: 0; }
          72%     { opacity: 1; }
        }

        .neon-exploding {
          font-family: 'Impact', 'Arial Black', sans-serif;
          font-weight: 900;
          color: transparent;
          -webkit-text-stroke: 2px #ff4500;
          text-shadow: 0 0 10px #ff4500, 0 0 30px #ff2200, 0 0 70px #ff0000;
          user-select: none;
          letter-spacing: 0.3em;
          font-size: 3rem;
          line-height: 1.1;
          animation: flicker-exploding 4s infinite;
        }

        .neon-kittens {
          font-family: 'Impact', 'Arial Black', sans-serif;
          font-weight: 900;
          color: transparent;
          -webkit-text-stroke: 2px #ff4500;
          text-shadow: 0 0 10px #ff4500, 0 0 30px #ff2200, 0 0 70px #ff0000;
          user-select: none;
          letter-spacing: 0.3em;
          font-size: 3rem;
          line-height: 1.1;
          animation: flicker-kittens 5s infinite;
          animation-delay: 0.5s;
        }

        .bomb-circle {
          animation: flicker-bomb 4s infinite;
          animation-delay: 0.2s;
        }

        .bomb-ray {
          animation: flicker-ray 4s infinite;
          animation-delay: 0.2s;
        }

        .btn-next:hover { transform: scale(1.04); }
        .btn-next:active { transform: scale(0.97); }
        .avatar-btn:hover { transform: scale(1.15); }
      `}</style>

      {/* Background radial glow */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "radial-gradient(ellipse at center, #1a0800 0%, #000000 65%)",
        }}
      />

      {/* Main content */}
      <div
        style={{
          position: "relative",
          zIndex: 10,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "20px",
        }}
      >
        {/* EXPLODING */}
        <div className="neon-exploding">EXPLODING</div>

        {/* Bomb with flickering rays */}
        <div
          style={{
            position: "relative",
            width: "112px",
            height: "112px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="bomb-ray"
              style={{
                position: "absolute",
                width: "18px",
                height: "3px",
                background: "#ff4500",
                boxShadow: "0 0 8px #ff4500, 0 0 16px #ff2200",
                borderRadius: "2px",
                top: "50%",
                left: "50%",
                transformOrigin: "0 50%",
                transform: `translateY(-50%) rotate(${i * 45}deg) translateX(52px)`,
                animationDelay: `${0.2 + i * 0.03}s`,
              }}
            />
          ))}
          <div
            className="bomb-circle"
            style={{
              width: "80px",
              height: "80px",
              borderRadius: "50%",
              border: "3px solid #ff4500",
              background: "radial-gradient(circle, #1a0800 50%, #000 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "2.5rem",
              transition: "box-shadow 0.05s, border-color 0.05s",
            }}
          >
            💣
          </div>
        </div>

        {/* KITTENS */}
        <div className="neon-kittens" style={{ marginTop: "-12px" }}>KITTENS</div>

        {/* Selected avatar preview */}
        <div
          style={{
            width: "80px",
            height: "80px",
            borderRadius: "50%",
            border: "3px solid #ff6030",
            boxShadow: "0 0 16px #ff4500, 0 0 40px #ff220055",
            background: "#1a0500",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "2.5rem",
          }}
        >
          {AVATARS.find((a) => a.id === selectedAvatar)?.emoji}
        </div>

        {/* Avatar picker */}
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", justifyContent: "center", maxWidth: "300px" }}>
          {AVATARS.map((av) => (
            <button
              key={av.id}
              className="avatar-btn"
              onClick={() => setSelectedAvatar(av.id)}
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "50%",
                border: selectedAvatar === av.id ? "3px solid #ff4500" : "2px solid rgba(85,34,0,0.4)",
                boxShadow: selectedAvatar === av.id ? "0 0 12px #ff4500" : "none",
                background: "#1a0500",
                fontSize: "1.5rem",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "transform 0.1s",
              }}
            >
              {av.emoji}
            </button>
          ))}
        </div>

        {/* Name input */}
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="ช่องใส่ชื่อ"
          maxLength={20}
          style={{
            width: "256px",
            padding: "12px 16px",
            borderRadius: "6px",
            background: "#1a0800",
            border: focused ? "2px solid #ff4500" : "2px solid rgba(255,68,0,0.4)",
            boxShadow: focused ? "0 0 18px rgba(255,68,0,0.4)" : "0 0 10px rgba(255,34,0,0.1)",
            color: "#fff",
            fontSize: "1.1rem",
            textAlign: "center",
            outline: "none",
            fontFamily: "sans-serif",
            transition: "border-color 0.2s, box-shadow 0.2s",
            boxSizing: "border-box",
          }}
        />

        {/* Go button */}
        <button
          className="btn-next"
          onClick={handleSubmit}
          disabled={!name.trim()}
          style={{
            width: "256px",
            padding: "12px 0",
            borderRadius: "6px",
            background: name.trim() ? "linear-gradient(135deg, #cc3300, #ff6600)" : "#330a00",
            border: "2px solid #ff4400",
            boxShadow: name.trim() ? "0 0 20px rgba(255,68,0,0.5), 0 0 40px rgba(255,34,0,0.3)" : "none",
            color: "#fff",
            fontFamily: "'Impact', 'Arial Black', sans-serif",
            fontSize: "1.1rem",
            letterSpacing: "0.2em",
            cursor: name.trim() ? "pointer" : "not-allowed",
            opacity: name.trim() ? 1 : 0.35,
            transition: "transform 0.1s, box-shadow 0.2s",
            boxSizing: "border-box",
          }}
        >
          ไปหน้าถัดไป →
        </button>
      </div>
    </div>
  );
}