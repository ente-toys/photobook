"use client";

import React, { useState, useRef, useCallback, useMemo } from "react";
import { Box, Typography, IconButton } from "@mui/material";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import { Stage, Layer } from "react-konva";
import { useBook } from "@/context/BookContext";
import PageCanvas from "./PageCanvas";
import PageStrip from "./PageStrip";
import Toolbar from "./Toolbar";
import TextEditDialog from "./TextEditDialog";
import PhotoPool from "./PhotoPool";
import Footer from "./Footer";
import type { TextBlock } from "@/lib/types";

// A5 aspect ratio
const PAGE_ASPECT = 148 / 210;

export default function EditPage() {
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
  } = useBook();

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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const pages = book.pages;
  const leftPage = pages[currentSpreadIndex];
  const rightPage = pages[currentSpreadIndex + 1];
  const totalPages = pages.length;

  // Calculate page dimensions to fit container
  // Target: two A5 pages side by side with gap
  const PAGE_GAP = 2;

  // Use a responsive page width
  const pageWidth = 380;
  const pageHeight = Math.round(pageWidth / PAGE_ASPECT);

  const goToSpread = useCallback(
    (idx: number) => {
      const clamped = Math.max(0, Math.min(idx, totalPages - 1));
      // Ensure even index
      const even = clamped % 2 === 0 ? clamped : clamped - 1;
      setCurrentSpreadIndex(even);
      setSelectedSlotId(null);
      setSelectedPageId(null);
      setSelectedTextId(null);
    },
    [totalPages, setCurrentSpreadIndex]
  );

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

      {/* Main Canvas Area */}
      <Box
        ref={containerRef}
        sx={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          bgcolor: "#F3F3F5",
          overflow: "auto",
        }}
      >
        {/* Spread Editor */}
        <Box
          sx={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            px: 4,
            py: 4,
            gap: 4,
          }}
        >
          {/* Swap mode indicator */}
          {swapSourceSlotId && (
            <Box
              sx={{
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

          {/* Spread container */}
          <Box sx={{ display: "flex", gap: `${PAGE_GAP}px`, alignItems: "start" }}>
            {/* Left page */}
            {leftPage && (
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
                      page={leftPage}
                      pageWidth={pageWidth}
                      pageHeight={pageHeight}
                      isInteractive
                      selectedSlotId={
                        selectedPageId === leftPage.id ? selectedSlotId : null
                      }
                      selectedTextId={
                        selectedPageId === leftPage.id ? selectedTextId : null
                      }
                      swapSourceSlotId={swapSourceSlotId}
                      onSlotClick={(slotId) =>
                        handleSlotClick(leftPage.id, slotId)
                      }
                      onTextClick={(textId) =>
                        handleTextClick(leftPage.id, textId)
                      }
                      onTextDblClick={(textId) =>
                        handleTextDblClick(leftPage.id, textId)
                      }
                    />
                  </Layer>
                </Stage>
                <Box sx={{ textAlign: "center", py: 0.5 }}>
                  <Typography
                    sx={{ fontSize: "0.6rem", color: "#ccc", fontWeight: 600 }}
                  >
                    {currentSpreadIndex + 1}
                  </Typography>
                </Box>
              </Box>
            )}

            {/* Right page */}
            {rightPage && (
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
                      page={rightPage}
                      pageWidth={pageWidth}
                      pageHeight={pageHeight}
                      isInteractive
                      selectedSlotId={
                        selectedPageId === rightPage.id ? selectedSlotId : null
                      }
                      selectedTextId={
                        selectedPageId === rightPage.id ? selectedTextId : null
                      }
                      swapSourceSlotId={swapSourceSlotId}
                      onSlotClick={(slotId) =>
                        handleSlotClick(rightPage.id, slotId)
                      }
                      onTextClick={(textId) =>
                        handleTextClick(rightPage.id, textId)
                      }
                      onTextDblClick={(textId) =>
                        handleTextDblClick(rightPage.id, textId)
                      }
                    />
                  </Layer>
                </Stage>
                <Box sx={{ textAlign: "center", py: 0.5 }}>
                  <Typography
                    sx={{ fontSize: "0.6rem", color: "#ccc", fontWeight: 600 }}
                  >
                    {currentSpreadIndex + 2}
                  </Typography>
                </Box>
              </Box>
            )}
          </Box>
        </Box>

        {/* Bottom Navigation Bar */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 3,
            py: 2,
            mx: "auto",
            mb: 2,
            px: 3,
            bgcolor: "rgba(226, 226, 228, 0.7)",
            backdropFilter: "blur(24px)",
            borderRadius: 999,
            boxShadow: "0px 12px 32px rgba(26, 28, 29, 0.06)",
          }}
        >
          <IconButton
            size="small"
            onClick={() => goToSpread(currentSpreadIndex - 2)}
            disabled={currentSpreadIndex === 0}
            sx={{ color: "#999" }}
          >
            <ChevronLeftIcon />
          </IconButton>
          <Typography
            sx={{
              fontSize: "0.7rem",
              fontWeight: 900,
              letterSpacing: "0.1em",
              color: "#666",
              userSelect: "none",
            }}
          >
            PAGE {currentSpreadIndex + 1}-
            {Math.min(currentSpreadIndex + 2, totalPages)} OF {totalPages}
          </Typography>
          <IconButton
            size="small"
            onClick={() => goToSpread(currentSpreadIndex + 2)}
            disabled={currentSpreadIndex + 2 >= totalPages}
            sx={{ color: "#999" }}
          >
            <ChevronRightIcon />
          </IconButton>
        </Box>

        <Footer />
      </Box>

      {/* Right Sidebar - Page Strip */}
      <PageStrip />

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
