"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { Box, IconButton, Typography } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { Stage, Layer } from "react-konva";
import { useBook } from "@/context/BookContext";
import PageCanvas from "./PageCanvas";
import LayoutPicker from "./LayoutPicker";
import TextToolbar from "./TextToolbar";
import type { BookPage, TextBlock } from "@/lib/types";
import { getCaptionZones } from "@/lib/layouts";
import type { CaptionPosition } from "./PageCanvas";
import type { DragInfo } from "@/hooks/usePhotoDrag";

function SlotControls({
  pageId,
  slotId,
  slot,
  pageWidth,
  pageHeight,
  visible,
}: {
  pageId: string;
  slotId: string;
  slot: { x: number; y: number; width: number; height: number; cropZoom: number };
  pageWidth: number;
  pageHeight: number;
  visible: boolean;
}) {
  const { updateSlot, removeSlot } = useBook();

  const handleZoomIn = (e: React.MouseEvent) => {
    e.stopPropagation();
    updateSlot(pageId, slotId, {
      cropZoom: Math.min(slot.cropZoom + 0.2, 3),
    });
  };

  const handleZoomOut = (e: React.MouseEvent) => {
    e.stopPropagation();
    updateSlot(pageId, slotId, {
      cropZoom: Math.max(slot.cropZoom - 0.2, 1),
    });
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    removeSlot(pageId, slotId);
  };

  const btnSize = Math.max(22, Math.min(28, pageWidth * 0.06));
  const iconSize = btnSize * 0.58;
  const padding = Math.max(4, pageWidth * 0.012);

  return (
    <div
      style={{
        position: "absolute",
        left: (slot.x / 100) * pageWidth,
        top: (slot.y / 100) * pageHeight,
        width: (slot.width / 100) * pageWidth,
        height: (slot.height / 100) * pageHeight,
        zIndex: 3,
        pointerEvents: "none",
      }}
    >
      {/* Delete — top right */}
      <div
        onClick={handleDelete}
        style={{
          position: "absolute",
          top: padding,
          right: padding,
          width: btnSize,
          height: btnSize,
          borderRadius: btnSize / 2,
          background: "rgba(0,0,0,0.45)",
          backdropFilter: "blur(8px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          opacity: visible ? 1 : 0,
          transition: "opacity 0.15s ease",
          pointerEvents: visible ? "auto" : "none",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLDivElement).style.background = "rgba(186,26,26,0.7)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLDivElement).style.background = "rgba(0,0,0,0.45)";
        }}
      >
        <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none">
          <path
            d="M7 4V2h10v2h5v2h-2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6H2V4h5zm2 4v10h2V8H9zm4 0v10h2V8h-2z"
            fill="rgba(255,255,255,0.9)"
          />
        </svg>
      </div>

      {/* Zoom controls — bottom right */}
      <div
        style={{
          position: "absolute",
          bottom: padding,
          right: padding,
          display: "flex",
          gap: 2,
          borderRadius: btnSize / 2,
          background: "rgba(0,0,0,0.45)",
          backdropFilter: "blur(8px)",
          padding: 2,
          opacity: visible ? 1 : 0,
          transition: "opacity 0.15s ease",
          pointerEvents: visible ? "auto" : "none",
        }}
      >
        <div
          onClick={handleZoomOut}
          style={{
            width: btnSize,
            height: btnSize,
            borderRadius: btnSize / 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            transition: "background 0.15s",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.15)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLDivElement).style.background = "transparent";
          }}
        >
          <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none">
            <circle cx="11" cy="11" r="7" stroke="rgba(255,255,255,0.9)" strokeWidth="2" />
            <path d="M8 11h6" stroke="rgba(255,255,255,0.9)" strokeWidth="2" strokeLinecap="round" />
            <path d="M16.5 16.5L21 21" stroke="rgba(255,255,255,0.9)" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>
        <div
          onClick={handleZoomIn}
          style={{
            width: btnSize,
            height: btnSize,
            borderRadius: btnSize / 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            transition: "background 0.15s",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.15)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLDivElement).style.background = "transparent";
          }}
        >
          <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none">
            <circle cx="11" cy="11" r="7" stroke="rgba(255,255,255,0.9)" strokeWidth="2" />
            <path d="M11 8v6M8 11h6" stroke="rgba(255,255,255,0.9)" strokeWidth="2" strokeLinecap="round" />
            <path d="M16.5 16.5L21 21" stroke="rgba(255,255,255,0.9)" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>
      </div>
    </div>
  );
}

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
  editingTextId: string | null;
  onSlotClick: (pageId: string, slotId: string) => void;
  onTextClick: (pageId: string, textId: string) => void;
  onTextDblClick: (pageId: string, textId: string) => void;
  onTextUpdate: (pageId: string, blockId: string, updates: Partial<TextBlock>) => void;
  onTextDelete: (pageId: string, blockId: string) => void;
  onTextEditEnd: () => void;
  onStageClick: (e: any) => void;
  // Hover
  isHovered: boolean;
  onHoverChange: (pageId: string | null) => void;
  // Photo drag
  dragSourceInfo: DragInfo | null;
  dragOverInfo: DragInfo | null;
  dragOverPageId: string | null;
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
  editingTextId,
  onSlotClick,
  onTextClick,
  onTextDblClick,
  onTextUpdate,
  onTextDelete,
  onTextEditEnd,
  onStageClick,
  isHovered,
  onHoverChange,
  dragSourceInfo,
  dragOverInfo,
  dragOverPageId,
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
  const { thumbnailUrls, photoUrls, loadPreviews, removePage, setPageLayout, setPagePadding, updatePage, updateSlot, photos } = useBook();

  // Trigger lazy-loading of 1080px previews for this page's photos
  const pagePhotoIds = useMemo(
    () => page.slots.filter((s) => s.photoId).map((s) => s.photoId!),
    [page.slots]
  );
  useEffect(() => {
    if (pagePhotoIds.length > 0) loadPreviews(pagePhotoIds);
  }, [pagePhotoIds, loadPreviews]);

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

  const isBackCover = pageIndex === totalPages - 1;
  const isFrontCover = pageIndex === 0;

  // Front-cover captions act as a title — much larger than interior captions.
  const captionFontSize = Math.round(pageHeight * (isFrontCover ? 0.05 : 0.016));
  // Caption zones span the actual empty band between the page edge and the
  // nearest photo, so captions stay centered even when the user adds extra
  // vertical padding (or on the back cover with its larger inset).
  const captionZones = getCaptionZones(page);
  const topCaptionZoneHeight = pageHeight * (captionZones.topPct / 100);
  const bottomCaptionZoneHeight = pageHeight * (captionZones.bottomPct / 100);
  const captionInputHeight = captionFontSize * 1.6;
  const topCaptionInputOffset = Math.max(
    0,
    (topCaptionZoneHeight - captionInputHeight) / 2
  );
  const bottomCaptionInputOffset = Math.max(
    0,
    (bottomCaptionZoneHeight - captionInputHeight) / 2
  );

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
    handleCaptionSave();
  };

  useEffect(() => {
    if (editingCaption && captionInputRef.current) {
      captionInputRef.current.focus();
      captionInputRef.current.select();
    }
  }, [editingCaption]);

  const isInterior = pageIndex > 0 && !isBackCover;
  const isDragTarget = pageDragTarget === pageIndex && pageDragSource !== null;
  const isDragSource = pageDragSource === pageIndex;
  const photoCount = page.slots.filter((s) => s.photoId !== null).length;
  // The back cover sits above the Ente branding strip — its layout is
  // canonical, so hide the picker. The front cover defaults to full-bleed
  // but the user is free to pick a different single-photo layout.
  const hideLayoutPicker = isBackCover && photoCount === 1;
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
              photoUrls={photoUrls}
              isInteractive
              isBackCover={isBackCover}
              isFrontCover={isFrontCover}
              selectedSlotId={
                selectedPageId === page.id ? selectedSlotId : null
              }
              selectedTextId={
                selectedPageId === page.id ? selectedTextId : null
              }
              editingTextId={
                selectedPageId === page.id ? editingTextId : null
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
              hasSelectedSlotOnPage &&
              pageDragSource === null &&
              !dragSourceInfo
                ? "none"
                : "auto",
          }}
        />
        {/* Green overlay when page is a valid drop target for "add to page" */}
        {dragOverPageId === page.id && dragSourceInfo && dragSourceInfo.pageId !== page.id && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 3,
              background: "rgba(8, 194, 37, 0.1)",
              border: "2px dashed #08C225",
              borderRadius: 2,
              pointerEvents: "none",
            }}
          />
        )}
        {/* Drag-and-drop overlay divs for photo slots.
            - Unselected + has photo: draggable=true for HTML5 rearrange.
            - Selected + has photo:   onMouseDown drives crop panning via
              document-level mousemove/mouseup listeners. Done in HTML (not
              Konva) because canvas + stacked overlay divs caused unreliable
              event delivery in Chromium/Linux. */}
        {page.slots.map((slot) => {
          const isSelected =
            selectedPageId === page.id && selectedSlotId === slot.id;
          const canPanCrop = isSelected && !!slot.photoId && !dragSourceInfo;
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
              onMouseDown={
                canPanCrop
                  ? (e) => {
                      if (e.button !== 0) return;
                      const photo = photos.find((p) => p.id === slot.photoId);
                      if (!photo) return;
                      e.preventDefault();
                      e.stopPropagation();
                      const startX = e.clientX;
                      const startY = e.clientY;
                      const origCropX = slot.cropX;
                      const origCropY = slot.cropY;
                      const sw = (slot.width / 100) * pageWidth;
                      const sh = (slot.height / 100) * pageHeight;
                      const imgAspect = photo.width / photo.height;
                      const slotAspect = sw / sh;
                      let drawW: number, drawH: number;
                      if (imgAspect > slotAspect) {
                        drawH = sh * slot.cropZoom;
                        drawW = drawH * imgAspect;
                      } else {
                        drawW = sw * slot.cropZoom;
                        drawH = drawW / imgAspect;
                      }
                      // slack is <= 0 (image is larger than slot in the
                      // panned axis). If 0, no panning possible on that axis.
                      const slackX = sw - drawW;
                      const slackY = sh - drawH;
                      const onMove = (ev: MouseEvent) => {
                        const dx = ev.clientX - startX;
                        const dy = ev.clientY - startY;
                        const newCropX =
                          slackX !== 0
                            ? Math.max(
                                0,
                                Math.min(1, origCropX + dx / slackX)
                              )
                            : origCropX;
                        const newCropY =
                          slackY !== 0
                            ? Math.max(
                                0,
                                Math.min(1, origCropY + dy / slackY)
                              )
                            : origCropY;
                        if (
                          newCropX !== slot.cropX ||
                          newCropY !== slot.cropY
                        ) {
                          updateSlot(page.id, slot.id, {
                            cropX: newCropX,
                            cropY: newCropY,
                          });
                        }
                      };
                      const onUp = () => {
                        document.removeEventListener("mousemove", onMove);
                        document.removeEventListener("mouseup", onUp);
                      };
                      document.addEventListener("mousemove", onMove);
                      document.addEventListener("mouseup", onUp);
                    }
                  : undefined
              }
              style={{
                position: "absolute",
                left: (slot.x / 100) * pageWidth,
                top: (slot.y / 100) * pageHeight,
                width: (slot.width / 100) * pageWidth,
                height: (slot.height / 100) * pageHeight,
                cursor: slot.photoId
                  ? isSelected
                    ? "move"
                    : "grab"
                  : "default",
                pointerEvents:
                  pageDragSource !== null ? "none" : "auto",
                zIndex: 2,
              }}
            />
          );
        })}
        {/* Text block interaction overlays — higher z-index than slots so text gets click priority */}
        {page.textBlocks.map((block) => {
          const isTextEditing = selectedPageId === page.id && editingTextId === block.id;
          if (isTextEditing) return null;
          const isTextSelected = selectedPageId === page.id && selectedTextId === block.id;
          const bx = (block.x / 100) * pageWidth;
          const by = (block.y / 100) * pageHeight;
          const bw = (block.width / 100) * pageWidth;
          const fontSize = pageHeight * ((block.fontSize ?? 2.5) / 100);
          const rotation = block.rotation ?? 0;
          return (
            <div
              key={`text-overlay-${block.id}`}
              onClick={(e) => {
                e.stopPropagation();
                onTextClick(page.id, block.id);
              }}
              onDoubleClick={(e) => {
                e.stopPropagation();
                onTextDblClick(page.id, block.id);
              }}
              onMouseDown={isTextSelected ? (e) => {
                e.stopPropagation();
                e.preventDefault();
                const startX = e.clientX;
                const startY = e.clientY;
                const origX = block.x;
                const origY = block.y;
                const onMove = (ev: MouseEvent) => {
                  const dx = ((ev.clientX - startX) / pageWidth) * 100;
                  const dy = ((ev.clientY - startY) / pageHeight) * 100;
                  onTextUpdate(page.id, block.id, {
                    x: Math.max(-block.width + 5, Math.min(95, origX + dx)),
                    y: Math.max(-5, Math.min(95, origY + dy)),
                  });
                };
                const onUp = () => {
                  document.removeEventListener("mousemove", onMove);
                  document.removeEventListener("mouseup", onUp);
                };
                document.addEventListener("mousemove", onMove);
                document.addEventListener("mouseup", onUp);
              } : undefined}
              style={{
                position: "absolute",
                left: bx - 4,
                top: by - 4,
                width: bw + 8,
                height: fontSize * 1.6 + 8,
                zIndex: 6,
                cursor: isTextSelected ? "grab" : "pointer",
                transform: rotation ? `rotate(${rotation}deg)` : undefined,
                transformOrigin: "top left",
                pointerEvents: dragSourceInfo ? "none" : "auto",
              }}
            />
          );
        })}
        {/* Photo slot controls (zoom/delete) on selected slots */}
        {page.slots.map((slot) => {
          const isSelected =
            selectedPageId === page.id && selectedSlotId === slot.id;
          if (!isSelected || !slot.photoId) return null;
          return (
            <SlotControls
              key={`ctrl-${slot.id}`}
              pageId={page.id}
              slotId={slot.id}
              slot={slot}
              pageWidth={pageWidth}
              pageHeight={pageHeight}
              visible={isHovered}
            />
          );
        })}
        {/* Inline text editing overlay */}
        {selectedPageId === page.id && editingTextId && (() => {
          const block = page.textBlocks.find((t) => t.id === editingTextId);
          if (!block) return null;
          const bx = (block.x / 100) * pageWidth;
          const by = (block.y / 100) * pageHeight;
          const bw = (block.width / 100) * pageWidth;
          const fontSize = pageHeight * ((block.fontSize ?? 2.5) / 100);
          const color = block.color ?? "#555555";
          const rotation = block.rotation ?? 0;
          return (
            <input
              key={`edit-${block.id}`}
              type="text"
              autoFocus
              defaultValue={block.text}
              placeholder="Type here"
              onBlur={(e) => {
                onTextUpdate(page.id, block.id, { text: e.currentTarget.value });
                onTextEditEnd();
              }}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  onTextUpdate(page.id, block.id, { text: e.currentTarget.value });
                  onTextEditEnd();
                }
                if (e.key === "Enter") {
                  onTextUpdate(page.id, block.id, { text: e.currentTarget.value });
                  onTextEditEnd();
                }
              }}
              style={{
                position: "absolute",
                left: bx + bw / 2,
                top: by,
                transform: `translateX(-50%)${rotation ? ` rotate(${rotation}deg)` : ""}`,
                transformOrigin: "center top",
                width: "auto",
                minWidth: fontSize * 6,
                zIndex: 15,
                border: "none",
                borderBottom: "1.5px solid rgba(8, 194, 37, 0.5)",
                outline: "none",
                borderRadius: 4,
                background: "rgba(255,255,255,0.85)",
                fontFamily: "var(--font-nunito), sans-serif",
                fontSize: fontSize,
                fontWeight: 700,
                color: color,
                textAlign: "center" as const,
                padding: "2px 6px",
                lineHeight: 1.3,
                caretColor: "#08C225",
              }}
              onInput={(e) => {
                const el = e.currentTarget;
                el.style.width = "0";
                el.style.width = Math.max(fontSize * 6, el.scrollWidth + 4) + "px";
              }}
              ref={(el) => {
                if (el) {
                  // Auto-size to content on mount
                  requestAnimationFrame(() => {
                    el.style.width = "0";
                    el.style.width = Math.max(fontSize * 6, el.scrollWidth + 4) + "px";
                  });
                }
              }}
            />
          );
        })()}
        {/* Floating text toolbar */}
        {selectedPageId === page.id && selectedTextId && !editingTextId && (() => {
          const block = page.textBlocks.find((t) => t.id === selectedTextId);
          if (!block) return null;
          return (
            <TextToolbar
              block={block}
              pageWidth={pageWidth}
              pageHeight={pageHeight}
              onUpdate={(updates) => onTextUpdate(page.id, block.id, updates)}
              onDelete={() => onTextDelete(page.id, block.id)}
              onEdit={() => onTextDblClick(page.id, block.id)}
            />
          );
        })()}
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
                top: topCaptionInputOffset,
                left: pageWidth * 0.05,
                width: pageWidth * 0.9,
                height: captionInputHeight,
                zIndex: 5,
                border: "none",
                outline: "none",
                background: "white",
                fontFamily: "var(--font-nunito), sans-serif",
                fontSize: captionFontSize,
                fontWeight: 400,
                color: "#2a2a2a",
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
                height: topCaptionZoneHeight,
                zIndex: 4,
                cursor: "text",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                pointerEvents: dragSourceInfo ? "none" : "auto",
              }}
            >
              {!page.topCaption && topCaptionHovered && (
                <span
                  style={{
                    fontFamily: "var(--font-nunito), sans-serif",
                    fontSize: captionFontSize,
                    fontWeight: 400,
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
        {hasBottomSpace && !isBackCover && (
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
                bottom: bottomCaptionInputOffset,
                left: pageWidth * 0.05,
                width: pageWidth * 0.9,
                height: captionInputHeight,
                zIndex: 5,
                border: "none",
                outline: "none",
                background: "white",
                fontFamily: "var(--font-nunito), sans-serif",
                fontSize: captionFontSize,
                fontWeight: 400,
                color: "#2a2a2a",
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
                height: bottomCaptionZoneHeight,
                zIndex: 4,
                cursor: "text",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                pointerEvents: dragSourceInfo ? "none" : "auto",
              }}
            >
              {!page.bottomCaption && bottomCaptionHovered && (
                <span
                  style={{
                    fontFamily: "var(--font-nunito), sans-serif",
                    fontSize: captionFontSize,
                    fontWeight: 400,
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
            ? "Back cover"
            : pageIndex}
      </Typography>
    </Box>
  );

  const slotThumbnails = page.slots
    .filter((s) => s.photoId !== null)
    .map((s) => thumbnailUrls.get(s.photoId!) ?? "");

  const showPicker = photoCount > 0 && !hideLayoutPicker;
  const pickerContainer = (
    <Box
      sx={{
        width: PICKER_WIDTH,
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: pickerSide === "left" ? "flex-end" : "flex-start",
        opacity: isHovered && showPicker ? 1 : 0,
        transition: "opacity 0.2s",
        pointerEvents: isHovered && showPicker ? "auto" : "none",
      }}
    >
      {showPicker && (
        <LayoutPicker
          photoCount={photoCount}
          currentVariant={page.layoutVariant}
          thumbnailUrls={slotThumbnails}
          onSelect={(key) => setPageLayout(page.id, key)}
          paddingH={page.paddingH ?? 0}
          paddingV={page.paddingV ?? 0}
          onPaddingChange={(h, v) => setPagePadding(page.id, h, v)}
          side={pickerSide}
          excludeFullScreen={isBackCover}
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
