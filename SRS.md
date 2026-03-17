# 📋 Software Requirements Specification (SRS)
**Project:** Exploding Kittens — Online Multiplayer  
**Version:** 2.0  
**Status:** Pending Review  

---

## สารบัญ
1. [Functional Requirements](#functional-requirements)
2. [Non-Functional Requirements](#non-functional-requirements)
3. [Technical Requirements](#technical-requirements)
4. [Open Questions](#open-questions)

---

# FUNCTIONAL REQUIREMENTS

---

## FR-01: Identity & Token

| ID | Requirement |
|----|-------------|
| FR-01-1 | ระบบสร้าง UUID token อัตโนมัติเมื่อเปิดเว็บครั้งแรก เก็บใน LocalStorage |
| FR-01-2 | ผู้เล่นตั้งชื่อและเลือก avatar ก่อนเข้าเล่น — ไม่มี login/password |
| FR-01-3 | Token มีอายุ **12 ชั่วโมง** นับจากเวลาที่สร้าง |
| FR-01-4 | Token หมดอายุหรือไม่มี → ผู้เล่นต้องตั้งชื่อ + เลือก avatar ใหม่ |
| FR-01-5 | มี token ที่ยังใช้งานได้ + ยังอยู่ในห้อง → redirect กลับห้องเดิมอัตโนมัติ |
| FR-01-6 | ชื่อและ avatar สุดท้ายที่ใช้ถูกจำไว้ใน PlayerIdentity เพื่อ pre-fill ครั้งถัดไป |

---

## FR-02: Lobby

| ID | Requirement |
|----|-------------|
| FR-02-1 | แสดงรายการห้องทั้งหมดที่ status = WAITING |
| FR-02-2 | ค้นหาห้องด้วย Room ID ได้โดยตรง |
| FR-02-3 | สร้างห้องใหม่ได้ โดยกำหนด: ชื่อห้อง, card version, add-on |
| FR-02-4 | มีคู่มือการเล่นเข้าถึงได้จาก Lobby |

---

## FR-03: Room & Configuration

| ID | Requirement |
|----|-------------|
| FR-03-1 | Card Version มี 2 แบบ: **Original** และ **Good vs. Evil** |
| FR-03-2 | Add-on มี 1 แบบ: **Imploding Kittens: Expansion** (เลือกเปิด/ปิดได้) |
| FR-03-3 | Card Version และ Add-on สามารถใช้ร่วมกันได้ (Original + Imploding, Good vs. Evil + Imploding) |
| FR-03-4 | Host สามารถเปลี่ยน card version หรือเปิด/ปิด add-on ได้ขณะ status = WAITING |
| FR-03-5 | เมื่อ Host เปลี่ยน config ต้องแจ้งเตือนผู้เล่นทุกคนในห้องทันที |
| FR-03-6 | ผู้เล่นทุกคนที่เข้าห้องจะเป็น **SPECTATOR** ก่อนเสมอ |
| FR-03-7 | ผู้เล่นเลือกที่นั่งเพื่อเปลี่ยนเป็น **PLAYER** |
| FR-03-8 | ผู้เล่นลุกจากที่นั่งกลับเป็น SPECTATOR ได้ขณะ status = WAITING |
| FR-03-9 | ถ้า 2 คนเลือกที่นั่งเดียวกันพร้อมกัน → สุ่มผู้ชนะ แจ้งผู้แพ้ให้เลือกใหม่ |
| FR-03-10 | Host กดเริ่มเกมได้เมื่อมี PLAYER อย่างน้อย **2 คน** |
| FR-03-11 | Host ออกจากห้อง → ย้าย Host role ไปผู้เล่นคนอื่นในห้องอัตโนมัติ |

---

## FR-04: Gameplay — Core Mechanics

| ID | Requirement |
|----|-------------|
| FR-04-1 | แจกไพ่ตอนเริ่มเกม: **4 ใบ + Defuse 1 ใบ** ต่อผู้เล่น 1 คน |
| FR-04-2 | ผู้เล่นเห็นเฉพาะไพ่ในมือตัวเอง คนอื่นเห็นแค่จำนวนใบ |
| FR-04-3 | เล่นแบบ turn-based เวียนตามลำดับที่นั่ง |
| FR-04-4 | ในเทิร์นตัวเอง: เลือกเล่นไพ่ (0 ถึงหลายใบ) หรือจั่วไพ่เพื่อจบเทิร์น |
| FR-04-5 | ผู้เล่นที่รอดคนสุดท้ายคือผู้ชนะ |
| FR-04-6 | เมื่อจั่วได้ **Exploding Kitten (EK)** ให้เวลา **20 วินาที** เพื่อตัดสินใจ: |
| FR-04-7 | — หากมี Defuse: เลือกใช้ Defuse หรือไม่ใช้ก็ได้ (ไม่ใช้ = ตาย) |
| FR-04-8 | — หากไม่มี Defuse: กดปุ่มระเบิดหรือรอหมดเวลา = ตาย |
| FR-04-9 | หาก Defuse ถูกใช้: ผู้เล่นเลือกตำแหน่งใส่ EK กลับในกอง (0 = บนสุด, n = ล่างสุด) |

---

## FR-05: Gameplay — Card Actions (Original + Shared)

### การ์ดที่มีใน Original และ Good vs. Evil

| การ์ด | Effect |
|-------|--------|
| **Exploding Kitten (EK)** | ระเบิด — ดู FR-04-6 ถึง FR-04-9 |
| **Defuse** | ใช้กู้ระเบิด → เลือกตำแหน่งใส่ EK กลับ |
| **Attack** | จบเทิร์นโดยไม่จั่ว ผู้เล่นถัดไปเล่น 2 เทิร์น (chain ได้ ดู FR-05-Chain) |
| **Skip** | จบเทิร์นโดยไม่จั่ว |
| **See The Future** | ดูไพ่ 3 ใบบนสุดของกอง (private เฉพาะคนเล่น) |
| **Shuffle** | สับกองไพ่แบบสุ่ม |
| **Favor** | เลือกผู้เล่นที่จะบังคับโดยกดที่ตำแหน่งที่นั่ง → **ผู้ที่โดนบังคับเป็นคนเลือกไพ่ให้เอง** 1 ใบ |
| **Nope** | ขัด action — ดูกฎ Nope ด้านล่าง |
| **Cat Cards (Combo)** | Taco Cat, Melon Cat และการ์ดแมวอื่นๆ — ดู FR-05-Combo |

### กฎ Nope Window

| ID | Requirement |
|----|-------------|
| FR-05-N1 | **Nope ไม่มี Nope Window** สำหรับ action ทั่วไป (Attack, Skip, See The Future, Shuffle) |
| FR-05-N2 | **Nope Window เปิด 5 วินาที** เฉพาะเมื่อผู้เล่นโดน Favor หรือโดนขโมยไพ่จาก Combo |
| FR-05-N3 | Nope Window เปิดให้เฉพาะ **ผู้เล่นที่โดนกระทำ** เท่านั้น (ไม่ใช่ทุกคน) |
| FR-05-N4 | Nope ถูก Nope ได้ (Nope Chain) — เลขคี่ = ยกเลิก, เลขคู่ = action ผ่าน |

### กฎ Attack Chain

| ID | Requirement |
|----|-------------|
| FR-05-A1 | ผู้เล่นถัดไปที่โดน Attack ต้องเล่น 2 เทิร์น |
| FR-05-A2 | ถ้าผู้เล่นที่โดน Attack เล่น Attack ใดๆ (รวม Targeted Attack) → ผู้เล่นถัดไปบวกเพิ่มอีก 2 เทิร์น (เช่น 4, 6, 8...) |

### กฎ Combo

| ID | Requirement |
|----|-------------|
| FR-05-C1 | Combo 2 ใบ (การ์ดแมวเหมือนกัน 2 ใบ) → เลือกผู้เล่น → ขโมยไพ่สุ่ม 1 ใบ |
| FR-05-C2 | Combo 3 ใบ (การ์ดแมวเหมือนกัน 3 ใบ) → เลือกผู้เล่น → เลือกไพ่ที่ต้องการ |
| FR-05-C3 | ผู้เล่นที่โดนขโมยมี Nope Window 5 วินาที (FR-05-N2) |
| FR-05-C4 | **Feral Cat** (Good vs. Evil): แทนการ์ดแมวใบไหนก็ได้เพื่อทำ Combo |

---

## FR-06: Card Actions — Good vs. Evil Expansion

การ์ดที่แตกต่างหรือเพิ่มเติมจาก Original:

| การ์ด | Effect |
|-------|--------|
| **Targeted Attack** | เลือกผู้เล่นให้เล่น 2 เทิร์น (chain ตาม FR-05-A2) |
| **Reveal The Future** | แสดงไพ่ 3 ใบบนสุดของกองให้ **ทุกคน** เห็น (ต่างจาก See The Future ที่ private) |
| **Feral Cat** | แทนการ์ดแมวใบไหนก็ได้ในการทำ Combo |
| **Raising Hack** | จั่วการ์ดใบล่างสุดของ Deck → ตัดสินใจเก็บไว้หรือวางบนสุด → จบเทิร์น |
| **Armageddon** | **เล่นจากมือ** → trigger Mini-game ระหว่าง 2 ผู้เล่น (ดู FR-06-Armageddon) |
| **God Cat** | การ์ดพิเศษที่ได้จาก Armageddon (ดู FR-06-Armageddon) |

### FR-06-Armageddon: Mini-game Flow

| Step | Requirement |
|------|-------------|
| 1 | Player A **เล่นการ์ด Armageddon จากมือ** → เลือก Player B เพื่อเล่น mini-game ด้วย |
| 2 | Player A เลือกว่าจะให้ไพ่ **God** หรือ **Evil** กับ Player B |
| 3 | Player B ตัดสินใจ: **เก็บการ์ดที่ได้ไว้** หรือ **สลับกับ Player A** |
| 4 | ผู้ที่ได้ไพ่ **Evil** → ต้องทำการกู้ระเบิด (ดู FR-04-6 ถึง FR-04-9) |
| 5 | ผู้ที่ได้ไพ่ **God Cat** → นำการ์ดขึ้นมือ สามารถใช้แทนการ์ดใดก็ได้ใน Deck **ยกเว้น Nope และระเบิดทุกประเภท** |
| 6 | God Cat มีกรอบ/หลังการ์ดพิเศษ เพื่อให้ผู้เล่นอื่นรู้ว่าใบนี้คือ God Cat เมื่อถูกขโมย |

---

## FR-07: Card Actions — Imploding Kittens Add-on

| การ์ด | Effect |
|-------|--------|
| **Alter The Future** | ดูไพ่ 3 ใบบนสุดของกองและ **สลับตำแหน่ง** ได้ (private เฉพาะคนเล่น) |
| **Draw From The Bottom** | จั่วไพ่ใบล่างสุดของกอง → ถือว่าจบ 1 เทิร์น |
| **Imploding Kitten** | ระเบิดพิเศษ — ดู FR-07-IK |

### FR-07-IK: Imploding Kitten Flow

| ID | Requirement |
|----|-------------|
| FR-07-IK1 | ใส่ Imploding Kitten ลงกองในสถานะ **คว่ำหน้า** ตอนเริ่มเกม |
| FR-07-IK2 | ผู้เล่นที่จั่วได้ในสถานะคว่ำหน้า → **เลือกตำแหน่ง** ใส่กลับในกอง → เปลี่ยนเป็นสถานะ **หงายหน้า** |
| FR-07-IK3 | เมื่อ Imploding Kitten หงายหน้าอยู่บนสุดกอง → แสดง UI พิเศษเพื่อแจ้งเตือนทุกคน |
| FR-07-IK4 | ผู้เล่นที่จั่ว Imploding Kitten ในสถานะหงายหน้า → **ตายทันที ไม่สามารถกู้ระเบิดได้** (Defuse ใช้ไม่ได้) |

---

## FR-08: Game End

| ID | Requirement |
|----|-------------|
| FR-08-1 | ประกาศผู้ชนะเมื่อเหลือผู้เล่นคนสุดท้าย |
| FR-08-2 | บันทึก `winner_player_id` ใน GameSession เพื่อใช้ในรอบถัดไป |
| FR-08-3 | รอบถัดไป: ผู้เล่นที่ชนะรอบก่อนเป็น **ผู้เริ่มก่อน** |
| FR-08-4 | หากผู้เล่นที่ชนะออกจากห้องก่อนรอบถัดไปเริ่ม → **สุ่มผู้เริ่มเหมือนปกติ** |
| FR-08-5 | เปลี่ยน Room status กลับเป็น **WAITING ทันที** หลังประกาศผู้ชนะ |
| FR-08-6 | ไม่มีระบบโหวตเล่นต่อ — reset อัตโนมัติ |
| FR-08-7 | ผู้เล่นทุกคน (PLAYER และ SPECTATOR) กลับสู่หน้าเลือกที่นั่ง |
| FR-08-8 | ผู้เล่นที่ต้องการออกกลับ Lobby ได้เองผ่านปุ่ม Leave |

---

## FR-09: Disconnect & Reconnect

| ID | Requirement |
|----|-------------|
| FR-09-1 | ตรวจจับ disconnect อัตโนมัติผ่าน Socket.io |
| FR-09-2 | Hold game state ไว้ **1 นาที** รอ reconnect |
| FR-09-3 | Reconnect ภายใน 1 นาที → กลับที่นั่งเดิมและ state เดิมได้ทันที |
| FR-09-4 | เกิน 1 นาที → ถือว่าออกจากห้อง ลบ Player record |
| FR-09-5 | แจ้งผู้เล่นอื่นในห้องเมื่อมีคน disconnect และ reconnect |
| FR-09-6 | ถ้า Host disconnect → **รอ 1 นาทีเหมือน Player คนอื่น** เพื่อให้ Host สามารถ reconnect กลับมาได้ |
| FR-09-7 | ถ้า Host ไม่ reconnect ภายใน 1 นาที → migrate host ไปคนอื่นในห้อง |

---

## FR-10: AFK System

| ID | Requirement |
|----|-------------|
| FR-10-1 | ตั้ง AFK timeout **30 วินาที** นับจากเริ่มเทิร์น |
| FR-10-2 | แจ้งเตือนผู้เล่น (private) ก่อนหมดเวลา |
| FR-10-3 | หมดเวลา → force draw card อัตโนมัติ |
| FR-10-4 | บันทึก afk_count ต่อ Player ต่อ session |

---

# NON-FUNCTIONAL REQUIREMENTS

| ID | Requirement |
|----|-------------|
| NFR-01 | การเปลี่ยนแปลงทุกอย่างในห้องแสดงผล real-time ให้ทุกคนพร้อมกัน |
| NFR-02 | Backend validate ทุก action เอง — ห้ามเชื่อข้อมูลจาก Client |
| NFR-03 | ไพ่ในมือเป็น private — ส่งหาเจ้าของเท่านั้น |
| NFR-04 | Rate limiting บน REST API |
| NFR-05 | Cascade delete เมื่อ Room ถูกลบ |
| NFR-06 | Database constraint ป้องกัน duplicate seat (`@@unique[room_id, seat_number]`) |
| NFR-07 | Loading state ทุก async action |
| NFR-08 | Error message ชัดเจนเมื่อ API fail หรือ Socket disconnect |
| NFR-09 | Animation: เล่นไพ่, จั่วไพ่, ระเบิด |
| NFR-10 | Responsive Design — รองรับ Mobile |
| NFR-11 | รองรับหลายห้องพร้อมกัน |

---

# TECHNICAL REQUIREMENTS

| ID | Requirement |
|----|-------------|
| TR-01 | Frontend: Next.js, React, Tailwind CSS, Framer Motion, shadcn, Aceternity UI, react-confetti, Socket.io Client |
| TR-02 | Backend: Node.js, Express, Socket.io, Prisma ORM |
| TR-03 | Database: PostgreSQL |
| TR-04 | Version Control: GitHub |
| TR-05 | Branch Strategy: feature → develop → main |
| TR-06 | CI/CD: GitHub Actions — Lint → Test → Build → Deploy |
| TR-07 | 3 Environments: Local, Production |
| TR-08 | Code Review ก่อน merge ทุกครั้ง (อย่างน้อย 1 คน) |
| TR-09 | Test Framework ต้องติดตั้งและมี test จริง (QA Debt จาก Sprint 1) |

---

# CARD MASTER — จำนวนการ์ดทั้งหมด

## Original Deck

| Code | การ์ด | จำนวน |
|------|-------|-------|
| `EK` | Exploding Kitten | players - 1 (ใส่หลังแจกไพ่) |
| `DF` | Defuse | 6 ใบ (แจก 1 ต่อคน ส่วนที่เหลือใส่กลับกอง) |
| `AT` | Attack | 4 ใบ |
| `SK` | Skip | 4 ใบ |
| `SF` | See The Future | 5 ใบ |
| `SH` | Shuffle | 4 ใบ |
| `NP` | Nope | 5 ใบ |
| `FV` | Favor | 4 ใบ |
| `CAT_TACO` | Taco Cat | 4 ใบ |
| `CAT_MELON` | Melon Cat | 4 ใบ |
| `CAT_HAIRY` | Hairy Potato Cat | 4 ใบ |
| `CAT_BEARD` | Bearded Cat | 4 ใบ |

## Good vs. Evil (เพิ่มเติม / แทนบางใบจาก Original)

| Code | การ์ด | ไม่มี Add-on | มี Add-on |
|------|-------|-------------|----------|
| `TA` | Targeted Attack | 2 ใบ | 4 ใบ |
| `RF` | Reveal The Future | 3 ใบ | 3 ใบ |
| `FERAL` | Feral Cat | 4 ใบ | 8 ใบ |
| `RH` | Raising Hack | 2 ใบ | 2 ใบ |
| `ARM` | Armageddon | 1 ใบ | 1 ใบ |
| `GOD` | God Cat | 1 ใบ (Playmat) | 1 ใบ (Playmat) |
| `DEVIL` | Devil Cat | 1 ใบ (Playmat) | 1 ใบ (Playmat) |

## Imploding Kittens Add-on

| Code | การ์ด | จำนวน |
|------|-------|-------|
| `IK` | Imploding Kitten | 1 ใบ |
| `ALF` | Alter The Future | 4 ใบ |
| `DFB` | Draw From The Bottom | 4 ใบ |

---

*เอกสารนี้เป็น Source of Truth สำหรับการทำ Sprint Plan ทุก Sprint  
ทุกครั้งที่มี decision เปลี่ยนแปลงต้องอัปเดตที่นี่ก่อนเสมอ*
