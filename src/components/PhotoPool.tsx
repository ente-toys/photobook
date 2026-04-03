"use client";

import React, { useMemo } from "react";
import { Box, Typography, Drawer, IconButton } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { useBook } from "@/context/BookContext";

interface PhotoPoolProps {
  open: boolean;
  onClose: () => void;
  selectedSlotId: string | null;
  selectedPageId: string | null;
}

export default function PhotoPool({
  open,
  onClose,
  selectedSlotId,
  selectedPageId,
}: PhotoPoolProps) {
  const { photos, thumbnailUrls, book, updateSlot } = useBook();

  // Determine which photos are already placed in slots
  const usedPhotoIds = useMemo(() => {
    const ids = new Set<string>();
    for (const page of book.pages) {
      for (const slot of page.slots) {
        if (slot.photoId) ids.add(slot.photoId);
      }
    }
    return ids;
  }, [book.pages]);

  const handlePhotoClick = (photoId: string) => {
    if (selectedSlotId && selectedPageId) {
      updateSlot(selectedPageId, selectedSlotId, { photoId });
      onClose();
    }
  };

  const hasSelectedSlot = selectedSlotId !== null && selectedPageId !== null;

  return (
    <Drawer
      anchor="bottom"
      open={open}
      onClose={onClose}
      variant="persistent"
      sx={{
        "& .MuiDrawer-paper": {
          height: 240,
          bgcolor: "#F3F3F5",
          borderTop: "1px solid rgba(0,0,0,0.08)",
          boxShadow: "0px -8px 32px rgba(0,0,0,0.08)",
          // Account for left toolbar (72px) and right sidebar (192px)
          left: 72,
          right: 192,
          width: "auto",
        },
      }}
    >
      <Box sx={{ px: 2.5, pt: 1.5, pb: 1, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Box>
          <Typography sx={{ fontSize: "0.75rem", fontWeight: 700, color: "#333" }}>
            Photo Library
          </Typography>
          <Typography sx={{ fontSize: "0.65rem", color: "#999" }}>
            {hasSelectedSlot
              ? "Click a photo to assign it to the selected slot"
              : "Select a slot first, then pick a photo"}
          </Typography>
        </Box>
        <IconButton size="small" onClick={onClose} sx={{ color: "#999" }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>
      <Box
        sx={{
          flex: 1,
          overflowX: "auto",
          overflowY: "hidden",
          px: 2.5,
          pb: 2,
          display: "flex",
          gap: 1,
          alignItems: "flex-start",
        }}
      >
        {photos.map((photo) => {
          const thumbUrl = thumbnailUrls.get(photo.id);
          const isUsed = usedPhotoIds.has(photo.id);
          if (!thumbUrl) return null;

          return (
            <Box
              key={photo.id}
              onClick={() => handlePhotoClick(photo.id)}
              sx={{
                flexShrink: 0,
                width: 120,
                height: 120,
                borderRadius: 1,
                overflow: "hidden",
                cursor: hasSelectedSlot ? "pointer" : "default",
                border: "2px solid transparent",
                opacity: isUsed ? 0.5 : 1,
                position: "relative",
                "&:hover": hasSelectedSlot
                  ? {
                      border: "2px solid #08C225",
                      transform: "scale(1.03)",
                    }
                  : {},
                transition: "all 0.15s ease",
              }}
            >
              <img
                src={thumbUrl}
                alt={photo.fileName}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  display: "block",
                }}
              />
              {isUsed && (
                <Box
                  sx={{
                    position: "absolute",
                    bottom: 2,
                    right: 2,
                    bgcolor: "rgba(0,0,0,0.6)",
                    color: "white",
                    fontSize: "0.5rem",
                    px: 0.5,
                    borderRadius: 0.5,
                    fontWeight: 600,
                  }}
                >
                  In use
                </Box>
              )}
            </Box>
          );
        })}
      </Box>
    </Drawer>
  );
}
