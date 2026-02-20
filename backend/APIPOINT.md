
---

  Room Endpoints

| Method | Endpoint | Description |
|--------|----------|------------|
| POST | /rooms | Create room |
| GET | /rooms | List rooms |
| GET | /rooms/:room_id | Get room detail |
| POST | /rooms/:room_id/join | Join room |
| POST | /rooms/:room_id/leave | Leave room |
| POST | /rooms/:room_id/start | Start game |

---

 Player Endpoints

| Method | Endpoint | Description |
|--------|----------|------------|
| POST | /players | Create player |
| GET | /rooms/:room_id/players | List players in room |
| GET | /players/:player_id | Player detail |
| PATCH | /players/:player_id | Update profile/status |
| PATCH | /players/:player_id/seat | Select seat |
| PATCH | /players/:player_id/afk | Set AFK flag |

---

Game Session Endpoints

| Method | Endpoint | Description |
|--------|----------|------------|
| POST | /sessions | Create session |
| GET | /sessions/:session_id | Session detail |
| POST | /sessions/:session_id/end | End game |
| GET | /rooms/:room_id/session | Active session in room |

---

Deck Config Endpoints

| Method | Endpoint | Description |
|--------|----------|------------|
| POST | /rooms/:room_id/deck-config | Set config |
| GET | /rooms/:room_id/deck-config | Get config |
| PATCH | /rooms/:room_id/deck-config | Update config |

---
Deck State Endpoints

| Method | Endpoint | Description |
|--------|----------|------------|
| GET | /sessions/:session_id/deck | Get deck state |
| POST | /sessions/:session_id/deck/shuffle | Shuffle deck |
| PATCH | /sessions/:session_id/deck | Update deck state |

---

Card Hand Endpoints

| Method | Endpoint | Description |
|--------|----------|------------|
| GET | /sessions/:session_id/hands | All hands (admin) |
| GET | /sessions/:session_id/hands/:player_id | Player hand |
| PATCH | /hands/:hand_id | Update cards/count |

---

 Game Action Endpoints

| Method | Endpoint | Description |
|--------|----------|------------|
| POST | /sessions/:session_id/draw | Draw card |
| POST | /sessions/:session_id/play | Play card |
| POST | /sessions/:session_id/nope | Nope action |
| POST | /sessions/:session_id/end-turn | End turn |

---

 Game Log Endpoints

| Method | Endpoint | Description |
|--------|----------|------------|
| GET | /sessions/:session_id/logs | List logs |
| POST | /logs | Create log entry |

---

Card Master Endpoints (Reference Data)

| Method | Endpoint | Description |
|--------|----------|------------|
| GET | /cards | List all cards |
| GET | /cards/:card_code | Card detail |

---
 Socket Event Check (Realtime)

- join-room
- leave-room
- game-update (broadcast)
- turn-change (broadcast)
- player-update (broadcast)