"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Stage, Layer, Rect, Image as KonvaImage, Text, Group, Transformer } from "react-konva";
import Konva from "konva";
import type { BookPage, PhotoSlot, TextBlock } from "@/lib/types";
import { A5_ASPECT } from "@/lib/types";
import { useBook } from "@/context/BookContext";

export type CaptionPosition = "top" | "bottom";

interface PageCanvasProps {
  page: BookPage;
  pageWidth: number;
  pageHeight: number;
  isInteractive?: boolean;
  isBackCover?: boolean;
  onSlotClick?: (slotId: string) => void;
  selectedSlotId?: string | null;
  selectedTextId?: string | null;
  onTextClick?: (textId: string) => void;
  onTextDblClick?: (textId: string) => void;
  editingTextId?: string | null;
  editingCaption?: CaptionPosition | null;
  dragOverSlotId?: string | null;
  dragSourceSlotId?: string | null;
  useFullRes?: boolean;
  onDropPhoto?: (photoId: string, slotId: string) => void;
}

function PhotoSlotRenderer({
  slot,
  pageWidth,
  pageHeight,
  photoUrl,
  isSelected,
  isDragOver,
  isDragSource,
  onClick,
  isInteractive,
  pageId,
}: {
  slot: PhotoSlot;
  pageWidth: number;
  pageHeight: number;
  photoUrl?: string;
  isSelected: boolean;
  isDragOver: boolean;
  isDragSource: boolean;
  onClick: () => void;
  isInteractive: boolean;
  pageId: string;
}) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const { updateSlot } = useBook();

  const sx = (slot.x / 100) * pageWidth;
  const sy = (slot.y / 100) * pageHeight;
  const sw = (slot.width / 100) * pageWidth;
  const sh = (slot.height / 100) * pageHeight;

  useEffect(() => {
    if (!photoUrl) {
      setImage(null);
      return;
    }
    const img = new window.Image();
    img.src = photoUrl;
    img.onload = () => setImage(img);
  }, [photoUrl]);

  const clipFunc = (ctx: Konva.Context) => {
    ctx.rect(sx, sy, sw, sh);
  };

  // Calculate image draw position
  const drawProps = useMemo(() => {
    if (!image) return null;
    const imgAspect = image.naturalWidth / image.naturalHeight;
    const slotAspect = sw / sh;

    let drawW: number, drawH: number;
    if (imgAspect > slotAspect) {
      drawH = sh * slot.cropZoom;
      drawW = drawH * imgAspect;
    } else {
      drawW = sw * slot.cropZoom;
      drawH = drawW / imgAspect;
    }

    const drawX = sx + (sw - drawW) * slot.cropX;
    const drawY = sy + (sh - drawH) * slot.cropY;

    return { x: drawX, y: drawY, width: drawW, height: drawH };
  }, [image, sx, sy, sw, sh, slot.cropX, slot.cropY, slot.cropZoom]);

  return (
    <Group clipFunc={clipFunc}>
      {/* Slot background */}
      <Rect
        x={sx}
        y={sy}
        width={sw}
        height={sh}
        fill="#EEEEF0"
        onClick={onClick}
        onTap={onClick}
      />
      {/* Photo */}
      {image && drawProps && (
        <KonvaImage
          image={image}
          x={drawProps.x}
          y={drawProps.y}
          width={drawProps.width}
          height={drawProps.height}
          onClick={onClick}
          onTap={onClick}
          draggable={isInteractive && isSelected}
          onDragEnd={(e) => {
            if (!isInteractive) return;
            // Update crop position based on drag
            const newX = (e.target.x() - sx) / (sw - drawProps.width) || 0.5;
            const newY = (e.target.y() - sy) / (sh - drawProps.height) || 0.5;
            updateSlot(pageId, slot.id, {
              cropX: Math.max(0, Math.min(1, newX)),
              cropY: Math.max(0, Math.min(1, newY)),
            });
            // Reset position since we store in state
            e.target.position({ x: drawProps.x, y: drawProps.y });
          }}
        />
      )}
      {/* Drag source dimming */}
      {isDragSource && (
        <Rect
          x={sx}
          y={sy}
          width={sw}
          height={sh}
          fill="rgba(255, 255, 255, 0.5)"
          listening={false}
        />
      )}
      {/* Drag over indicator */}
      {isDragOver && !isDragSource && (
        <Rect
          x={sx}
          y={sy}
          width={sw}
          height={sh}
          stroke="#08C225"
          strokeWidth={2}
          dash={[6, 3]}
          fill="rgba(8, 194, 37, 0.1)"
          listening={false}
        />
      )}
      {/* Selection border */}
      {isSelected && !isDragSource && (
        <Rect
          x={sx}
          y={sy}
          width={sw}
          height={sh}
          stroke="#08C225"
          strokeWidth={2}
          listening={false}
        />
      )}
      {/* Empty slot indicator */}
      {!image && !slot.photoId && (
        <Text
          x={sx}
          y={sy + sh / 2 - 8}
          width={sw}
          text={isDragOver ? "Drop here" : "Empty slot"}
          fontSize={12}
          fill={isDragOver ? "#08C225" : "#999"}
          fontStyle={isDragOver ? "bold" : "normal"}
          align="center"
        />
      )}
    </Group>
  );
}

