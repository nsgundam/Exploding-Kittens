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
| FR-04-4a | แต่ละเทิร์นมีตัวนับถอยหลัง **30 วินาที** แสดงให้ทุกคนเห็น |
| FR-04-4b | เมื่อผู้เล่นทำการ **เล่นไพ่ (Action)** ตัวนับถอยหลังจะ **รีเซ็ตกลับ 30 วินาที** ทันที |
| FR-04-4c | ถ้าตัวนับถอยหลังถึง 0 โดยไม่มี action → force draw card อัตโนมัติ **(นับเป็น AFK 1 ครั้ง)** |
| FR-04-5 | ผู้เล่นที่รอดคนสุดท้ายคือผู้ชนะ |
| FR-04-6 | เมื่อจั่วได้ **Exploding Kitten (EK)** ให้เวลา **10 วินาที** เพื่อตัดสินใจ: |
| FR-04-7 | — หากมี Defuse: เลือกใช้ Defuse หรือไม่ใช้ก็ได้ (ไม่ใช้ = ตาย) |
| FR-04-8 | — หากไม่มี Defuse: กดปุ่มระเบิดหรือรอหมดเวลา = ตาย |
| FR-04-9 | หาก Defuse ถูกใช้: ผู้เล่นเลือกตำแหน่งใส่ EK กลับในกอง (0 = บนสุด, n = ล่างสุด) |
| FR-04-10 | **[NEW]** UI กองไพ่ทิ้ง (Discard Pile) แสดงเฉพาะ **ไพ่ใบล่าสุด** ที่เพิ่งถูกทิ้งลงไป (ไม่มี History หน้าต่างแยก) |

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
| FR-05-N1 | **[UPDATED]** ระบบจะเปิด Nope Window **3 วินาที** ทุกครั้งที่ผู้เล่นเล่นการ์ด**ใดก็ตาม**จากมือ (ทุก Action Card: Attack, Skip, See The Future, Shuffle, Favor, Combo, Targeted Attack, Reverse ฯลฯ) |
| FR-05-N2 | **[UPDATED]** แสดง UI countdown พร้อมข้อความ **"Does anyone want to play nope? {time}"** ให้ **ทุกคน** เห็น — หากไม่มีใคร Nope ภายในเวลา action นั้นทำงานทันที |
| FR-05-N3 | Nope Window เปิดให้ **ผู้เล่นทุกคน** ในห้องสามารถกดขัดจังหวะได้ |
| FR-05-N4 | Nope ถูก Nope ได้ (Nope Chain) — เมื่อมีการเล่น Nope ระหว่าง Window ให้ **reset countdown 3 วินาทีใหม่** อีกครั้ง — เลขคี่ = ยกเลิก, เลขคู่ = action ผ่าน |

### กฎ Attack Chain

| ID | Requirement |
|----|-------------|
| FR-05-A1 | ผู้เล่นถัดไปที่โดน Attack ต้องเล่น 2 เทิร์น |
| FR-05-A2 | ถ้าผู้เล่นที่โดน Attack เล่น Attack ใดๆ (รวม Targeted Attack) → ผู้เล่นถัดไปบวกเพิ่มอีก 2 เทิร์น (เช่น 4, 6, 8...) |
| FR-05-A3 | **[NEW]** UI ต้องแสดงตัวเลขเทิร์นที่เหลืออย่างชัดเจน เช่น **"เทิร์นของคุณ (1/4)"** เมื่อผู้เล่นมีเทิร์นสะสม |

### กฎ Combo

| ID | Requirement |
|----|-------------|
| FR-05-C1 | Combo 2 ใบ (การ์ดชื่อเดียวกัน 2 ใบ) → เลือกผู้เล่น → ขโมยไพ่สุ่ม 1 ใบ |
| FR-05-C1a | **[G&E]** Combo 2 ใบใน Good vs Evil ใช้ได้กับ **ไพ่ชื่อเดียวกันทุกประเภท** ไม่ใช่แค่ Cat cards (เช่น Shuffle 2 ใบ, Attack 2 ใบ ก็ combo ได้) |
| FR-05-C2 | Combo 3 ใบ (การ์ดชื่อเดียวกัน 3 ใบ) → เลือกผู้เล่น → เลือกไพ่ที่ต้องการ |
| FR-05-C3 | ผู้เล่นที่โดนขโมยมี Nope Window 3 วินาที (FR-05-N1) |
| FR-05-C4 | **Feral Cat** (Good vs. Evil): แทนการ์ดแมวใบไหนก็ได้เพื่อทำ Combo — **ใช้แทนได้เฉพาะ Cat Card เท่านั้น ไม่สามารถใช้แทน Action Card (Shuffle, Attack ฯลฯ) ได้** |

