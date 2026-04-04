import { v4 as uuid } from "uuid";
import type { BookPage, Photo, PhotoSlot } from "./types";

// Margin as percentage of page
const MARGIN = 6;
// Separate horizontal/vertical gaps to produce equal absolute spacing on A5 portrait pages
const H_GAP = 1.28; // horizontal gap (% of page width)
const V_GAP = 0.9; // vertical gap (% of page height)

type Orientation = "landscape" | "portrait" | "square";

function getOrientation(photo: Photo): Orientation {
  const ratio = photo.width / photo.height;
  if (ratio > 1.15) return "landscape";
  if (ratio < 0.85) return "portrait";
  return "square";
}

function makeSlot(
  photoId: string,
  x: number,
  y: number,
  w: number,
  h: number
): PhotoSlot {
  return {
    id: uuid(),
    photoId,
    x,
    y,
    width: w,
    height: h,
    cropX: 0.5,
    cropY: 0.5,
    cropZoom: 1,
  };
}

// Content area boundaries for standard margin
const LEFT = MARGIN;
const TOP = MARGIN;
const RIGHT = 100 - MARGIN;
const BOTTOM = 100 - MARGIN;
const CW = RIGHT - LEFT;
const CH = BOTTOM - TOP;

// ── Layout variant system ──────────────────────────────────────────

export interface LayoutVariant {
  key: string;
  photoCount: number;
  generate: (photoIds: string[]) => PhotoSlot[];
}

// Slot position (no photo ID) for thumbnail preview rendering
export interface SlotPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

function contentArea(margin: number) {
  const l = margin, t = margin, r = 100 - margin, b = 100 - margin;
  return { l, t, cw: r - l, ch: b - t };
}

// ── 1-photo variants ──────────────────────────────────────────────

function gen1Padded(ids: string[]): PhotoSlot[] {
  const { l, t, cw, ch } = contentArea(14);
  return [makeSlot(ids[0], l, t, cw, ch)];
}

function gen1Moderate(ids: string[]): PhotoSlot[] {
  return [makeSlot(ids[0], LEFT, TOP, CW, CH)];
}

function gen1Full(ids: string[]): PhotoSlot[] {
  return [makeSlot(ids[0], 0, 0, 100, 100)];
}

// ── 2-photo variants ──────────────────────────────────────────────

function gen2Stacked(ids: string[]): PhotoSlot[] {
  const halfH = (CH - V_GAP) / 2;
  return [
    makeSlot(ids[0], LEFT, TOP, CW, halfH),
    makeSlot(ids[1], LEFT, TOP + halfH + V_GAP, CW, halfH),
  ];
}

function gen2SideBySide(ids: string[]): PhotoSlot[] {
  const halfW = (CW - H_GAP) / 2;
  return [
    makeSlot(ids[0], LEFT, TOP, halfW, CH),
    makeSlot(ids[1], LEFT + halfW + H_GAP, TOP, halfW, CH),
  ];
}

function gen2BigTop(ids: string[]): PhotoSlot[] {
  const bigH = CH * 0.62;
  const smallH = CH - bigH - V_GAP;
  return [
    makeSlot(ids[0], LEFT, TOP, CW, bigH),
    makeSlot(ids[1], LEFT, TOP + bigH + V_GAP, CW, smallH),
  ];
}

function gen2BigLeft(ids: string[]): PhotoSlot[] {
  const bigW = CW * 0.62;
  const smallW = CW - bigW - H_GAP;
  return [
    makeSlot(ids[0], LEFT, TOP, bigW, CH),
    makeSlot(ids[1], LEFT + bigW + H_GAP, TOP, smallW, CH),
  ];
}

function gen2BigBottom(ids: string[]): PhotoSlot[] {
  const bigH = CH * 0.62;
  const smallH = CH - bigH - V_GAP;
  return [
    makeSlot(ids[0], LEFT, TOP, CW, smallH),
    makeSlot(ids[1], LEFT, TOP + smallH + V_GAP, CW, bigH),
  ];
}

function gen2BigRight(ids: string[]): PhotoSlot[] {
  const bigW = CW * 0.62;
  const smallW = CW - bigW - H_GAP;
  return [
    makeSlot(ids[0], LEFT, TOP, smallW, CH),
    makeSlot(ids[1], LEFT + smallW + H_GAP, TOP, bigW, CH),
  ];
}

