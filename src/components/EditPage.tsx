"use client";

import React, { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { Box, Typography } from "@mui/material";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import { Stage, Layer } from "react-konva";
import { useBook } from "@/context/BookContext";
import PageCanvas from "./PageCanvas";
import PageStrip from "./PageStrip";
import Toolbar from "./Toolbar";
import TextEditDialog from "./TextEditDialog";
import PhotoPool from "./PhotoPool";
import CaptionEditor from "./CaptionEditor";
import Footer from "./Footer";
import type { TextBlock } from "@/lib/types";

// A5 aspect ratio
const PAGE_ASPECT = 148 / 210;

export default function EditPage() {
  const bookCtx = useBook();
  const {
    book,
    currentSpreadIndex,
    setCurrentSpreadIndex,
    addPhotos,
    updatePage,
    updateTextBlock,
    removeTextBlock,
    swapPhotos,
    updateSlot,
    addTextBlock,
  } = bookCtx;

  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);
  const [swapSourceSlotId, setSwapSourceSlotId] = useState<string | null>(null);
  const [swapSourcePageId, setSwapSourcePageId] = useState<string | null>(null);
  const [editingTextBlock, setEditingTextBlock] = useState<TextBlock | null>(
    null
  );
  const [editingTextPageId, setEditingTextPageId] = useState<string | null>(
    null
  );
  const [photoPoolOpen, setPhotoPoolOpen] = useState(false);
  const [captionAnchor, setCaptionAnchor] = useState<HTMLElement | null>(null);
  const [captionPageId, setCaptionPageId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const sidebarScrollRef = useRef<HTMLDivElement>(null);

  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  const pages = book.pages;
  const leftPage = pages[currentSpreadIndex]; // for toolbar context
  const totalPages = pages.length;

  const PAGE_GAP = 2;

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
    const availW = containerSize.width - 128 - PAGE_GAP;

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

  const handleSlotClick = useCallback(
    (pageId: string, slotId: string) => {
      // If we have a swap source and click a different slot, perform swap
      if (swapSourceSlotId && swapSourcePageId) {
        if (swapSourceSlotId !== slotId || swapSourcePageId !== pageId) {
          swapPhotos(swapSourcePageId, swapSourceSlotId, pageId, slotId);
          setSwapSourceSlotId(null);
          setSwapSourcePageId(null);
          setSelectedSlotId(null);
          setSelectedPageId(null);
          return;
        }
        // Clicked same slot again — cancel swap mode
        setSwapSourceSlotId(null);
        setSwapSourcePageId(null);
      }
      setSelectedSlotId(slotId);
      setSelectedPageId(pageId);
      setSelectedTextId(null);
    },
    [swapSourceSlotId, swapSourcePageId, swapPhotos]
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
    // Clicked on empty area - deselect and cancel swap
    if (e.target === e.target.getStage()) {
      setSelectedSlotId(null);
      setSelectedPageId(null);
      setSelectedTextId(null);
      setSwapSourceSlotId(null);
      setSwapSourcePageId(null);
    }
  }, []);

  const handleAddText = useCallback(() => {
    const pageId = selectedPageId || leftPage?.id;
    if (!pageId) return;
    const block = addTextBlock(pageId);
    // Immediately open the edit dialog for the new block
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
        onTogglePhotoPool={() => setPhotoPoolOpen((v) => !v)}
        onAddText={handleAddText}
        onEditCaptions={(anchor) => {
          // Edit captions for the left page of current spread (or selected page)
          const pageId = selectedPageId || leftPage?.id;
          if (pageId) {
            setCaptionPageId(pageId);
            setCaptionAnchor(anchor);
          }
        }}
        selectedSlotId={selectedSlotId}
        selectedPageId={selectedPageId}
        selectedTextId={selectedTextId}
        isSwapMode={swapSourceSlotId !== null}
        onStartSwap={() => {
          if (selectedSlotId && selectedPageId) {
            setSwapSourceSlotId(selectedSlotId);
            setSwapSourcePageId(selectedPageId);
          }
        }}
        onCancelSwap={() => {
          setSwapSourceSlotId(null);
          setSwapSourcePageId(null);
        }}
      />

      {/* Main Canvas Area - scrollable */}
      <Box
        ref={containerRef}
        onScroll={handleMainScroll}
        sx={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          bgcolor: "#F3F3F5",
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
          {/* Swap mode indicator */}
          {swapSourceSlotId && (
            <Box
              sx={{
                position: "sticky",
                top: 16,
                zIndex: 10,
                bgcolor: "rgba(8, 194, 37, 0.1)",
                border: "1px solid #08C225",
                borderRadius: 999,
                px: 3,
                py: 0.75,
                display: "flex",
                alignItems: "center",
                gap: 1,
              }}
            >
              <SwapHorizIcon sx={{ fontSize: 18, color: "#006E0F" }} />
              <Typography sx={{ fontSize: "0.8rem", fontWeight: 600, color: "#006E0F" }}>
                Click another photo slot to swap
              </Typography>
            </Box>
          )}

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
                  width: pageWidth * 2 + PAGE_GAP,
                  justifyContent: lp ? "flex-start" : "flex-end",
                }}
              >
                {/* Left page */}
                {lp && (
                  <Box>
                    <Box
                      sx={{
                        boxShadow: "0px 12px 32px rgba(26, 28, 29, 0.06)",
                        borderRadius: 0.5,
                        overflow: "hidden",
                      }}
                    >
                      <Stage
                        width={pageWidth}
                        height={pageHeight}
                        onClick={handleStageClick}
                      >
                        <Layer>
                          <PageCanvas
                            page={lp}
                            pageWidth={pageWidth}
                            pageHeight={pageHeight}
                            isInteractive
                            selectedSlotId={
                              selectedPageId === lp.id ? selectedSlotId : null
                            }
                            selectedTextId={
                              selectedPageId === lp.id ? selectedTextId : null
                            }
                            swapSourceSlotId={swapSourceSlotId}
                            onSlotClick={(slotId) =>
                              handleSlotClick(lp.id, slotId)
                            }
                            onTextClick={(textId) =>
                              handleTextClick(lp.id, textId)
                            }
                            onTextDblClick={(textId) =>
                              handleTextDblClick(lp.id, textId)
                            }
                          />
                        </Layer>
                      </Stage>
                    </Box>
                    <Typography
                      sx={{ fontSize: "0.6rem", color: "#aaa", fontWeight: 600, textAlign: "center", mt: 0.5 }}
                    >
                      {spread.left! + 1}
                    </Typography>
                  </Box>
                )}

                {/* Right page */}
                {rp && (
                  <Box>
                    <Box
                      sx={{
                        boxShadow: "0px 12px 32px rgba(26, 28, 29, 0.06)",
                        borderRadius: 0.5,
                        overflow: "hidden",
                      }}
                    >
                      <Stage
                        width={pageWidth}
                        height={pageHeight}
                        onClick={handleStageClick}
                      >
                        <Layer>
                          <PageCanvas
                            page={rp}
                            pageWidth={pageWidth}
                            pageHeight={pageHeight}
                            isInteractive
                            selectedSlotId={
                              selectedPageId === rp.id ? selectedSlotId : null
                            }
                            selectedTextId={
                              selectedPageId === rp.id ? selectedTextId : null
                            }
                            swapSourceSlotId={swapSourceSlotId}
                            onSlotClick={(slotId) =>
                              handleSlotClick(rp.id, slotId)
                            }
                            onTextClick={(textId) =>
                              handleTextClick(rp.id, textId)
                            }
                            onTextDblClick={(textId) =>
                              handleTextDblClick(rp.id, textId)
                            }
                          />
                        </Layer>
                      </Stage>
                    </Box>
                    <Typography
                      sx={{ fontSize: "0.6rem", color: "#aaa", fontWeight: 600, textAlign: "center", mt: 0.5 }}
                    >
                      {spread.right! + 1}
                    </Typography>
                  </Box>
                )}
              </Box>
            );
          })}
        </Box>

        <Footer />
      </Box>

      {/* Right Sidebar - Page Strip */}
      <PageStrip
        scrollContainerRef={sidebarScrollRef}
        onSpreadClick={handleSidebarSpreadClick}
      />

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
        multiple
        style={{ display: "none" }}
        onChange={handleFileChange}
      />

      {/* Photo Pool Drawer */}
      <PhotoPool
        open={photoPoolOpen}
        onClose={() => setPhotoPoolOpen(false)}
        selectedSlotId={selectedSlotId}
        selectedPageId={selectedPageId}
      />

      {/* Caption Editor */}
      <CaptionEditor
        anchorEl={captionAnchor}
        open={Boolean(captionAnchor) && Boolean(captionPageId)}
        onClose={() => {
          setCaptionAnchor(null);
          setCaptionPageId(null);
        }}
        topCaption={
          captionPageId
            ? pages.find((p) => p.id === captionPageId)?.topCaption || ""
            : ""
        }
        bottomCaption={
          captionPageId
            ? pages.find((p) => p.id === captionPageId)?.bottomCaption || ""
            : ""
        }
        onChangeTop={(val) => {
          if (captionPageId) updatePage(captionPageId, { topCaption: val });
        }}
        onChangeBottom={(val) => {
          if (captionPageId) updatePage(captionPageId, { bottomCaption: val });
        }}
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
