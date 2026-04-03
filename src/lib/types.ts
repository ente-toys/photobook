export interface Photo {
  id: string;
  fileName: string;
  width: number;
  height: number;
  dateTaken: number; // timestamp
  thumbnailUrl?: string; // runtime only, object URL
  fullUrl?: string; // runtime only, object URL
}

export type TextStyle = "title" | "body";
export type TextAlignment = "left" | "center" | "right";

export interface TextBlock {
  id: string;
  text: string;
  x: number; // percentage 0-100
  y: number;
  width: number;
  height: number;
  style: TextStyle;
  alignment: TextAlignment;
}

export interface PhotoSlot {
  id: string;
  photoId: string | null;
  x: number; // percentage 0-100
  y: number;
  width: number;
  height: number;
  cropX: number; // pan offset within frame (0-1)
  cropY: number;
  cropZoom: number; // 1 = fit, >1 = zoomed in
}

export interface BookPage {
  id: string;
  slots: PhotoSlot[];
  textBlocks: TextBlock[];
  topCaption: string;
  bottomCaption: string;
  layoutVariant?: string;
}

export interface BookState {
  pages: BookPage[];
  currentSpreadIndex: number; // index of left page (always even)
}

export type AppView = "start" | "edit" | "results";

// A5 dimensions in mm
export const A5_WIDTH_MM = 148;
export const A5_HEIGHT_MM = 210;
// A5 aspect ratio
export const A5_ASPECT = A5_WIDTH_MM / A5_HEIGHT_MM; // ~0.705
