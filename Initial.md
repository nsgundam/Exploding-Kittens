# 🐱💣 Exploding Kittens — Project Initial Document

> **Version:** Sprint 1 (Active)  
> **Last Updated:** 2026-03-10  
> **Team:** กัน, พัต, อาร์ม, เบส, เพชร, นันย่า

---

## 📌 Project Overview

**Exploding Kittens** is a real-time multiplayer web-based card game inspired by the popular tabletop game. Players join rooms, select seats, and compete in turn-based card play — all communicated through a WebSocket-powered backend. The project supports both the **Classic** card version and the **Good & Evil** expansion.

---

## 🏗️ Architecture

```
Exploding-Kittens/
├── backend/          # Express + Socket.IO API server (TypeScript)
├── frontend/         # Next.js 16 client application (TypeScript)
├── AGENTS.md         # Agent development guidelines
└── Initial.md        # ← You are here
```

### System Diagram

```
┌──────────────────────┐       WebSocket (Socket.IO)       ┌──────────────────────┐
│                      │◄────────────────────────────────►  │                      │
│   Next.js Frontend   │       REST API (Express)           │   Express Backend    │
│   (localhost:3000)   │◄────────────────────────────────►  │   (localhost:4000)   │
│                      │                                    │                      │
└──────────────────────┘                                    └──────────┬───────────┘
                                                                       │
                                                                       │ Prisma ORM
                                                                       ▼
                                                            ┌──────────────────────┐
                                                            │     PostgreSQL       │
                                                            │  exploding_kittens_db│
                                                            └──────────────────────┘
```

---

## 🧰 Tech Stack

### Backend
| Technology | Version | Purpose |
|---|---|---|
| Node.js | v25.6.1 | Runtime |
| TypeScript | 5.9.3 | Language |
| Express | 5.2.1 | REST API framework |
| Socket.IO | 4.8.3 | Real-time WebSocket communication |
| Prisma | 7.4.0 | ORM & database migrations |
| PostgreSQL | 15.15 | Relational database |
| pg | 8.18.0 | PostgreSQL client adapter |

### Frontend
| Technology | Version | Purpose |
|---|---|---|
| Next.js | 16.1.6 | React framework (App Router) |
| React | 19.2.3 | UI library |
| Tailwind CSS | 4.2.1 | Utility-first styling |
| Framer Motion | 12.34.4 | Animations & transitions |
| Socket.IO Client | 4.8.3 | Real-time WebSocket communication |
| Lucide React | 0.576.0 | Icon library |
| Radix UI | — | Accessible UI primitives (Button, Input) |

---

## 📂 Project Structure

### Backend (`backend/`)

```
backend/
├── prisma/
│   ├── schema.prisma          # Database schema (10 models)
│   ├── seed.ts                # Test data seeder
│   └── migrations/            # Migration history
├── src/
│   ├── server.ts              # Express + Socket.IO entry point
│   ├── config/
│   │   └── prisma.ts          # Prisma client singleton
│   ├── controllers/
│   │   └── room.controllers.ts
│   ├── routes/
│   │   └── room.route.ts      # REST endpoints under /api/rooms
│   ├── services/
│   │   └── room.service.ts    # Core business logic
│   ├── socket/
│   │   └── room.socket.ts     # Socket.IO event handlers
│   └── types/
│       └── Rooms.ts           # TypeScript interfaces
├── .env                       # DATABASE_URL, PORT
├── prisma.config.ts
├── package.json
└── tsconfig.json
```

### Frontend (`frontend/`)

