'use client';

import React from 'react';
import styles from './JoinModal.module.css';

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
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalTitle}>⚠️ ยืนยันการเข้าห้อง</div>
        <div className={styles.modalText}>
          คุณต้องการเข้าร่วมห้อง<br />
          <strong>{roomId}.{roomName}</strong><br />
          ใช่หรือไม่?
        </div>
        <div className={styles.modalButtons}>
          <button className={styles.confirmButton} onClick={onConfirm}>
            YES
          </button>
          <button className={styles.cancelButton} onClick={onClose}>
            NO
          </button>
        </div>
      </div>
    </div>
  );
}