// ── 3-photo variants ──────────────────────────────────────────────

function gen3Top1Bot2(ids: string[]): PhotoSlot[] {
  const topH = CH * 0.55;
  const botH = CH - topH - V_GAP;
  const halfW = (CW - H_GAP) / 2;
  return [
    makeSlot(ids[0], LEFT, TOP, CW, topH),
    makeSlot(ids[1], LEFT, TOP + topH + V_GAP, halfW, botH),
    makeSlot(ids[2], LEFT + halfW + H_GAP, TOP + topH + V_GAP, halfW, botH),
  ];
}

function gen3Left1Right2(ids: string[]): PhotoSlot[] {
  const leftW = CW * 0.55;
  const rightW = CW - leftW - H_GAP;
  const halfH = (CH - V_GAP) / 2;
  return [
    makeSlot(ids[0], LEFT, TOP, leftW, CH),
    makeSlot(ids[1], LEFT + leftW + H_GAP, TOP, rightW, halfH),
    makeSlot(ids[2], LEFT + leftW + H_GAP, TOP + halfH + V_GAP, rightW, halfH),
  ];
}

function gen3Bot1Top2(ids: string[]): PhotoSlot[] {
  const botH = CH * 0.55;
  const topH = CH - botH - V_GAP;
  const halfW = (CW - H_GAP) / 2;
  return [
    makeSlot(ids[0], LEFT, TOP, halfW, topH),
    makeSlot(ids[1], LEFT + halfW + H_GAP, TOP, halfW, topH),
    makeSlot(ids[2], LEFT, TOP + topH + V_GAP, CW, botH),
  ];
}

function gen3Right1Left2(ids: string[]): PhotoSlot[] {
  const rightW = CW * 0.55;
  const leftW = CW - rightW - H_GAP;
  const halfH = (CH - V_GAP) / 2;
  return [
    makeSlot(ids[0], LEFT, TOP, leftW, halfH),
    makeSlot(ids[1], LEFT, TOP + halfH + V_GAP, leftW, halfH),
    makeSlot(ids[2], LEFT + leftW + H_GAP, TOP, rightW, CH),
  ];
}

function gen3EqualRows(ids: string[]): PhotoSlot[] {
  const rowH = (CH - V_GAP * 2) / 3;
  return [
    makeSlot(ids[0], LEFT, TOP, CW, rowH),
    makeSlot(ids[1], LEFT, TOP + rowH + V_GAP, CW, rowH),
    makeSlot(ids[2], LEFT, TOP + (rowH + V_GAP) * 2, CW, rowH),
  ];
}

function gen3EqualCols(ids: string[]): PhotoSlot[] {
  const colW = (CW - H_GAP * 2) / 3;
  return [
    makeSlot(ids[0], LEFT, TOP, colW, CH),
    makeSlot(ids[1], LEFT + colW + H_GAP, TOP, colW, CH),
    makeSlot(ids[2], LEFT + (colW + H_GAP) * 2, TOP, colW, CH),
  ];
}

function gen3DominantTop(ids: string[]): PhotoSlot[] {
  const bigH = CH * 0.75;
  const smallH = CH - bigH - V_GAP;
  const halfW = (CW - H_GAP) / 2;
  return [
    makeSlot(ids[0], LEFT, TOP, CW, bigH),
    makeSlot(ids[1], LEFT, TOP + bigH + V_GAP, halfW, smallH),
    makeSlot(ids[2], LEFT + halfW + H_GAP, TOP + bigH + V_GAP, halfW, smallH),
  ];
}

function gen3DominantBottom(ids: string[]): PhotoSlot[] {
  const bigH = CH * 0.75;
  const smallH = CH - bigH - V_GAP;
  const halfW = (CW - H_GAP) / 2;
  return [
    makeSlot(ids[0], LEFT, TOP, halfW, smallH),
    makeSlot(ids[1], LEFT + halfW + H_GAP, TOP, halfW, smallH),
    makeSlot(ids[2], LEFT, TOP + smallH + V_GAP, CW, bigH),
  ];
}

