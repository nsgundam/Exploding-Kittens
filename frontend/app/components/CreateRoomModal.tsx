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

  const deckPreview = `สำรับ ${selectedDeck}${addonEnabled ? ' + Add-on' : ' (ไม่มี ADD-ON)'}`;

  return (
    <div
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-[1000] animate-fade-in"
      onClick={onClose}
    >
      <div
        style={{ width: '560px', padding: '0' }}
        className="bg-[#1a1a1a] border-[5px] border-white rounded-2xl text-white animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Title */}
        <div style={{ padding: '32px 48px 24px 48px' }} className="flex items-center justify-center gap-3 border-b border-white/10">
          <span className="text-3xl">🎴</span>
          <h2 className="text-2xl font-bold text-white font-bungee">สร้างห้องใหม่</h2>
        </div>

        {/* Content */}
        <div style={{ padding: '28px 48px', display: 'flex', flexDirection: 'column', gap: '24px' }}>

          {/* Room Name */}
          <div>
            <label className="block text-base mb-2 text-[#ffaa00] font-bungee">ชื่อห้อง:</label>
            <input
              type="text"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              placeholder="กรอกชื่อห้อง"
              maxLength={30}
              style={{ height: '56px' }}
              className="w-full px-4 text-base border-[2px] border-gray-400 rounded-xl outline-none font-bungee bg-white text-black focus:border-[#ffaa00] transition-colors"
            />
          </div>

          {/* Deck Selection */}
          <div>
            <label className="block text-base mb-2 text-[#ffaa00] font-bungee">เลือกสำรับการ์ด:</label>
            <div className="flex gap-3">
              <button
                style={{ height: '56px' }}
                className={[
                  'flex-1 border-[2px] rounded-xl cursor-pointer transition-all font-bold text-base font-bungee flex items-center justify-center gap-2',
                  selectedDeck === 1
                    ? 'bg-linear-to-br from-[#ffcc00] to-[#ff9900] border-[#ff6600] text-black'
                    : 'bg-[#2a2a2a] border-gray-500 text-white hover:border-[#ffaa00]',
                ].join(' ')}
                onClick={() => setSelectedDeck(1)}
              >
                🎴 สำรับ 1
              </button>
              <button
                style={{ height: '56px' }}
                className={[
                  'flex-1 border-[2px] rounded-xl cursor-pointer transition-all font-bold text-base font-bungee flex items-center justify-center gap-2',
                  selectedDeck === 2
                    ? 'bg-linear-to-br from-[#ffcc00] to-[#ff9900] border-[#ff6600] text-black'
                    : 'bg-[#2a2a2a] border-gray-500 text-white hover:border-[#ffaa00]',
                ].join(' ')}
                onClick={() => setSelectedDeck(2)}
              >
                🎴 สำรับ 2
              </button>
            </div>
          </div>

          {/* Addon Toggle — centered */}
          <div>
            <label className="block text-base mb-3 text-[#ffaa00] font-bungee text-center">ADD-ON (เพิ่มการ์ดพิเศษ):</label>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', marginBottom: '20px' }}>
              <span className="text-sm text-white/80">ไม่ใช้</span>
              <div
                className={[
                  'w-[56px] h-[28px] rounded-full relative cursor-pointer transition-all border-2 border-black shrink-0',
                  addonEnabled ? 'bg-[#4CAF50]' : 'bg-[#555]',
                ].join(' ')}
                onClick={() => setAddonEnabled(!addonEnabled)}
              >
                <div
                  className={[
                    'w-5 h-5 bg-white rounded-full absolute top-[2px] transition-all shadow border border-black',
                    addonEnabled ? 'left-[32px]' : 'left-[2px]',
                  ].join(' ')}
                />
              </div>
              <span className={`text-sm ${addonEnabled ? 'text-[#ffaa00]' : 'text-white/80'}`}>ใช้</span>
            </div>
            <div style={{ height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '16px' }} className="bg-[#ffaa00]/15 rounded-xl border border-[#ffaa00]/50 text-sm text-white/90">
              ℹ️ {deckPreview}
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div style={{ padding: '0 48px 36px 48px' }} className="flex gap-3">
          <button
            style={{ height: '60px' }}
            className="flex-1 bg-linear-to-br from-[#ff6600] to-[#ff4400] border-[2px] border-black rounded-xl text-base font-bold text-black font-bungee transition-all hover:scale-[1.02] hover:shadow-[0_4px_15px_rgba(255,102,0,0.5)] cursor-pointer"
            onClick={handleCreate}
          >
            สร้างห้อง
          </button>
          <button
            style={{ height: '60px' }}
            className="flex-1 bg-[#555] border-[2px] border-black rounded-xl text-base font-bold text-white font-bungee transition-all hover:scale-[1.02] hover:bg-[#666] cursor-pointer"
            onClick={onClose}
          >
            ยกเลิก
          </button>
        </div>
      </div>
    </div>
  );
}