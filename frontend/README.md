# 🐱 Frontend — Exploding Kittens Client

This directory contains the web client for the Exploding Kittens Online Multiplayer game. It provides the user interface, handles client state, and communicates in real-time with the game server via WebSockets.

## 🛠️ Technology Stack
- **Framework:** Next.js (React 19)
- **Styling:** Tailwind CSS & PostCSS
- **Animations:** Framer Motion & Canvas Confetti
- **Components:** Radix UI / shadcn concepts
- **Real-Time Communication:** Socket.io-client

## 🚀 Installation & Local Development

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Environment Variables:**
   Create a `.env` or `.env.local` file in the root of the `frontend` directory:
   ```env
   # Ensure these point to your running backend instance
   NEXT_PUBLIC_SOCKET_URL="http://localhost:4000"
   NEXT_PUBLIC_API_URL="http://localhost:4000"
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```

   The app will start at `http://localhost:3000`.

4. **Build for Production:**
   ```bash
   npm run build
   npm run start
   ```

## 🏗️ Architecture Overview

- **`/app`**: Contains the Next.js App Router pages (e.g., Lobby, Game Room).
- **`/components`**: Reusable UI pieces.
  - `/game`: Components specifically for rendering the game board, deck, cards, player hands, Nope windows, and the EK Bomb sequence.
  - `/lobby`: Room creation, room list, and player profile configuration.
- **`/hooks`**: Custom React hooks for encapsulating game state, managing socket event listeners, and countdown timers.
- **State Management:** The frontend state strictly reflects the server's Source of Truth. Optimistic updates are used sparingly; actions are broadcast to the server, and the UI updates upon receiving validation events.

## 🎨 UI/UX Features
- **Card Fanning & Interaction:** Your hand is displayed dynamically with hover states and select-to-play workflows.
- **Nope Chains:** A global 3-second Nope window is surfaced for interrupts whenever an actionable card is played.
- **Imploding Kittens:** Visual indicators for face-up and face-down states on the deck.
- **Responsive:** Designed to be totally playable on both desktop and mobile devices.