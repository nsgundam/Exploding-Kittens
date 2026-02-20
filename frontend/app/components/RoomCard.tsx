'use client';

import React from 'react';
import styles from './RoomCard.module.css';

interface RoomCardProps {
  id: string;
  name: string;
  deck: number;
  addon: boolean;
  players: number;
  maxPlayers: number;
  status: 'waiting' | 'playing';
  onClick: () => void;
}

export default function RoomCard({
  id,
  name,
  deck,
  addon,
  players,
  maxPlayers,
  status,
  onClick
}: RoomCardProps) {
  const deckText = `สำรับ ${deck}${addon ? ' + Add-on' : ''}`;
  const isClickable = status === 'waiting';
  
  return (
    <div 
      className={`${styles.roomCard} ${!isClickable ? styles.disabled : ''}`}
      onClick={isClickable ? onClick : undefined}
      style={{ animationDelay: `${Math.random() * 0.3}s` }}
    >
      <div className={styles.cardAddon}>
        <span className={styles.cardIcon}>🎴</span>
        <span className={styles.cardText}>{deckText}</span>
      </div>

      <div className={styles.roomNameContainer}>
        <span className={styles.roomName}>
          ❄ {id}.{name} ❄
        </span>
      </div>

      <div className={styles.playerCount}>
        <span className={styles.explosion}>💥</span>
        <span className={styles.count}>{players}/{maxPlayers}</span>
      </div>

      <div className={`${styles.statusButton} ${styles[status]}`}>
        <span className={`${styles.star} ${styles.starTop}`}>★</span>
        <span className={styles.statusText}>
          {status === 'waiting' ? 'Waiting' : 'Playing'}
        </span>
        <span className={`${styles.star} ${styles.starBottom}`}>★</span>
      </div>
    </div>
  );
}