---

## FR-06: Card Actions — Good vs. Evil Expansion

การ์ดที่แตกต่างหรือเพิ่มเติมจาก Original:

| การ์ด | Effect |
|-------|--------|
| **Targeted Attack** | เลือกผู้เล่นให้เล่น 2 เทิร์น (chain ตาม FR-05-A2) |
| **Reveal The Future** | แสดงไพ่ 3 ใบบนสุดของกองให้ **ทุกคน** เห็น (ต่างจาก See The Future ที่ private) |
| **Feral Cat** | แทนการ์ดแมวใบไหนก็ได้ในการทำ Combo |
| **Raising Hack** | จั่วการ์ดใบล่างสุดของ Deck → ตัดสินใจเก็บไว้หรือวางบนสุด → จบเทิร์น |
| **Armageddon** | **เล่นจากมือ** → trigger Mini-game ระหว่าง 2 ผู้เล่น (ดู FR-06-Armageddon) — **เล่นได้เฉพาะเมื่อ Godcat AND Devilcat อยู่บน Playmat เท่านั้น (ไม่มีใครถือ Godcat อยู่ในมือ)** |
| **God Cat** | การ์ดพิเศษที่ได้จาก Armageddon (ดู FR-06-Armageddon) — หลังเล่นแล้ว **กลับไปที่ Playmat เสมอ ห้ามทิ้งลง Discard Pile** |

### FR-06-Armageddon: Mini-game Flow

| Step | Requirement |
|------|-------------|
| 0 | **[UPDATED] Prerequisite:** ถ้า Godcat หรือ Devilcat ไม่อยู่บน Playmat (เช่น มีคนถือ Godcat ไว้ในมือ) การ์ด Armageddon **ทุกใบในมือผู้เล่นจะถูกล็อค (เล่นไม่ได้) ทันที** |
| 1 | Player A **เล่นการ์ด Armageddon จากมือ** → หยิบ Godcat และ Devilcat จาก Playmat |
| 2 | Player A ดูไพ่ทั้ง 2 ใบลับๆ แล้ว **วางคว่ำ** 1 ใบไว้หน้าตัวเอง และ 1 ใบหน้า Player B ที่เลือก โดยรู้แค่คนเดียวว่าใครได้อะไร |
| 3 | Player B **ไม่ได้ดูไพ่** แล้วตัดสินใจ: **เก็บไพ่ที่อยู่หน้าตัวเอง** หรือ **สลับกับ Player A** |
| 4 | เปิดไพ่ทั้งสองพร้อมกัน |
| 5 | ผู้ที่ได้ **Devilcat** → ต้องทิ้ง Defuse ทันที (ไม่ได้ใส่ไพ่กลับกอง) หรือตาย → วาง Devilcat กลับ Playmat |
| 6 | ผู้ที่ได้ **God Cat** → นำ Godcat ขึ้นมือ สามารถใช้แทนการ์ดใดก็ได้ใน Deck **ยกเว้น Nope** |
| 7 | หลัง Player A เล่น Godcat → ต้องส่ง **กลับ Playmat เสมอ** ห้ามทิ้งลง Discard Pile → ทำให้ Armageddon เล่นได้อีกครั้ง |
| 8 | God Cat มีหลังการ์ดพิเศษ ทำให้ผู้เล่นอื่นรู้ว่าใบนี้คือ Godcat เมื่อถูกขโมย (ถูกขโมยได้ปกติ) |

---

## FR-07: Card Actions — Imploding Kittens Add-on

> **20 ใบรวม / 6 ประเภท** (ต้องใช้คู่กับ Original หรือ Good vs. Evil)

