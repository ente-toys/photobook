import JSZip from "jszip";
import type { BookPage } from "./types";
import { A5_WIDTH_MM, A5_HEIGHT_MM } from "./types";
import { getCaptionZones } from "./layouts";
import { getPhotoBlob } from "./db";
import { createPdfX4, renderCanvasToFogra39Jpeg } from "./pdfx";

function getNunitoFont(): string {
  if (typeof window === "undefined") return "sans-serif";
  return (
    getComputedStyle(document.documentElement)
      .getPropertyValue("--font-nunito")
      .trim() || "sans-serif"
  );
}

const DPI = 300;
const A5_WIDTH_PX = Math.round((A5_WIDTH_MM / 25.4) * DPI);
const A5_HEIGHT_PX = Math.round((A5_HEIGHT_MM / 25.4) * DPI);
const A4_SPREAD_GUTTER_MM = 1;
const A4_SPREAD_WIDTH_MM = A5_WIDTH_MM * 2 + A4_SPREAD_GUTTER_MM;
const A4_SPREAD_HEIGHT_MM = A5_HEIGHT_MM;
const A4_SPREAD_WIDTH_PX = Math.round((A4_SPREAD_WIDTH_MM / 25.4) * DPI);
const A4_SPREAD_HEIGHT_PX = A5_HEIGHT_PX;
const A4_SPREAD_GUTTER_PX = A4_SPREAD_WIDTH_PX - A5_WIDTH_PX * 2;

const BLANK_PAGE: BookPage = {
  id: "__blank",
  slots: [],
  textBlocks: [],
  topCaption: "",
  bottomCaption: "",
};

/** Insert a blank page after the cover and before the back cover for print exports. */
function addBlankPages(pages: BookPage[]): BookPage[] {
  if (pages.length < 2) return pages;
  return [
    pages[0], // cover
    BLANK_PAGE, // inside front cover
    ...pages.slice(1, -1),
    BLANK_PAGE, // inside back cover
    pages[pages.length - 1], // back cover
  ];
}

async function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/** Wraps text into lines that fit within maxWidth, breaking on word boundaries. */
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  if (!text) return [];
  const words = text.split(" ");
  const lines: string[] = [];
  let currentLine = words[0] ?? "";

  for (let i = 1; i < words.length; i++) {
    const testLine = currentLine + " " + words[i];
    if (ctx.measureText(testLine).width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = words[i];
    } else {
      currentLine = testLine;
    }
  }
  lines.push(currentLine);
  return lines;
}

/** Lazily loads full-res photo URLs from IndexedDB, caching for the duration of an export. */
function createPhotoUrlResolver() {
  const cache = new Map<string, string>();

  return {
    async resolve(photoId: string): Promise<string | null> {
      if (cache.has(photoId)) return cache.get(photoId)!;
      const blob = await getPhotoBlob(photoId);
      if (!blob) return null;
      const url = URL.createObjectURL(blob);
      cache.set(photoId, url);
      return url;
    },
    revokeAll() {
      cache.forEach((url) => URL.revokeObjectURL(url));
      cache.clear();
    },
  };
}