function gen3DominantLeft(ids: string[]): PhotoSlot[] {
  const bigW = CW * 0.75;
  const smallW = CW - bigW - H_GAP;
  const halfH = (CH - V_GAP) / 2;
  return [
    makeSlot(ids[0], LEFT, TOP, bigW, CH),
    makeSlot(ids[1], LEFT + bigW + H_GAP, TOP, smallW, halfH),
    makeSlot(ids[2], LEFT + bigW + H_GAP, TOP + halfH + V_GAP, smallW, halfH),
  ];
}

function gen3DominantRight(ids: string[]): PhotoSlot[] {
  const bigW = CW * 0.75;
  const smallW = CW - bigW - H_GAP;
  const halfH = (CH - V_GAP) / 2;
  return [
    makeSlot(ids[0], LEFT, TOP, smallW, halfH),
    makeSlot(ids[1], LEFT, TOP + halfH + V_GAP, smallW, halfH),
    makeSlot(ids[2], LEFT + smallW + H_GAP, TOP, bigW, CH),
  ];
}

// ── 4-photo variants ──────────────────────────────────────────────

function gen4Grid(ids: string[]): PhotoSlot[] {
  const halfW = (CW - H_GAP) / 2;
  const halfH = (CH - V_GAP) / 2;
  return [
    makeSlot(ids[0], LEFT, TOP, halfW, halfH),
    makeSlot(ids[1], LEFT + halfW + H_GAP, TOP, halfW, halfH),
    makeSlot(ids[2], LEFT, TOP + halfH + V_GAP, halfW, halfH),
    makeSlot(ids[3], LEFT + halfW + H_GAP, TOP + halfH + V_GAP, halfW, halfH),
  ];
}

function gen4Top1Bot3(ids: string[]): PhotoSlot[] {
  const topH = CH * 0.5;
  const botH = CH - topH - V_GAP;
  const thirdW = (CW - H_GAP * 2) / 3;
  return [
    makeSlot(ids[0], LEFT, TOP, CW, topH),
    makeSlot(ids[1], LEFT, TOP + topH + V_GAP, thirdW, botH),
    makeSlot(ids[2], LEFT + thirdW + H_GAP, TOP + topH + V_GAP, thirdW, botH),
    makeSlot(ids[3], LEFT + thirdW * 2 + H_GAP * 2, TOP + topH + V_GAP, thirdW, botH),
  ];
}

function gen4Bot1Top3(ids: string[]): PhotoSlot[] {
  const botH = CH * 0.5;
  const topH = CH - botH - V_GAP;
  const thirdW = (CW - H_GAP * 2) / 3;
  return [
    makeSlot(ids[0], LEFT, TOP, thirdW, topH),
    makeSlot(ids[1], LEFT + thirdW + H_GAP, TOP, thirdW, topH),
    makeSlot(ids[2], LEFT + thirdW * 2 + H_GAP * 2, TOP, thirdW, topH),
    makeSlot(ids[3], LEFT, TOP + topH + V_GAP, CW, botH),
  ];
}

function gen4Left1Right3(ids: string[]): PhotoSlot[] {
  const leftW = CW * 0.5;
  const rightW = CW - leftW - H_GAP;
  const thirdH = (CH - V_GAP * 2) / 3;
  return [
    makeSlot(ids[0], LEFT, TOP, leftW, CH),
    makeSlot(ids[1], LEFT + leftW + H_GAP, TOP, rightW, thirdH),
    makeSlot(ids[2], LEFT + leftW + H_GAP, TOP + thirdH + V_GAP, rightW, thirdH),
    makeSlot(ids[3], LEFT + leftW + H_GAP, TOP + (thirdH + V_GAP) * 2, rightW, thirdH),
  ];
}

function gen4Right1Left3(ids: string[]): PhotoSlot[] {
  const rightW = CW * 0.5;
  const leftW = CW - rightW - H_GAP;
  const thirdH = (CH - V_GAP * 2) / 3;
  return [
    makeSlot(ids[0], LEFT, TOP, leftW, thirdH),
    makeSlot(ids[1], LEFT, TOP + thirdH + V_GAP, leftW, thirdH),
    makeSlot(ids[2], LEFT, TOP + (thirdH + V_GAP) * 2, leftW, thirdH),
    makeSlot(ids[3], LEFT + leftW + H_GAP, TOP, rightW, CH),
  ];
}