| การ์ด | Effect |
|-------|--------|
| **Alter The Future** | ดูไพ่ 3 ใบบนสุดของกองและ **สลับตำแหน่ง** ได้ (private เฉพาะคนเล่น) |
| **Draw From The Bottom** | จั่วไพ่ใบล่างสุดของกอง → จบ 1 เทิร์น — **ถ้าใช้ขณะโดน Attack จบได้แค่ 1 จาก 2 เทิร์น** |
| **Feral Cat** | ใช้แทน Cat Card ใบไหนก็ได้ใน Combo — **ใช้แทน Action Card ไม่ได้** |
| **Reverse** | กลับทิศทางการเล่น + จบเทิร์นโดยไม่จั่ว — **ถ้าเหลือ 2 ผู้เล่น ทำงานเหมือน Skip** — **ถ้าโดน Attack ก็ยังจบแค่ 1 จาก 2 เทิร์น** |
| **Targeted Attack** | เลือกผู้เล่นคนใดก็ได้ (รวมตัวเอง) ให้เล่น 2 เทิร์น — chain ได้ตาม FR-05-A2 |
| **Imploding Kitten** | ระเบิดพิเศษ — ดู FR-07-IK |

### FR-07-IK: Imploding Kitten Flow

| ID | Requirement |
|----|-------------|
| FR-07-IK1 | ใส่ Imploding Kitten ลงกองในสถานะ **คว่ำหน้า** ตอนเริ่มเกม |
| FR-07-IK2 | ผู้เล่นที่จั่วได้ในสถานะคว่ำหน้า → **เลือกตำแหน่ง** ใส่กลับในกอง → เปลี่ยนเป็นสถานะ **หงายหน้า** (มีกรอบขาวพิเศษ) |
| FR-07-IK3 | เมื่อ Imploding Kitten หงายหน้าอยู่บนสุดกอง → แสดง UI พิเศษแจ้งเตือนทุกคน |
| FR-07-IK4 | ผู้เล่นที่จั่ว Imploding Kitten หงายหน้า → **ตายทันที Defuse ใช้ไม่ได้** |
| FR-07-IK5 | หลัง Imploding Kitten ระเบิด → ทิ้งลง Discard Pile เหมือน EK ปกติ |
| FR-07-IK6 | ถ้าเล่น Shuffle ขณะ IK หงายหน้าอยู่บน → สับกองใต้โต๊ะ (IK อาจลงไปอยู่ในกองได้) |

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
| FR-09-8 | **[NEW] Race Condition:** หากผู้เล่น disconnect ขณะเวลาเทิร์นของตัวเองยังเดินอยู่ → ปล่อยให้เวลาเดินต่อจนถึง 0 → Force Draw (นับ AFK 1 ครั้ง) → หากไม่กลับมาภายใน 1 นาที จึงเตะออก |

---

## FR-10: AFK System

| ID | Requirement |
|----|-------------|
| FR-10-1 | ตั้ง AFK timeout **30 วินาที** นับจากเริ่มเทิร์น |
| FR-10-2 | แจ้งเตือนผู้เล่น (private) ก่อนหมดเวลา |
| FR-10-3 | หมดเวลา → force draw card อัตโนมัติ และระบบบันทึก afk_count +1 |
| FR-10-4 | **[UPDATED]** หากผู้เล่นคนใดมี afk_count ครบ **2 ครั้ง** → บังคับ Disconnect (เตะออกจากห้องทันที) และข้ามเทิร์นให้คนถัดไป |

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
| TR-01 | Frontend: Next.js, React, Tailwind CSS, Framer Motion, Socket.io Client |
| TR-02 | Backend: Node.js, Express, Socket.io, Prisma ORM |
| TR-03 | Database: PostgreSQL |
| TR-04 | Version Control: GitHub |
| TR-05 | Branch Strategy: feature → develop → staging → main |
| TR-06 | CI/CD: GitHub Actions — Lint → Test → Build → Deploy |
| TR-07 | 3 Environments: Local, Staging, Production |
| TR-08 | Code Review ก่อน merge ทุกครั้ง (อย่างน้อย 1 คน) |
| TR-09 | Test Framework ต้องติดตั้งและมี test จริง (QA Debt จาก Sprint 1) |

---

# OPEN QUESTIONS

> ❓ = ยังไม่ได้ตัดสินใจ | ✅ = ตัดสินใจแล้ว | ⚠️ = ต้องยืนยัน