```
frontend/
├── app/
│   ├── page.tsx               # Home — name input & avatar picker
│   ├── layout.tsx             # Root layout
│   ├── globals.css            # Global styles (Tailwind)
│   ├── Lobby/
│   │   └── page.tsx           # Room list, create & join room
│   ├── room/
│   │   └── [roomId]/
│   │       └── page.tsx       # Game room — seat selection
│   ├── api/
│   │   └── rooms/
│   │       └── [[...slug]]/
│   │           └── route.ts   # API proxy to backend
│   └── components/
│       ├── AnimatedBackground.tsx
│       ├── CreateRoomModal.tsx
│       ├── JoinModal.tsx
│       └── RoomCard.tsx
├── components/
│   └── ui/
│       ├── button.tsx         # Reusable Button (Radix + CVA)
│       └── input.tsx          # Reusable Input
├── hooks/
│   └── useRoomSocket.ts       # Socket.IO hook for room state
├── lib/
│   └── utils.ts               # Utility functions (cn)
├── public/
│   └── images/
│       └── background.jpg     # Background asset
├── .env                       # NEXT_PUBLIC_API_URL
├── next.config.ts
├── tailwind.config.js
├── package.json
└── tsconfig.json
```

---

## 🗄️ Database Schema

### Entity Relationship

```
PlayerIdentity ──┬── hosts ──► Room ──┬── has ──► DeckConfig
                  │                    ├── has many ──► Player
                  │                    └── has many ──► GameSession ──┬── has ──► DeckState
                  └── has many ──► Player ──┬── has many ──► CardHand │
                                            └── has many ──► GameLog ◄┘

CardMaster (standalone — card definitions)
```

### Models Summary

| Model | Purpose |
|---|---|
| `PlayerIdentity` | Persistent player identity via UUID token (stored in LocalStorage) |
| `Room` | Game room with host, status (WAITING/PLAYING), and max player limit |
| `Player` | Player instance within a room, with seat number and role (PLAYER/SPECTATOR) |
| `GameSession` | Active game session tracking turn state and winner |
| `DeckConfig` | Room-level card version and expansion configuration |
| `DeckState` | Session-level deck order, discard pile, and remaining count |
| `CardHand` | Player's current hand of cards in a session |
| `GameLog` | Action log per turn (play card, draw, nope, etc.) |
| `CardMaster` | Master card definitions (type, effect, quantity, expansion) |

### Enums

| Enum | Values |
|---|---|
| `PlayerRole` | `SPECTATOR`, `PLAYER` |
| `RoomStatus` | `WAITING`, `PLAYING` |
| `GameSessionStatus` | `WAITING`, `IN_PROGRESS`, `FINISHED` |

---

## 🔌 API & Socket Events

### REST API

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/rooms` | List all rooms |
| `GET` | `/api/rooms/:id` | Get room by ID |
| `POST` | `/api/rooms` | Create a new room |
| `POST` | `/api/rooms/:id/join` | Join a room (create Player as SPECTATOR) |
| `POST` | `/api/rooms/:id/seat` | Select a seat |
| `POST` | `/api/rooms/:id/leave` | Leave a room |
| `POST` | `/api/rooms/:id/start` | Start the game (host only) |

### Socket.IO Events

| Event | Direction | Payload | Description |
|---|---|---|---|
| `joinRoom` | Client → Server | `{ roomId, playerToken, displayName }` | Join a room |
| `selectSeat` | Client → Server | `{ roomId, playerToken, seatNumber }` | Select / change seat |
| `unseatPlayer` | Client → Server | `{ roomId, playerToken }` | Leave seat (become spectator) |
| `roomUpdated` | Server → Client | Room data with players | Broadcast updated room state |
| `roomDeleted` | Server → Client | — | Room was deleted (no players left) |
| `errorMessage` | Server → Client | Error string | Error notification |
| `disconnect` | Auto | — | 60s grace period reconnection window |

---

## 🃏 Card Types

### Core Cards (Classic Version)

| Code | Name | Type | Qty | Effect |
|---|---|---|---|---|
| `EK` | Exploding Kitten | bomb | 4 | Eliminate player if no Defuse |
| `DF` | Defuse | defuse | 6 | Cancel bomb, insert EK back in deck |
| `AT` | Attack | action | 4 | End turn, next player takes 2 turns |
| `SK` | Skip | action | 4 | End turn without drawing |
| `SF` | See The Future | action | 5 | Peek at top 3 cards of deck |
| `SH` | Shuffle | action | 4 | Randomly shuffle the deck |
| `NP` | Nope | reaction | 5 | Cancel any action, playable anytime |
| `FV` | Favor | action | 4 | Force a player to give you 1 card |
| `CAT_TACO` | Taco Cat | combo | 4 | Pair to steal a random card |
| `CAT_MELON` | Melon Cat | combo | 4 | Pair to steal a random card |

### Good & Evil Expansion

| Code | Name | Type | Qty | Effect |
|---|---|---|---|---|
| `EKG` | Exploding Kitten (Good) | bomb | 2 | Gold variant bomb |
| `EKE` | Exploding Kitten (Evil) | bomb | 2 | Red variant + discard hand |

---

## 🚀 Getting Started

### Prerequisites

- Node.js v25+
- PostgreSQL 15+ (via Homebrew)
- A local database named `exploding_kittens_db`

### Setup

```bash
# 1. Clone the repository
git clone <repo-url>
cd Exploding-Kittens

