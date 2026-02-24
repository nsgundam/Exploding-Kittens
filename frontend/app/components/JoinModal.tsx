'use client';

import React from 'react';

interface JoinModalProps {
  isOpen: boolean;
  roomId: string;
  roomName: string;
  onConfirm: () => void;
  onClose: () => void;
}

export default function JoinModal({ isOpen, roomId, roomName, onConfirm, onClose }: JoinModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/85 flex items-center justify-center z-[1000] animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-linear-to-br from-[#2a2a2a] to-[#1a1a1a] border-[5px] border-white rounded-3xl p-10 max-w-[500px] w-[90%] text-center text-white animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-4xl mb-5 text-[#ffaa00] drop-shadow-[2px_2px_4px_rgba(0,0,0,0.5)]">
          ⚠️ ยืนยันการเข้าห้อง
        </div>

        <div className="text-xl mb-8 leading-relaxed">
          คุณต้องการเข้าร่วมห้อง<br />
          <strong className="text-[#ffaa00] text-2xl">{roomId}.{roomName}</strong><br />
          ใช่หรือไม่?
        </div>

        <div className="flex gap-5 justify-center">
          <button
            className="bg-linear-to-br from-[#ff6600] to-[#ff4400] border-[3px] border-black rounded-xl px-10 py-4 text-xl font-bold text-black font-bungee transition-all hover:scale-110 hover:shadow-[0_5px_20px_rgba(255,102,0,0.5)] cursor-pointer"
            onClick={onConfirm}
          >
            YES
          </button>

          <button
            className="bg-linear-to-br from-[#888] to-[#666] border-[3px] border-black rounded-xl px-10 py-4 text-xl font-bold text-black font-bungee transition-all hover:scale-110 hover:shadow-[0_5px_20px_rgba(136,136,136,0.5)] cursor-pointer"
            onClick={onClose}
          >
            NO
          </button>
        </div>
      </div>
    </div>
  );
}