| # | คำถาม | Status | Decision |
|---|-------|--------|----------|
| OQ-01 | Token อายุกี่ชั่วโมง? | ✅ | 12 ชั่วโมง |
| OQ-02 | Nope Window กี่วินาที? | ✅ | **3 วินาที สำหรับทุกการเล่นการ์ด** — แสดง "Does anyone want to play nope? {time}" ให้ทุกคนเห็น, หาก Nope ถูกเล่นระหว่าง Window จะ reset countdown 3 วิใหม่ (เปลี่ยนจาก 5 วิเฉพาะ Favor/Combo) |
| OQ-03 | AFK timeout กี่วินาที? | ✅ | 30 วินาที — **หาก AFK ครบ 2 ครั้ง เตะออกทันที** |
| OQ-04 | Good vs. Evil การ์ดเพิ่มเติม? | ✅ | Targeted Attack, Reveal The Future, Feral Cat, Raising Hack, Armageddon |
| OQ-05 | Combo 3 ใบอยู่ใน scope? | ✅ | อยู่ใน scope |
| OQ-06 | Disconnect hold state กี่นาที? | ✅ | 1 นาที (ทั้ง Host และ Player) |
| OQ-07 | EK drawn → timeout กี่วินาที? | ✅ | ~~20 วินาที~~ → **10 วินาที** |
| OQ-08 | Game End → โหวตหรือ auto reset? | ✅ | Auto reset กลับ WAITING ทันที |
| OQ-09 | God Cat ใช้แทนการ์ดอะไรได้บ้าง? | ✅ | ทุกใบ **ยกเว้น Nope** (สามารถใช้แทนระเบิดหรือ Defuse ได้) |
| OQ-10 | Imploding Kitten กี่ใบ? | ✅ | 1 ใบ |
| OQ-11 | Armageddon กี่ใบ? | ✅ | ~~1 ใบ~~ → **3 ใบ** |
| OQ-12 | God Cat / Devil Cat กี่ใบ? | ✅ | อย่างละ 1 ใบ บน Playmat (ไม่นับในกอง) |
| OQ-13 | Feral Cat กี่ใบ? | ✅ | Good vs. Evil = 4 ใบ |
| OQ-14 | Raising Hack กี่ใบ? | ✅ | 2 ใบ |
| OQ-15 | Targeted Attack กี่ใบ? | ✅ | 2 ใบ |
| OQ-16 | Alter The Future กี่ใบ? | ✅ | 4 ใบ |
| OQ-17 | Draw From The Bottom กี่ใบ? | ✅ | 4 ใบ |
| OQ-18 | Reveal The Future กี่ใบ? | ✅ | 3 ใบ |
| OQ-19 | Armageddon — เล่นได้เมื่อไหร่? | ✅ | เฉพาะเมื่อ **Godcat AND Devilcat อยู่บน Playmat เท่านั้น** (ถ้าไม่อยู่ การ์ด Armageddon จะถูกล็อค เล่นไม่ได้) |
| OQ-20 | Favor — ใครเลือกไพ่ที่ให้? | ✅ | ผู้ที่โดนบังคับเป็นคนเลือกไพ่ให้เอง |
| OQ-21 | Turn timer — กี่วินาที และ reset เมื่อไหร่? | ✅ | 30 วินาทีต่อเทิร์น, reset ทุกครั้งที่เล่นไพ่ (Action) |
| OQ-22 | เมื่อใช้ Defuse กับ Devilcat — ใส่ไพ่กลับกองไหม? | ✅ | **ไม่** — ทิ้ง Defuse ลง Discard เฉยๆ ไม่มีการใส่ไพ่กลับกอง (ต่างจาก Defuse ปกติ) |
| OQ-23 | Godcat หลังเล่นแล้วไปไหน? | ✅ | **กลับ Playmat เสมอ** ห้ามทิ้งลง Discard Pile → ทำให้ Armageddon เล่นได้อีก |

---

# CARD MASTER — จำนวนการ์ดทั้งหมด

> ข้อมูลอ้างอิงจาก Official Rulebook (explodingkittens.com)

## Original Deck (56 ใบ รวมทุกใบ)

