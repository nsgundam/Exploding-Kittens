'use client';

import React, { useState } from 'react';
import styles from './CreateRoomModal.module.css';

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
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalTitle}>🎴 สร้างห้องใหม่</div>
        
        <div className={styles.formGroup}>
          <label>ชื่อห้อง:</label>
          <input
            type="text"
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
            placeholder="กรอกชื่อห้อง"
            maxLength={30}
            className={styles.input}
          />
        </div>

        <div className={styles.formGroup}>
          <label>เลือกสำรับการ์ด:</label>
          <div className={styles.deckSelection}>
            <div
              className={`${styles.deckOption} ${selectedDeck === 1 ? styles.selected : ''}`}
              onClick={() => setSelectedDeck(1)}
            >
              🎴 สำรับ 1
            </div>
            <div
              className={`${styles.deckOption} ${selectedDeck === 2 ? styles.selected : ''}`}
              onClick={() => setSelectedDeck(2)}
            >
              🎴 สำรับ 2
            </div>
          </div>
        </div>

        <div className={styles.formGroup}>
          <label>Add-on (เพิ่มการ์ดพิเศษ):</label>
          <div className={styles.addonToggle}>
            <span>ไม่ใช้</span>
            <div
              className={`${styles.toggleSwitch} ${addonEnabled ? styles.active : ''}`}
              onClick={() => setAddonEnabled(!addonEnabled)}
            >
              <div className={styles.toggleSlider} />
            </div>
            <span className={styles.activeText}>ใช้</span>
          </div>
          <div className={styles.deckPreview}>
            ℹ️ {deckPreview}
          </div>
        </div>

        <div className={styles.modalButtons}>
          <button className={styles.createButton} onClick={handleCreate}>
            สร้างห้อง
          </button>
          <button className={styles.cancelButton} onClick={onClose}>
            ยกเลิก
          </button>
        </div>
      </div>
    </div>
  );
}
