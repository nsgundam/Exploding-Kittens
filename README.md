# 🐈 Exploding Kittens Backend

Backend service สำหรับเกม Exploding Kittens  
พัฒนาโดยใช้ **Node.js + TypeScript + PostgreSQL + Prisma ORM**

> 📐 Database schema reference: [Google Drive](https://drive.google.com/file/d/1jyOiu9N-F2sFwjkSKchcrgCUB82eFbdc/view?usp=sharing)

---

## 📦 Tech Stack

| Tool | Version |
|------|---------|
| Node.js | v25.6.1 (v18+ recommended) |
| TypeScript | 5.9.3 |
| PostgreSQL | 15.15 |
| Prisma CLI | 6.19.2 |
| Prisma Client | 6.19.2 |
| Express | latest |
| Socket.io (Server only) | latest |

ตรวจสอบเวอร์ชัน:

```bash
echo "Node: $(node -v)"
echo "TypeScript: $(npx tsc -v)"
echo "PostgreSQL: $(psql --version)"
echo "Prisma CLI: $(npx prisma -v | head -1)"
npm list @prisma/client prisma
```

---

## 🚀 Initial Setup (First Time Only)

### 1️⃣ Install PostgreSQL (macOS - Homebrew)

```bash
brew install postgresql
brew services start postgresql
```

สร้าง database:

```bash
createdb exploding_kittens_db
```

ทดสอบ connection:

```bash
psql -U <your_os_username> -d exploding_kittens_db
```

ออกจาก psql:

```bash
\q
```

---

### 2️⃣ Clone Project

```bash
git clone <repo-url>
cd Exploding-Kittens/backend
```

---

### 3️⃣ Install Dependencies

```bash
npm install
```

ตรวจสอบเวอร์ชัน Prisma ให้ถูกต้อง:

```bash
npm install prisma@6.19.2 @prisma/client@6.19.2
npm install -D @types/node
```

> ⚠️ ตรวจสอบว่า **ไม่มี** `@prisma/adapter-pg` ติดตั้งอยู่

---

## ⚙️ Environment Setup

สร้างไฟล์ `.env` ใน `backend/`:

```env
DATABASE_URL="postgresql://<your_os_username>@localhost:5432/exploding_kittens_db"
```

ตัวอย่าง:

```env
DATABASE_URL="postgresql://patchanan@localhost:5432/exploding_kittens_db"
```

> ⚠️ หากไม่ได้ตั้งรหัสผ่าน PostgreSQL **ห้ามใส่ `:password`**

---

## 🧠 Prisma Configuration (Prisma v6 Standard Mode)

**`prisma/schema.prisma`**

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}
```

> ✅ Prisma v6 ใช้ `url = env("DATABASE_URL")` ตามปกติ  
> ❌ ไม่ต้องใช้ `prisma.config.ts`  
> ❌ ไม่ต้องใช้ adapter

---

## 🛠 Generate Prisma Client

```bash
npx prisma generate
```

---

## 🗄 Run Migration (Create Tables)

```bash
npx prisma migrate dev --name init
```

สิ่งที่จะเกิดขึ้น:
- สร้าง migration file
- Apply SQL ไปยัง database
- Generate Prisma Client

ตรวจสอบ table:

```bash
psql -U <your_os_username> -d exploding_kittens_db
\dt
```

---

## 🌱 Seed Configuration

ไฟล์ seed อยู่ที่: `src/seed.ts`

ตัวอย่างโครงสร้างพื้นฐาน:

```ts
import { PrismaClient } from "@prisma/client";
import "dotenv/config";

const prisma = new PrismaClient();
```

**`package.json`**

```json
"scripts": {
  "dev": "ts-node src/server.ts",
  "seed": "ts-node src/seed.ts"
}
```

### รัน Seed

```bash
npm run seed
```

Expected output:

```
Resetting data...
Seeding database...
Seed completed successfully.
```

---

## 🔍 Verify Seed Data

```bash
psql -U <your_os_username> -d exploding_kittens_db
```

Query:

```sql
SELECT * FROM "Room";
SELECT * FROM "Player";
SELECT * FROM "GameSession";
```

ปิด pager:

```bash
\pset pager off
```

---

## 🧱 Project Structure

```
backend/
 ├── prisma/
 │    ├── schema.prisma
 │    └── migrations/
 ├── src/
 │    ├── server.ts
 │    ├── seed.ts
 │    └── ...
 ├── .env
 ├── package.json
 └── tsconfig.json
```

---

## 🔌 Setup Socket.io (Backend Only)

ติดตั้ง:

```bash
npm install socket.io
```

> ⚠️ Backend ใช้เฉพาะ `socket.io`  
> **ห้ามติดตั้ง** `socket.io-client`

### Example Socket Server (`src/server.ts`)

```ts
import express from "express";
import http from "http";
import { Server } from "socket.io";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("join-room", (roomId: string) => {
    socket.join(roomId);
  });

  socket.on("leave-room", (roomId: string) => {
    socket.leave(roomId);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

const PORT = 4000;
server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
```

---

## ▶️ Run Development Server

```bash
npm run dev
```

Expected output:

```
Server running at http://localhost:4000
```

---

## 🔄 Development Workflow

```bash
# 1. แก้ไข schema.prisma
# 2. รัน migration
npx prisma migrate dev --name <migration_name>

# 3. Generate Prisma Client
npx prisma generate

# 4. (optional) Seed ข้อมูล
npm run seed

# 5. Start dev server
npm run dev
```

---

## 🧪 Useful Debug Commands

ตรวจสอบ environment variable:

```bash
node -r dotenv/config -e "console.log(process.env.DATABASE_URL)"
```

ตรวจสอบโครงสร้าง table:

```bash
\dt
\d "Room"
```

---

## 🏗 Architecture

Backend แบ่งออกเป็น 3 Layer:

```
Route Layer     →   Express routes / controllers
Service Layer   →   Business logic
Data Layer      →   Prisma ORM
```

> 💡 Multi-step database mutation ควรใช้ `prisma.$transaction()` เสมอ  
> 💡 Game logic ไม่ควรเขียนไว้ใน route โดยตรง