function TextBlockRenderer({
  block,
  pageWidth,
  pageHeight,
  isSelected,
  isEditing,
}: {
  block: TextBlock;
  pageWidth: number;
  pageHeight: number;
  isSelected: boolean;
  isEditing: boolean;
}) {
  const textRef = useRef<any>(null);
  const bx = (block.x / 100) * pageWidth;
  const by = (block.y / 100) * pageHeight;
  const bw = (block.width / 100) * pageWidth;

  const fontSize = pageHeight * ((block.fontSize ?? 2.5) / 100);
  const color = block.color ?? "#1a1c1d";
  const rotation = block.rotation ?? 0;

  // Hide text while inline editing
  if (isEditing) return null;

  const displayText = block.text || (isSelected ? "" : "Type here");
  const displayColor = block.text ? color : "#bbb";

  return (
    <>
      <Text
        ref={textRef}
        x={bx}
        y={by}
        text={displayText}
        fontSize={fontSize}
        fontFamily="'Manrope', sans-serif"
        fontStyle={block.style === "title" ? "bold" : "normal"}
        fill={displayColor}
        rotation={rotation}
        listening={false}
      />
      {isSelected && (
        <Rect
          x={bx - 3}
          y={by - 3}
          width={(textRef.current?.width() ?? fontSize * 4) + 6}
          height={(textRef.current?.height() ?? fontSize) + 6}
          stroke="#08C225"
          strokeWidth={1.5}
          rotation={rotation}
          listening={false}
        />
      )}
    </>
  );
}

function EnteBranding({
  pageWidth,
  pageHeight,
}: {
  pageWidth: number;
  pageHeight: number;
}) {
  const [logo, setLogo] = useState<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const img = new window.Image();
    img.src = "/ente-icon.png";
    img.onload = () => {
      // Pre-scale to target size in an offscreen canvas to avoid
      // aliasing from extreme downscaling (1024px → ~60px).
      const targetH = Math.round(pageHeight * 0.12 * (window.devicePixelRatio || 1));
      const targetW = Math.round((img.naturalWidth / img.naturalHeight) * targetH);
      const offscreen = document.createElement("canvas");
      offscreen.width = targetW;
      offscreen.height = targetH;
      const ctx = offscreen.getContext("2d")!;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, targetW, targetH);
      setLogo(offscreen);
    };
  }, [pageHeight]);

  const logoHeight = pageHeight * 0.12;
  const byFontSize = pageHeight * 0.018;
  const logoWidth = logo
    ? (logo.width / logo.height) * logoHeight
    : logoHeight * 2;
  const gap = byFontSize * 0.6;
  const totalWidth = byFontSize * 1.2 + gap + logoWidth;
  const startX = (pageWidth - totalWidth) / 2;
  const stripHeight = logoHeight + pageHeight * 0.03;
  const stripY = pageHeight - stripHeight;
  const yCenter = stripY + stripHeight / 2;

  return (
    <>
      {/* White background strip so branding is readable over photos */}
      <Rect
        x={0}
        y={stripY}
        width={pageWidth}
        height={stripHeight}
        fill="#ffffff"
        listening={false}
      />
      <Text
        x={startX}
        y={yCenter - byFontSize / 2}
        text="By"
        fontSize={byFontSize}
        fontFamily="'Manrope', sans-serif"
        fill="#999"
      />
      {logo && (
        <KonvaImage
          image={logo as unknown as HTMLImageElement}
          x={startX + byFontSize * 1.2 + gap}
          y={yCenter - logoHeight / 2}
          width={logoWidth}
          height={logoHeight}
          listening={false}
        />
      )}
    </>
  );
}

