"use client";

import React from "react";

interface JoinModalProps {
  isOpen: boolean;
  roomId: string;
  roomName: string;
  onConfirm: () => void;
  onClose: () => void;
}

export default function JoinModal({
  isOpen,
  roomId,
  roomName,
  onConfirm,
  onClose,
}: JoinModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-1000 animate-fade-in backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className="bg-white/10 backdrop-blur-3xl border border-white/30 rounded-3xl max-w-125 w-[90%] min-h-87.5 flex flex-col justify-center items-center text-center text-white shadow-[0_16px_40px_rgba(0,0,0,0.5)] animate-scale-in gap-6 px-16 py-12"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Title */}
        <div className="text-4xl text-[#ffaa00] drop-shadow-[2px_2px_4px_rgba(0,0,0,0.5)]">
          ⚠️ ยืนยันการเข้าห้อง
        </div>

        {/* Body */}
        <div className="flex flex-col gap-2 text-xl leading-relaxed">
          <span>คุณต้องการเข้าร่วมห้อง</span>
          <strong className="text-[#ffaa00] text-2xl">
            {roomId}.{roomName}
          </strong>
          <span>ใช่หรือไม่?</span>
        </div>

        {/* Buttons */}
        <div className="flex gap-6 justify-center mt-2">
          <button
            className="bg-linear-to-br from-[#ff6600] to-[#ff4400] border-2 border-black rounded-xl w-40 min-h-15 text-xl font-bold text-black font-bungee transition-all hover:scale-105 hover:shadow-[0_5px_20px_rgba(255,102,0,0.5)] cursor-pointer"
            onClick={onConfirm}
          >
            YES
          </button>

          <button
            className="bg-linear-to-br from-[#888] to-[#666] border-2 border-black rounded-xl w-40 min-h-15 text-xl font-bold text-black font-bungee transition-all hover:scale-105 hover:shadow-[0_5px_20px_rgba(136,136,136,0.5)] cursor-pointer"
            onClick={onClose}
          >
            NO
          </button>
        </div>
      </div>
    </div>
  );
}
