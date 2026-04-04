"use client";

import React from "react";
import { Box, IconButton, Tooltip } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import NoteAddIcon from "@mui/icons-material/NoteAdd";

import TextFieldsIcon from "@mui/icons-material/TextFields";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { useBook } from "@/context/BookContext";

interface ToolbarProps {
  onAddPhotos: () => void;
  onAddText: () => void;
}

export default function Toolbar({
  onAddPhotos,
  onAddText,
}: ToolbarProps) {
  const {
    addPage,
    removePage,
    currentSpreadIndex,
    book,
  } = useBook();

  const handleAddPage = () => {
    addPage(currentSpreadIndex + 1);
  };

  const handleAddText = () => {
    onAddText();
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
        bgcolor: "#141617",
        display: "flex",
        flexDirection: "column",
        py: 3,
        alignItems: "center",
        gap: 1.5,
        height: "100%",
        borderRight: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <Tooltip title="Add photos" placement="right">
        <IconButton
          onClick={onAddPhotos}
          sx={{
            width: 44,
            height: 44,
            color: "#888",
            "&:hover": { color: "#08C225", bgcolor: "rgba(255,255,255,0.08)" },
            borderRadius: 2,
            transition: "all 0.2s",
          }}
        >
          <AddIcon />
        </IconButton>
      </Tooltip>

      <Tooltip title="Add page" placement="right">
        <IconButton
          onClick={handleAddPage}
          sx={{
            width: 44,
            height: 44,
            color: "#888",
            "&:hover": { color: "#08C225", bgcolor: "rgba(255,255,255,0.08)" },
            borderRadius: 2,
            transition: "all 0.2s",
          }}
        >
          <NoteAddIcon />
        </IconButton>
      </Tooltip>

      <Tooltip title="Add text" placement="right">
        <IconButton
          onClick={handleAddText}
          sx={{
            width: 44,
            height: 44,
            color: "#888",
            "&:hover": { color: "#08C225", bgcolor: "rgba(255,255,255,0.08)" },
            borderRadius: 2,
            transition: "all 0.2s",
          }}
        >
          <TextFieldsIcon />
        </IconButton>
      </Tooltip>

      <Box sx={{ flex: 1 }} />

      <Tooltip title="Remove current spread" placement="right">
        <IconButton
          onClick={handleRemovePage}
          disabled={book.pages.length <= 2}
          sx={{
            width: 44,
            height: 44,
            color: "#555",
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