function CaptionText({
  text,
  y,
  pageWidth,
  pageHeight,
  fontSize,
  isEditing,
  anchor = "top",
}: {
  text: string;
  y: number;
  pageWidth: number;
  pageHeight: number;
  fontSize: number;
  isEditing?: boolean;
  anchor?: "top" | "bottom";
}) {
  const textRef = React.useRef<any>(null);
  const [adjustedY, setAdjustedY] = React.useState(y);

  React.useEffect(() => {
    if (anchor === "bottom" && textRef.current) {
      const textHeight = textRef.current.height();
      setAdjustedY(y - textHeight);
    } else {
      setAdjustedY(y);
    }
  }, [text, y, anchor, fontSize, pageWidth]);

  // Hide rendered text while editing (HTML overlay replaces it)
  if (isEditing) return null;
  if (!text) return null;
  return (
    <Text
      ref={textRef}
      x={0}
      y={adjustedY}
      width={pageWidth}
      text={text}
      fontSize={fontSize}
      fontFamily="'Manrope', sans-serif"
      fill="#1a1c1d"
      align="center"
    />
  );
}

export default function PageCanvas({
  page,
  pageWidth,
  pageHeight,
  isInteractive = false,
  isBackCover = false,
  selectedSlotId,
  selectedTextId,
  dragOverSlotId,
  dragSourceSlotId,
  useFullRes = false,
  onSlotClick,
  onTextClick,
  onTextDblClick,
  editingTextId,
  editingCaption,
  onDropPhoto,
}: PageCanvasProps) {
  const { thumbnailUrls, photoUrls } = useBook();
  const urls = isInteractive || useFullRes ? photoUrls : thumbnailUrls;

  const captionFontSize = pageHeight * 0.025;

  return (
    <>
      {/* White page background */}
      <Rect x={0} y={0} width={pageWidth} height={pageHeight} fill="#ffffff" />

      {/* Photo slots */}
      {page.slots.map((slot) => (
        <PhotoSlotRenderer
          key={slot.id}
          slot={slot}
          pageWidth={pageWidth}
          pageHeight={pageHeight}
          photoUrl={slot.photoId ? urls.get(slot.photoId) : undefined}
          isSelected={selectedSlotId === slot.id}
          isDragOver={dragOverSlotId === slot.id}
          isDragSource={dragSourceSlotId === slot.id}
          onClick={() => onSlotClick?.(slot.id)}
          isInteractive={isInteractive}
          pageId={page.id}
        />
      ))}

      {/* Captions */}
      <CaptionText
        text={page.topCaption}
        y={pageHeight * 0.02}
        pageWidth={pageWidth}
        pageHeight={pageHeight}
        fontSize={captionFontSize}
        isEditing={editingCaption === "top"}
      />
      {isBackCover ? (
        <EnteBranding pageWidth={pageWidth} pageHeight={pageHeight} />
      ) : (
        <CaptionText
          text={page.bottomCaption}
          y={pageHeight * 0.98}
          pageWidth={pageWidth}
          pageHeight={pageHeight}
          fontSize={captionFontSize}
          isEditing={editingCaption === "bottom"}
          anchor="bottom"
        />
      )}

      {/* Text blocks */}
      {page.textBlocks.map((block) => (
        <TextBlockRenderer
          key={block.id}
          block={block}
          pageWidth={pageWidth}
          pageHeight={pageHeight}
          isSelected={selectedTextId === block.id}
          isEditing={editingTextId === block.id}
        />
      ))}

      {/* Page number */}
      <Text
        x={pageWidth - 30}
        y={pageHeight - 18}
        text=""
        fontSize={8}
        fill="#ccc"
        fontFamily="'Manrope', sans-serif"
      />
    </>
  );
}