# 2. Backend setup
cd backend
npm install
# Create .env with your DATABASE_URL
npx prisma generate
npx prisma migrate dev --name init
npm run db:seed

# 3. Frontend setup
cd ../frontend
npm install
# Create .env with NEXT_PUBLIC_API_URL=http://localhost:4000

# 4. Run both servers
# Terminal 1:
cd backend && npm run dev    # → http://localhost:4000

# Terminal 2:
cd frontend && npm run dev   # → http://localhost:3000
```

---

## 📝 Development Guidelines

- Always use `npm run dev` — **never** run `npm run build` during development
- Prefer TypeScript (`.tsx`/`.ts`) for all new files
- Restart the dev server after adding new dependencies
- Backend uses `ts-node` directly (no build step needed for dev)
- Frontend uses Next.js App Router with hot-reload (HMR)

---

---

# 📅 Project Plan — Sprint Roadmap

---

## 🔄 Sprint 1 — Core Infrastructure (Week 3–4) `IN PROGRESS`

**Goal:** ทุกหน้า navigate ได้ และ Lobby ทำงานจริงกับ DB

**Sprint 1 Acceptance Criteria:**
- ✅ ผู้ใช้กรอกชื่อ เลือกรูป กดเริ่ม → token เก็บใน LocalStorage → redirect หน้า Lobby
- ✅ Lobby แสดงรายการห้องจาก DB ได้จริง
- ✅ สร้างห้องได้ → ห้องปรากฏในรายการทันที
- ✅ กด Join ห้อง status=WAITING → เข้าหน้า Game Room ได้
- ✅ เข้าหน้า Game Room → เห็นที่นั่งและสามารถเลือกที่นั่งได้ (real-time)

---

### 🏗️ Setup

| Ticket | งาน | ผู้รับผิดชอบ | Estimate | Status | Notes |
|--------|-----|-------------|----------|--------|-------|
| S1-01 | PostgreSQL + Prisma Schema + migrate | พัต | 1 วัน | ✅ Done | 10 models, 3 enums, 7 migrations applied |
| S1-02 | Express.js server structure + middleware | พัต | 0.5 วัน | ✅ Done | CORS, JSON parser, error handler |
| S1-03 | Next.js + Tailwind + folder structure | อาร์ม | 0.5 วัน | ✅ Done | Next.js 16 + Tailwind 4 + App Router |
| S1-04 | Socket.io server — connect/disconnect base | กัน | 1 วัน | ✅ Done | 60s reconnect grace period implemented |
| S1-05 | Prisma Seed data | กัน + พัต | 0.5 วัน | ✅ Done | 12 cards, 6 identities, 2 rooms (WAITING + PLAYING) |

---

### 🖥️ หน้า Login / Character Select

| Ticket | งาน | ผู้รับผิดชอบ | Estimate | Status | Notes |
|--------|-----|-------------|----------|--------|-------|
| S1-06 | Generate player token + เก็บ LocalStorage ตั้งแต่เปิดเว็บ | เบส | 0.5 วัน | ✅ Done | Uses `crypto.randomUUID()`, saved on first join |
| S1-07 | UI หน้า Login — เลือกรูป + กรอกชื่อ + กดเริ่ม | เบส | 1.5 วัน | ✅ Done | DiceBear API avatar, 8 styles, randomize tap |
| S1-08 | Redirect logic — ถ้ามี token + อยู่ในห้อง → reconnect | เบส | 0.5 วัน | ✅ Done | Backend has 60s grace period, frontend checks `/api/rooms/current` and redirects to `/room/[roomId]` if in room. |

---

### 🏛️ หน้า Lobby

| Ticket | งาน | ผู้รับผิดชอบ | Estimate | Status | Notes |
|--------|-----|-------------|----------|--------|-------|
| S1-09 | API: GET /rooms — ดึงห้อง status=WAITING | นันย่า | 1 วัน | ✅ Done | API filtered using `?status=WAITING`. |
| S1-10 | API: POST /rooms — สร้างห้อง + DeckConfig | นันย่า | 1 วัน | ✅ Done | Creates room code (6-digit), DeckConfig, host as Player |
| S1-11 | API: GET /rooms/:id — ค้นหาห้องด้วย room_id | นันย่า | 0.5 วัน | ✅ Done | Includes players + deck_config |
| S1-12 | UI Lobby — แสดงรายการห้อง + empty state | เพชร | 1.5 วัน | ✅ Done | RoomCard component with status badges |
| S1-13 | UI Modal สร้างห้อง — ชื่อ + card version + add-on | เพชร | 1 วัน | ✅ Done | Classic/Good&Evil deck picker + add-on toggle |
| S1-14 | เชื่อม Lobby UI กับ API + error handling | เบส | 1 วัน | ✅ Done | API proxy via Next.js route handler, x-player-token header |

---

### 🎮 หน้า Game Room (Base)

| Ticket | งาน | ผู้รับผิดชอบ | Estimate | Status | Notes |
|--------|-----|-------------|----------|--------|-------|
| S1-15 | API: POST /rooms/:id/join — สร้าง Player record (SPECTATOR) | นันย่า | 1 วัน | ✅ Done | Idempotent join, upserts PlayerIdentity |
| S1-16 | UI Game Room — แสดงที่นั่ง + player list | อาร์ม | 2 วัน | ✅ Done | Basic UI (functional, not styled — shows seats + player list) |
| S1-17 | Socket: join_room / leave_room event | กัน | 1 วัน | ✅ Done | `joinRoom` event + disconnect handler with grace period |
| S1-18 | Socket: seat_select + real-time sync ทุก client | กัน | 2 วัน | ✅ Done | `selectSeat` + `unseatPlayer` events, broadcasts `roomUpdated` |
| S1-19 | API: PATCH /rooms/:id/seat — บันทึก seat ลง DB | นันย่า | 1 วัน | ✅ Done | API changed to `PATCH /rooms/:id/seat`. |

---

### 🧪 QA

| Ticket | งาน | ผู้รับผิดชอบ | Estimate | Status | Notes |
|--------|-----|-------------|----------|--------|-------|
| S1-20 | เขียน Test Case ตาม AC ทุกหน้า | อาร์ม | 1 วัน | ❌ Not Done | No test files found in project |
| S1-21 | Test flow ทั้งหมดก่อน Sprint Review | อาร์ม + เพชร | 1 วัน | ❌ Not Done | No automated or documented manual tests |

---

### Sprint 1 Summary

| Category | Total | Done | Partial/Note | Not Done |
|----------|-------|------|--------------|----------|
| Setup | 5 | 5 | 0 | 0 |
| Login | 3 | 3 | 0 | 0 |
| Lobby | 6 | 6 | 0 | 0 |
| Game Room | 5 | 5 | 0 | 0 |
| QA | 2 | 0 | 0 | 2 |
| **Total** | **21** | **19** | **0** | **2** |

### ⚠️ Issues Found in Sprint 1 (FIXED)

1. ~~**S1-08 — Reconnect redirect missing:**~~ [FIXED: Added `/api/rooms/current` check on Home page to auto-redirect].

2. ~~**S1-09 — No WAITING filter:**~~ [FIXED: Modified API and frontend fetch to filter by `status=WAITING`].

3. ~~**S1-19 — POST instead of PATCH:**~~ [FIXED: Changed seat selection endpoint to `PATCH /api/rooms/:id/seat`].

4. **S1-20/21 — No tests:** Zero test files exist in the project. No test framework is configured in either backend or frontend.

---

---

## ⏳ Sprint 2 — Basic Gameplay (Week 5–6) `PLANNED`

**Goal:** Host กดเริ่มเกมได้ และผู้เล่นเล่นไพ่ได้จริง

| Ticket | งาน | ผู้รับผิดชอบ | Estimate |
|--------|-----|-------------|----------|
| S2-01 | API: POST /sessions — สร้าง GameSession + DeckState + แจกไพ่ | พัต + นันย่า | — |
| S2-02 | UI: ปุ่ม "Start Game" สำหรับ Host + validate ผู้เล่น ≥ 2 คน | เบส | — |
| S2-03 | Socket: game_start event → sync ทุก client | กัน | — | ✅ Done | Included in `room.socket.ts` |
| S2-04 | UI Game Room — แสดงไพ่ในมือ (ตัวเอง) | เบส | — |
| S2-05 | UI Game Room — แสดง deck count, discard pile | เบส | — |
| S2-06 | Socket: play_card event + บันทึก GameLog | กัน + นันย่า | — | ✅ Done | Stubbed `gameService.playCard` |
| S2-07 | Socket: draw_card event + ตรวจสอบ Exploding Kitten | กัน | — | ✅ Done | Stubbed `gameService.drawCard` |
| S2-08 | Game Logic: turn management (เทิร์น + เปลี่ยนผู้เล่น) | พัต | — |
| S2-09 | Game Logic: Defuse card handling | นันย่า | — |
| S2-10 | UI: แสดง Game Log / action history | อาร์ม | — |
| S2-11 | QA: Test gameplay flow ครบ | อาร์ม + เพชร | — |

---

## ⏳ Sprint 3 — Advanced Features (Week 7–8) `PLANNED`

**Goal:** การ์ด action ทุกใบทำงานได้ และ Reconnect ใช้งานได้จริง

| Ticket | งาน | ผู้รับผิดชอบ | Estimate |
|--------|-----|-------------|----------|
| S3-01 | Game Logic: Attack, Skip, See The Future, Shuffle, Favor | พัต + นันย่า | — |
| S3-02 | Game Logic: Nope card (interrupt any time) | กัน + นันย่า | — |
| S3-03 | Game Logic: Combo cards (2 คู่ / 3 คู่) | นันย่า | — |
| S3-04 | Reconnect: detect disconnect + hold state 5 นาที | กัน | — |
| S3-05 | Reconnect: token validation → restore game state | กัน + พัต | — |
| S3-06 | Host migration: ย้าย host เมื่อ host disconnect | กัน | — |
| S3-07 | Game End: ประกาศผู้ชนะ + เลือกเล่นต่อ/ออก (นับทุกคนทั้ง PLAYER และ SPECTATOR, threshold > 1 คน) | พัต + เบส | — |
| S3-08 | Token Expiry: กำหนดอายุ token + logic ตรวจสอบ/ล้างใน PlayerIdentity | พัต + กัน | — |
| S3-09 | Good & Evil version: การ์ดพิเศษ | นันย่า | — |
| S3-10 | QA: Test edge cases (disconnect, nope chain, combo, token expiry) | อาร์ม + เพชร | — |

---

## ⏳ Sprint 4 — Polish & UX (Week 9–10) `PLANNED`

**Goal:** ประสบการณ์ผู้เล่นดีขึ้น มี animation และ feedback ที่ชัดเจน

| Ticket | งาน | ผู้รับผิดชอบ | Estimate |
|--------|-----|-------------|----------|
| S4-01 | Animation: เล่นไพ่, จั่วไพ่, ระเบิด (Framer Motion) | เบส + เพชร | — |
| S4-02 | UI: คู่มือการเล่นใน Lobby | อาร์ม | — |
| S4-03 | UI: Notification เมื่อ Host เปลี่ยน DeckConfig | เบส | — |
| S4-04 | UI: AFK warning + afk_count display | เพชร | — |
| S4-05 | Responsive Design — Mobile support | อาร์ม + เพชร | — |
| S4-06 | Error handling UI (API fail, Socket disconnect) | เบส | — |
| S4-07 | Performance: optimize Socket events, reduce re-render | กัน | — |
| S4-08 | QA: UX testing + Bug fixes | อาร์ม + เพชร | — |

---

## ⏳ Sprint 5 — Testing & Launch (Week 11–12) `PLANNED`

**Goal:** Production-ready + Deploy จริง

| Ticket | งาน | ผู้รับผิดชอบ | Estimate |
|--------|-----|-------------|----------|
| S5-01 | Integration Testing ทุก flow | อาร์ม + เพชร | — |
| S5-02 | Load Testing: ทดสอบหลายห้องพร้อมกัน | กัน | — |
| S5-03 | Security: token validation, rate limiting | พัต + กัน | — |
| S5-04 | Deploy Backend to Production | กัน | — |
| S5-05 | Deploy Frontend to Production | กัน | — |
| S5-06 | Smoke Test บน Production | อาร์ม | — |
| S5-07 | Final Documentation | นันย่า + พัต | — |
| S5-08 | Project Retrospective | ทั้งทีม | — |

---

## 📊 Overall Progress

| Sprint | Status | Completion |
|--------|--------|------------|
| Sprint 1 — Core Infrastructure | 🔄 In Progress | 19/21 tickets done (0 partial, 2 not done) |
| Sprint 2 — Basic Gameplay | 🔄 In Progress | 3/11 |
| Sprint 3 — Advanced Features | ⏳ Planned | 0/10 |
| Sprint 4 — Polish & UX | ⏳ Planned | 0/8 |
| Sprint 5 — Testing & Launch | ⏳ Planned | 0/8 |
| **Total** | | **22/58 tickets** |

### 🔄 Game Flow

```
1. HOME PAGE          ──── Sprint 1 ✅
   └─ Enter nickname + pick avatar → saved to LocalStorage
       └─ Navigate to Lobby

2. LOBBY              ──── Sprint 1 ✅
   ├─ View all rooms (auto-refresh)
   ├─ Create Room (name, max players, card version, expansions)
   └─ Join Room → navigate to /room/[roomId]

3. GAME ROOM (Waiting) ──── Sprint 1 ✅
   ├─ See all players (seated + spectators)
   ├─ Select seat → become PLAYER
   ├─ Leave seat → become SPECTATOR
   └─ Host starts game (min 2 seated players)

4. GAME ROOM (Playing) ──── Sprint 2 🚧
   ├─ Deal cards
   ├─ Turn-based play (play cards / draw)
   ├─ Exploding Kitten drawn → Defuse or eliminate
   └─ Last player standing wins

5. CARD ACTIONS        ──── Sprint 3 🚧
   ├─ Attack, Skip, See The Future, Shuffle, Favor
   ├─ Nope chain (interrupt system)
   └─ Combo cards (pair / triple steal)

6. POLISH & DEPLOY     ──── Sprint 4–5 🚧
   ├─ Animations, mobile support, error handling
   └─ Production deployment
```
