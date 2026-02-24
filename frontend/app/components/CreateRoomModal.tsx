'use client';

import React, { useState } from 'react';

interface CreateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string, deck: number, addon: boolean) => void;
}

export default function CreateRoomModal({ isOpen, onClose, onCreate }: CreateRoomModalProps) {
  const [roomName, setRoomName] = useState('');
  const [selectedDeck, setSelectedDeck] = useState(1);
  const [addonEnabled, setAddonEnabled] = useState(false);

  if (!isOpen) return null;

  const handleCreate = () => {
    if (roomName.trim() === '') {
      alert('กรุณากรอกชื่อห้อง');
      return;
    }
    onCreate(roomName, selectedDeck, addonEnabled);
    setRoomName('');
    setSelectedDeck(1);
    setAddonEnabled(false);
  };

  const deckPreview = `สำรับ ${selectedDeck}${addonEnabled ? ' + Add-on' : ' (ไม่มี Add-on)'}`;

  return (
    <div 
      className="fixed inset-0 bg-black/85 flex items-center justify-center z-[1000] animate-in fade-in duration-300 px-4"
      onClick={onClose}
    >
      <div 
        className="bg-gradient-to-br from-[#2a2a2a] to-[#1a1a1a] border-[5px] border-white rounded-[20px] p-8 md:p-10 max-w-[550px] w-full text-white animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto custom-scrollbar"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-[1.8em] md:text-[2em] mb-[30px] text-[#ffaa00] text-center [text-shadow:2px_2px_4px_rgba(0,0,0,0.5)] font-bold">
          🎴 สร้างห้องใหม่
        </div>
        
        {/* Room Name Input */}
        <div className="mb-[25px]">
          <label className="block mb-2.5 font-bold text-[1.1em]">ชื่อห้อง:</label>
          <input
            type="text"
            className="w-full p-[15px] bg-[#333] border-[3px] border-white rounded-[10px] text-white text-[1.1em] focus:border-[#ffaa00] outline-none transition-colors"
            placeholder="ใส่ชื่อห้องที่นี่..."
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
          />
        </div>

        {/* Deck Selection */}
        <div className="mb-[25px]">
          <label className="block mb-2.5 font-bold text-[1.1em]">เลือกสำรับการ์ด:</label>
          <div className="flex gap-5">
            {[1, 2].map((num) => (
              <div
                key={num}
                className={`
                  flex-1 py-[15px] px-5 bg-[#333] border-[3px] rounded-[10px] text-center cursor-pointer transition-all font-bold
                  ${selectedDeck === num ? 'border-[#ffaa00] bg-[#444] shadow-[0_0_15px_rgba(255,170,0,0.3)] text-[#ffaa00]' : 'border-white text-white hover:bg-[#383838]'}
                `}
                onClick={() => setSelectedDeck(num)}
              >
                🎴 สำรับ {num}
              </div>
            ))}
          </div>
        </div>

        {/* Add-on Toggle */}
        <div className="mb-[25px]">
          <label className="block mb-2.5 font-bold text-[1.1em]">Add-on (เพิ่มการ์ดพิเศษ):</label>
          <div className="flex items-center gap-[15px]">
            <span className={!addonEnabled ? 'text-white' : 'text-gray-500'}>ไม่ใช้</span>
            
            {/* Custom Toggle Switch */}
            <div
              className={`
                relative w-[60px] h-[30px] rounded-[15px] border-2 border-black cursor-pointer transition-colors duration-300
                ${addonEnabled ? 'bg-[#4CAF50]' : 'bg-[#333]'}
              `}
              onClick={() => setAddonEnabled(!addonEnabled)}
            >
              <div className={`
                absolute top-[1px] w-6 h-6 bg-white rounded-full border-2 border-black transition-all duration-300 shadow-md
                ${addonEnabled ? 'left-[30px]' : 'left-[2px]'}
              `} />
            </div>

            <span className={addonEnabled ? 'text-[#4CAF50] font-bold' : 'text-gray-500'}>ใช้</span>
          </div>

          {/* Preview Box */}
          <div className="mt-[15px] p-[15px] bg-orange-500/10 rounded-[10px] text-center border-2 border-[#ffaa00] text-[#ffaa00] italic">
            ℹ️ {deckPreview}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-[15px] mt-[30px]">
          <button 
            className="flex-1 bg-gradient-to-br from-[#ff6600] to-[#ff4400] border-[3px] border-black rounded-[10px] py-[15px] text-[1.2em] font-bold text-black hover:scale-105 active:scale-95 transition-transform"
            onClick={handleCreate}
          >
            สร้างห้อง
          </button>
          <button 
            className="flex-1 bg-gradient-to-br from-[#888] to-[#666] border-[3px] border-black rounded-[10px] py-[15px] text-[1.2em] font-bold text-black hover:scale-105 active:scale-95 transition-transform"
            onClick={onClose}
          >
            ยกเลิก
          </button>
        </div>
      </div>
    </div>
  );
}