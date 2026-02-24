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
      className="fixed inset-0 bg-black/85 flex items-center justify-center z-[1000] animate-in fade-in duration-300 px-4"
      onClick={onClose}
    >
      <div 
        className="bg-gradient-to-br from-[#2a2a2a] to-[#1a1a1a] border-[5px] border-white rounded-[20px] p-10 max-w-[500px] w-full text-center text-white animate-in zoom-in-90 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-[2em] mb-5 text-[#ffaa00] [text-shadow:2px_2px_4px_rgba(0,0,0,0.5)] font-bold">
          ⚠️ ยืนยันการเข้าห้อง
        </div>
        <div className="text-[1.2em] mb-[30px] leading-[1.8]">
          คุณต้องการเข้าร่วมห้อง<br />
          <strong className="text-[#ffaa00] text-[1.2em]">{roomId}.{roomName}</strong><br />
          ใช่หรือไม่?
        </div>
        <div className="flex gap-5 justify-center">
          <button 
            className="bg-gradient-to-br from-[#ff6600] to-[#ff4400] border-[3px] border-black rounded-[10px] py-[15px] px-10 text-[1.2em] font-bold text-black transition-transform hover:scale-110 active:scale-95"
            onClick={onConfirm}
          >
            YES
          </button>
          <button 
            className="bg-gradient-to-br from-[#888] to-[#666] border-[3px] border-black rounded-[10px] py-[15px] px-10 text-[1.2em] font-bold text-black transition-transform hover:scale-110 active:scale-95"
            onClick={onClose}
          >
            NO
          </button>
        </div>
      </div>
    </div>
  );
}