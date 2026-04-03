"use client";

import React, { useState, useRef, useEffect } from "react";
import { Box, IconButton, Typography } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { Stage, Layer } from "react-konva";
import { useBook } from "@/context/BookContext";
import PageCanvas from "./PageCanvas";
import LayoutPicker from "./LayoutPicker";
import type { BookPage } from "@/lib/types";
import type { CaptionPosition } from "./PageCanvas";
import type { DragInfo } from "@/hooks/usePhotoDrag";

export const PICKER_WIDTH = 60;

interface SpreadPageProps {
  page: BookPage;
  pageIndex: number;
  pickerSide: "left" | "right";
  pageWidth: number;
  pageHeight: number;
  totalPages: number;
  // Selection
  selectedSlotId: string | null;
  selectedPageId: string | null;
  selectedTextId: string | null;
  onSlotClick: (pageId: string, slotId: string) => void;
  onTextClick: (pageId: string, textId: string) => void;
  onTextDblClick: (pageId: string, textId: string) => void;
  onStageClick: (e: any) => void;
  // Hover
  isHovered: boolean;
  onHoverChange: (pageId: string | null) => void;
  // Photo drag
  dragSourceInfo: DragInfo | null;
  dragOverInfo: DragInfo | null;
  onPhotoDragStart: (
    e: React.DragEvent,
    pageId: string,
    slotId: string,
    photoId: string
  ) => void;
  onSlotDragOver: (
    e: React.DragEvent,
    pageId: string,
    slotId: string
  ) => void;
  onPhotoDrop: (
    e: React.DragEvent,
    pageId: string,
    slotId: string
  ) => void;
  onPhotoDragEnd: () => void;
  onPageDragOver: (e: React.DragEvent, pageId: string) => void;
  onPageDrop: (e: React.DragEvent, pageId: string) => void;
  // Page drag
  pageDragSource: number | null;
  pageDragTarget: number | null;
  pageDragSourceRef: React.MutableRefObject<number | null>;
  onPageDragStart: (e: React.DragEvent, pageIndex: number) => void;
  onPageDragOverPage: (e: React.DragEvent, pageIndex: number) => void;
  onPageDropOnPage: (e: React.DragEvent, pageIndex: number) => void;
  onPageDragEndCleanup: () => void;
}

