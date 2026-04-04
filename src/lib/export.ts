import { jsPDF } from "jspdf";
import JSZip from "jszip";
import type { BookPage, Photo } from "./types";
import { A5_WIDTH_MM, A5_HEIGHT_MM } from "./types";
import { getPhotoBlob } from "./db";

const DPI = 300;
const A5_WIDTH_PX = Math.round((A5_WIDTH_MM / 25.4) * DPI);
const A5_HEIGHT_PX = Math.round((A5_HEIGHT_MM / 25.4) * DPI);

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
  maxWidth: number
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
  isBackCover = false
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

  // Draw captions
  if (page.topCaption) {
    ctx.fillStyle = "#1a1c1d";
    ctx.font = `${Math.round(height * 0.025)}px 'Manrope', sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText(page.topCaption, width / 2, height * 0.04);
  }

  if (isBackCover) {
    // Draw "By ente" branding on back cover
    try {
      const logo = await loadImage("/ente-icon.png");
      const logoHeight = height * 0.12;
      const logoWidth = (logo.naturalWidth / logo.naturalHeight) * logoHeight;
      const byFontSize = Math.round(height * 0.018);
      const gap = byFontSize * 0.6;
      const totalWidth = byFontSize * 1.2 + gap + logoWidth;
      const startX = (width - totalWidth) / 2;
      const stripHeight = logoHeight + height * 0.03;
      const stripY = height - stripHeight;
      const yCenter = stripY + stripHeight / 2;

      // White background strip
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, stripY, width, stripHeight);

      ctx.fillStyle = "#999";
      ctx.font = `${byFontSize}px 'Manrope', sans-serif`;
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText("By", startX, yCenter);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(
        logo,
        startX + byFontSize * 1.2 + gap,
        yCenter - logoHeight / 2,
        logoWidth,
        logoHeight
      );
      ctx.textBaseline = "alphabetic";
    } catch (e) {
      console.warn("Failed to draw ente branding:", e);
    }
  } else if (page.bottomCaption) {
    ctx.fillStyle = "#1a1c1d";
    ctx.font = `${Math.round(height * 0.025)}px 'Manrope', sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.fillText(page.bottomCaption, width / 2, height * 0.98);
    ctx.textBaseline = "alphabetic";
  }

  // Draw text blocks
  for (const block of page.textBlocks) {
    const bx = (block.x / 100) * width;
    const by = (block.y / 100) * height;
    const bw = (block.width / 100) * width;
    const fontSize = Math.round(height * ((block.fontSize ?? 2.5) / 100));
    const color = block.color ?? "#1a1c1d";
    const rotation = block.rotation ?? 0;

    ctx.save();
    if (rotation) {
      ctx.translate(bx, by);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.translate(-bx, -by);
    }

    ctx.fillStyle = color;
    ctx.font =
      block.style === "title"
        ? `bold ${fontSize}px 'Manrope', sans-serif`
        : `${fontSize}px 'Manrope', sans-serif`;
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

export async function exportPdfA5(
  pages: BookPage[],
  onProgress?: (pct: number) => void
): Promise<Blob> {
  const resolver = createPhotoUrlResolver();
  try {
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: [A5_WIDTH_MM, A5_HEIGHT_MM],
    });

    for (let i = 0; i < pages.length; i++) {
      if (i > 0) pdf.addPage([A5_WIDTH_MM, A5_HEIGHT_MM], "portrait");

      const canvas = await renderPageToCanvas(
        pages[i],
        resolver.resolve,
        A5_WIDTH_PX,
        A5_HEIGHT_PX,
        i === pages.length - 1
      );
      const imgData = canvas.toDataURL("image/jpeg", 0.95);
      pdf.addImage(imgData, "JPEG", 0, 0, A5_WIDTH_MM, A5_HEIGHT_MM);

      onProgress?.(Math.round(((i + 1) / pages.length) * 100));
    }

    return pdf.output("blob");
  } finally {
    resolver.revokeAll();
  }
}

