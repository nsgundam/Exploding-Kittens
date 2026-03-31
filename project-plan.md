# 🐱💣 Exploding Kittens — Project Plan v2.1
**Based on:** SRS v2.0 (Approved)  
**Model:** Agile Scrum + DevOps  
**Last Updated:** Sprint 2  
**Version:** 2.5 (MVP Scope — G&E Cut + Token Expiry Cut + คู่มือ Cut + Reconnect Hold Cut)

---

## 📋 สารบัญ
1. [Project Overview](#1-project-overview)
2. [Team & RACI Matrix](#2-team--raci-matrix)
3. [Timeline & Gantt](#3-timeline--gantt)
4. [Sprint Breakdown & Tickets](#4-sprint-breakdown--tickets)
5. [CI/CD Pipeline Plan](#5-cicd-pipeline-plan)
6. [Risk Register](#6-risk-register)
7. [Definition of Done](#7-definition-of-done)
8. [SRS Coverage Checklist](#8-srs-coverage-checklist)

---

## 1. Project Overview

| Item | Detail |
|------|--------|
| **Project** | Exploding Kittens — Online Multiplayer |
| **Tech Stack** | Next.js, Node.js, Express, PostgreSQL, Prisma, Socket.io, Tailwind, Framer Motion, shadcn, Aceternity UI |
| **Duration** | 12 สัปดาห์ (6 Sprints × 2 สัปดาห์) |
| **Team Size** | 6 คน |
| **Current Sprint** | Sprint 2 — Basic Gameplay |
| **SRS Version** | 2.0 (Approved) |

### Goals — SRS Coverage Map

| Goal | FR Reference | Sprint |
|------|-------------|--------|
| Identity ไม่ต้อง login ใช้ Token (ไม่มี expiry ใน MVP) | FR-01 | S1 |
| Lobby: สร้าง / ค้นหา / เข้าห้อง | FR-02, FR-03 | S1 |
| Room Config: Version + Add-on + Host Change | FR-03 | S1, S2 |
| Core Gameplay: Turn-based + EK Bomb | FR-04 | S2 |
| Cards: Original (AT/SK/SF/SH/FV/NP/Combo) | FR-05 | S2, S3 |
| Expansion: Imploding Kittens | FR-06 | S4 |
| Game End + Auto Reset + Winner First | FR-07 | S2 |
| Disconnect / Reconnect (simplified — no hold state) | FR-08 | S3 |
| AFK System (30 วิ) | FR-09 | S3 |

---

## 2. Team & RACI Matrix

### Team Roster

| ชื่อ | Primary Role | Secondary Role | ความรับผิดชอบหลัก |
|------|-------------|----------------|-------------------|
| **กัน** | PM / DevOps | Lead Dev | Planning, Socket.io, Deployment, Unblock |
| **พัต** | System Architect | Lead Backend | Architecture, DB, API Design, Docs |
| **นันย่า** | Backend Dev | Documentation | REST API, Game Logic, DB Queries |
| **เบส** | Frontend Dev | Full-stack | UI Components, API Integration |
| **อาร์ม** | Lead QA | Frontend Dev | Test Cases, QA Process, UI |
| **เพชร** | Frontend Dev | QA | UI Components, Testing |

### RACI Matrix

> R = Responsible | A = Accountable | C = Consulted | I = Informed

| งาน | PM/DevOps | SA/Lead BE | Backend Dev | Frontend Dev | Lead QA | FE/QA |
|-----|-----------|-----------|-------------|-------------|---------|-------|
| Sprint Planning & Management | A/R | C | I | I | I | I |
| Daily Standup | A/R | R | R | R | R | R |
| Sprint Review & Retrospective | A/R | R | R | R | R | R |
| DB Schema & Architecture | C | A/R | C | I | I | I |
| REST API Development | C | A | R | I | I | I |
| Socket.io Development | A/R | C | C | I | I | I |
| Game Logic (Backend) | C | A | R | I | I | I |
| Frontend — Pages & Components | I | I | I | A/R | R | R |
| Frontend — Socket Integration | C | I | I | A/R | C | R |
| Card Seed Data (CardMaster) | I | C | A/R | I | I | I |
| QA — Test Case Writing | I | I | I | C | A/R | C |
| QA — Manual Testing | I | I | I | C | A/R | R |
| CI/CD Pipeline | A/R | C | I | I | I | I |
| Deployment | A/R | C | I | I | I | I |
| Technical Documentation | C | A/R | R | I | I | I |

---

## 3. Timeline & Gantt

```
WEEK        │  1  │  2  │  3  │  4  │  5  │  6  │  7  │  8  │  9  │ 10  │ 11  │ 12  │
SPRINT      │──S0──│──S0──│──S1──│──S1──│──S2──│──S2──│──S3──│──S3──│──S4──│──S4──│──S5──│──S6──│
────────────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┤
Setup/Infra │█████│█████│░░░░░│     │     │     │     │     │     │     │     │     │
Login/Token │     │     │█████│█████│     │     │     │     │     │     │     │     │
Lobby/Room  │     │     │█████│█████│     │     │     │     │     │     │     │     │
────────────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┤
Core Game   │     │     │     │     │█████│█████│     │     │     │     │     │     │
EK Bomb     │     │     │     │     │█████│█████│     │     │     │     │     │     │
Basic Cards │     │     │     │     │█████│█████│     │     │     │     │     │     │
Game End    │     │     │     │     │█████│█████│     │     │     │     │     │     │
────────────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┤
Favor/Nope  │     │     │     │     │     │     │█████│█████│     │     │     │     │
Combo/Chain │     │     │     │     │     │     │█████│█████│     │     │     │     │
Reconnect   │     │     │     │     │     │     │█████│█████│     │     │     │     │
AFK         │     │     │     │     │     │     │█████│█████│     │     │     │     │
────────────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┤
Imploding   │     │     │     │     │     │     │     │     │█████│█████│     │     │
────────────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┤
Polish/UX   │     │     │     │     │     │     │     │     │     │     │█████│     │
Test/Launch │     │     │     │     │     │     │     │     │     │     │     │█████│

█ = Active   ░ = Minor/Ongoing   (G&E Cards + Armageddon = MVP-CUT)
```

---

## 4. Sprint Breakdown & Tickets

> **Role Legend:**
> `PM` = PM/DevOps | `SA` = System Architect/Lead Backend | `BE` = Backend Dev
> `FE` = Frontend Dev | `QA` = Lead QA | `FE/QA` = Frontend Dev/QA | `All` = All Team

---

### ✅ Sprint 0 — Planning & Setup (Week 1–2) `DONE`

**Goal:** ทีมและ infrastructure พร้อมก่อน code แรก

| Ticket | งาน | FR Ref | Role | Status |
|--------|-----|--------|------|--------|
| S0-01 | กำหนด Tech Stack และ Architecture | TR-01/02 | SA | ✅ Done |
| S0-02 | ออกแบบ DB Schema (ERD) + Prisma | TR-03 | SA | ✅ Done |
| S0-03 | ตั้งค่า GitHub Repo + Branch Strategy | TR-04/05 | PM | ✅ Done |
| S0-04 | กำหนด Definition of Done | — | PM + All | ✅ Done |
| S0-05 | สร้าง Wireframe ทุกหน้า | — | FE + QA | ✅ Done |
| S0-06 | กำหนด API Contract (Endpoint List) | — | SA | ✅ Done |

---

### ✅ Sprint 1 — Core Infrastructure (Week 3–4) `DONE`

**Goal:** ทุกหน้า navigate ได้ Lobby + Game Room ทำงานจริงกับ DB

**Acceptance Criteria:**
- ✅ Token สร้าง/โหลดจาก LocalStorage → redirect Lobby
- ✅ Lobby แสดงห้องจาก DB + สร้างห้องได้
- ✅ เข้าห้อง → เห็นที่นั่ง + เลือกที่นั่งได้ real-time

| Ticket | งาน | FR Ref | Role | Status |
|--------|-----|--------|------|--------|
| S1-01 | PostgreSQL + Prisma Schema + migrate | TR-03 | SA | ✅ Done |
| S1-02 | Express.js server structure + middleware | TR-02 | SA | ✅ Done |
| S1-03 | Next.js + Tailwind + folder structure | TR-01 | QA | ✅ Done |
| S1-04 | Socket.io server base + authenticate event | NFR-01/FR-09-1 | PM | ✅ Done |
| S1-05 | Prisma Seed (12 cards, 6 identities, 2 rooms) | — | PM + SA | ✅ Done |
| S1-06 | Generate token + LocalStorage + pre-fill ชื่อ/avatar | FR-01-1/2/6 | FE | ✅ Done |
| S1-07 | UI หน้า Login — avatar + ชื่อ + เริ่ม | FR-01-2 | FE | ✅ Done |
| S1-08 | Redirect logic — token ยังอยู่ในห้อง | FR-01-5 | FE | ✅ Done |
| S1-09 | API: GET /rooms?status=WAITING | FR-02-1 | BE | ✅ Done |
| S1-10 | API: POST /rooms — สร้างห้อง + DeckConfig | FR-02-3/FR-03-1/2 | BE | ✅ Done |
| S1-11 | API: GET /rooms/:id — ค้นหาด้วย room_id | FR-02-2 | BE | ✅ Done |
| S1-12 | UI Lobby — รายการห้อง + empty state | FR-02-1 | FE/QA | ✅ Done |
| S1-13 | UI Modal สร้างห้อง — ชื่อ + version + add-on | FR-02-3/FR-03-1/2 | FE/QA | ✅ Done |
| S1-14 | เชื่อม Lobby UI กับ API + error handling | NFR-07/08 | FE | ✅ Done |
| S1-15 | API: POST /rooms/:id/join — สร้าง Player (SPECTATOR) | FR-03-6 | BE | ✅ Done |
| S1-16 | UI Game Room — ที่นั่ง + player list | FR-03-6/7 | QA | ✅ Done |
| S1-17 | Socket: joinRoom / leaveRoom event | FR-03-6 | PM | ✅ Done |
| S1-18 | Socket: selectSeat / unseatPlayer + roomUpdated | FR-03-7/8/9 | PM | ✅ Done |
| S1-19 | API: PATCH /rooms/:id/seat — บันทึกที่นั่งลง DB | FR-03-7 | BE | ✅ Done |
| S1-20 | **[G01]** UI: ปุ่มลุกจากที่นั่ง (Leave Seat button) | FR-03-8 | FE | ✅ Done |
| S1-21 | **[G02]** UI: Host config panel ใน Game Room — dropdown เปลี่ยน version/add-on ขณะ WAITING | FR-03-4 | FE | ✅ Done |
| S1-22 | **[G03]** API: POST /rooms/:id/leave — leave room REST endpoint | FR-03 | BE | ✅ Done |
| S1-23 | **[G04]** Logic: ลบ Room เมื่อ Player ทุกคนออก + broadcast roomDeleted | FR-03 | PM + BE | ✅ Done |
| S1-24 | **[G05]** Socket: room_list_updated → Lobby real-time (สร้าง/ลบ/status เปลี่ยน) | FR-02-1 | PM | ✅ Done |
| S1-25 | **[G06]** Seed: แก้ Original deck ครบ (เพิ่ม CAT_HAIRY, CAT_BEARD; ย้าย EKG/EKE ไป G&E) | CARD_MASTER | PM + SA | ✅ Done |
| S1-26 | เขียน Test Case ตาม AC | TR-09 | QA | ✅ Done |
| S1-27 | Test flow ทั้งหมด | TR-09 | QA + FE/QA | ✅ Done |

---

### 🔄 Sprint 2 — Basic Gameplay (Week 5–6) `DONE`

**Goal:** Host เริ่มเกมได้ + เล่น/จั่วได้จริง + basic cards + เกมจบ + Auto Reset + Room Config

**Acceptance Criteria:**
- Host กด Start Game เมื่อมี PLAYER ≥ 2 → เกมเริ่ม
- ผู้เล่นแต่ละคนได้รับไพ่ 4 ใบ + Defuse 1 ใบ (private)
- แต่ละเทิร์นมีตัวนับถอยหลัง **30 วิ** แสดงให้ทุกคนเห็น และ reset เมื่อเล่นไพ่
- เล่น Attack / Skip / See The Future / Shuffle ได้
- จั่วได้ EK → **10 วิ** ตัดสินใจ → ใช้ Defuse หรือตาย
- ผู้เล่นรอดคนสุดท้ายชนะ → Auto Reset → WAITING
- Host เปลี่ยน DeckConfig ได้ขณะ WAITING + แจ้งเตือนทุกคน

#### 🔧 Room Config — Host Change DeckConfig

| Ticket | งาน | FR Ref | Role | Status |
|--------|-----|--------|------|----------|
| S2-01 | API: PATCH /rooms/:id/config — Host เปลี่ยน version/add-on | FR-03-4 | BE | ✅ Done  |
| S2-02 | Socket: deck_config_updated → broadcast deck_config_changed | FR-03-5 | PM | ✅ Done |
| S2-03 | UI: Notification เมื่อ Host เปลี่ยน DeckConfig | FR-03-5 | FE | ✅ Done |

#### 🏗️ Backend — Game Session & Deck

| Ticket | งาน | FR Ref | Role | Status |
|--------|-----|--------|------|----------|
| S2-04 | API: POST /rooms/:id/start — validate + สร้าง GameSession | FR-03-10/FR-04-1 | SA + BE | ✅ Done |
| S2-05 | Game Logic: สุ่มไพ่ตาม version + expansions → บันทึก DeckState | FR-04-1 | SA | ✅ Done |
| S2-06 | Game Logic: แจกไพ่ 4+1 ต่อคน → สร้าง CardHand | FR-04-1 | BE | ✅ Done |
| S2-07 | Game Logic: Turn management — เวียนตามที่นั่ง + เปลี่ยนเทิร์น | FR-04-3 | SA | ✅ Done |
| S2-07a | **[NEW]** Game Logic: Turn timer 30 วิ — เริ่มนับเมื่อเทิร์นเริ่ม, reset เมื่อเล่นไพ่ — **ถ้า disconnect ขณะเวลาเดิน ให้ Force Draw เมื่อหมดเวลา** | FR-04-4a/4b/4c/FR-09-8 | SA | ✅ Done |

#### 🔌 Socket — Game Start & Turn

| Ticket | งาน | FR Ref | Role | Status |
|--------|-----|--------|------|----------|
| S2-08 | Socket: start_game → validate → broadcast game_started | FR-03-10 | PM | ✅ Done |
| S2-09 | Socket: deal_hand → ส่งไพ่ private ให้แต่ละคน | FR-04-1/2/NFR-03 | PM | ✅ Done |
| S2-10 | Socket: turn_changed → broadcast ใครเทิร์นถัดไป | FR-04-3 | PM | ✅ Done |
| S2-10a | **[NEW]** Socket: turn_timer_tick → broadcast countdown ให้ทุกคนเห็น + turn_timer_reset เมื่อเล่นไพ่ | FR-04-4a/4b | PM | ✅ Done |

#### 🃏 Game Logic — Basic Cards

| Ticket | งาน | FR Ref | Role | Status |
|--------|-----|--------|------|----------|
| S2-11 | Game Logic: play_card validation (เป็นเทิร์น? มีไพ่จริง?) | NFR-02 | SA | ✅ Done |
| S2-12 | Game Logic: Attack — จบเทิร์นไม่จั่ว + ผู้ถัดไป 2 เทิร์น | FR-05 | BE | ✅ Done |
| S2-13 | Game Logic: Skip — จบเทิร์นไม่จั่ว | FR-05 | BE | ✅ Done |
| S2-14 | Game Logic: See The Future — ดู 3 ใบบน (private) | FR-05 | BE | ✅ Done |
| S2-15 | Game Logic: Shuffle — สับกอง | FR-05 | BE | ✅ Done |
| S2-16 | Socket: play_card event → broadcast card_effect_applied | FR-05 | PM | ✅ Done |

#### 💣 Game Logic — EK Bomb Sequence

| Ticket | งาน | FR Ref | Role | Status |
|--------|-----|--------|------|----------|
| S2-17 | Game Logic: draw_card — จั่วไพ่บนสุด ตรวจ EK | FR-04-4 | SA | ✅ Done |
| S2-18 | Socket: draw_card event + card_drawn (private) + deck_updated | FR-04-4/NFR-03 | PM | ✅ Done |
| S2-19 | Game Logic: EK drawn → เปิด **10 วิ** timer | FR-04-6 | SA | ✅ Done |
| S2-20 | Socket: exploding_kitten_drawn → broadcast + defuse_required (private) | FR-04-6/7/8 | PM | ✅ Done |
| S2-21 | Game Logic: Defuse ใช้ได้ → เลือกตำแหน่ง + insert EK กลับ | FR-04-9 | BE | ✅ Done |
| S2-22 | Socket: insert_exploding_kitten + exploding_kitten_inserted | FR-04-9 | PM | ✅ Done |
| S2-23 | Game Logic: ไม่ Defuse / หมดเวลา → player_eliminated | FR-04-7/8 | BE | ✅ Done |
| S2-24 | Socket: player_eliminated → ตรวจ game over → game_ended | FR-04-5/FR-08-1 | PM | ✅ Done |

#### 🏁 Game End + Auto Reset

| Ticket | งาน | FR Ref | Role | Status |
|--------|-----|--------|------|----------|
| S2-25 | Game Logic: บันทึก winner_player_id + ประกาศผู้ชนะ | FR-08-1/2 | BE | ✅ Done |
| S2-26 | Game Logic: Auto Reset — Room → WAITING + reset Player state | FR-08-5/6/7 | SA | ✅ Done |
| S2-27 | Game Logic: รอบถัดไป winner เริ่มก่อน ถ้า winner ออกแล้วสุ่ม | FR-08-3/4 | BE | ✅ Done |

#### 🖥️ Frontend — Game UI

| Ticket | งาน | FR Ref | Role | Status |
|--------|-----|--------|------|----------|
| S2-28 | UI: ปุ่ม Start Game (Host only) + validate ≥ 2 PLAYER | FR-03-10 | FE | ✅ Done |
| S2-29 | UI: แสดงไพ่ในมือตัวเอง (private) | FR-04-2 | FE | ✅ Done |
| S2-30 | UI: แสดง deck count + **discard pile top (แสดงเฉพาะไพ่ใบล่าสุดที่ถูกทิ้ง)** | FR-04-4/FR-04-10 | FE | ✅ Done |
| S2-31 | UI: แสดงจำนวนไพ่คนอื่น (ไม่รู้ว่าอะไร) | FR-04-2 | FE | ✅ Done |
| S2-32 | UI: Turn indicator — ใครเทิร์น | FR-04-3 | QA | ✅ Done |
| S2-32a | **[NEW]** UI: Turn countdown timer 30 วิ | FR-04-4a/4b/FR-05-N1/N2 | FE | ✅ Done |
| S2-33 | **[G07]** UI: ปุ่ม Draw Card (จั่วไพ่ button เพื่อจบเทิร์น) | FR-04-4 | FE | ✅ Done |
| S2-34 | **[G08]** UI: Card play interaction — เลือก card จากมือ + กด play (select & play mechanism) | FR-05 | FE | ✅ Done |
| S2-35 | **[G09]** UI: See The Future — modal แสดง 3 ใบบนสุด (private เฉพาะคนเล่น) | FR-05 | FE | ✅ Done |
| S2-36 | UI: EK Bomb sequence — **10 วิ** countdown + ปุ่ม Defuse / ระเบิด (แก้จาก 20 วิ) | FR-04-6/7/8 | FE | ✅ Done |
| S2-37 | UI: เลือกตำแหน่งใส่ EK กลับกอง | FR-04-9 | FE | ✅ Done |
| S2-38 | UI: Player eliminated + ประกาศผู้ชนะ | FR-08-1 | QA | ✅ Done |
| S2-39 | UI: ปุ่ม Leave กลับ Lobby หลังเกมจบ | FR-08-8 | FE/QA | ✅ Done |
| S2-40 | UI: Game Log / action history | — | QA | ✅ Done |
| S2-41 | UI: Search Room by ID ใน Lobby | FR-02-2 | FE/QA | ✅ Done |

#### 🧪 QA Sprint 2

| Ticket | งาน | FR Ref | Role | Status |
|--------|-----|--------|------|----------|
| S2-42 | Test Case: Game Start + Deal Cards | FR-04-1 | QA | ✅ Done |
| S2-43 | Test Case: Turn Timer — 30 วิ countdown + reset เมื่อเล่นไพ่ + force draw เมื่อหมดเวลา | FR-04-4a/4b/4c | QA | ✅ Done |
| S2-44 | Test Case: EK Bomb Sequence ทุก path (10 วิ) | FR-04-6/7/8/9 | QA | ✅ Done |
| S2-45 | Test Case: Basic Cards (AT/SK/SF/SH) + Card play interaction | FR-05 | FE/QA | ✅ Done |
| S2-46 | Manual Test: Full gameplay flow | — | QA + FE/QA | ✅ Done |

---

### ⏳ Sprint 3 — Advanced Cards + Resilience (Week 7–8) `DONE`

**Goal:** Favor, Nope Chain, Combo, Attack Chain, Reconnect, AFK, Token Expiry

**Acceptance Criteria:**
- ทุกครั้งที่ผู้เล่นเล่นการ์ดใดก็ตาม → แสดง **"Does anyone want to play nope? {time}"** countdown **3 วิ** ให้ทุกคนเห็น
- Favor → หลัง Nope Window ผ่าน: ผู้โดนบังคับเลือกไพ่ให้เอง
- หากมีการเล่น Nope ระหว่าง Window → reset countdown **3 วิ** ใหม่
- Nope Chain: คี่ = ยกเลิก, คู่ = ผ่าน
- Combo 2x/3x → ผ่าน universal Nope Window **3 วิ** เหมือนกัน
- Attack Chain +2 เทิร์นต่อครั้ง
- Disconnect → **ลบ Player ทันที** ไม่มี hold state (MVP-simplified)
- AFK 30 วิ → force draw

#### 🃏 Favor & Nope

| Ticket | งาน | FR Ref | Role | Status |
|--------|-----|--------|------|----------|
| S3-01 | Game Logic: เปิด **Nope Window 3 วิ ทุกครั้งที่มีการเล่นการ์ดใดก็ตาม** (Attack, Skip, SF, SH, Favor, Combo, Reverse, Targeted Attack ฯลฯ) — หากมีการเล่น Nope ให้ reset timer 3 วิใหม่ | FR-05-N1/N2/N3/N4 | SA | ✅ Done |
| S3-02 | Game Logic: Favor — target เลือกไพ่ให้เอง (หลัง Nope Window ผ่านแล้ว) | FR-05-FV | BE | ✅ Done |
| S3-03 | Socket: broadcast **action_pending** พร้อม payload การ์ดที่เล่น ทุก Action — **ส่ง UI text "Does anyone want to play nope? {time}"** ให้ทุกคน — broadcast **nope_window_reset** เมื่อมีการเล่น Nope (reset countdown 3 วิใหม่) — broadcast **action_executed** เมื่อหมดเวลาและไม่มี Nope | FR-05-N1/N2/N4 | PM | ✅ Done |
| S3-04 | Game Logic: Nope card — validate + บันทึก chain count | FR-05-N1/N4 | SA | ✅ Done |
| S3-05 | Socket: play_nope + nope_played (chain logic) | FR-05-N4 | PM | ✅ Done |
| S3-06 | Game Logic: Nope Chain resolve — คี่ = cancel, คู่ = pass | FR-05-N4 | BE | ✅ Done |

#### 🃏 Combo Cards

| Ticket | งาน | FR Ref | Role | Status |
|--------|-----|--------|------|----------|
| S3-07 | Game Logic: Combo 2x — validate คู่ + เลือก target + ขโมย random | FR-05-C1 | BE | ✅ Done |
| S3-08 | Game Logic: Combo 3x — validate triple + เลือก target + เลือกไพ่ | FR-05-C2 | BE | ✅ Done |
| S3-09 | Socket: combo_steal_target (private) + combo_steal_select + Nope Window | FR-05-C3 | PM | ✅ Done |

#### ⚔️ Attack Chain

| Ticket | งาน | FR Ref | Role | Estimate |
|--------|-----|--------|------|----------|
| S3-10 | Game Logic: Attack Chain — สะสม turns_remaining (+2 ต่อครั้ง) | FR-05-A1/A2 | SA | ✅ Done |
| S3-11 | Socket: turn_changed อัปเดต turns_remaining | FR-05-A2 | PM | ✅ Done |

#### 🔌 Disconnect & Host Migration

| Ticket | งาน | FR Ref | Role | Estimate |
|--------|-----|--------|------|----------|
| S3-12 | Game Logic: disconnect detect → **ลบ Player record ทันที** + จัดการเทิร์นต่อ (ไม่มี hold state ใน MVP) | FR-09-1/3 | PM | 0.5 วัน |
| S3-15 | Socket: player_disconnected broadcast → แจ้งผู้เล่นอื่นในห้อง | FR-09-5 | PM | 0.5 วัน |
| S3-17 | Game Logic: Host disconnect → **migrate host ไปคนอื่นทันที** (ไม่มี wait period ใน MVP) | FR-09-7 | PM | 0.5 วัน |
| S3-18 | Socket: host_migrated broadcast | FR-09-7 | PM | 0.5 วัน |

#### ⏰ AFK System

| Ticket | งาน | FR Ref | Role | Status |
|--------|-----|--------|------|----------|
| S3-19 | Game Logic: AFK timer 30 วิ per turn | FR-10-1 | SA | ✅ Done |
| S3-21 | Game Logic: หมดเวลา → force draw + afk_count +1 — **ถ้า afk_count == 2 → Kick ออกทันที** ข้ามเทิร์นให้คนถัดไป | FR-10-3/4 | BE | ✅ Done |

#### 🖥️ Frontend — Advanced UI

| Ticket | งาน | FR Ref | Role | Status |
|--------|-----|--------|------|----------|
| S3-24 | UI: Favor — กดที่นั่งเพื่อเลือก target | FR-05-FV | FE | ✅ Done |
| S3-25 | UI: Favor — ผู้โดนบังคับ modal เลือกไพ่ (แสดงหลัง Nope Window 3 วิ ผ่านแล้ว — Nope button แสดงผ่าน universal Nope UI แทน) | FR-05-FV/N2 | FE | ✅ Done |
| S3-26 | UI: Nope button + chain display (Nope #1, #2...) | FR-05-N4 | QA | ✅ Done |
| S3-27 | UI: Combo — เลือก 2x หรือ 3x + เลือก target | FR-05-C1/C2 | FE/QA | ✅ Done |
| S3-28 | **[G10]** UI: Combo 3x — modal แสดงการ์ดในมือ target ให้คนเล่นเลือกใบที่ต้องการ | FR-05-C2 | FE/QA | ✅ Done |
| S3-29 | UI: Combo — Nope Window **3 วิ** (universal) แสดง "Does anyone want to play nope? {time}" ให้ทุกคนเห็น รวมถึงผู้ถูกขโมย | FR-05-C3 | FE/QA | ✅ Done |
| S3-30 | UI: Attack Chain indicator — แสดงตัวเลขชัดเจน เช่น **"เทิร์นของคุณ (1/4)"** | FR-05-A3 | QA | ✅ Done |
| S3-32 | UI: AFK warning countdown | FR-10-2 | FE/QA | ✅ Done |

#### 🧪 QA Sprint 3

| Ticket | งาน | FR Ref | Role | Estimate |
|--------|-----|--------|------|----------|
| S3-33 | Test Case: Favor + Nope Chain ทุก path | FR-05-FV/N | QA | ✅ Done |
| S3-34 | Test Case: Combo 2x/3x + Nope Window + Combo 3x card selection | FR-05-C | QA | ✅ Done |
| S3-35 | Test Case: Attack Chain สะสม turns | FR-05-A | FE/QA | ✅ Done |
| S3-36 | Test Case: Disconnect (immediate leave) + AFK ทุก scenario | FR-09/10 | QA + FE/QA | ✅ Done |

---

### ⏳ Sprint 4 — Imploding Kittens Expansion (Week 9–10) `IN PROGRESS`

**Goal:** Imploding Kittens ทุกการ์ดทำงานได้จริง — **(Good vs. Evil = MVP-CUT)**

**Acceptance Criteria:**
- Imploding Kittens: Alter The Future, Draw From Bottom, Feral Cat, Reverse, Targeted Attack (IK), Imploding Kitten ทำงานได้ครบ

#### 💣 Imploding Kittens

| Ticket | งาน | FR Ref | Role | Estimate |
|--------|-----|--------|------|----------|
| S4-01 | Seed: เพิ่มการ์ด Imploding Kittens **ครบ 6 ประเภท / 20 ใบ** ลง CardMaster | FR-07 | BE | 1 วัน |
| S4-02 | Game Logic: Alter The Future — ดู+สลับ 3 ใบบน (private) | FR-07 | BE | 1 วัน |
| S4-03 | Game Logic: Draw From The Bottom — จั่วล่างสุด + จบเทิร์น (Attack = จบ 1 จาก 2 เทิร์น) | FR-07 | BE | 0.5 วัน |
| S4-04 | Game Logic: Feral Cat (IK) — ใช้แทน Cat Card ใบไหนก็ได้ใน Combo | FR-07/FR-05-C4 | BE | 0.5 วัน |
| S4-05 | Game Logic: Reverse — กลับทิศ + จบเทิร์น (2 ผู้เล่น = Skip, Attack = จบ 1 จาก 2 เทิร์น) | FR-07 | BE | 1 วัน |
| S4-06 | Game Logic: Targeted Attack (IK) — เลือก target ใดก็ได้ chain ได้ตาม FR-05-A2 | FR-07 | BE | 0.5 วัน |
| S4-07 | Game Logic: Imploding Kitten — คว่ำหน้า/หงายหน้า state + กรอบพิเศษ | FR-07-IK1/2 | SA | 1.5 วัน |
| S4-08 | Game Logic: IK หงายหน้า จั่วได้ → ตายทันที Defuse ใช้ไม่ได้ + ทิ้ง Discard | FR-07-IK4/5 | BE | 0.5 วัน |
| S4-09 | Game Logic: Shuffle ขณะ IK หงายหน้าบนสุด → สับกองปกติ (IK อาจลงกองได้) | FR-07-IK6 | BE | 0.5 วัน |
| S4-10 | Socket: imploding_kitten_* events ครบ + reverse_played + targeted_attack_ik | FR-07-IK3 | PM | 1.5 วัน |
| S4-11 | UI: Imploding Kitten face-up/down deck indicator | FR-07-IK3 | FE/QA | 1 วัน |
| S4-12 | UI: Alter The Future — drag-to-reorder 3 ใบบน (private) | FR-07 | FE | 1.5 วัน |
| S4-13 | UI: Draw From Bottom — แสดงไพ่ที่จั่วได้ + เลือกเก็บหรือวางบน | FR-07 | FE/QA | 0.5 วัน |
| S4-14 | UI: Reverse — แสดงทิศทางการเล่นที่เปลี่ยนให้ทุกคนเห็น | FR-07 | FE/QA | 0.5 วัน |
| S4-15 | UI: Targeted Attack (IK) — กดที่นั่งเพื่อเลือก target | FR-07 | FE/QA | 0.5 วัน |
| S4-16 | UI: Feral Cat (IK) — เลือกว่าจะแทนแมวใบไหนตอน Combo | FR-07/FR-05-C4 | FE/QA | 0.5 วัน |

#### 🧪 QA Sprint 4

| Ticket | งาน | FR Ref | Role | Estimate |
|--------|-----|--------|------|----------|
| S4-17 | Test Case: Imploding Kittens ทุกใบ ทุก path (IK flip, Reverse 2-player, TA-IK chain, DFB attack) | FR-07 | FE/QA | 1.5 วัน |

---

### ⏳ Sprint 5 — Polish & UX (Week 11) `PLANNED`

**Goal:** Animation + Mobile + Security + Performance

**Acceptance Criteria:**
- Animation เล่นไพ่/จั่ว/ระเบิดทำงานได้
- Mobile responsive ทุกหน้า
- Rate limiting ทำงานได้

| Ticket | งาน | FR Ref | Role | Estimate |
|--------|-----|--------|------|----------|
| S5-01 | Animation: เล่นไพ่ (Framer Motion) | NFR-09 | FE + FE/QA | 1.5 วัน |
| S5-02 | Animation: จั่วไพ่ + ได้ไพ่ใหม่ | NFR-09 | FE | 1 วัน |
| S5-03 | Animation: ระเบิด EK / IK | NFR-09 | FE + FE/QA | 1.5 วัน |
| S5-04 | Animation: ผู้ชนะ (react-confetti) | NFR-09 | FE/QA | 0.5 วัน |
| S5-05 | Responsive Design — Mobile ทุกหน้า | NFR-10 | QA + FE/QA | 2 วัน |
| S5-06 | Error handling UI — API fail + Socket disconnect | NFR-08 | FE | 1 วัน |
| S5-07 | Loading states ทุก async action | NFR-07 | FE + FE/QA | 1 วัน |
| S5-08 | Performance: optimize Socket events + reduce re-render | NFR-11 | PM | 1 วัน |
| S5-09 | Security: Rate limiting middleware | NFR-04 | SA + PM | 1 วัน |
| S5-10 | UX Testing + Bug fixes รอบใหญ่ | — | QA + FE/QA | 2 วัน |
| S5-11 | Cross-browser test (Chrome, Firefox, Safari) | — | QA | 1 วัน |
| S5-12 | Mobile device test | NFR-10 | FE/QA | 1 วัน |

---

### ⏳ Sprint 6 — Testing & Launch (Week 12) `PLANNED`

**Goal:** Production-ready + Deploy จริง

| Ticket | งาน | FR Ref | Role | Estimate |
|--------|-----|--------|------|----------|
| S6-01 | Integration Testing ทุก flow ตาม SRS | TR-09 | QA + FE/QA | 2 วัน |
| S6-02 | Load Testing: หลายห้องพร้อมกัน | NFR-11 | PM | 1 วัน |
| S6-03 | Fix bugs จาก Integration Testing | — | All | 2 วัน |
| S6-04 | Deploy Backend to Production | TR-06/07 | PM | 0.5 วัน |
| S6-05 | Deploy Frontend to Production | TR-06/07 | PM | 0.5 วัน |
| S6-06 | Smoke Test บน Production | — | QA | 0.5 วัน |
| S6-07 | Final Documentation | TR-09 | BE + SA | 1 วัน |
| S6-08 | Project Retrospective | — | All | 0.5 วัน |

---

## 📊 Overall Progress Tracker

| Sprint | Goal | Tickets | Status |
|--------|------|---------|--------|
| Sprint 0 | Planning & Setup | 6 | ✅ Done |
| Sprint 1 | Core Infrastructure | 27 | ✅ Done |
| Sprint 2 | Basic Gameplay + Room Config | 51 | 🔄 In Progress |
| Sprint 3 | Advanced Cards + Disconnect + AFK | 30 | ⏳ Planned |
| Sprint 4 | Imploding Kittens Expansion | 17 | ⏳ Planned |
| Sprint 5 | Polish & UX | 12 | ⏳ Planned |
| Sprint 6 | Testing & Launch | 8 | ⏳ Planned |
| **Total** | | **151 tickets** | **33/151** |

> **MVP-CUT tickets (ไม่นับในจำนวนข้างบน):** S3-22/23 (Token Expiry), S3-13/14/16/31 (Reconnect hold state), S4-01~S4-18/28/29 (G&E + Armageddon), S5-08/S5-13 (คู่มือ + token) = 27 tickets ย้ายไป post-MVP backlog

---

## 5. CI/CD Pipeline Plan

### Branch Strategy

```
main      → Production (auto deploy)
  └── develop → Staging (auto deploy)
        ├── feature/S2-10-room-config-api
        ├── feature/S2-19-draw-card-logic
        └── fix/S2-35-ek-timer-bug
```

**กฎการ Merge:**
- `feature/*` → `develop` : Code Review ≥ 1 คน + CI pass
- `develop` → `main` : QA approve + PM approve

### Pipeline Stages

```
Push Code → Stage 1: CODE QUALITY (ESLint + TypeScript + Prisma validate)
         → Stage 2: TEST (Jest Unit + API Integration + Socket Tests)
         → Stage 3: BUILD (tsc build + next build)
         → Stage 4: DEPLOY (develop→Staging auto | main→Production auto)
```

### Environments

| Environment | Backend | Frontend | Database |
|-------------|---------|----------|----------|
| **Local** | localhost:4000 | localhost:3000 | PostgreSQL local |
| **Production** | TBD | TBD | PostgreSQL production |

---

## 6. Risk Register

| # | Risk | Severity | Likelihood | Mitigation | Role Owner |
|---|------|----------|------------|------------|------------|
| R01 | PM overload (PM + Socket + DevOps) | 🔴 High | สูง | แบ่ง Socket เป็น chunk เล็ก prioritize PM งานก่อน | PM |
| R02 | QA Debt — ไม่มี test framework | 🔴 High | สูง | S2-01/02 ต้องเป็น ticket แรกของ Sprint 2 | Lead QA |
| R03 | Socket race condition (seat selection) | 🟡 Medium | กลาง | @@unique constraint + server-side resolve | PM |
| R04 | Player disconnect กลางเกม → เทิร์นค้าง | 🟡 Medium | สูง | Force Draw เมื่อหมดเวลา + ลบ Player ทันที (MVP: no hold state) | PM |
| R05 | Imploding Kitten face-up/down ยาก track | 🟡 Medium | กลาง | เพิ่ม field ใน DeckState ก่อน Sprint 4 | SA |
| R06 | Scope creep กลาง Sprint | 🟡 Medium | กลาง | ทุก feature ใหม่ log ใน Backlog รอ Sprint ถัดไป | PM |
| R07 | Backend Dev overload (Game Logic หลายอย่าง) | 🟡 Medium | กลาง | SA ช่วย Backend ถ้า Architecture tasks เสร็จเร็ว | SA |
| R08 | Token LocalStorage ถูกลบ → reconnect ไม่ได้ | 🟢 Low | ต่ำ | แจ้ง user เป็น session ใหม่ ตั้งชื่อได้ปกติ | FE |
| R09 | Production deploy ล้มเหลว Sprint 6 | 🟢 Low | ต่ำ | ทดสอบ CI/CD ตั้งแต่ Sprint 2 | PM |

---

## 7. Definition of Done

> Ticket ถือว่า "เสร็จ" เมื่อผ่านทุกข้อ

### Code Level
- [ ] Code ผ่าน Review จากทีมอย่างน้อย 1 คน
- [ ] ไม่มี ESLint error + TypeScript compile ผ่าน
- [ ] ไม่มี merge conflict

### Feature Level
- [ ] ทำงานตาม Acceptance Criteria + FR Reference ที่ระบุใน ticket
- [ ] รองรับ error case (API fail, Socket disconnect, invalid input)
- [ ] มี loading state ใน UI

### Testing Level
- [ ] มี Test Case เขียนไว้
- [ ] QA test ผ่าน ไม่มี Critical/Major bug ค้าง
- [ ] Test บน Chrome + Firefox อย่างน้อย

### Integration Level
- [ ] Feature ทำงานร่วมกับ feature อื่นได้โดยไม่พัง
- [ ] API response ตรงกับ Contract ที่กำหนด
- [ ] Socket events ถูกต้องตาม socket-events.md

### Documentation Level
- [ ] อัปเดต API doc ถ้ามีการเปลี่ยน endpoint
- [ ] Comment code ในจุดที่ logic ซับซ้อน

---

## 8. SRS Coverage Checklist

| FR | Requirement | Ticket | ✅ |
|----|-------------|--------|---|
| FR-01-1 | Generate UUID token | S1-06 | ✅ |
| FR-01-2 | ตั้งชื่อ + avatar | S1-06/07 | ✅ |
| FR-01-3 | Token ไม่มี expiry ใน MVP | — | MVP-CUT |
| FR-01-5 | มี token + ในห้อง → redirect | S1-08 | ✅ |
| FR-01-6 | pre-fill ชื่อ/avatar | S1-06 | ✅ |
| FR-02-1 | แสดงห้อง WAITING + real-time | S1-09/12/S1-24 | ✅ |
| FR-02-2 | ค้นหา Room ID | S1-11/S2-43 | ✅ |
| FR-02-3 | สร้างห้อง | S1-10/13 | ✅ |
| FR-02-4 | ~~คู่มือการเล่น~~ | ~~S5-08~~ | MVP-CUT |
| FR-03-1/2 | Card Version (Original) + Add-on (Imploding) | S1-10/13 | ✅ |
| FR-03-3 | Version + Add-on ร่วมกัน | S2-07 | ✅ |
| FR-03-4 | Host เปลี่ยน config + UI controls | S2-03/S1-21 | ✅ |
| FR-03-5 | แจ้งเตือน config เปลี่ยน | S2-04/05 | ✅ |
| FR-03-6 | เข้าห้อง → SPECTATOR | S1-15 | ✅ |
| FR-03-7 | เลือกที่นั่ง | S1-18/19 | ✅ |
| FR-03-8 | ลุกจากที่นั่ง + UI ปุ่ม | S1-18/S1-20 | ✅ |
| FR-03-9 | race condition → สุ่ม | S1-18 | ✅ |
| FR-03-10 | Host start ≥ 2 PLAYER | S2-06/S2-30 | ✅ |
| FR-03-11 | Host ออก → migrate | S3-17/18 | ✅ |
| FR-03 leave | Leave room API + ลบห้องเมื่อว่าง | S1-22/23 | ✅ |
| FR-04-1 | แจก 4+1 ต่อคน | S2-06/07/08 | ✅ |
| FR-04-2 | Private hand | S2-11/31/33 | ✅ |
| FR-04-3 | Turn-based เวียนที่นั่ง | S2-09/12/34 | ✅ |
| FR-04-4 | เล่นหรือจั่ว + UI ปุ่ม Draw | S2-18/20/35 | ✅ |
| FR-04-4a/4b/4c | Turn timer 30 วิ + reset เมื่อ Action + force draw | S2-09a/12a/34a | ✅ |
| FR-04-5 | คนสุดท้ายชนะ | S2-26/27 | ✅ |
| FR-04-6 | EK drawn → **10 วิ** | S2-21/22/38 | ✅ |
| FR-04-7 | มี Defuse → ใช้หรือไม่ | S2-23/38 | ✅ |
| FR-04-8 | ไม่มี Defuse → ตาย | S2-25/38 | ✅ |
| FR-04-9 | ใส่ EK กลับ เลือกตำแหน่ง | S2-23/24/39 | ✅ |
| FR-05 Attack/Skip | Basic cards + UI play | S2-14/15/36 | ✅ |
| FR-05 SF | See The Future + UI modal | S2-16/37 | ✅ |
| FR-05 SH | Shuffle | S2-17 | ✅ |
| FR-05-FV | Favor + target เลือกเอง | S3-01/02/03/24/25 | ✅ |
| FR-05-N1/N4 | Nope + chain + reset timer | S3-04/05/06/26 | ✅ |
| FR-05-N2/N3 | Nope Window **3 วิ ทุก Action** + UI text | S3-01/03/S2-34a | ✅ |
| FR-05-C1 | Combo 2x (Cat Cards only) | S3-07/09/27 | ✅ |
| FR-05-C2 | Combo 3x + UI เลือกการ์ด | S3-08/09/27/28 | ✅ |
| FR-05-C3 | Nope Window combo | S3-09/29 | ✅ |
| FR-05-C4 | Feral Cat (IK) | S4-04/16 | ✅ |
| FR-05-A1/A2 | Attack Chain +2 | S3-10/11/30 | ✅ |
| FR-06 G&E | ~~Good vs. Evil cards~~ | — | MVP-CUT |
| FR-06-ARM | ~~Armageddon Mini-game~~ | — | MVP-CUT |
| FR-07 ALF/DFB | Alter Future / Draw Bottom | S4-02/03/12/13 | ✅ |
| FR-07 Feral/Reverse/TA | Feral Cat (IK) / Reverse / Targeted Attack (IK) | S4-04/05/06/14/15/16 | ✅ |
| FR-07-IK | Imploding Kitten + IK-Shuffle rule | S4-07/08/09/10/11 | ✅ |
| FR-08-1/2 | ประกาศผู้ชนะ + บันทึก | S2-27/40 | ✅ |
| FR-08-3/4 | Winner เริ่มก่อน / สุ่มถ้าออก | S2-29 | ✅ |
| FR-08-5/6/7 | Auto Reset → WAITING | S2-28 | ✅ |
| FR-08-8 | ปุ่ม Leave กลับ Lobby | S2-41 | ✅ |
| FR-09-1 | Detect disconnect | S3-12 | ✅ |
| FR-09-3 | Disconnect → ลบ Player ทันที (MVP-simplified) | S3-12 | ✅ |
| FR-09-5 | แจ้งคนอื่น | S3-15 | ✅ |
| FR-09-7 | Host disconnect → migrate ทันที | S3-17/18 | ✅ |
| FR-09-8 | Disconnect ระหว่างเทิร์น → Force Draw → ลบ | S2-09a | ✅ |
| FR-10-1/3/4 | AFK 30 วิ + force draw + **kick ครั้งที่ 2** | S3-19/21/32 | ✅ |
| NFR-01 | Real-time | Socket throughout | ✅ |
| NFR-02 | Backend validate | S2-13 | ✅ |
| NFR-03 | Private hand | S2-11 | ✅ |
| NFR-04 | Rate limiting | S5-09 | ✅ |
| NFR-05 | Cascade delete | Schema S0/S1 | ✅ |
| NFR-06 | Unique seat constraint | Schema S0/S1 | ✅ |
| NFR-07 | Loading state | S5-07 | ✅ |
| NFR-08 | Error handling UI | S5-06 | ✅ |
| NFR-09 | Animation | S5-01/02/03/04 | ✅ |
| NFR-10 | Mobile responsive | S5-05/12 | ✅ |
| NFR-11 | หลายห้องพร้อมกัน | S5-08/S6-02 | ✅ |
| TR-09 | Test Framework | S2-01/02 | ✅ |
| CARD_MASTER | Original deck ครบ + seed ถูกต้อง | S1-25 | ✅ |

**MVP SRS Coverage: 57/57 Active Requirements = 100% ✅**
*(4 requirements ถูกตัดออก: FR-01-3/4, FR-02-4, FR-06 G&E+ARM — ใส่ไว้ใน post-MVP backlog)*

---

*Project Plan v2.5 (MVP) ใช้ SRS v2.1 เป็น Source of Truth  
MVP Scope: Original + Imploding Kittens | ตัดออก: Good vs. Evil, Token Expiry, คู่มือการเล่น, Reconnect Hold State  
อัปเดตทุก Sprint Review — ถ้ามี decision เปลี่ยนแปลงต้องแก้ SRS ก่อนเสมอ*