function gen4EqualRows(ids: string[]): PhotoSlot[] {
  const rowH = (CH - V_GAP * 3) / 4;
  return [
    makeSlot(ids[0], LEFT, TOP, CW, rowH),
    makeSlot(ids[1], LEFT, TOP + rowH + V_GAP, CW, rowH),
    makeSlot(ids[2], LEFT, TOP + (rowH + V_GAP) * 2, CW, rowH),
    makeSlot(ids[3], LEFT, TOP + (rowH + V_GAP) * 3, CW, rowH),
  ];
}

function gen4WideLeft(ids: string[]): PhotoSlot[] {
  const bigW = CW * 0.62;
  const smallW = CW - bigW - H_GAP;
  const halfH = (CH - V_GAP) / 2;
  return [
    makeSlot(ids[0], LEFT, TOP, bigW, halfH),
    makeSlot(ids[1], LEFT + bigW + H_GAP, TOP, smallW, halfH),
    makeSlot(ids[2], LEFT, TOP + halfH + V_GAP, bigW, halfH),
    makeSlot(ids[3], LEFT + bigW + H_GAP, TOP + halfH + V_GAP, smallW, halfH),
  ];
}

function gen4WideRight(ids: string[]): PhotoSlot[] {
  const bigW = CW * 0.62;
  const smallW = CW - bigW - H_GAP;
  const halfH = (CH - V_GAP) / 2;
  return [
    makeSlot(ids[0], LEFT, TOP, smallW, halfH),
    makeSlot(ids[1], LEFT + smallW + H_GAP, TOP, bigW, halfH),
    makeSlot(ids[2], LEFT, TOP + halfH + V_GAP, smallW, halfH),
    makeSlot(ids[3], LEFT + smallW + H_GAP, TOP + halfH + V_GAP, bigW, halfH),
  ];
}

function gen4TallTop(ids: string[]): PhotoSlot[] {
  const bigH = CH * 0.62;
  const smallH = CH - bigH - V_GAP;
  const halfW = (CW - H_GAP) / 2;
  return [
    makeSlot(ids[0], LEFT, TOP, halfW, bigH),
    makeSlot(ids[1], LEFT + halfW + H_GAP, TOP, halfW, bigH),
    makeSlot(ids[2], LEFT, TOP + bigH + V_GAP, halfW, smallH),
    makeSlot(ids[3], LEFT + halfW + H_GAP, TOP + bigH + V_GAP, halfW, smallH),
  ];
}

function gen4TallBottom(ids: string[]): PhotoSlot[] {
  const bigH = CH * 0.62;
  const smallH = CH - bigH - V_GAP;
  const halfW = (CW - H_GAP) / 2;
  return [
    makeSlot(ids[0], LEFT, TOP, halfW, smallH),
    makeSlot(ids[1], LEFT + halfW + H_GAP, TOP, halfW, smallH),
    makeSlot(ids[2], LEFT, TOP + smallH + V_GAP, halfW, bigH),
    makeSlot(ids[3], LEFT + halfW + H_GAP, TOP + smallH + V_GAP, halfW, bigH),
  ];
}

function gen4EqualCols(ids: string[]): PhotoSlot[] {
  const colW = (CW - H_GAP * 3) / 4;
  return [
    makeSlot(ids[0], LEFT, TOP, colW, CH),
    makeSlot(ids[1], LEFT + colW + H_GAP, TOP, colW, CH),
    makeSlot(ids[2], LEFT + (colW + H_GAP) * 2, TOP, colW, CH),
    makeSlot(ids[3], LEFT + (colW + H_GAP) * 3, TOP, colW, CH),
  ];
}

// ── Variant registry ──────────────────────────────────────────────

