'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import RoomCard from '../components/RoomCard';
import JoinModal from '../components/JoinModal';
import CreateRoomModal from '../components/CreateRoomModal';
import styles from '../page.module.css';

interface Room {
  id: string;
  name: string;
  deck: number;
  addon: boolean;
  players: number;
  maxPlayers: number;
  status: 'waiting' | 'playing';
}

// Mock function to generate more rooms (simulating API call)
const generateMockRooms = (startId: number, count: number): Room[] => {
  const rooms: Room[] = [];
  const names = ['Adventure', 'Epic', 'Legends', 'Warriors', 'Dragons', 'Phoenix', 'Thunder', 'Mystic'];
  
  for (let i = 0; i < count; i++) {
    const id = (startId + i).toString();
    rooms.push({
      id,
      name: names[Math.floor(Math.random() * names.length)],
      deck: Math.random() > 0.5 ? 1 : 2,
      addon: Math.random() > 0.5,
      players: Math.floor(Math.random() * 5) + 1,
      maxPlayers: 5,
      status: Math.random() > 0.3 ? 'waiting' : 'playing',
    });
  }
  return rooms;
};

export default function LobbyPage() {
  const [rooms, setRooms] = useState<Room[]>(generateMockRooms(1234, 20));
  const [filteredRooms, setFilteredRooms] = useState<Room[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  
  const observerTarget = useRef<HTMLDivElement>(null);
  const nextId = useRef(1234 + 20);

  // Filter rooms based on search query
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredRooms(rooms);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = rooms.filter(
        (room) =>
          room.name.toLowerCase().includes(query) ||
          room.id.includes(query) ||
          `${room.id}.${room.name}`.toLowerCase().includes(query)
      );
      setFilteredRooms(filtered);
    }
  }, [searchQuery, rooms]);

  // Infinite scroll - load more rooms
  const loadMoreRooms = useCallback(() => {
    if (isLoading || !hasMore) return;
    
    setIsLoading(true);
    
    // Simulate API call delay
    setTimeout(() => {
      const newRooms = generateMockRooms(nextId.current, 10);
      setRooms((prev) => [...prev, ...newRooms]);
      nextId.current += 10;
      setIsLoading(false);
      
      // Stop loading after 100 rooms (demo purposes)
      if (nextId.current > 1334) {
        setHasMore(false);
      }
    }, 500);
  }, [isLoading, hasMore]);

  // Intersection Observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading) {
          loadMoreRooms();
        }
      },
      { threshold: 0.1 }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [loadMoreRooms, hasMore, isLoading]);

  const handleRoomClick = (room: Room) => {
    setSelectedRoom(room);
    setIsJoinModalOpen(true);
  };

  const handleJoinConfirm = () => {
    if (selectedRoom) {
      console.log('Joining room:', selectedRoom.id);
      alert(`กำลังเข้าร่วมห้อง ${selectedRoom.id}.${selectedRoom.name}...`);
      // Here you would redirect to the game page
      // router.push(`/game/${selectedRoom.id}`);
    }
    setIsJoinModalOpen(false);
    setSelectedRoom(null);
  };

  const handleCreateRoom = (name: string, deck: number, addon: boolean) => {
    const newId = (nextId.current++).toString();
    const newRoom: Room = {
      id: newId,
      name,
      deck,
      addon,
      players: 1,
      maxPlayers: 5,
      status: 'waiting',
    };

    setRooms((prev) => [newRoom, ...prev]);
    setIsCreateModalOpen(false);
    alert(`สร้างห้อง "${name}" สำเร็จ!`);
    
    // Auto-join the created room
    // handleRoomClick(newRoom);
  };

  const handleBack = () => {
    if (confirm('คุณต้องการกลับไปหน้า Login หรือไม่?')) {
      console.log('Going back to login...');
      alert('กำลังกลับไปหน้า Login...');
      // router.push('/login');
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>
          <span className={styles.titleIcon}>🎮</span>
          EXPLODING KITTENS LOBBY
          <span className={styles.titleIcon}>🎮</span>
        </h1>
      </div>

      <div className={styles.lobbyFrame}>
        <div className={styles.roomListContainer}>
          <div className={styles.roomList}>
            {filteredRooms.map((room) => (
              <RoomCard
                key={room.id}
                id={room.id}
                name={room.name}
                deck={room.deck}
                addon={room.addon}
                players={room.players}
                maxPlayers={room.maxPlayers}
                status={room.status}
                onClick={() => handleRoomClick(room)}
              />
            ))}
            
            {isLoading && (
              <div className={styles.loading}>
                <div className={styles.spinner}>🎴</div>
                <span>กำลังโหลดห้องเพิ่มเติม...</span>
              </div>
            )}
            
            {!hasMore && filteredRooms.length > 0 && (
              <div className={styles.endMessage}>
                ไม่มีห้องเพิ่มเติมแล้ว 🎴
              </div>
            )}
            
            {filteredRooms.length === 0 && searchQuery && (
              <div className={styles.noResults}>
                ไม่พบห้องที่ค้นหา "{searchQuery}" 😿
              </div>
            )}
            
            <div ref={observerTarget} className={styles.observer} />
          </div>
        </div>
      </div>

      <div className={styles.controls}>
        <button className={styles.backButton} onClick={handleBack}>
          <span className={styles.arrow}>◄</span> BACK
        </button>

        <div className={styles.searchContainer}>
          <span className={styles.searchIcon}>🔍</span>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <span
              className={styles.clearSearch}
              onClick={() => setSearchQuery('')}
            >
              ✕
            </span>
          )}
        </div>

        <button className={styles.createButton} onClick={() => setIsCreateModalOpen(true)}>
          Create
        </button>

        <button className={styles.helpButton}>?</button>
      </div>

      <JoinModal
        isOpen={isJoinModalOpen}
        roomId={selectedRoom?.id || ''}
        roomName={selectedRoom?.name || ''}
        onConfirm={handleJoinConfirm}
        onClose={() => setIsJoinModalOpen(false)}
      />

      <CreateRoomModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreate={handleCreateRoom}
      />
    </div>
  );
}
