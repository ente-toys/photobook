import { jsPDF } from "jspdf";
import JSZip from "jszip";
import type { BookPage, Photo } from "./types";
import { A5_WIDTH_MM, A5_HEIGHT_MM } from "./types";

const DPI = 200;
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

export async function renderPageToCanvas(
  page: BookPage,
  photoUrls: Map<string, string>,
  width: number,
  height: number
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
    const url = photoUrls.get(slot.photoId);
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

  if (page.bottomCaption) {
    ctx.fillStyle = "#1a1c1d";
    ctx.font = `${Math.round(height * 0.025)}px 'Manrope', sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText(page.bottomCaption, width / 2, height * 0.97);
  }

  // Draw text blocks
  for (const block of page.textBlocks) {
    const bx = (block.x / 100) * width;
    const by = (block.y / 100) * height;
    const fontSize =
      block.style === "title"
        ? Math.round(height * 0.04)
        : Math.round(height * 0.025);

    ctx.fillStyle = "#1a1c1d";
    ctx.font =
      block.style === "title"
        ? `bold ${fontSize}px 'Manrope', sans-serif`
        : `${fontSize}px 'Manrope', sans-serif`;
    ctx.textAlign = block.alignment;

    const textX =
      block.alignment === "center"
        ? bx + ((block.width / 100) * width) / 2
        : block.alignment === "right"
        ? bx + (block.width / 100) * width
        : bx;

    ctx.fillText(block.text, textX, by + fontSize);
  }

  return canvas;
}

export async function exportPdfA5(
  pages: BookPage[],
  photoUrls: Map<string, string>,
  onProgress?: (pct: number) => void
): Promise<Blob> {
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: [A5_WIDTH_MM, A5_HEIGHT_MM],
  });

  for (let i = 0; i < pages.length; i++) {
    if (i > 0) pdf.addPage([A5_WIDTH_MM, A5_HEIGHT_MM], "portrait");

    const canvas = await renderPageToCanvas(
      pages[i],
      photoUrls,
      A5_WIDTH_PX,
      A5_HEIGHT_PX
    );
    const imgData = canvas.toDataURL("image/jpeg", 0.92);
    pdf.addImage(imgData, "JPEG", 0, 0, A5_WIDTH_MM, A5_HEIGHT_MM);

    onProgress?.(Math.round(((i + 1) / pages.length) * 100));
  }

  return pdf.output("blob");
}

export async function exportPdfA4Spreads(
  pages: BookPage[],
  photoUrls: Map<string, string>,
  onProgress?: (pct: number) => void
): Promise<Blob> {
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
        photoUrls,
        A5_WIDTH_PX,
        A5_HEIGHT_PX
      );
      const imgData = canvas.toDataURL("image/jpeg", 0.92);
      pdf.addImage(imgData, "JPEG", 0, 0, A5_WIDTH_MM, A5_HEIGHT_MM);
    }

    // Right page
    if (rightIdx < pages.length) {
      const canvas = await renderPageToCanvas(
        pages[rightIdx],
        photoUrls,
        A5_WIDTH_PX,
        A5_HEIGHT_PX
      );
      const imgData = canvas.toDataURL("image/jpeg", 0.92);
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
}

export async function exportPngZip(
  pages: BookPage[],
  photoUrls: Map<string, string>,
  onProgress?: (pct: number) => void
): Promise<Blob> {
  const zip = new JSZip();

  for (let i = 0; i < pages.length; i++) {
    const canvas = await renderPageToCanvas(
      pages[i],
      photoUrls,
      A5_WIDTH_PX,
      A5_HEIGHT_PX
    );

    const blob = await new Promise<Blob>((resolve) =>
      canvas.toBlob((b) => resolve(b!), "image/png")
    );

    const pageNum = String(i + 1).padStart(3, "0");
    zip.file(`page_${pageNum}.png`, blob);

    onProgress?.(Math.round(((i + 1) / pages.length) * 100));
  }

  return zip.generateAsync({ type: "blob" });
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
