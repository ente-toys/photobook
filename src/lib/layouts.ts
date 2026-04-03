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

// Content area boundaries (percentage of page)
const LEFT = MARGIN;
const TOP = MARGIN;
const RIGHT = 100 - MARGIN;
const BOTTOM = 100 - MARGIN;
const CW = RIGHT - LEFT; // content width
const CH = BOTTOM - TOP; // content height

/**
 * Layout generators for different photo counts.
 * Each returns an array of slot definitions (x, y, w, h as percentages).
 */

function layout1(photos: Photo[]): PhotoSlot[] {
  return [makeSlot(photos[0].id, LEFT, TOP, CW, CH)];
}

function layout2Stacked(photos: Photo[]): PhotoSlot[] {
  const halfH = (CH - V_GAP) / 2;
  return [
    makeSlot(photos[0].id, LEFT, TOP, CW, halfH),
    makeSlot(photos[1].id, LEFT, TOP + halfH + V_GAP, CW, halfH),
  ];
}

function layout2SideBySide(photos: Photo[]): PhotoSlot[] {
  const halfW = (CW - H_GAP) / 2;
  return [
    makeSlot(photos[0].id, LEFT, TOP, halfW, CH),
    makeSlot(photos[1].id, LEFT + halfW + H_GAP, TOP, halfW, CH),
  ];
}

function layout3TopOneBottomTwo(photos: Photo[]): PhotoSlot[] {
  const topH = CH * 0.55;
  const botH = CH - topH - V_GAP;
  const halfW = (CW - H_GAP) / 2;
  return [
    makeSlot(photos[0].id, LEFT, TOP, CW, topH),
    makeSlot(photos[1].id, LEFT, TOP + topH + V_GAP, halfW, botH),
    makeSlot(photos[2].id, LEFT + halfW + H_GAP, TOP + topH + V_GAP, halfW, botH),
  ];
}

function layout3LeftOneTwoRight(photos: Photo[]): PhotoSlot[] {
  const leftW = CW * 0.55;
  const rightW = CW - leftW - H_GAP;
  const halfH = (CH - V_GAP) / 2;
  return [
    makeSlot(photos[0].id, LEFT, TOP, leftW, CH),
    makeSlot(photos[1].id, LEFT + leftW + H_GAP, TOP, rightW, halfH),
    makeSlot(
      photos[2].id,
      LEFT + leftW + H_GAP,
      TOP + halfH + V_GAP,
      rightW,
      halfH
    ),
  ];
}

function layout4Grid(photos: Photo[]): PhotoSlot[] {
  const halfW = (CW - H_GAP) / 2;
  const halfH = (CH - V_GAP) / 2;
  return [
    makeSlot(photos[0].id, LEFT, TOP, halfW, halfH),
    makeSlot(photos[1].id, LEFT + halfW + H_GAP, TOP, halfW, halfH),
    makeSlot(photos[2].id, LEFT, TOP + halfH + V_GAP, halfW, halfH),
    makeSlot(photos[3].id, LEFT + halfW + H_GAP, TOP + halfH + V_GAP, halfW, halfH),
  ];
}

function layout4TopOneBotThree(photos: Photo[]): PhotoSlot[] {
  const topH = CH * 0.5;
  const botH = CH - topH - V_GAP;
  const thirdW = (CW - H_GAP * 2) / 3;
  return [
    makeSlot(photos[0].id, LEFT, TOP, CW, topH),
    makeSlot(photos[1].id, LEFT, TOP + topH + V_GAP, thirdW, botH),
    makeSlot(photos[2].id, LEFT + thirdW + H_GAP, TOP + topH + V_GAP, thirdW, botH),
    makeSlot(
      photos[3].id,
      LEFT + thirdW * 2 + H_GAP * 2,
      TOP + topH + V_GAP,
      thirdW,
      botH
    ),
  ];
}

function chooseBestLayout(photos: Photo[]): PhotoSlot[] {
  const count = photos.length;
  if (count === 0) return [];
  if (count === 1) return layout1(photos);

  if (count === 2) {
    const o0 = getOrientation(photos[0]);
    const o1 = getOrientation(photos[1]);
    // Two portraits side by side, two landscapes stacked
    if (o0 === "portrait" && o1 === "portrait") {
      return layout2SideBySide(photos);
    }
    if (o0 === "landscape" && o1 === "landscape") {
      return layout2Stacked(photos);
    }
    // Mixed: side by side
    return layout2SideBySide(photos);
  }

  if (count === 3) {
    const o0 = getOrientation(photos[0]);
    if (o0 === "landscape") {
      return layout3TopOneBottomTwo(photos);
    }
    return layout3LeftOneTwoRight(photos);
  }

  // count === 4
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
