# Pixela (working name)

Premium photobook platform for the Sri Lankan market: a warm editorial marketing
site plus a constrained, Once Upon-style photobook editor (preset layouts,
curated fonts and cover colors, pan/zoom cropping in fixed slots) with order
intake. Printed in Colombo, delivered island-wide.

## Setup

```bash
yarn install
cp .env.example .env   # then edit values
yarn db:migrate        # creates prisma/dev.db and generates the client
yarn dev
```

Yarn only — never npm or pnpm. `package-lock.json` is gitignored; delete it if
one appears.

## Commands

| Command          | Purpose                                            |
| ---------------- | -------------------------------------------------- |
| `yarn dev`       | dev server                                         |
| `yarn build`     | production build — must pass with zero TS errors   |
| `yarn lint`      | ESLint, zero warnings tolerated                    |
| `yarn test`      | Vitest unit tests                                  |
| `yarn test:watch`| Vitest watch mode                                  |
| `yarn db:migrate`| `prisma migrate dev`                               |
| `yarn db:studio` | Prisma Studio                                      |

## Environment variables

See `.env.example`. `DATABASE_URL` is SQLite in dev; the schema is written
Postgres-compatible (no native enums, no SQLite-only types). For prod, point at
Postgres and swap the driver adapter where the Prisma client is constructed
(`@prisma/adapter-better-sqlite3` → `@prisma/adapter-pg`).

## Where to change things

| What                          | Where                                            |
| ----------------------------- | ------------------------------------------------ |
| Brand name                    | `src/data/site.ts` (`BRAND_NAME`)                |
| WhatsApp number               | `src/data/site.ts` (`WHATSAPP_NUMBER`)           |
| Prices & delivery fees        | `src/lib/pricing.ts` — the ONLY pricing location |
| Book formats & physical specs | `src/lib/print-specs.ts`                         |
| Layout templates              | `src/data/layouts.ts`                            |
| Cover colors / in-book fonts  | `src/data/cover-colors.ts`, `src/data/book-fonts.ts` (ids fixed in `src/lib/schemas/book.ts`) |
| Districts                     | `src/data/districts.ts` (canonical 25)           |
| User-facing strings           | `src/i18n/en.ts` (everything; Sinhala/Tamil additive later) |
| External image URLs           | `src/data/images.ts`                             |

## Architecture

- **The book document is the single source of truth.** One versioned JSON
  `BookDocument` (Zod schemas: `src/lib/schemas/book.ts`; inferred types:
  `src/types/book.ts`). All geometry is normalized 0–1 floats relative to
  spread dimensions — never pixels. Screen, thumbnails, admin preview and the
  future 300 DPI print pipeline render the same document. Shape changes bump
  `schemaVersion` + add a migration in `src/lib/book-migrations.ts`.
- **Crop model** (`src/lib/crop.ts`): photos cover-fit their slot, then
  `scale ≥ 1` zooms; `crop.x/y ∈ [0,1]` are the fraction of the pan range
  consumed (0.5 = centered), so any stored crop is valid at any zoom.
- **Orders snapshot the document** onto the Order row at submission; orders
  render only from their snapshot.
- **Repository pattern:** all DB access via `src/server/repositories/*`
  (arrives milestone 2+); route handlers and server actions never import
  Prisma directly. Generated client lives in `src/generated/prisma`
  (gitignored; `yarn prisma generate` recreates it).
- **Adapter seams:** file storage via `StorageAdapter` (`src/server/storage/`,
  local-filesystem impl writing to `./storage/`; S3/R2 is interface-only later).
  Notifications via `Notifier` (console impl; Resend later). Payment is a
  captured preference enum only — `TODO: PayHere` marks the boundary.

## Print pipeline notes (deferred)

`generatePrintPdf(orderId)` is stubbed (milestone 6): walks the order's
snapshotted document + `src/lib/print-specs.ts` at 300 DPI with 3 mm bleed,
CMYK conversion at the printer. The normalized geometry makes this a contained
task — no editor code involved.

## Deferred from v1

PayHere integration · S3/R2 storage adapter · Resend email notifier · HEIC
uploads · user accounts (seam in `src/server/session.ts`) · Sinhala/Tamil
locales · automated print-PDF generation.

## Milestone status

1. ✅ Scaffold, Prisma schema, document model, layouts/print specs, pure
   helpers (crop, DPI, remap, pricing, distribution, phone) with tests
2. ✅ Photo upload pipeline (two-stage preview/original, concurrency 3,
   retry), StorageAdapter + local impl + authenticated serving route,
   anonymous sessions, repositories, photo tray
3. ✅ Editor core: spread canvas + shared renderer, slot interactions
   (pick/pan/zoom/replace/remove, DPI badges), layout switching via
   remapSlots, filmstrip with dnd reorder, undo/redo (zundo, 50 cap,
   pan gestures coalesced), debounced autosave with updatedAt guard,
   server-quoted live pricing (editor JS 287KB gz, budget 350KB)
4. ✅ Cover step in the editor (title/subtitle/spine, 4 fonts, 8 colors,
   6 layouts, cover photos w/ pan-zoom), marketing-grade /create picker
   with live preview, /my-books (thumbnails, copy-once resume links,
   two-step delete), crawler-safe /resume confirmation flow
5. ✅ Auto-create ("Fill my book" — chronological, one undo entry,
   two-step confirm on filled books, leftover notice), full-screen preview
   with framer page-turn (lazy chunk, reduced-motion aware) and a
   completeness checklist (jump/fix), checkCompleteness lib feeding the
   M6 checkout gate
6. ✅ Checkout with server-revalidated gate (blockers, per-slot "leave
   blank" confirmations, COD-Colombo rule), orders snapshot the document
   (photo deletion locked once ordered), PB- references, console Notifier
   seam, print-PDF stub w/ design notes, basic-auth admin (orders table,
   frozen-snapshot detail, status flow, streamed photo zip)
7. ✅ Marketing site: conversion home (hero, trust bar, SL occasion grid,
   how-it-works, pricing, 5 testimonials, no-JS FAQ accordion + FAQPage
   JSON-LD), 6 static /occasions/[slug] SEO landers, about/contact/
   delivery-and-payments/privacy/terms, announcement bar, context-aware
   WhatsApp float, sitemap + robots — Lighthouse mobile 95/100/100
   (budgets: ≥90/≥95/≥95)
