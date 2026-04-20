"use client";

import React, { useState } from "react";
export interface RoomCreatePayload {
  name: string;
  cardVersion: string;
  expansions: string[];
}

interface CreateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (payload: RoomCreatePayload) => void;
}

export default function CreateRoomModal({
  isOpen,
  onClose,
  onCreate,
}: CreateRoomModalProps) {
  const [roomName, setRoomName] = useState("");
  const [addonEnabled, setAddonEnabled] = useState(false);

  if (!isOpen) return null;

  const handleCreate = () => {
    if (roomName.trim() === "") {
      alert("กรุณากรอกชื่อห้อง");
      return;
    }

    const cardVersion = "original";
    const expansions = addonEnabled ? ["imploding"] : [];

    onCreate({
      name: roomName,
      cardVersion,
      expansions,
    });

    setRoomName("");
    setAddonEnabled(false);
  };

  const deckPreview = `${addonEnabled ? "original + Add-on" : "original"}`;

  return (
    <div
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-1000 animate-fade-in"
      onClick={onClose}
    >
      <div
        style={{
          width: "min(560px, calc(100vw - 2rem))",
          padding: "0",
          maxHeight: "calc(100dvh - 2rem)",
          overflowY: "auto",
        }}
        className="bg-zinc-900/60 backdrop-blur-3xl border border-white/30 rounded-3xl text-white shadow-[0_16px_40px_rgba(0,0,0,0.6)] animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Title */}
        <div
          style={{ padding: "32px 48px 24px 48px" }}
          className="flex items-center justify-center gap-3 border-b border-white/20"
        >
          <h2 className="text-2xl font-bold text-white font-bungee">
            Create new room
          </h2>
        </div>

        {/* Content */}
        <div
          style={{
            padding: "28px 48px",
            display: "flex",
            flexDirection: "column",
            gap: "24px",
          }}
        >
          {/* Room Name */}
          <div>
            <label className="block text-base mb-2 text-[#ffaa00] font-bungee">
              Room name:
            </label>
            <input
              type="text"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              placeholder="room name"
              maxLength={30}
              style={{ height: "56px" }}
              className="w-full px-4 text-base border-2 border-gray-400 rounded-xl outline-none font-bungee bg-white text-black focus:border-[#ffaa00] transition-colors"
            />
          </div>

          {/* Addon Toggle */}
          <div>
            <label className="block text-base mb-3 text-[#ffaa00] font-bungee text-center">
              ADD-ON
            </label>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "16px",
                marginBottom: "20px",
              }}
            >
              <span className="text-sm text-white/80">OFF</span>
              <div
                className={[
                  "w-14 h-7 rounded-full relative cursor-pointer transition-all border-2 border-black shrink-0",
                  addonEnabled ? "bg-[#4CAF50]" : "bg-[#555]",
                ].join(" ")}
                onClick={() => setAddonEnabled(!addonEnabled)}
              >
                <div
                  className={[
                    "w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all shadow border border-black",
                    addonEnabled ? "left-8" : "left-0.5",
                  ].join(" ")}
                />
              </div>
              <span
                className={`text-sm ${addonEnabled ? "text-[#ffaa00]" : "text-white/80"}`}
              >
                ON
              </span>
            </div>
            <div
              style={{
                height: "48px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginTop: "16px",
              }}
              className="bg-[#ffaa00]/15 rounded-xl border border-[#ffaa00]/50 text-sm text-white/90"
            >
              {deckPreview}
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div style={{ padding: "0 48px 36px 48px" }} className="flex gap-3">
          <button
            style={{ height: "60px" }}
            className="flex-1 bg-linear-to-br from-[#ff6600] to-[#ff4400] border-2 border-black rounded-xl text-base font-bold text-black font-bungee transition-all hover:scale-[1.02] hover:shadow-[0_4px_15px_rgba(255,102,0,0.5)] cursor-pointer"
            onClick={handleCreate}
          >
            Create room
          </button>
          <button
            style={{ height: "60px" }}
            className="flex-1 bg-[#555] border-2 border-black rounded-xl text-base font-bold text-white font-bungee transition-all hover:scale-[1.02] hover:bg-[#666] cursor-pointer"
            onClick={onClose}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