export async function renderPageToCanvas(
  page: BookPage,
  resolvePhotoUrl: (photoId: string) => Promise<string | null>,
  width: number,
  height: number,
  isBackCover = false,
  isFrontCover = false,
): Promise<HTMLCanvasElement> {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;

  // White background
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);

  // Draw photo slots
  for (const slot of page.slots) {
    if (!slot.photoId) continue;
    const url = await resolvePhotoUrl(slot.photoId);
    if (!url) continue;

    try {
      const img = await loadImage(url);

      const sx = (slot.x / 100) * width;
      const sy = (slot.y / 100) * height;
      const sw = (slot.width / 100) * width;
      const sh = (slot.height / 100) * height;

      ctx.save();
      ctx.beginPath();
      ctx.rect(sx, sy, sw, sh);
      ctx.clip();

      // Calculate crop/fit
      const imgAspect = img.naturalWidth / img.naturalHeight;
      const slotAspect = sw / sh;

      let drawW: number, drawH: number;
      if (imgAspect > slotAspect) {
        // Image wider than slot - fit height, crop width
        drawH = sh * slot.cropZoom;
        drawW = drawH * imgAspect;
      } else {
        // Image taller than slot - fit width, crop height
        drawW = sw * slot.cropZoom;
        drawH = drawW / imgAspect;
      }

      const drawX = sx + (sw - drawW) * slot.cropX;
      const drawY = sy + (sh - drawH) * slot.cropY;

      ctx.drawImage(img, drawX, drawY, drawW, drawH);
      ctx.restore();
    } catch (e) {
      console.warn("Failed to draw photo:", e);
    }
  }

  // Draw captions vertically centered within the actual empty band between
  // the page edge and the nearest photo, so they stay centered when the user
  // adds extra padding (or on the back cover with its larger inset).
  // Front-cover captions act as a title, much larger than interior captions.
  const captionFontSize = Math.round(height * (isFrontCover ? 0.05 : 0.016));
  const captionZones = getCaptionZones(page);
  const captionZoneCenterTop = (height * captionZones.topPct) / 100 / 2;
  const captionZoneCenterBottom =
    height - (height * captionZones.bottomPct) / 100 / 2;

  // Skip stale captions when the photo edge touches the page (full-bleed).
  // there's no band to center the caption in, and rendering it would spill
  // half off the page.
  if (page.topCaption && captionZones.topPct > 0) {
    ctx.fillStyle = "#2a2a2a";
    ctx.font = `${captionFontSize}px ${getNunitoFont()}, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(page.topCaption, width / 2, captionZoneCenterTop);
    ctx.textBaseline = "alphabetic";
  }

  if (isBackCover) {
    // Draw centered Ente logo on back cover
    try {
      const logo = await loadImage("/ente-branding.svg");
      const logoHeight = height * 0.031;
      const logoWidth = (logo.naturalWidth / logo.naturalHeight) * logoHeight;
      const stripHeight = logoHeight + height * 0.03;
      const stripY = height - stripHeight;
      const yCenter = stripY + stripHeight / 2;
      const logoX = (width - logoWidth) / 2;

      // White background strip
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, stripY, width, stripHeight);

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(
        logo,
        logoX,
        yCenter - logoHeight / 2,
        logoWidth,
        logoHeight,
      );
    } catch (e) {
      console.warn("Failed to draw ente branding:", e);
    }
  } else if (page.bottomCaption && captionZones.bottomPct > 0) {
    ctx.fillStyle = "#2a2a2a";
    ctx.font = `${captionFontSize}px ${getNunitoFont()}, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(page.bottomCaption, width / 2, captionZoneCenterBottom);
    ctx.textBaseline = "alphabetic";
  }

  // Draw text blocks
  for (const block of page.textBlocks) {
    const bx = (block.x / 100) * width;
    const by = (block.y / 100) * height;
    const bw = (block.width / 100) * width;
    const fontSize = Math.round(height * ((block.fontSize ?? 2.5) / 100));
    const color = block.color ?? "#555555";
    const rotation = block.rotation ?? 0;

    ctx.save();
    if (rotation) {
      ctx.translate(bx, by);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.translate(-bx, -by);
    }

    ctx.fillStyle = color;
    ctx.font = `bold ${fontSize}px ${getNunitoFont()}, sans-serif`;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";

    // Word-wrap text within block width
    const lines = wrapText(ctx, block.text, bw);
    const lineHeight = fontSize * 1.2;
    for (let li = 0; li < lines.length; li++) {
      ctx.fillText(lines[li], bx, by + li * lineHeight);
    }

    ctx.textBaseline = "alphabetic";
    ctx.restore();
  }

  return canvas;
}

function pdfBytesToBlob(pdfBytes: Uint8Array): Blob {
  const pdfArrayBuffer = new ArrayBuffer(pdfBytes.byteLength);
  new Uint8Array(pdfArrayBuffer).set(pdfBytes);
  return new Blob([pdfArrayBuffer], { type: "application/pdf" });
}

async function renderA4SpreadToCanvas(
  pages: BookPage[],
  spreadIndex: number,
  resolvePhotoUrl: (photoId: string) => Promise<string | null>,
): Promise<HTMLCanvasElement> {
  const canvas = document.createElement("canvas");
  canvas.width = A4_SPREAD_WIDTH_PX;
  canvas.height = A4_SPREAD_HEIGHT_PX;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, A4_SPREAD_WIDTH_PX, A4_SPREAD_HEIGHT_PX);

  const leftIdx = spreadIndex * 2;
  const rightIdx = spreadIndex * 2 + 1;

  if (leftIdx < pages.length) {
    const pageCanvas = await renderPageToCanvas(
      pages[leftIdx],
      resolvePhotoUrl,
      A5_WIDTH_PX,
      A5_HEIGHT_PX,
      leftIdx === pages.length - 1,
      leftIdx === 0,
    );
    ctx.drawImage(pageCanvas, 0, 0);
  }

  if (rightIdx < pages.length) {
    const pageCanvas = await renderPageToCanvas(
      pages[rightIdx],
      resolvePhotoUrl,
      A5_WIDTH_PX,
      A5_HEIGHT_PX,
      rightIdx === pages.length - 1,
      rightIdx === 0,
    );
    ctx.drawImage(pageCanvas, A5_WIDTH_PX + A4_SPREAD_GUTTER_PX, 0);
  }

  return canvas;
}

