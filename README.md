# Ente Photobook

A fully private photobook maker that runs entirely in your browser. No uploads, no accounts, no tracking — just drag in your photos, design your book, and download the result. What you do with it is up to you: print it at home, take it to a local print shop, or order online.

## Why?

Every photobook service out there requires you to upload your personal photos to their servers. Photobook flips that: everything happens locally in your browser. Your photos never leave your device.

## Features

- **Drag-and-drop photo import** with automatic chronological sorting via EXIF data
- **Smart auto-layout** that arranges photos across pages based on orientation, varying layouts (1–4 photos per page) to keep things interesting
- **Interactive editor** — reorder pages, reposition and crop photos within their slots, add captions and text blocks
- **Multiple export formats:**
  - PDF with A5 portrait pages
  - PDF with A4 landscape spreads (two pages per sheet, ready for home printing)
  - ZIP of numbered PNG images
- **Persistent state** — your book is saved locally in your browser so you can come back to it

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to start making your photobook.
