# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Ente Photobook — a fully private, browser-only photobook maker. Photos never leave the device. Users import photos, arrange them into an A5 portrait book with auto-layout, edit pages, then export as PDF or PNG ZIP. Intended to eventually integrate into the Ente Photos ecosystem and deploy on `photobook.ente.com`.

## Repository Structure

- `photobook-app/` — the Next.js application (this is the main codebase)
- `stitch-designs/` — HTML/PNG mockups of the three app screens (start, edit, results)
- `ente_photobook_notes.md` — product requirements and design notes

## Commands

All commands run from `photobook-app/`:

```bash
npm run dev      # Dev server on localhost:3000
npm run build    # Static export (output: "export") to out/
npm run lint     # Next.js lint
```

No test framework is configured.

## Architecture

**Single-page app with three views** (`AppView` type: `"start" | "edit" | "results"`), routed via state not URL. The entire app is dynamically imported with `ssr: false` because Konva requires the DOM.

**Key layers:**

- **`context/BookContext.tsx`** — single React Context holding all app state: photos, book pages, spread index, view state. Provides all mutation functions (add/remove/reorder pages, update slots, text blocks, captions). Debounced auto-save to IndexedDB.
- **`lib/types.ts`** — core data model. `BookState` contains `BookPage[]`, each page has `PhotoSlot[]` (positioned as percentages 0-100) and `TextBlock[]`. All coordinates are percentages of page dimensions.
- **`lib/layouts.ts`** — auto-layout engine that distributes photos across pages (1-4 per page) choosing layout variants based on photo orientation. First page is always a single cover photo.
- **`lib/db.ts`** — persistence via `localforage` (IndexedDB). Three stores: `photo_blobs`, `thumbnails`, `metadata`. Session restores on mount.
- **`lib/export.ts`** — renders pages to canvas then exports as A5 PDF, A4 spread PDF, or PNG ZIP. Uses jsPDF and JSZip.
- **`lib/images.ts`** — EXIF date extraction (via `exifr`) and thumbnail generation.

**UI stack:** MUI v7 + Emotion, Konva (`react-konva`) for the page canvas editor. HEIC/HEIF conversion via `heic2any`. Page flip animation via `page-flip`.

**Design system:** Ente-aligned — accent green `#08C225`, light mode only, grey app background with white book pages. Font: Nunito for book content.

## Key Conventions

- All slot/text positions use **percentage coordinates** (0-100) relative to page dimensions, not pixels
- A5 portrait format: 148mm × 210mm, aspect ratio ~0.705
- Pages are always kept in even count (for spreads) — blank page appended if needed
- Photos stored as blobs in IndexedDB; object URLs created at runtime and tracked in `photoUrls`/`thumbnailUrls` Maps
- Thumbnails are capped at 1080px for performance
- Static export (`output: "export"` in next.config.js) — no server-side features
- Canvas is externalized in webpack config to avoid SSR issues with Konva