export async function exportPdfA4Spreads(
  pages: BookPage[],
  onProgress?: (pct: number) => void
): Promise<Blob> {
  const resolver = createPhotoUrlResolver();
  try {
    const A4W = A5_HEIGHT_MM * 2; // 420mm
    const A4H = A5_WIDTH_MM; // actually A5_HEIGHT for landscape... let me recalculate
    // A4 landscape = 297mm x 210mm, but we want two A5 pages side by side
    // Two A5 portrait pages = 148*2 x 210 = 296mm x 210mm
    const spreadW = A5_WIDTH_MM * 2;
    const spreadH = A5_HEIGHT_MM;

    const pdf = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: [spreadW, spreadH],
    });

    const totalSpreads = Math.ceil(pages.length / 2);

    for (let s = 0; s < totalSpreads; s++) {
      if (s > 0) pdf.addPage([spreadW, spreadH], "landscape");

      const leftIdx = s * 2;
      const rightIdx = s * 2 + 1;

      // Left page
      if (leftIdx < pages.length) {
        const canvas = await renderPageToCanvas(
          pages[leftIdx],
          resolver.resolve,
          A5_WIDTH_PX,
          A5_HEIGHT_PX,
          leftIdx === pages.length - 1
        );
        const imgData = canvas.toDataURL("image/jpeg", 0.95);
        pdf.addImage(imgData, "JPEG", 0, 0, A5_WIDTH_MM, A5_HEIGHT_MM);
      }

      // Right page
      if (rightIdx < pages.length) {
        const canvas = await renderPageToCanvas(
          pages[rightIdx],
          resolver.resolve,
          A5_WIDTH_PX,
          A5_HEIGHT_PX,
          rightIdx === pages.length - 1
        );
        const imgData = canvas.toDataURL("image/jpeg", 0.95);
        pdf.addImage(
          imgData,
          "JPEG",
          A5_WIDTH_MM,
          0,
          A5_WIDTH_MM,
          A5_HEIGHT_MM
        );
      }

      onProgress?.(Math.round(((s + 1) / totalSpreads) * 100));
    }

    return pdf.output("blob");
  } finally {
    resolver.revokeAll();
  }
}

export async function exportPngZip(
  pages: BookPage[],
  onProgress?: (pct: number) => void
): Promise<Blob> {
  const resolver = createPhotoUrlResolver();
  try {
    const zip = new JSZip();

    for (let i = 0; i < pages.length; i++) {
      const canvas = await renderPageToCanvas(
        pages[i],
        resolver.resolve,
        A5_WIDTH_PX,
        A5_HEIGHT_PX,
        i === pages.length - 1
      );

      const blob = await new Promise<Blob>((resolve) =>
        canvas.toBlob((b) => resolve(b!), "image/png")
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
  pages: BookPage[],
  onProgress?: (pct: number) => void
): Promise<Blob> {
  const resolver = createPhotoUrlResolver();
  try {
    const zip = new JSZip();
    const spreadW = A5_WIDTH_PX * 2;
    const spreadH = A5_HEIGHT_PX;
    const totalSpreads = Math.ceil(pages.length / 2);

    for (let s = 0; s < totalSpreads; s++) {
      const canvas = document.createElement("canvas");
      canvas.width = spreadW;
      canvas.height = spreadH;
      const ctx = canvas.getContext("2d")!;

      // White background
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, spreadW, spreadH);

      const leftIdx = s * 2;
      const rightIdx = s * 2 + 1;

      // Left page
      if (leftIdx < pages.length) {
        const pageCanvas = await renderPageToCanvas(
          pages[leftIdx],
          resolver.resolve,
          A5_WIDTH_PX,
          A5_HEIGHT_PX,
          leftIdx === pages.length - 1
        );
        ctx.drawImage(pageCanvas, 0, 0);
      }

      // Right page
      if (rightIdx < pages.length) {
        const pageCanvas = await renderPageToCanvas(
          pages[rightIdx],
          resolver.resolve,
          A5_WIDTH_PX,
          A5_HEIGHT_PX,
          rightIdx === pages.length - 1
        );
        ctx.drawImage(pageCanvas, A5_WIDTH_PX, 0);
      }

      const blob = await new Promise<Blob>((resolve) =>
        canvas.toBlob((b) => resolve(b!), "image/png")
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
