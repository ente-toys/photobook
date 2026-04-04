"use client";

import React, { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { Box, IconButton } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { useBook } from "@/context/BookContext";
import PageStrip from "./PageStrip";
import Toolbar from "./Toolbar";
import SpreadPage, { PICKER_WIDTH } from "./SpreadPage";
import TextEditDialog from "./TextEditDialog";

import { useAutoScroll } from "@/hooks/useAutoScroll";
import { usePhotoDrag } from "@/hooks/usePhotoDrag";
import { usePageDrag } from "@/hooks/usePageDrag";
import type { TextBlock } from "@/lib/types";

// A5 aspect ratio
const PAGE_ASPECT = 148 / 210;
const PAGE_GAP = 2;

export default function EditPage() {
  const {
    book,
    currentSpreadIndex,
    setCurrentSpreadIndex,
    addPhotos,
    updateTextBlock,
    removeTextBlock,
    addTextBlock,
    showPageStrip,
    setShowPageStrip,
  } = useBook();

  // Selection state
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);

  // Text editing state
  const [editingTextBlock, setEditingTextBlock] = useState<TextBlock | null>(null);
  const [editingTextPageId, setEditingTextPageId] = useState<string | null>(null);

  // Hover & UI state
  const [hoveredPageId, setHoveredPageId] = useState<string | null>(null);

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const sidebarScrollRef = useRef<HTMLDivElement>(null);

  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  const pages = book.pages;
  const leftPage = pages[currentSpreadIndex];
  const totalPages = pages.length;

  // Drag hooks
  const autoScroll = useAutoScroll(containerRef);
  const photoDrag = usePhotoDrag(containerRef, autoScroll);
  const pageDrag = usePageDrag();

  // Group pages into spread rows: cover alone on right, interior paired, back cover alone on left
  const spreads = useMemo(() => {
    const result: { left: number | null; right: number | null }[] = [];
    if (pages.length === 0) return result;
    if (pages.length === 1) return [{ left: null, right: 0 }];

    // Cover (page 0) alone on right
    result.push({ left: null, right: 0 });

    // Interior pages (1 to N-2) paired
    for (let i = 1; i <= pages.length - 2; i += 2) {
      result.push({
        left: i,
        right: i + 1 <= pages.length - 2 ? i + 1 : null,
      });
    }

    // Back cover (last page) alone on left
    result.push({ left: pages.length - 1, right: null });

    return result;
  }, [pages.length]);

  // Observe container size for responsive layout
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setContainerSize({ width, height });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Calculate page dimensions based on container width (height is scrollable)
  const { pageWidth, pageHeight } = useMemo(() => {
    const availW = containerSize.width - 128 - PAGE_GAP - PICKER_WIDTH * 2;

    if (availW <= 0) {
      return { pageWidth: 380, pageHeight: Math.round(380 / PAGE_ASPECT) };
    }

    let pw = Math.max(200, Math.min(availW / 2, 500));
    const ph = Math.round(pw / PAGE_ASPECT);

    return { pageWidth: Math.round(pw), pageHeight: ph };
  }, [containerSize.width]);

  // Sync sidebar scroll with main area scroll
  const handleMainScroll = useCallback(() => {
    const main = containerRef.current;
    const sidebar = sidebarScrollRef.current;
    if (!main || !sidebar) return;

    const maxMainScroll = main.scrollHeight - main.clientHeight;
    if (maxMainScroll <= 0) return;

    const fraction = main.scrollTop / maxMainScroll;
    const maxSidebarScroll = sidebar.scrollHeight - sidebar.clientHeight;
    sidebar.scrollTop = fraction * maxSidebarScroll;

    // Update currentSpreadIndex based on visible spread
    const visibleIdx = Math.round(fraction * Math.max(0, spreads.length - 1));
    const spread = spreads[visibleIdx];
    if (spread) {
      const newIndex = spread.left ?? spread.right ?? 0;
      if (newIndex !== currentSpreadIndex) {
        setCurrentSpreadIndex(newIndex);
      }
    }
  }, [spreads, currentSpreadIndex, setCurrentSpreadIndex]);

  // Scroll main area to a specific spread row (called from sidebar click)
  const handleSidebarSpreadClick = useCallback((spreadIdx: number) => {
    const main = containerRef.current;
    if (!main) return;
    const spreadEl = main.querySelector(`[data-spread-index="${spreadIdx}"]`);
    if (spreadEl) {
      spreadEl.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, []);

  // Selection handlers
  const handleSlotClick = useCallback(
    (pageId: string, slotId: string) => {
      setSelectedSlotId(slotId);
      setSelectedPageId(pageId);
      setSelectedTextId(null);
    },
    []
  );

  const handleTextClick = useCallback(
    (pageId: string, textId: string) => {
      setSelectedTextId(textId);
      setSelectedPageId(pageId);
      setSelectedSlotId(null);
    },
    []
  );

  const handleTextDblClick = useCallback(
    (pageId: string, textId: string) => {
      const page = pages.find((p) => p.id === pageId);
      const block = page?.textBlocks.find((t) => t.id === textId);
      if (block) {
        setEditingTextBlock(block);
        setEditingTextPageId(pageId);
      }
    },
    [pages]
  );

  const handleStageClick = useCallback((e: any) => {
    if (e.target === e.target.getStage()) {
      setSelectedSlotId(null);
      setSelectedPageId(null);
      setSelectedTextId(null);
    }
  }, []);

  // Toolbar actions
  const handleAddText = useCallback(() => {
    const pageId = selectedPageId || leftPage?.id;
    if (!pageId) return;
    const block = addTextBlock(pageId);
    setEditingTextBlock(block);
    setEditingTextPageId(pageId);
    setSelectedTextId(block.id);
    setSelectedPageId(pageId);
    setSelectedSlotId(null);
  }, [selectedPageId, leftPage?.id]);

  const handleAddPhotos = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        addPhotos(Array.from(e.target.files));
      }
    },
    [addPhotos]
  );

  return (
    <Box sx={{ display: "flex", height: "100vh", pt: "64px" }}>
      {/* Left Toolbar */}
      <Toolbar
        onAddPhotos={handleAddPhotos}
        onAddText={handleAddText}
        selectedTextId={selectedTextId}
        selectedPageId={selectedPageId}
      />

      {/* Main Canvas Area - scrollable */}
      <Box
        ref={containerRef}
        onScroll={handleMainScroll}
        onDragOver={photoDrag.handleContainerDragOver}
        onDragEnd={photoDrag.handleDragEnd}
        sx={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          bgcolor: "#1a1c1d",
          overflow: "auto",
        }}
      >
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            px: 4,
            py: 4,
            gap: 4,
          }}
        >
          {/* All spreads */}
          {spreads.map((spread, spreadIdx) => {
            const lp = spread.left !== null ? pages[spread.left] : null;
            const rp = spread.right !== null ? pages[spread.right] : null;

            return (
              <Box
                key={spreadIdx}
                data-spread-index={spreadIdx}
                sx={{
                  display: "flex",
                  gap: `${PAGE_GAP}px`,
                  alignItems: "start",
                  width: PICKER_WIDTH + pageWidth * 2 + PAGE_GAP + PICKER_WIDTH,
                  justifyContent: lp ? "flex-start" : "flex-end",
                }}
              >
                {lp && (
                  <SpreadPage
                    page={lp}
                    pageIndex={spread.left!}
                    pickerSide="left"
                    pageWidth={pageWidth}
                    pageHeight={pageHeight}
                    totalPages={totalPages}
                    selectedSlotId={selectedSlotId}
                    selectedPageId={selectedPageId}
                    selectedTextId={selectedTextId}
                    onSlotClick={handleSlotClick}
                    onTextClick={handleTextClick}
                    onTextDblClick={handleTextDblClick}
                    onStageClick={handleStageClick}
                    isHovered={hoveredPageId === lp.id}
                    onHoverChange={setHoveredPageId}
                    dragSourceInfo={photoDrag.dragSourceInfo}
                    dragOverInfo={photoDrag.dragOverInfo}
                    onPhotoDragStart={photoDrag.handleDragStart}
                    onSlotDragOver={photoDrag.handleSlotDragOver}
                    onPhotoDrop={photoDrag.handleDrop}
                    onPhotoDragEnd={photoDrag.handleDragEnd}
                    onPageDragOver={photoDrag.handlePageDragOver}
                    onPageDrop={photoDrag.handlePageDrop}
                    pageDragSource={pageDrag.pageDragSource}
                    pageDragTarget={pageDrag.pageDragTarget}
                    pageDragSourceRef={pageDrag.pageDragSourceRef}
                    onPageDragStart={pageDrag.handlePageDragStart}
                    onPageDragOverPage={pageDrag.handlePageDragOverPage}
                    onPageDropOnPage={pageDrag.handlePageDropOnPage}
                    onPageDragEndCleanup={pageDrag.handlePageDragEndCleanup}
                  />
                )}
                {rp && (
                  <SpreadPage
                    page={rp}
                    pageIndex={spread.right!}
                    pickerSide="right"
                    pageWidth={pageWidth}
                    pageHeight={pageHeight}
                    totalPages={totalPages}
                    selectedSlotId={selectedSlotId}
                    selectedPageId={selectedPageId}
                    selectedTextId={selectedTextId}
                    onSlotClick={handleSlotClick}
                    onTextClick={handleTextClick}
                    onTextDblClick={handleTextDblClick}
                    onStageClick={handleStageClick}
                    isHovered={hoveredPageId === rp.id}
                    onHoverChange={setHoveredPageId}
                    dragSourceInfo={photoDrag.dragSourceInfo}
                    dragOverInfo={photoDrag.dragOverInfo}
                    onPhotoDragStart={photoDrag.handleDragStart}
                    onSlotDragOver={photoDrag.handleSlotDragOver}
                    onPhotoDrop={photoDrag.handleDrop}
                    onPhotoDragEnd={photoDrag.handleDragEnd}
                    onPageDragOver={photoDrag.handlePageDragOver}
                    onPageDrop={photoDrag.handlePageDrop}
                    pageDragSource={pageDrag.pageDragSource}
                    pageDragTarget={pageDrag.pageDragTarget}
                    pageDragSourceRef={pageDrag.pageDragSourceRef}
                    onPageDragStart={pageDrag.handlePageDragStart}
                    onPageDragOverPage={pageDrag.handlePageDragOverPage}
                    onPageDropOnPage={pageDrag.handlePageDropOnPage}
                    onPageDragEndCleanup={pageDrag.handlePageDragEndCleanup}
                  />
                )}
              </Box>
            );
          })}
        </Box>
      </Box>

      {/* Right Sidebar - Page Strip */}
      {showPageStrip && (
        <Box sx={{ position: "relative", display: "flex", flexDirection: "column" }}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "flex-end",
              bgcolor: "#141617",
              borderLeft: "1px solid rgba(255,255,255,0.06)",
              px: 0.5,
              pt: 0.5,
            }}
          >
            <IconButton
              onClick={() => setShowPageStrip(false)}
              size="small"
              sx={{
                color: "rgba(255,255,255,0.45)",
                "&:hover": { color: "rgba(255,255,255,0.8)" },
              }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
          <PageStrip
            scrollContainerRef={sidebarScrollRef}
            onSpreadClick={handleSidebarSpreadClick}
          />
        </Box>
      )}

      {/* Offscreen canvas for drag ghost */}
      <canvas ref={photoDrag.dragGhostRef} style={{ position: "fixed", left: -9999 }} />

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
        multiple
        style={{ display: "none" }}
        onChange={handleFileChange}
      />

{/* Text Edit Dialog */}
      <TextEditDialog
        open={editingTextBlock !== null}
        block={editingTextBlock}
        onSave={(updates) => {
          if (editingTextPageId && editingTextBlock) {
            updateTextBlock(editingTextPageId, editingTextBlock.id, updates);
          }
        }}
        onClose={() => {
          setEditingTextBlock(null);
          setEditingTextPageId(null);
        }}
        onDelete={() => {
          if (editingTextPageId && editingTextBlock) {
            removeTextBlock(editingTextPageId, editingTextBlock.id);
          }
          setEditingTextBlock(null);
          setEditingTextPageId(null);
          setSelectedTextId(null);
        }}
      />
    </Box>
  );
}