export async function exportPdfX4A5(
  inputPages: BookPage[],
  onProgress?: (pct: number) => void,
): Promise<Blob> {
  const pages = addBlankPages(inputPages);
  const resolver = createPhotoUrlResolver();
  try {
    const pageJpegs: Uint8Array[] = [];

    for (let i = 0; i < pages.length; i++) {
      const canvas = await renderPageToCanvas(
        pages[i],
        resolver.resolve,
        A5_WIDTH_PX,
        A5_HEIGHT_PX,
        i === pages.length - 1,
        i === 0,
      );

      pageJpegs.push(await renderCanvasToFogra39Jpeg(canvas));
      onProgress?.(Math.round(((i + 1) / pages.length) * 95));
    }

    const pdfBytes = await createPdfX4(pageJpegs, {
      widthMm: A5_WIDTH_MM,
      heightMm: A5_HEIGHT_MM,
      widthPx: A5_WIDTH_PX,
      heightPx: A5_HEIGHT_PX,
    });
    onProgress?.(100);
    return pdfBytesToBlob(pdfBytes);
  } finally {
    resolver.revokeAll();
  }
}

export async function exportPdfX4A4Spreads(
  inputPages: BookPage[],
  onProgress?: (pct: number) => void,
): Promise<Blob> {
  const pages = addBlankPages(inputPages);
  const resolver = createPhotoUrlResolver();
  try {
    const spreadJpegs: Uint8Array[] = [];
    const totalSpreads = Math.ceil(pages.length / 2);

    for (let s = 0; s < totalSpreads; s++) {
      const canvas = await renderA4SpreadToCanvas(pages, s, resolver.resolve);
      spreadJpegs.push(await renderCanvasToFogra39Jpeg(canvas));
      onProgress?.(Math.round(((s + 1) / totalSpreads) * 95));
    }

    const pdfBytes = await createPdfX4(spreadJpegs, {
      widthMm: A4_SPREAD_WIDTH_MM,
      heightMm: A4_SPREAD_HEIGHT_MM,
      widthPx: A4_SPREAD_WIDTH_PX,
      heightPx: A4_SPREAD_HEIGHT_PX,
    });
    onProgress?.(100);
    return pdfBytesToBlob(pdfBytes);
  } finally {
    resolver.revokeAll();
  }
}

export async function exportPngZip(
  inputPages: BookPage[],
  onProgress?: (pct: number) => void,
): Promise<Blob> {
  const pages = addBlankPages(inputPages);
  const resolver = createPhotoUrlResolver();
  try {
    const zip = new JSZip();

    for (let i = 0; i < pages.length; i++) {
      const canvas = await renderPageToCanvas(
        pages[i],
        resolver.resolve,
        A5_WIDTH_PX,
        A5_HEIGHT_PX,
        i === pages.length - 1,
        i === 0,
      );

      const blob = await new Promise<Blob>((resolve) =>
        canvas.toBlob((b) => resolve(b!), "image/png"),
      );

      const pageNum = String(i + 1).padStart(3, "0");
      zip.file(`page_${pageNum}.png`, blob);

      onProgress?.(Math.round(((i + 1) / pages.length) * 100));
    }

    return zip.generateAsync({ type: "blob" });
  } finally {
    resolver.revokeAll();
  }
}

export async function exportPngA4Zip(
  inputPages: BookPage[],
  onProgress?: (pct: number) => void,
): Promise<Blob> {
  const pages = addBlankPages(inputPages);
  const resolver = createPhotoUrlResolver();
  try {
    const zip = new JSZip();
    const totalSpreads = Math.ceil(pages.length / 2);

    for (let s = 0; s < totalSpreads; s++) {
      const canvas = await renderA4SpreadToCanvas(pages, s, resolver.resolve);

      const blob = await new Promise<Blob>((resolve) =>
        canvas.toBlob((b) => resolve(b!), "image/png"),
      );

      const spreadNum = String(s + 1).padStart(3, "0");
      zip.file(`spread_${spreadNum}.png`, blob);

      onProgress?.(Math.round(((s + 1) / totalSpreads) * 100));
    }

    return zip.generateAsync({ type: "blob" });
  } finally {
    resolver.revokeAll();
  }
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
