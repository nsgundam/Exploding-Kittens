"use client";

import React, { useState } from "react";

interface DeckConfigModalProps {
  isOpen: boolean;
  roomId: string;
  currentCardVersion: string;
  currentExpansions: string[];
  onClose: () => void;
  onSaved: (cardVersion: string, expansions: string[]) => void;
  onSave?: (cardVersion: string, expansions: string[]) => void; // socket-based save
}

export default function DeckConfigModal({
  isOpen,
  roomId,
  currentExpansions,
  onClose,
  onSaved,
  onSave,
}: DeckConfigModalProps) {

  const [addonEnabled, setAddonEnabled] = useState(
    currentExpansions.includes("imploding_kittens")
  );
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSave = async () => {
    setLoading(true);
    try {
      const cardVersion = "original";
      const expansions = addonEnabled ? ["imploding_kittens"] : [];

      if (onSave) {
        // ใช้ socket emit (preferred)
        onSave(cardVersion, expansions);
        onSaved(cardVersion, expansions);
        onClose();
      } else {
        // fallback: REST API
        const playerToken = localStorage.getItem("player_token");
        const res = await fetch(`/api/rooms/${roomId}/config`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "x-player-token": playerToken || "",
          },
          body: JSON.stringify({ cardVersion, expansions }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err?.message || "Failed to update deck config");
        }
        onSaved(cardVersion, expansions);
        onClose();
      }
    } catch (err) {
      alert(`เกิดข้อผิดพลาด: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  const deckPreview = `Original Edition${addonEnabled ? " + Add-on" : " (ไม่มี ADD-ON)"}`;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        style={{
          width: "min(480px, calc(100vw - 2rem))",
          maxHeight: "calc(100dvh - 2rem)",
          background: "rgba(240,220,170,0.97)",
          border: "3px solid rgba(120,70,10,0.5)",
          borderRadius: "24px",
          boxShadow: "0 24px 60px rgba(0,0,0,0.5)",
          fontFamily: "'Fredoka One', cursive",
          overflow: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: "24px 32px 20px",
            borderBottom: "2px solid rgba(120,70,10,0.2)",
            background: "rgba(180,100,20,0.12)",
          }}
        >
          <div className="flex items-center justify-center gap-3">
            <span className="text-3xl">⚙️</span>
            <h2 className="text-2xl font-bold" style={{ color: "#3d1a00" }}>
              ตั้งค่าสำรับไพ่
            </h2>
          </div>
          <p className="text-center text-sm mt-1" style={{ color: "rgba(80,40,0,0.6)" }}>
            เปลี่ยนได้เฉพาะก่อนเริ่มเกมเท่านั้น
          </p>
        </div>

        {/* Content */}
        <div style={{ padding: "28px 32px", display: "flex", flexDirection: "column", gap: "24px" }}>


          {/* Addon Toggle */}
          <div>
            <label className="block text-base mb-3 font-bold text-center" style={{ color: "#5c2d00" }}>
              💥 ADD-ON ( Imploding Kittens Expansion)
            </label>
            <div className="flex items-center justify-center gap-4 mb-4">
              <span className="text-sm" style={{ color: "rgba(80,40,0,0.7)" }}>ไม่ใช้</span>
              <div
                style={{
                  width: "56px",
                  height: "28px",
                  borderRadius: "14px",
                  background: addonEnabled ? "#16a34a" : "rgba(120,70,10,0.25)",
                  border: "2px solid rgba(0,0,0,0.2)",
                  position: "relative",
                  cursor: "pointer",
                  transition: "background 0.2s",
                }}
                onClick={() => setAddonEnabled(!addonEnabled)}
              >
                <div
                  style={{
                    width: "20px",
                    height: "20px",
                    borderRadius: "50%",
                    background: "#fff",
                    position: "absolute",
                    top: "2px",
                    left: addonEnabled ? "32px" : "2px",
                    transition: "left 0.2s",
                    boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
                  }}
                />
              </div>
              <span
                className="text-sm font-bold"
                style={{ color: addonEnabled ? "#16a34a" : "rgba(80,40,0,0.7)" }}
              >
                ใช้
              </span>
            </div>

            {/* Preview */}
            <div
              style={{
                height: "48px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "12px",
                background: "rgba(180,100,20,0.1)",
                border: "1px solid rgba(180,100,20,0.3)",
                color: "#5c2d00",
                fontSize: "14px",
              }}
            >
              ℹ️ {deckPreview}
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div style={{ padding: "0 32px 28px", display: "flex", gap: "12px" }}>
          <button
            style={{
              flex: 1,
              height: "52px",
              borderRadius: "14px",
              background: loading ? "rgba(120,70,10,0.3)" : "linear-gradient(135deg, #f5a623, #d45f00)",
              boxShadow: loading ? "none" : "0 4px 0 #8b3d00",
              color: "#fff",
              fontFamily: "'Fredoka One', cursive",
              fontSize: "16px",
              fontWeight: "bold",
              border: "none",
              cursor: loading ? "not-allowed" : "pointer",
              transition: "all 0.1s",
            }}
            onClick={handleSave}
            disabled={loading}
          >
            {loading ? "กำลังบันทึก..." : "💾 บันทึก"}
          </button>
          <button
            style={{
              flex: 1,
              height: "52px",
              borderRadius: "14px",
              background: "rgba(120,70,10,0.12)",
              border: "2px solid rgba(120,70,10,0.35)",
              color: "#5c2d00",
              fontFamily: "'Fredoka One', cursive",
              fontSize: "16px",
              fontWeight: "bold",
              cursor: "pointer",
            }}
            onClick={onClose}
          >
            ยกเลิก
          </button>
        </div>
      </div>
    </div>
  );
}
