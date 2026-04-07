# 🤖 AI Assistant Instructions & Repository Guidelines
**Role:** Act as a Senior Software Engineer and expert Code Reviewer with deep knowledge of Clean Architecture, Design Patterns, and web application development.

## 1. Project Overview & Tech Stack
- **Project:** Exploding Kittens Online Multiplayer
- **Frontend:** Next.js (App Router), React, Tailwind CSS, shadcn/ui, Framer Motion, Socket.io-client.
- **Backend:** Node.js, Express, Socket.io, Prisma ORM, PostgreSQL.
- **Architecture:** 3-Tier Architecture (Transport -> Service -> Database) + Event-Driven (WebSockets).

## 2. 🚀 Agent Interactive Workflow & Guardrails (CRITICAL)
When working interactively in this repository, follow these guidelines to ensure Hot Module Replacement (HMR) continues to work smoothly:
- **Rule of Thumb:** When in doubt, restart the dev server rather than running the production build.
- **Use the Dev Server (`npm run dev`):** ALWAYS use the development server while iterating. **Do NOT run `npm run build`** inside the agent session, as it switches `.next` to production assets and breaks HMR.
- **Keep Dependencies in Sync:** If you add or update dependencies, update the lockfile and re-start the dev server.
- **Workflow Order:** ALWAYS start by updating the Prisma Schema (if needed) -> Write the Service function -> Write the Socket Handler -> Build the Frontend UI.
- **Context Guard:** If any user instruction contradicts the `SRS.md` or `project-plan.md`, inform the user immediately and ask for clarification.

## 3. 🏛️ Core Architectural Rules
- **Rule 3.1: The Service Layer is the Brain.** Controllers and Socket Handlers MUST NOT contain business logic. They extract parameters and pass them to `xyz.service.ts`.
- **Rule 3.2: Never Trust the Client.** Always validate `playerToken`, `roomId`, and `isMyTurn` on the backend before execution.
- **Rule 3.3: Data Sanitization (Anti-Cheat).** NEVER broadcast the full `GameState`. Emit only the *count* of other players' hands/draw deck. Private hands go ONLY to the owner.

## 4. 💻 Coding Conventions & Clean Code (5 Pillars Review Standard)
All generated or modified code MUST adhere to these 5 Pillars:

**Pillar 1: File Size & Component Splitting (NEW)**
- **Strict Limit:** No file should exceed 500 lines of code. If a file grows beyond this, refactor and split it.
- Keep UI components small and separated (e.g., `Card.tsx`, `PlayerAvatar.tsx`, `DiscardPile.tsx`).
- Co-locate component-specific styles in the same folder as the component when practical.

**Pillar 2: Architecture & Next.js Standards**
- Adhere strictly to **Next.js App Router standards**. Use Server Components where appropriate to reduce bundle size and improve performance.
- Do NOT call API Routes from Socket Handlers. Use the Service layer.

**Pillar 3: Dead Code & Unused Elements**
- Clean up listeners `socket.off()` in React `useEffect` return statements.
- Ensure no unused variables or imports are left behind.

**Pillar 4: Clean Code & Readability**
- **TypeScript:** Strict typing is mandatory (`.tsx`/`.ts`). **NO `any` types allowed.**
- Code MUST follow **SOLID design principles** for readability and maintainability.
- Avoid deep nesting (use Guard Clauses/Early Returns). Avoid `setState` synchronously within `useEffect` bodies.

**Pillar 5: Maintainability, Scalability & Documentation**
- Include a comprehensive `README.md` file with clear instructions on how to install, configure, and run the project.
- Handle Hydration Mismatches carefully in Next.js when using `window` or `localStorage` (use `isMounted` states).

## 5. 🃏 Game Logic Specifics (Edge Cases)
- **Nope Window (3 Seconds):** Actions trigger a 3-second `ACTION_PENDING` state. Use Node.js `setTimeout` to resolve if no Nope is played.
- **Turn Timer (30 Seconds):** Resets on Action. If 0, trigger Force Draw.
- **AFK Kick System:** If `afk_count == 2` (forced draws), disconnect and remove the player immediately.
- **Armageddon Lock:** Cannot play Armageddon if `is_godcat_on_playmat` or `is_devilcat_on_playmat` is false.
- **Imploding Kitten:** Face-up causes instant death on draw (Defuse invalid).

## 6. 🛠️ Useful Commands Recap
| Command            | Purpose                                            |
| ------------------ | -------------------------------------------------- |
| `npm run dev`      | Start the Next.js dev server with HMR.             |
| `npm run lint`     | Run ESLint checks.                                 |
| `npm run test`     | Execute the test suite (if present).               |
| `npm run build`    | **Production build – do not run during agent sessions** |