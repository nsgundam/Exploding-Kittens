# 💣 Backend — Exploding Kittens Server

This directory contains the authoritative game server for the Exploding Kittens Online Multiplayer game. It manages room lobbies, session states, real-time events, and enforces all of the game rules.

## 🛠️ Technology Stack
- **Runtime:** Node.js
- **API Framework:** Express.js
- **Real-Time Communication:** Socket.io
- **Database:** PostgreSQL
- **ORM:** Prisma
- **Language:** TypeScript

## 🚀 Installation & Local Development

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Database Setup:**
   You must have a PostgreSQL instance running. Create a `.env` file in the root of the `backend` directory:
   ```env
   # Replace user, password, and port with your local DB credentials
   DATABASE_URL="postgresql://user:password@localhost:5432/exploding_kittens?schema=public"
   PORT=4000
   ```

3. **Initialize Prisma & Seed Data:**
   Run the following commands to create the tables and seed the database with the core cards (Original + Imploding Kittens):
   ```bash
   npm run db:generate   # Generates the Prisma Client
   npm run db:migrate    # Runs migrations to create SQL tables
   npm run db:seed       # Seeds the CardMaster catalog and default identities
   ```
   *(Optional)* You can manage the database via Prisma Studio:
   ```bash
   npm run db:studio
   ```

4. **Start the development server:**
   ```bash
   npm run dev
   ```
   The backend API and Socket.io server will be accessible at `http://localhost:4000`.

## 🏗️ Architecture Overview

- **REST API:** Handles static provisioning, such as finding a room, joining a room, and generating/configuring session states.
- **Socket.io Controller:** Manages the active game session (turns, timers, card executions, disconnects, etc.). The server acts as the **Source of Truth** — clients simply render what the server broadcasts.
- **Game Engine:** 
  - Validates card moves and handles chain resolutions (e.g., Nope chains).
  - Handles time-critical sequences like the *Exploding Kitten Bomb Sequence* (10 seconds) or *Nope Window* (3 seconds).
  - Runs a ticking clock that automatically resets turns and issues Force-Draws for AFK players.
  
## 🃏 Supported Features
- Core Original Cards (Attack, Skip, See the Future, Shuffle, Favor, Cat Cards).
- Combo Mechanics (2x Steal, 3x Target Select).
- Universal Nope Chain mechanics.
- Imploding Kittens expansion (Alter, Draw From Bottom, Reverse, Targeted Attack).