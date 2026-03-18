# 🤖 AI Assistant Instructions (Exploding Kittens Project)

## 1. Project Overview & Tech Stack
- **Project:** Exploding Kittens Online Multiplayer
- **Frontend:** Next.js (App Router), React, Tailwind CSS, shadcn/ui, Framer Motion, Socket.io-client.
- **Backend:** Node.js, Express, Socket.io, Prisma ORM, PostgreSQL.
- **Architecture:** 3-Tier Architecture (Transport -> Service -> Database) + Event-Driven (WebSockets).

## 2. 🏛️ Core Architectural Rules (CRITICAL)
- **Rule 2.1: The Service Layer is the Brain.** - Controllers (REST API) and Socket Handlers MUST NOT contain business logic. 
  - They must extract parameters and pass them directly to `xyz.service.ts`.
  - Do NOT call API Routes from Socket Handlers. Use the Service layer.
- **Rule 2.2: Never Trust the Client.**
  - Always validate `playerToken`, `roomId`, and `isMyTurn` on the backend before executing any action.
- **Rule 2.3: Data Sanitization (Anti-Cheat).**
  - NEVER broadcast the full `GameState` to clients. 
  - You MUST sanitize the state before emitting. Clients should only receive the *count* of other players' hands and the *count* of the draw deck. Private hands must only be sent to the specific owner.

## 3. 💻 Coding Conventions & Strictness
- **TypeScript:** Strict typing is mandatory. **NO `any` types allowed.** Always define Interfaces/Types for socket payloads, GameState, and Player parameters.
- **React (Next.js):** - Beware of Hydration Mismatches (SSR Trap). Use `useEffect` and `isMounted` states when dealing with `localStorage` or `window`.
  - Avoid calling `setState` synchronously within `useEffect` bodies to prevent cascading renders. Use `setTimeout` if necessary or refactor logic.
- **Socket.io:** - Always clean up event listeners in React `useEffect` return statements (`socket.off()`).
  - Use `io.to(roomId).emit()` for room-wide broadcasts, not global emits.

## 4. 🃏 Game Logic Specifics (Edge Cases to Remember)
- **Nope Window (3 Seconds):** Every action (Attack, Skip, See the Future, Favor, Combo) triggers a 3-second `ACTION_PENDING` state. Use Node.js `setTimeout` to resolve the action if no Nope is played.
- **Turn Timer (30 Seconds):** Resets on any Action. If it reaches 0, trigger a Force Draw.
- **AFK Kick System:** If a player is forced to draw 2 times (afk_count == 2), they MUST be disconnected and removed from the game immediately.
- **Armageddon Lock (G&E):** Armageddon cards CANNOT be played if `is_godcat_on_playmat` or `is_devilcat_on_playmat` is `false`.
- **Imploding Kitten:** When face-up, it causes instant death upon drawing (Defuse cannot be used).

## 5. 🛠️ Development Workflow
- When asked to create a new feature, ALWAYS start by updating the Prisma Schema (if needed), then write the Service function, then the Socket Handler, and finally the Frontend UI.
- Keep UI components small and separated (e.g., `Card.tsx`, `PlayerAvatar.tsx`, `DiscardPile.tsx`).
- If an instruction contradicts the `SRS.md` or `project-plan.md`, inform the user immediately and ask for clarification.