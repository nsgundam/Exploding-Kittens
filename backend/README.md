# 🐈‍⬛ Exploding Kittens Backend 🐈

> more info dbms table: [Google Drive](https://drive.google.com/file/d/1jyOiu9N-F2sFwjkSKchcrgCUB82eFbdc/view?usp=sharing)

---

## 📦 Tech Stack

- Node.js (v18+ recommended)
- PostgreSQL (local via Homebrew)
- Prisma CLI: 7.x
- Prisma Client: 7.x
- TypeScript
- ts-node

---

## 📌 Versions Used in This Project

| Tool | Version |
|---|---|
| Node.js | v25.6.1 |
| TypeScript | 5.9.3 |
| PostgreSQL | 15.15 (Homebrew) |
| Prisma CLI | 7.4.0 |
| Prisma Client | 7.4.0 |
| @prisma/adapter-pg | 7.4.0 |
```
backend@1.0.0 /Users/patchanan/Exploding-Kittens/backend
├── @prisma/adapter-pg@7.4.0
├─┬ @prisma/client@7.4.0
│ └── prisma@7.4.0 deduped
└── prisma@7.4.0
```

---

## 🫵🏻 How to Check Versions
```bash
echo "Node: $(node -v)" && \
echo "TypeScript: $(npx tsc -v)" && \
echo "PostgreSQL: $(psql --version)" && \
echo "Prisma CLI: $(npx prisma -v | head -1)" && \
npm list @prisma/client @prisma/adapter-pg prisma
```

---

## 🚀 Initial Setup (First Time Only)

### 1️⃣ Install PostgreSQL (macOS - Homebrew)
```bash
brew install postgresql
brew services start postgresql
```

Create database:
```bash
createdb exploding_kittens_db
```

Check connection:
```bash
psql -U <your_os_username> -d exploding_kittens_db
```

Exit with:
```
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

---

### 4️⃣ Install Required Packages (Prisma v7)

Prisma v7 requires adapter-based connection.
```bash
npm install @prisma/adapter-pg pg
npm install -D @types/node
```

---

## ⚙️ Environment Setup

Create a file named `.env` inside `backend/` and add:
```env
DATABASE_URL="postgresql://<your_os_username>@localhost:5432/exploding_kittens_db"
```

**Example:**
```env
DATABASE_URL="postgresql://patchanan@localhost:5432/exploding_kittens_db"
```

> ⚠️ If you did not set a PostgreSQL password, do **NOT** include `:password`


---

## 🛠 Generate Prisma Client

After editing schema:
```bash
npx prisma generate
```

---

## 🗄 Run Migration (Create Tables)
```bash
npx prisma migrate dev --name init
```

This will:
- Create migration file
- Apply SQL to database
- Generate Prisma Client

Verify tables exist:
```bash
psql -U <your_os_username> -d exploding_kittens_db
\dt
```

---

## 🌱 Run Seed
```bash
npm run seed
```

Expected output:
```
Seeding database...
Seed completed successfully.
```

---

## 🔍 Verify Seed Data
```bash
psql -U <your_os_username> -d exploding_kittens_db
```

Because Prisma creates case-sensitive table names, use quotes:
```sql
SELECT * FROM "Room";
SELECT * FROM "Player";
SELECT * FROM "GameSession";
```

To exit pager view:
```
q
```

Disable pager permanently:
```
\pset pager off
```

---

## 🔁 If VSCode Shows Red Error on `process`
```bash
npm install -D @types/node
```

Open `tsconfig.json` and ensure:
```json
{
  "compilerOptions": {
    "types": ["node"],
    "moduleResolution": "node"
  }
}
```

**Restart TypeScript Server** in VSCode:
- `Cmd + Shift + P`
- Type: `TypeScript: Restart TS Server`

---

## 🧱 Development Workflow Summary
```bash
# 1. Edit schema.prisma, then:
npx prisma migrate dev --name <migration_name>

# 2. Regenerate client
npx prisma generate

# 3. Re-seed if needed
npm run seed
```

---

## 🧠 Architecture Notes (Prisma v7)

Prisma v7 separates schema definition, connection configuration, and runtime adapter.
Connection must use `@prisma/adapter-pg`. Unlike Prisma v4/v5, `datasources` inside schema is no longer supported.

---

## 🧪 Useful Debug Commands
```bash
# Check environment variable
node -r dotenv/config -e "console.log(process.env.DATABASE_URL)"
```
```
# List tables
\dt

# Check table structure
\d "Room"
```

---


## 🔌 Setup Socket.io (Backend Only)

โปรเจกต์นี้ใช้ **Socket.io (Server)** สำหรับระบบ Real-time เช่น:
- Join Room
- Broadcast Player Update
- Game Events
- Sync Game State

> ⚠️ Backend ใช้ `socket.io` เท่านั้น  
> ห้ามใช้ `socket.io-client` ใน backend

---

## 📦 ติดตั้ง Socket.io (Server)

ในโฟลเดอร์ `backend/` รัน:
```bash
npm install socket.io
```

ตรวจสอบว่าใน `package.json` ไม่มี `socket.io-client`

---

## 🧠 โครงสร้างไฟล์ Backend
```
backend/
 ├── prisma/
 ├── src/
 │    ├── server.ts
 │    ├── index.ts (optional)
 │    └── ...
 ├── prisma.config.ts
 ├── .env
 └── package.json
```

---

## 🚀 สร้าง Socket Server (`src/server.ts`)
```ts
import express from "express";
import http from "http";
import { Server } from "socket.io";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*", // แก้เป็น frontend URL ตอน production
  },
});

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("join-room", (roomId: string) => {
    socket.join(roomId);
    console.log(`${socket.id} joined room ${roomId}`);
  });

  socket.on("leave-room", (roomId: string) => {
    socket.leave(roomId);
    console.log(`${socket.id} left room ${roomId}`);
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

## ▶️ รัน Backend Server

เพิ่มใน `package.json`:
```json
"scripts": {
  "dev": "ts-node src/server.ts",
  "seed": "ts-node prisma/seed.ts"
}
```

รัน:
```bash
npm run dev
```

Expected output:✅
```
Server running at http://localhost:4000
```