| Code | การ์ด | จำนวนใน Deck | หมายเหตุ |
|------|-------|-------------|---------|
| `EK` | Exploding Kitten | 4 ใบ | ใส่กลับ players-1 ใบหลัง setup |
| `DF` | Defuse | 6 ใบ | แจก 1 ต่อคน, ส่วนที่เหลือใส่กลับ 2 ใบ |
| `AT` | Attack | 4 ใบ | |
| `SK` | Skip | 4 ใบ | |
| `SF` | See The Future | 5 ใบ | |
| `SH` | Shuffle | 4 ใบ | |
| `NP` | Nope | 5 ใบ | |
| `FV` | Favor | 4 ใบ | ผู้โดนบังคับ **เป็นคนเลือกไพ่ให้เอง** |
| `CAT_TACO` | Taco Cat | 4 ใบ | |
| `CAT_MELON` | Catermelon | 4 ใบ | |
| `CAT_HAIRY` | Hairy Potato Cat | 4 ใบ | |
| `CAT_BEARD` | Bearded Cat | 4 ใบ | |
| `CAT_RAINBOW` | Rainbow-Ralphing Cat | 4 ใบ | **[เพิ่มใหม่]** Cat card ใบที่ 5 |
| **รวม** | | **56 ใบ** | |

## Good vs. Evil Deck (55 ใบ = 53 ใน Deck + 2 บน Playmat)

| Code | การ์ด | จำนวน | หมายเหตุ |
|------|-------|-------|---------|
| `EK` | Exploding Kitten | 4 ใบ | เหมือน Original |
| `DF` | Defuse | 6 ใบ | เหมือน Original |
| `NP` | Nope | 3 ใบ | น้อยกว่า Original |
| `AT` | Attack | 4 ใบ | |
| `TA` | Targeted Attack | 2 ใบ | |
| `SH` | Shuffle | 2 ใบ | น้อยกว่า Original |
| `RH` | Raising Heck | 2 ใบ | |
| `FV` | Favor | 2 ใบ | น้อยกว่า Original |
| `RF` | Reveal The Future | 3 ใบ | |
| `ARM` | Armageddon | **3 ใบ** | เล่นได้เฉพาะ Godcat + Devilcat อยู่บน Playmat |
| `FERAL` | Feral Cat | 4 ใบ | ใช้แทนได้เฉพาะ Cat Card เท่านั้น |
| `CAT_MERCAT` | Mercat | 4 ใบ | Cat card ของ G&E |
| *(cat cards อื่นๆ)* | *(ตาม deck จริง)* | *(4 ใบต่อประเภท)* | |
| `GOD` | God Cat | **1 ใบ (Playmat)** | หลังเล่นกลับ Playmat เสมอ ห้ามทิ้ง Discard |
| `DEVIL` | Devil Cat | **1 ใบ (Playmat)** | หลัง Armageddon กลับ Playmat เสมอ ห้ามใส่กอง |
| **รวม Deck** | | **53 ใบ** | ไม่นับ Playmat cards |

## Imploding Kittens Add-on (20 ใบรวม)

| Code | การ์ด | จำนวน | หมายเหตุ |
|------|-------|-------|---------|
| `IK` | Imploding Kitten | 1 ใบ | คว่ำหน้า → หงายหน้า → ตายทันที Defuse ใช้ไม่ได้ |
| `ALF` | Alter The Future | 4 ใบ | ดูและสลับ 3 ใบบน (private) |
| `DFB` | Draw From The Bottom | 4 ใบ | จั่วล่างสุด + จบเทิร์น |
| `FERAL_IK` | Feral Cat | 4 ใบ | ใช้แทน Cat Card เท่านั้น (ใช้ได้กับ Original ที่ไม่มี G&E) |
| `REV` | Reverse | 4 ใบ | กลับทิศ + จบเทิร์น, 2 ผู้เล่น = Skip |
| `TA_IK` | Targeted Attack | 3 ใบ | เลือก target ใดก็ได้, chain ได้ |
| **รวม** | | **20 ใบ** | |

---

*เอกสารนี้เป็น Source of Truth สำหรับการทำ Sprint Plan ทุก Sprint  
ทุกครั้งที่มี decision เปลี่ยนแปลงต้องอัปเดตที่นี่ก่อนเสมอ*