const ALL_VARIANTS: LayoutVariant[] = [
  // 1 photo
  { key: "1-padded", photoCount: 1, generate: gen1Padded },
  { key: "1-moderate", photoCount: 1, generate: gen1Moderate },
  { key: "1-full", photoCount: 1, generate: gen1Full },
  // 2 photos
  { key: "2-stacked", photoCount: 2, generate: gen2Stacked },
  { key: "2-side", photoCount: 2, generate: gen2SideBySide },
  { key: "2-big-top", photoCount: 2, generate: gen2BigTop },
  { key: "2-big-left", photoCount: 2, generate: gen2BigLeft },
  { key: "2-big-bottom", photoCount: 2, generate: gen2BigBottom },
  { key: "2-big-right", photoCount: 2, generate: gen2BigRight },
  // 3 photos
  { key: "3-top1-bot2", photoCount: 3, generate: gen3Top1Bot2 },
  { key: "3-left1-right2", photoCount: 3, generate: gen3Left1Right2 },
  { key: "3-bot1-top2", photoCount: 3, generate: gen3Bot1Top2 },
  { key: "3-right1-left2", photoCount: 3, generate: gen3Right1Left2 },
  { key: "3-dominant-top", photoCount: 3, generate: gen3DominantTop },
  { key: "3-dominant-bottom", photoCount: 3, generate: gen3DominantBottom },
  { key: "3-dominant-left", photoCount: 3, generate: gen3DominantLeft },
  { key: "3-dominant-right", photoCount: 3, generate: gen3DominantRight },
  { key: "3-equal-rows", photoCount: 3, generate: gen3EqualRows },
  { key: "3-equal-cols", photoCount: 3, generate: gen3EqualCols },
  // 4 photos
  { key: "4-grid", photoCount: 4, generate: gen4Grid },
  { key: "4-top1-bot3", photoCount: 4, generate: gen4Top1Bot3 },
  { key: "4-bot1-top3", photoCount: 4, generate: gen4Bot1Top3 },
  { key: "4-left1-right3", photoCount: 4, generate: gen4Left1Right3 },
  { key: "4-right1-left3", photoCount: 4, generate: gen4Right1Left3 },
  { key: "4-wide-left", photoCount: 4, generate: gen4WideLeft },
  { key: "4-wide-right", photoCount: 4, generate: gen4WideRight },
  { key: "4-tall-top", photoCount: 4, generate: gen4TallTop },
  { key: "4-tall-bottom", photoCount: 4, generate: gen4TallBottom },
  { key: "4-equal-cols", photoCount: 4, generate: gen4EqualCols },
];

const VARIANT_MAP = new Map(ALL_VARIANTS.map((v) => [v.key, v]));

/** Mirror pairs: each key maps to its mirrored variant */
const MIRROR_MAP = new Map<string, string>([
  ["2-big-top", "2-big-bottom"],
  ["2-big-bottom", "2-big-top"],
  ["2-big-left", "2-big-right"],
  ["2-big-right", "2-big-left"],
  ["3-top1-bot2", "3-bot1-top2"],
  ["3-bot1-top2", "3-top1-bot2"],
  ["3-left1-right2", "3-right1-left2"],
  ["3-right1-left2", "3-left1-right2"],
  ["3-dominant-top", "3-dominant-bottom"],
  ["3-dominant-bottom", "3-dominant-top"],
  ["3-dominant-left", "3-dominant-right"],
  ["3-dominant-right", "3-dominant-left"],
  ["4-top1-bot3", "4-bot1-top3"],
  ["4-bot1-top3", "4-top1-bot3"],
  ["4-left1-right3", "4-right1-left3"],
  ["4-right1-left3", "4-left1-right3"],
  ["4-wide-left", "4-wide-right"],
  ["4-wide-right", "4-wide-left"],
  ["4-tall-top", "4-tall-bottom"],
  ["4-tall-bottom", "4-tall-top"],
]);

/** Variants hidden from the picker (mirrors of a primary variant) */
const HIDDEN_MIRRORS = new Set([
  "2-big-bottom",
  "2-big-right",
  "3-bot1-top2",
  "3-right1-left2",
  "3-dominant-bottom",
  "3-dominant-right",
  "4-bot1-top3",
  "4-right1-left3",
  "4-wide-right",
  "4-tall-bottom",
]);

/** Get the mirror variant key, if one exists */
export function getMirrorVariant(key: string): string | undefined {
  return MIRROR_MAP.get(key);
}

/** Get all available layout variants for a given photo count (excluding hidden mirrors) */
export function getVariantsForCount(count: number): LayoutVariant[] {
  return ALL_VARIANTS.filter((v) => v.photoCount === count && !HIDDEN_MIRRORS.has(v.key));
}

