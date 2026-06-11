# CLAUDE.md

Photobook platform for the Sri Lankan market: Next.js marketing site + customer-facing photobook editor + order intake. Read this fully before making changes. These rules apply to every session and override default habits.

## Commands

```bash
yarn dev          # dev server
yarn build        # production build — must pass with zero TS errors before any task is "done"
yarn lint         # zero warnings tolerated
yarn test         # Vitest unit tests
yarn test:watch   # Vitest watch mode
yarn db:migrate   # prisma migrate dev
yarn db:studio    # prisma studio
```

**Yarn only.** Never run npm or pnpm. Never create `package-lock.json`; it is gitignored — if you see one, delete it.

## Architecture invariants — never violate these

### 1. The book document is the single source of truth
- The entire book (cover, spreads, placements, text) is one versioned JSON `BookDocument` (types in `src/types/book.ts`, Zod schema in `src/lib/schemas/book.ts`).
- **All geometry is normalized 0–1 floats relative to spread dimensions. Never store pixels.** Screen rendering, thumbnails, admin preview, and the future 300 DPI print pipeline all render the same document. Pixel values may exist only transiently inside rendering components.
- Any document shape change requires bumping `schemaVersion` and adding a migration function in `src/lib/book-migrations.ts`. Never mutate the shape silently.

### 2. Orders snapshot the document
- On order submission, the `BookDocument` JSON is copied onto the Order row. Orders render exclusively from their snapshot. Editing a book after ordering must never affect a placed order. Do not "optimize" this into a reference.

### 3. Repository pattern, no exceptions
- Server actions and route handlers never import Prisma directly. All DB access goes through `src/server/repositories/*`. Ownership checks (session token vs. book) live in the repository layer, not in callers.

### 4. Adapter seams stay intact
- File storage only via the `StorageAdapter` interface (`src/server/storage/`). Current impl: local filesystem. Do not import `fs` for photo handling anywhere else.
- Notifications only via the `Notifier` interface. Current impl: console. Do not add email/SMS SDKs directly into actions.
- Payment is a captured preference enum only. Do not begin a PayHere integration unless explicitly asked; the boundary is marked with `TODO: PayHere`.

### 5. Pricing and validation are server-side pure functions
- `priceBook()` in `src/lib/pricing.ts` is the ONLY place prices are computed. The client displays values it received from the server; it never recomputes. Same for `effectiveDpi()` and checkout validation — pure, tested, server-authoritative.

### 6. Marketing pages don't pay for the editor
- Editor code is code-split under the editor route group. Never import editor stores, dnd-kit, zundo, or exifr from marketing routes. Marketing routes are RSC by default; justify every `"use client"`.

## Code style

- TypeScript strict. No `any`. No non-null assertions (`!`) without an adjacent `// SAFETY:` comment explaining why.
- **Maximum cyclomatic complexity 10 per function** (enforced via ESLint `complexity` rule — do not disable it). If you're nesting a third conditional, extract a helper instead.
- No component over ~150 lines. Decompose by responsibility, not by markup section.
- Pure logic (crop math, DPI, slot remapping, photo distribution, pricing, phone normalization) lives in `src/lib/` and has Vitest coverage. New pure helpers ship with tests in the same commit.
- All user-facing strings — marketing AND editor — go through `src/i18n/en.ts`. No string literals in JSX that a user will read. (Sinhala/Tamil are planned as additive locales.)
- All LKR formatting through `formatLKR()` in `src/lib/format.ts`. Never `Rs. ${x}` inline.
- All Tailwind colors via theme tokens (`paper`, `ink`, `terracotta`, `sage`, `sand`). No raw hex in components.
- All image URLs centralized in `src/data/images.ts`.
- Zod schemas in `src/lib/schemas/` are the source of truth for shapes; infer types with `z.infer`. Never hand-write a type that duplicates a schema.

## Domain rules worth remembering

- Phone validation: accept `+947XXXXXXXX` and `07XXXXXXXX`; normalize to E.164 via `normalizePhoneLK()` before persisting.
- Districts: the canonical list of 25 Sri Lankan districts lives in `src/data/districts.ts`. Don't redeclare it.
- DPI policy: < 100 effective DPI blocks checkout for that slot; 100–149 warns; ≥ 150 is clean.
- Free delivery threshold Rs. 15,000; otherwise Rs. 450 Colombo / Rs. 650 island-wide. These constants live in `src/lib/pricing.ts` only.
- Sessions are anonymous: signed httpOnly cookie, 90 days. Resume share tokens rotate on use. Do not add an auth provider unless explicitly asked; the seam is commented in `src/server/session.ts`.
- Layout switches must preserve content via `remapSlots()` — never silently drop a customer's photo; overflow returns to the tray.

## UX ground rules

- Mobile first, literally: every editor interaction must work at 360px width. Bottom sheets, not cramped side panels. Most traffic is Sri Lankan mobile.
- Editor micro-interactions ≤ 150ms; page-turn animation only in preview mode. Respect `prefers-reduced-motion` via the shared motion config — no per-component media queries.
- Autosave: debounced 1.5s, last-write-wins with `updatedAt` guard, visible Saved/Saving indicator. Never add a manual save button.
- Undo/redo history is capped at 50 entries and scoped to document edits only (not navigation, not uploads).

## Definition of done for any task

1. `yarn build` passes — zero TS errors, zero ESLint warnings.
2. New/changed pure logic has passing tests.
3. Touched UI verified at 360px and desktop.
4. No invariant above violated; if a task seems to require violating one, stop and ask instead of working around it.
