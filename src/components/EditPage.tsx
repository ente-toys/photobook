"use client";

import React, { useState, useRef, useCallback, useMemo, useEffect, type RefCallback } from "react";
import { Box, IconButton } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { useBook } from "@/context/BookContext";
import PageStrip from "./PageStrip";
import Toolbar from "./Toolbar";
import SpreadPage, { PICKER_WIDTH } from "./SpreadPage";

import { useAutoScroll } from "@/hooks/useAutoScroll";
import { usePhotoDrag } from "@/hooks/usePhotoDrag";
import { usePageDrag } from "@/hooks/usePageDrag";
import { useSpreads } from "@/hooks/useSpreads";
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
    undo,
    redo,
  } = useBook();

  // Selection state
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);

  // Inline text editing state
  const [editingTextId, setEditingTextId] = useState<string | null>(null);

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

  const spreads = useSpreads(pages.length);

  // Virtualization: only render visible spreads + buffer
  const [visibleSpreads, setVisibleSpreads] = useState<Set<number>>(() => new Set([0, 1, 2]));
  const spreadElsRef = useRef<Map<number, Element>>(new Map());
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;

    const observer = new IntersectionObserver(
      (entries) => {
        setVisibleSpreads((prev) => {
          const next = new Set(prev);
          for (const entry of entries) {
            const idx = Number((entry.target as HTMLElement).dataset.spreadIndex);
            if (!isNaN(idx)) {
              if (entry.isIntersecting) next.add(idx);
              else next.delete(idx);
            }
          }
          if (next.size === prev.size && [...next].every((v) => prev.has(v)))
            return prev;
          return next;
        });
      },
      { root, rootMargin: "600px 0px" }
    );
    observerRef.current = observer;

    // Observe all currently tracked elements
    spreadElsRef.current.forEach((el) => observer.observe(el));

    return () => {
      observer.disconnect();
      observerRef.current = null;
    };
  }, [spreads.length]);

  const spreadRefCallback = useCallback(
    (idx: number): RefCallback<HTMLDivElement> =>
      (el) => {
        const prev = spreadElsRef.current.get(idx);
        if (prev && observerRef.current) observerRef.current.unobserve(prev);

        if (el) {
          spreadElsRef.current.set(idx, el);
          if (observerRef.current) observerRef.current.observe(el);
        } else {
          spreadElsRef.current.delete(idx);
        }
      },
    []
  );

  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "z") {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [undo, redo]);

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
      setEditingTextId(textId);
      setSelectedTextId(textId);
      setSelectedPageId(pageId);
    },
    []
  );

  const handleStageClick = useCallback((e: any) => {
    if (e.target === e.target.getStage()) {
      setSelectedSlotId(null);
      setSelectedPageId(null);
      setSelectedTextId(null);
      setEditingTextId(null);
    }
  }, []);

  // Toolbar actions
  const handleAddText = useCallback(() => {
    const pageId = selectedPageId || leftPage?.id;
    if (!pageId) return;
    const block = addTextBlock(pageId);
    setSelectedTextId(block.id);
    setSelectedPageId(pageId);
    setSelectedSlotId(null);
    setEditingTextId(block.id);
  }, [selectedPageId, leftPage?.id, addTextBlock]);

  const handleTextUpdate = useCallback(
    (pageId: string, blockId: string, updates: Partial<TextBlock>) => {
      updateTextBlock(pageId, blockId, updates);
    },
    [updateTextBlock]
  );

  const handleTextDelete = useCallback(
    (pageId: string, blockId: string) => {
      removeTextBlock(pageId, blockId);
      setSelectedTextId(null);
      setEditingTextId(null);
    },
    [removeTextBlock]
  );

  const handleTextEditEnd = useCallback(() => {
    setEditingTextId(null);
  }, []);

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
          {/* Spreads (virtualized: only visible spreads render full content) */}
          {spreads.map((spread, spreadIdx) => {
            const isVisible = visibleSpreads.has(spreadIdx);
            const lp = spread.left !== null ? pages[spread.left] : null;
            const rp = spread.right !== null ? pages[spread.right] : null;

            return (
              <Box
                key={spreadIdx}
                ref={spreadRefCallback(spreadIdx)}
                data-spread-index={spreadIdx}
                sx={{
                  display: "flex",
                  gap: `${PAGE_GAP}px`,
                  alignItems: "start",
                  width: PICKER_WIDTH + pageWidth * 2 + PAGE_GAP + PICKER_WIDTH,
                  justifyContent: lp ? "flex-start" : "flex-end",
                  minHeight: pageHeight,
                }}
              >
                {isVisible && lp && (
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
                    editingTextId={editingTextId}
                    onSlotClick={handleSlotClick}
                    onTextClick={handleTextClick}
                    onTextDblClick={handleTextDblClick}
                    onTextUpdate={handleTextUpdate}
                    onTextDelete={handleTextDelete}
                    onTextEditEnd={handleTextEditEnd}
                    onStageClick={handleStageClick}
                    isHovered={hoveredPageId === lp.id}
                    onHoverChange={setHoveredPageId}
                    dragSourceInfo={photoDrag.dragSourceInfo}
                    dragOverInfo={photoDrag.dragOverInfo}
                    dragOverPageId={photoDrag.dragOverPageId}
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
                {isVisible && rp && (
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
                    editingTextId={editingTextId}
                    onSlotClick={handleSlotClick}
                    onTextClick={handleTextClick}
                    onTextDblClick={handleTextDblClick}
                    onTextUpdate={handleTextUpdate}
                    onTextDelete={handleTextDelete}
                    onTextEditEnd={handleTextEditEnd}
                    onStageClick={handleStageClick}
                    isHovered={hoveredPageId === rp.id}
                    onHoverChange={setHoveredPageId}
                    dragSourceInfo={photoDrag.dragSourceInfo}
                    dragOverInfo={photoDrag.dragOverInfo}
                    dragOverPageId={photoDrag.dragOverPageId}
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

    </Box>
  );
}