/** Get the slot positions for a variant (for thumbnail previews) */
export function getVariantPreview(key: string): SlotPosition[] {
  const variant = VARIANT_MAP.get(key);
  if (!variant) return [];
  const dummyIds = Array.from({ length: variant.photoCount }, (_, i) => `d${i}`);
  return variant.generate(dummyIds).map((s) => ({
    x: s.x,
    y: s.y,
    width: s.width,
    height: s.height,
  }));
}

/** Apply a specific layout variant to a set of photo IDs */
export function applyVariant(key: string, photoIds: string[]): PhotoSlot[] {
  const variant = VARIANT_MAP.get(key);
  if (!variant) return [];
  return variant.generate(photoIds);
}

// ── Legacy layout selection (orientation-based auto-pick) ─────────

function layout1(photos: Photo[]): PhotoSlot[] {
  return gen1Moderate([photos[0].id]);
}

function layout2Stacked(photos: Photo[]): PhotoSlot[] {
  return gen2Stacked(photos.map((p) => p.id));
}

function layout2SideBySide(photos: Photo[]): PhotoSlot[] {
  return gen2SideBySide(photos.map((p) => p.id));
}

function layout3TopOneBottomTwo(photos: Photo[]): PhotoSlot[] {
  return gen3Top1Bot2(photos.map((p) => p.id));
}

function layout3LeftOneTwoRight(photos: Photo[]): PhotoSlot[] {
  return gen3Left1Right2(photos.map((p) => p.id));
}

function layout4Grid(photos: Photo[]): PhotoSlot[] {
  return gen4Grid(photos.map((p) => p.id));
}

function layout4TopOneBotThree(photos: Photo[]): PhotoSlot[] {
  return gen4Top1Bot3(photos.map((p) => p.id));
}

export function chooseBestLayout(photos: Photo[]): PhotoSlot[] {
  const count = photos.length;
  if (count === 0) return [];
  if (count === 1) return layout1(photos);

  if (count === 2) {
    const o0 = getOrientation(photos[0]);
    const o1 = getOrientation(photos[1]);
    if (o0 === "portrait" && o1 === "portrait") {
      return layout2SideBySide(photos);
    }
    if (o0 === "landscape" && o1 === "landscape") {
      return layout2Stacked(photos);
    }
    return layout2SideBySide(photos);
  }

  if (count === 3) {
    const o0 = getOrientation(photos[0]);
    if (o0 === "landscape") {
      return layout3TopOneBottomTwo(photos);
    }
    return layout3LeftOneTwoRight(photos);
  }

  const landscapes = photos.filter((p) => getOrientation(p) === "landscape");
  if (landscapes.length >= 1) {
    return layout4TopOneBotThree(photos);
  }
  return layout4Grid(photos);
}

export function generateAutoLayout(photos: Photo[]): BookPage[] {
  // Sort by dateTaken
  const sorted = [...photos].sort((a, b) => a.dateTaken - b.dateTaken);

  const pages: BookPage[] = [];
  let idx = 0;

  // First page (cover) - single photo
  if (sorted.length > 0) {
    pages.push({
      id: uuid(),
      slots: layout1([sorted[0]]),
      textBlocks: [],
      topCaption: "",
      bottomCaption: "",
    });
    idx = 1;
  }

  // Distribute remaining photos with variety
  const layoutCycle = [2, 3, 1, 4, 2, 3, 1, 2];
  let cycleIdx = 0;

  while (idx < sorted.length) {
    const remaining = sorted.length - idx;
    let count = Math.min(layoutCycle[cycleIdx % layoutCycle.length], remaining);

    // Don't leave 1 photo for a last page if we can avoid it
    if (remaining - count === 1 && count < 4) {
      count = Math.min(count + 1, remaining, 4);
    }

    const pagePhotos = sorted.slice(idx, idx + count);
    const slots = chooseBestLayout(pagePhotos);

    pages.push({
      id: uuid(),
      slots,
      textBlocks: [],
      topCaption: "",
      bottomCaption: "",
    });

    idx += count;
    cycleIdx++;
  }

  // Ensure even number of pages (for spreads) - add blank last page if needed
  if (pages.length % 2 !== 0) {
    pages.push({
      id: uuid(),
      slots: [],
      textBlocks: [],
      topCaption: "",
      bottomCaption: "",
    });
  }

  return pages;
}