export default function SpreadPage({
  page,
  pageIndex,
  pickerSide,
  pageWidth,
  pageHeight,
  totalPages,
  selectedSlotId,
  selectedPageId,
  selectedTextId,
  onSlotClick,
  onTextClick,
  onTextDblClick,
  onStageClick,
  isHovered,
  onHoverChange,
  dragSourceInfo,
  dragOverInfo,
  onPhotoDragStart,
  onSlotDragOver,
  onPhotoDrop,
  onPhotoDragEnd,
  onPageDragOver,
  onPageDrop,
  pageDragSource,
  pageDragTarget,
  pageDragSourceRef,
  onPageDragStart,
  onPageDragOverPage,
  onPageDropOnPage,
  onPageDragEndCleanup,
}: SpreadPageProps) {
  const { thumbnailUrls, removePage, setPageLayout, updatePage } = useBook();

  // Caption editing
  const [editingCaption, setEditingCaption] = useState<CaptionPosition | null>(null);
  const [captionValue, setCaptionValue] = useState("");
  const [topCaptionHovered, setTopCaptionHovered] = useState(false);
  const [bottomCaptionHovered, setBottomCaptionHovered] = useState(false);
  const captionInputRef = useRef<HTMLInputElement>(null);

  const hasTopSpace =
    page.slots.length === 0 || page.slots.every((s) => s.y > 0);
  const hasBottomSpace =
    page.slots.length === 0 || page.slots.every((s) => s.y + s.height < 100);

  const captionFontSize = Math.round(pageHeight * 0.025);
  const captionZoneHeight = pageHeight * 0.055;

  const handleCaptionClick = (position: CaptionPosition) => {
    const val = position === "top" ? page.topCaption : page.bottomCaption;
    setCaptionValue(val);
    setEditingCaption(position);
  };

  const handleCaptionSave = () => {
    if (editingCaption) {
      const key = editingCaption === "top" ? "topCaption" : "bottomCaption";
      updatePage(page.id, { [key]: captionValue });
      setEditingCaption(null);
    }
  };

  const handleCaptionCancel = () => {
    setEditingCaption(null);
  };

  useEffect(() => {
    if (editingCaption && captionInputRef.current) {
      captionInputRef.current.focus();
      captionInputRef.current.select();
    }
  }, [editingCaption]);

  const isInterior = pageIndex > 0 && pageIndex < totalPages - 1;
  const isDragTarget = pageDragTarget === pageIndex && pageDragSource !== null;
  const isDragSource = pageDragSource === pageIndex;
  const photoCount = page.slots.filter((s) => s.photoId !== null).length;
  const hasSelectedSlotOnPage =
    selectedPageId === page.id && selectedSlotId !== null;

  const pageBlock = (
    <Box>
      <Box
        sx={{
          position: "relative",
          boxShadow: isDragTarget
            ? "0 0 0 3px #08C225, 0px 12px 32px rgba(0, 0, 0, 0.3)"
            : "0px 12px 32px rgba(0, 0, 0, 0.3)",
          borderRadius: 0.5,
          overflow: "hidden",
          opacity: isDragSource ? 0.4 : 1,
          transition: "box-shadow 0.15s, opacity 0.15s",
        }}
      >
        <Stage
          width={pageWidth}
          height={pageHeight}
          onClick={onStageClick}
        >
          <Layer>
            <PageCanvas
              page={page}
              pageWidth={pageWidth}
              pageHeight={pageHeight}
              isInteractive
              selectedSlotId={
                selectedPageId === page.id ? selectedSlotId : null
              }
              selectedTextId={
                selectedPageId === page.id ? selectedTextId : null
              }
              editingCaption={editingCaption}
              dragOverSlotId={
                dragOverInfo?.pageId === page.id ? dragOverInfo.slotId : null
              }
              dragSourceSlotId={
                dragSourceInfo?.pageId === page.id
                  ? dragSourceInfo.slotId
                  : null
              }
              onSlotClick={(slotId) => onSlotClick(page.id, slotId)}
              onTextClick={(textId) => onTextClick(page.id, textId)}
              onTextDblClick={(textId) => onTextDblClick(page.id, textId)}
            />
          </Layer>
        </Stage>
        {/* Page-level drop zone / page drag handle */}
        <div
          draggable={isInterior}
          onDragStart={(e) => {
            if (!isInterior) {
              e.preventDefault();
              return;
            }
            onPageDragStart(e, pageIndex);
          }}
          onDragOver={(e) => {
            if (pageDragSourceRef.current !== null) {
              onPageDragOverPage(e, pageIndex);
            } else {
              onPageDragOver(e, page.id);
            }
          }}
          onDrop={(e) => {
            if (pageDragSourceRef.current !== null) {
              onPageDropOnPage(e, pageIndex);
            } else {
              onPageDrop(e, page.id);
            }
          }}
          onDragEnd={() => {
            onPageDragEndCleanup();
            onPhotoDragEnd();
          }}
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 1,
            cursor: isInterior ? "grab" : "default",
            pointerEvents:
              hasSelectedSlotOnPage && pageDragSource === null
                ? "none"
                : "auto",
          }}
        />
        {/* Drag-and-drop overlay divs for photo slots */}
        {page.slots.map((slot) => {
          const isSelected =
            selectedPageId === page.id && selectedSlotId === slot.id;
          return (
            <div
              key={slot.id}
              draggable={!!slot.photoId && !isSelected}
              onDragStart={(e) => {
                if (slot.photoId) {
                  e.stopPropagation();
                  onPhotoDragStart(e, page.id, slot.id, slot.photoId);
                } else {
                  e.preventDefault();
                }
              }}
              onDragOver={(e) => onSlotDragOver(e, page.id, slot.id)}
              onDrop={(e) => onPhotoDrop(e, page.id, slot.id)}
              onDragEnd={onPhotoDragEnd}
              onClick={() => onSlotClick(page.id, slot.id)}
              style={{
                position: "absolute",
                left: (slot.x / 100) * pageWidth,
                top: (slot.y / 100) * pageHeight,
                width: (slot.width / 100) * pageWidth,
                height: (slot.height / 100) * pageHeight,
                cursor: slot.photoId
                  ? isSelected
                    ? "default"
                    : "grab"
                  : "default",
                pointerEvents:
                  (isSelected && !dragSourceInfo) || pageDragSource !== null
                    ? "none"
                    : "auto",
                zIndex: 2,
              }}
            />
          );
        })}
        {/* Caption zones */}
        {hasTopSpace && (
          editingCaption === "top" ? (
            <input
              ref={captionInputRef}
              value={captionValue}
              onChange={(e) => setCaptionValue(e.target.value)}
              onBlur={handleCaptionSave}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCaptionSave();
                if (e.key === "Escape") handleCaptionCancel();
              }}
              style={{
                position: "absolute",
                top: pageHeight * 0.01,
                left: pageWidth * 0.05,
                width: pageWidth * 0.9,
                height: captionFontSize * 1.6,
                zIndex: 5,
                border: "none",
                outline: "none",
                background: "white",
                fontFamily: "'Manrope', sans-serif",
                fontSize: captionFontSize,
                color: "#1a1c1d",
                textAlign: "center" as const,
                padding: 0,
                borderRadius: 2,
              }}
            />
          ) : (
            <div
              onClick={(e) => {
                e.stopPropagation();
                handleCaptionClick("top");
              }}
              onMouseEnter={() => setTopCaptionHovered(true)}
              onMouseLeave={() => setTopCaptionHovered(false)}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: pageWidth,
                height: captionZoneHeight,
                zIndex: 4,
                cursor: "text",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {!page.topCaption && topCaptionHovered && (
                <span
                  style={{
                    fontFamily: "'Manrope', sans-serif",
                    fontSize: captionFontSize,
                    color: "#aaa",
                    pointerEvents: "none",
                  }}
                >
                  Add caption...
                </span>
              )}
            </div>
          )
        )}
        {hasBottomSpace && (
          editingCaption === "bottom" ? (
            <input
              ref={captionInputRef}
              value={captionValue}
              onChange={(e) => setCaptionValue(e.target.value)}
              onBlur={handleCaptionSave}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCaptionSave();
                if (e.key === "Escape") handleCaptionCancel();
              }}
              style={{
                position: "absolute",
                bottom: pageHeight * 0.01,
                left: pageWidth * 0.05,
                width: pageWidth * 0.9,
                height: captionFontSize * 1.6,
                zIndex: 5,
                border: "none",
                outline: "none",
                background: "white",
                fontFamily: "'Manrope', sans-serif",
                fontSize: captionFontSize,
                color: "#1a1c1d",
                textAlign: "center" as const,
                padding: 0,
                borderRadius: 2,
              }}
            />
          ) : (
            <div
              onClick={(e) => {
                e.stopPropagation();
                handleCaptionClick("bottom");
              }}
              onMouseEnter={() => setBottomCaptionHovered(true)}
              onMouseLeave={() => setBottomCaptionHovered(false)}
              style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                width: pageWidth,
                height: captionZoneHeight,
                zIndex: 4,
                cursor: "text",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {!page.bottomCaption && bottomCaptionHovered && (
                <span
                  style={{
                    fontFamily: "'Manrope', sans-serif",
                    fontSize: captionFontSize,
                    color: "#aaa",
                    pointerEvents: "none",
                  }}
                >
                  Add caption...
                </span>
              )}
            </div>
          )
        )}
        {/* Delete button on hover */}
        {totalPages > 2 && isInterior && (
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              removePage(page.id);
              onHoverChange(null);
            }}
            sx={{
              position: "absolute",
              top: 6,
              ...(pageIndex % 2 === 1 ? { left: 6 } : { right: 6 }),
              zIndex: 10,
              bgcolor: "rgba(0,0,0,0.35)",
              color: "rgba(255,255,255,0.8)",
              width: 24,
              height: 24,
              opacity: isHovered ? 1 : 0,
              transition: "opacity 0.2s, background-color 0.2s",
              pointerEvents: isHovered ? "auto" : "none",
              "&:hover": { bgcolor: "rgba(0,0,0,0.6)", color: "white" },
            }}
          >
            <CloseIcon sx={{ fontSize: 14 }} />
          </IconButton>
        )}
      </Box>
      <Typography
        sx={{
          fontSize: "0.85rem",
          color: "#aaa",
          fontWeight: 600,
          textAlign: "center",
          mt: 0.5,
        }}
      >
        {pageIndex === 0
          ? "Cover"
          : pageIndex === totalPages - 1
            ? "Back Cover"
            : pageIndex}
      </Typography>
    </Box>
  );

  const slotThumbnails = page.slots
    .filter((s) => s.photoId !== null)
    .map((s) => thumbnailUrls.get(s.photoId!) ?? "");

  const pickerContainer = (
    <Box
      sx={{
        width: PICKER_WIDTH,
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: pickerSide === "left" ? "flex-end" : "flex-start",
        opacity: isHovered && photoCount > 0 ? 1 : 0,
        transition: "opacity 0.2s",
        pointerEvents: isHovered && photoCount > 0 ? "auto" : "none",
      }}
    >
      {photoCount > 0 && (
        <LayoutPicker
          photoCount={photoCount}
          currentVariant={page.layoutVariant}
          thumbnailUrls={slotThumbnails}
          onSelect={(key) => setPageLayout(page.id, key)}
          side={pickerSide}
        />
      )}
    </Box>
  );

  return (
    <Box
      onMouseEnter={() => onHoverChange(page.id)}
      onMouseLeave={() => onHoverChange(null)}
      sx={{
        display: "flex",
        flexDirection: "row",
        alignItems: "start",
      }}
    >
      {pickerSide === "left" && pickerContainer}
      {pageBlock}
      {pickerSide === "right" && pickerContainer}
    </Box>
  );
}
