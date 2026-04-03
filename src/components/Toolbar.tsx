"use client";

import React from "react";
import { Box, IconButton, Tooltip, Divider } from "@mui/material";
import AddCircleIcon from "@mui/icons-material/AddCircle";
import AddPhotoAlternateIcon from "@mui/icons-material/AddPhotoAlternate";
import PhotoLibraryIcon from "@mui/icons-material/PhotoLibrary";
import TextFieldsIcon from "@mui/icons-material/TextFields";
import NotesIcon from "@mui/icons-material/Notes";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import ZoomInIcon from "@mui/icons-material/ZoomIn";
import ZoomOutIcon from "@mui/icons-material/ZoomOut";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import { useBook } from "@/context/BookContext";

interface ToolbarProps {
  onAddPhotos: () => void;
  onTogglePhotoPool: () => void;
  onEditCaptions: (anchor: HTMLElement) => void;
  onAddText: () => void;
  selectedSlotId: string | null;
  selectedPageId: string | null;
  selectedTextId: string | null;
  isSwapMode: boolean;
  onStartSwap: () => void;
  onCancelSwap: () => void;
}

export default function Toolbar({
  onAddPhotos,
  onTogglePhotoPool,
  onEditCaptions,
  onAddText,
  selectedSlotId,
  selectedPageId,
  selectedTextId,
  isSwapMode,
  onStartSwap,
  onCancelSwap,
}: ToolbarProps) {
  const {
    addPage,
    removePage,
    removeTextBlock,
    removeSlot,
    updateSlot,
    currentSpreadIndex,
    book,
  } = useBook();

  const handleAddPage = () => {
    addPage(currentSpreadIndex + 1);
  };

  const handleAddText = () => {
    onAddText();
  };

  const handleDeleteSelected = () => {
    if (selectedTextId && selectedPageId) {
      removeTextBlock(selectedPageId, selectedTextId);
    } else if (selectedSlotId && selectedPageId) {
      removeSlot(selectedPageId, selectedSlotId);
    }
  };

  const handleZoomIn = () => {
    if (selectedSlotId && selectedPageId) {
      const page = book.pages.find((p) => p.id === selectedPageId);
      const slot = page?.slots.find((s) => s.id === selectedSlotId);
      if (slot) {
        updateSlot(selectedPageId, selectedSlotId, {
          cropZoom: Math.min(slot.cropZoom + 0.2, 3),
        });
      }
    }
  };

  const handleZoomOut = () => {
    if (selectedSlotId && selectedPageId) {
      const page = book.pages.find((p) => p.id === selectedPageId);
      const slot = page?.slots.find((s) => s.id === selectedSlotId);
      if (slot) {
        updateSlot(selectedPageId, selectedSlotId, {
          cropZoom: Math.max(slot.cropZoom - 0.2, 1),
        });
      }
    }
  };

  const handleRemovePage = () => {
    if (book.pages.length <= 2) return;
    const leftPage = book.pages[currentSpreadIndex];
    const rightPage = book.pages[currentSpreadIndex + 1];
    if (rightPage) removePage(rightPage.id);
    if (leftPage) removePage(leftPage.id);
  };

  return (
    <Box
      sx={{
        width: 72,
        bgcolor: "#F3F3F5",
        display: "flex",
        flexDirection: "column",
        py: 3,
        alignItems: "center",
        gap: 1.5,
        height: "100%",
        borderRight: "1px solid rgba(0,0,0,0.04)",
      }}
    >
      <Tooltip title="Add Page" placement="right">
        <IconButton
          onClick={handleAddPage}
          sx={{
            width: 44,
            height: 44,
            color: "#006E0F",
            bgcolor: "white",
            borderRadius: 2,
            boxShadow: "0px 12px 32px rgba(26, 28, 29, 0.06)",
            "&:hover": { transform: "scale(1.05)" },
            transition: "all 0.2s",
          }}
        >
          <AddCircleIcon />
        </IconButton>
      </Tooltip>

      <Divider sx={{ width: 32, my: 0.5 }} />

      <Tooltip title="Import Photos from Device" placement="right">
        <IconButton
          onClick={onAddPhotos}
          sx={{
            width: 44,
            height: 44,
            color: "#999",
            "&:hover": { color: "#08C225", bgcolor: "white" },
            borderRadius: 2,
            transition: "all 0.2s",
          }}
        >
          <AddPhotoAlternateIcon />
        </IconButton>
      </Tooltip>

      <Tooltip title="Browse Photo Library" placement="right">
        <IconButton
          onClick={onTogglePhotoPool}
          sx={{
            width: 44,
            height: 44,
            color: "#999",
            "&:hover": { color: "#08C225", bgcolor: "white" },
            borderRadius: 2,
            transition: "all 0.2s",
          }}
        >
          <PhotoLibraryIcon />
        </IconButton>
      </Tooltip>

      <Tooltip title="Add Text" placement="right">
        <IconButton
          onClick={handleAddText}
          sx={{
            width: 44,
            height: 44,
            color: "#999",
            "&:hover": { color: "#08C225", bgcolor: "white" },
            borderRadius: 2,
            transition: "all 0.2s",
          }}
        >
          <TextFieldsIcon />
        </IconButton>
      </Tooltip>

      <Tooltip title="Edit Page Captions" placement="right">
        <IconButton
          onClick={(e) => onEditCaptions(e.currentTarget)}
          sx={{
            width: 44,
            height: 44,
            color: "#999",
            "&:hover": { color: "#08C225", bgcolor: "white" },
            borderRadius: 2,
            transition: "all 0.2s",
          }}
        >
          <NotesIcon />
        </IconButton>
      </Tooltip>

      {selectedSlotId && (
        <>
          <Divider sx={{ width: 32, my: 0.5 }} />
          <Tooltip title={isSwapMode ? "Cancel Swap" : "Swap Photo"} placement="right">
            <IconButton
              onClick={isSwapMode ? onCancelSwap : onStartSwap}
              sx={{
                width: 44,
                height: 44,
                color: isSwapMode ? "white" : "#999",
                bgcolor: isSwapMode ? "#08C225" : "transparent",
                "&:hover": {
                  color: isSwapMode ? "white" : "#08C225",
                  bgcolor: isSwapMode ? "#006E0F" : "white",
                },
                borderRadius: 2,
                transition: "all 0.2s",
              }}
            >
              <SwapHorizIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Zoom In" placement="right">
            <IconButton
              onClick={handleZoomIn}
              sx={{
                width: 44,
                height: 44,
                color: "#999",
                "&:hover": { color: "#08C225", bgcolor: "white" },
                borderRadius: 2,
              }}
            >
              <ZoomInIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Zoom Out" placement="right">
            <IconButton
              onClick={handleZoomOut}
              sx={{
                width: 44,
                height: 44,
                color: "#999",
                "&:hover": { color: "#08C225", bgcolor: "white" },
                borderRadius: 2,
              }}
            >
              <ZoomOutIcon />
            </IconButton>
          </Tooltip>
        </>
      )}

      {(selectedSlotId || selectedTextId) && (
        <>
          <Divider sx={{ width: 32, my: 0.5 }} />
          <Tooltip title="Delete Selected" placement="right">
            <IconButton
              onClick={handleDeleteSelected}
              sx={{
                width: 44,
                height: 44,
                color: "#999",
                "&:hover": { color: "#ba1a1a", bgcolor: "white" },
                borderRadius: 2,
              }}
            >
              <DeleteOutlineIcon />
            </IconButton>
          </Tooltip>
        </>
      )}

      <Box sx={{ flex: 1 }} />

      <Tooltip title="Remove Current Spread" placement="right">
        <IconButton
          onClick={handleRemovePage}
          disabled={book.pages.length <= 2}
          sx={{
            width: 44,
            height: 44,
            color: "#ccc",
            "&:hover": { color: "#ba1a1a" },
            borderRadius: 2,
          }}
        >
          <DeleteOutlineIcon />
        </IconButton>
      </Tooltip>
    </Box>
  );
}
