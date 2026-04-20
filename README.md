# 🐱💣 Exploding Kittens — Online Multiplayer

Welcome to the **Exploding Kittens Online Multiplayer** repository! This is a web-based adaptation of the wildly popular Russian Roulette-style card game *Exploding Kittens*. 

This project allows players to create rooms, invite friends, and play in real-time. It features the core gameplay mechanics as well as expansion support, all wrapped in a rich, responsive, and animated user interface.

## ✨ Features
- **Real-Time Multiplayer:** Built with Socket.io for instantaneous, low-latency gameplay.
- **Lobby System:** Create, find, and join custom game rooms.
- **Card Mechanics:** Play attacks, skips, see-the-futures, favor, and initiate epic **Nope chains**.
- **Expansions:** Support for the Original deck as well as the **Imploding Kittens** expansion.
- **Turn Limits & AFK System:** Integrated turn timers (30s) and AFK force-draw to keep the game moving.
- **Sleek Animations:** Card draws, explosions, and UI interactions built with Framer Motion.

## 🛠️ Project Structure
This repository is split into two main workspaces:
- **[`/backend`](./backend/README.md):** The Node.js game server. Handles all game logic, socket events, database persistence, and game state. Uses Express, Socket.io, Prisma, and PostgreSQL.
- **[`/frontend`](./frontend/README.md):** The game client. Built with Next.js, Tailwind CSS, Framer Motion, and shadcn/ui.

## 🚀 Getting Started

To run this project locally, you will need to start both the backend and frontend servers, and have a PostgreSQL database running.

### 1. Prerequisites
- **Node.js** (v18 or higher recommended)
- **PostgreSQL** (running locally or a cloud instance like Supabase/Neon)

### 2. Backend Setup
1. Open a terminal and navigate to the `backend` directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file inside the `backend` directory and configure your Database URL:
   ```env
   DATABASE_URL="postgresql://user:password@localhost:5432/exploding_kittens?schema=public"
   PORT=4000
   ```
4. Setup the database and seed initial deck data:
   ```bash
   npm run db:generate
   npm run db:migrate
   npm run db:seed
   ```
5. Start the backend development server:
   ```bash
   npm run dev
   ```

### 3. Frontend Setup
1. Open a new terminal window and navigate to the `frontend` directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env.local` or `.env` file to point to your backend:
   ```env
   NEXT_PUBLIC_SOCKET_URL="http://localhost:4000"
   NEXT_PUBLIC_API_URL="http://localhost:4000"
   ```
4. Start the frontend development server:
   ```bash
   npm run dev
   ```
5. Open [http://localhost:3000](http://localhost:3000) in your browser!

## 📜 License
This project is built for educational & non-commercial purposes. Exploding Kittens game concepts and assets are the property of Exploding Kittens Inc.
