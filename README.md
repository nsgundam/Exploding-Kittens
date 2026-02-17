# Exploding Kittens Backend
more info dbms table:(https://drive.google.com/file/d/1jyOiu9N-F2sFwjkSKchcrgCUB82eFbdc/view?usp=sharing)
## 📦 Tech Stack

- Node.js (v18+ recommended)
- PostgreSQL (local via Homebrew)
- Prisma CLI: 7.x
- Prisma Client: 7.x
- TypeScript
- ts-node
---
**use in project**
```
- Node: v25.6.1
- TypeScript: Version 5.9.3
- PostgreSQL: psql (PostgreSQL) 15.15 (Homebrew)
- Prisma schema loaded from prisma/schema.prisma.
- Prisma CLI: prisma  : 7.4.0
backend@1.0.0 /Users/patchanan/Exploding-Kittens/backend
├── @prisma/adapter-pg@7.4.0
├─┬ @prisma/client@7.4.0
│ └── prisma@7.4.0 deduped
└── prisma@7.4.0
```
---
## 🫵🏻 How to check version 
```
echo "Node: $(node -v)" && \
echo "TypeScript: $(npx tsc -v)" && \
echo "PostgreSQL: $(psql --version)" && \ 
echo "Prisma CLI: $(npx prisma -v | head -1)" && \
npm list @prisma/client @prisma/adapter-pg prisma
Node: v25.6.1
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

## 🧠 Important: Prisma v7 Configuration

Prisma v7 does **NOT** allow `url = env("DATABASE_URL")` inside `schema.prisma` — you must remove it.

### `prisma/schema.prisma`
```prisma
datasource db {
  provider = "postgresql"
}

generator client {
  provider = "prisma-client-js"
}
```

### `prisma.config.ts` (Required in Prisma v7)

Create this file in the `backend` root:
```ts
import { defineConfig } from "prisma/config";

export default defineConfig({
  datasource: {
    url: process.env.DATABASE_URL!,
  },
});
```

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

## 🌱 Seed Configuration

### `seed.ts` (Prisma v7 with Adapter)
```ts
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({
  adapter,
});
```

### `package.json`

Make sure you have:
```json
"scripts": {
  "seed": "ts-node prisma/seed.ts"
}
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

Open PostgreSQL:
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

Install Node types:
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

When updating schema:
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

Prisma v7 separates:
- Schema definition
- Connection configuration
- Runtime adapter

Connection must use `@prisma/adapter-pg`. Unlike Prisma v4/v5, `datasources` inside schema is no longer supported.

---

## 🧪 Useful Debug Commands

Check environment variable:
```bash
node -r dotenv/config -e "console.log(process.env.DATABASE_URL)"
```

List tables:
```
\dt
```

Check table structure:
```
\d "Room"
```

---

## 📌 Current Versions Used

| Tool | Version |
|---|---|
| Prisma CLI | 7.x |
| Prisma Client | 7.x |
| PostgreSQL | 15.x (Homebrew) |
| Node.js | 18+ recommended |

---

## ✅ Project Status

- [x] Database connected
- [x] Migration applied
- [x] Seed working
- [x] Adapter configured
- [x] Case-sensitive tables verified
