export type BookFormatId = "square-210" | "a5-portrait";

export type ExportOptionId =
  | "page-pdf"
  | "spread-pdf"
  | "page-png"
  | "spread-png";

interface AxisPair {
  h: number;
  v: number;
}

export interface BookFormat {
  id: BookFormatId;
  label: string;
  shortLabel: string;
  dimensionsLabel: string;
  fileSlug: string;
  widthMm: number;
  heightMm: number;
  marginMm: AxisPair;
  gapMm: AxisPair;
  singlePaddedMarginMm: AxisPair;
  paddingStepsMm: {
    h: number[];
    v: number[];
  };
  defaultExportOption: ExportOptionId;
  exportOptions: ExportOptionId[];
}

export const DEFAULT_BOOK_FORMAT_ID: BookFormatId = "square-210";

const A5_WIDTH_MM = 148;
const A5_HEIGHT_MM = 210;

const a5MarginMm: AxisPair = {
  h: A5_WIDTH_MM * 0.1,
  v: A5_HEIGHT_MM * 0.08,
};

const a5GapMm: AxisPair = {
  h: A5_WIDTH_MM * 0.0064,
  v: A5_HEIGHT_MM * 0.0045,
};

const a5SinglePaddedMarginMm: AxisPair = {
  h: A5_WIDTH_MM * 0.14,
  v: A5_HEIGHT_MM * 0.14,
};

const a5PaddingStepsMm = {
  h: [0, 4, 8, 12].map((pct) => (A5_WIDTH_MM * pct) / 100),
  v: [0, 4, 8, 12].map((pct) => (A5_HEIGHT_MM * pct) / 100),
};

export const BOOK_FORMATS: Record<BookFormatId, BookFormat> = {
  "square-210": {
    id: "square-210",
    label: "Square",
    shortLabel: "Square",
    dimensionsLabel: "210 x 210 mm",
    fileSlug: "square-210",
    widthMm: 210,
    heightMm: 210,
    marginMm: a5MarginMm,
    gapMm: a5GapMm,
    singlePaddedMarginMm: a5SinglePaddedMarginMm,
    paddingStepsMm: a5PaddingStepsMm,
    defaultExportOption: "page-pdf",
    exportOptions: ["page-pdf", "page-png"],
  },
  "a5-portrait": {
    id: "a5-portrait",
    label: "A5 portrait",
    shortLabel: "A5",
    dimensionsLabel: "148 x 210 mm",
    fileSlug: "A5",
    widthMm: A5_WIDTH_MM,
    heightMm: A5_HEIGHT_MM,
    marginMm: a5MarginMm,
    gapMm: a5GapMm,
    singlePaddedMarginMm: a5SinglePaddedMarginMm,
    paddingStepsMm: a5PaddingStepsMm,
    defaultExportOption: "page-pdf",
    exportOptions: ["page-pdf", "spread-pdf", "page-png", "spread-png"],
  },
};

export const BOOK_FORMAT_CHOICES = [
  BOOK_FORMATS["square-210"],
  BOOK_FORMATS["a5-portrait"],
];

export function getBookFormat(formatId: BookFormatId): BookFormat {
  return BOOK_FORMATS[formatId];
}

export function getBookFormatAspect(format: BookFormat): number {
  return format.widthMm / format.heightMm;
}
