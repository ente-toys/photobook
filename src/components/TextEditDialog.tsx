"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  ToggleButtonGroup,
  ToggleButton,
  Box,
  Typography,
} from "@mui/material";
import FormatAlignLeftIcon from "@mui/icons-material/FormatAlignLeft";
import FormatAlignCenterIcon from "@mui/icons-material/FormatAlignCenter";
import FormatAlignRightIcon from "@mui/icons-material/FormatAlignRight";
import type { TextBlock, TextAlignment, TextStyle } from "@/lib/types";

interface TextEditDialogProps {
  open: boolean;
  block: TextBlock | null;
  onSave: (updates: Partial<TextBlock>) => void;
  onClose: () => void;
  onDelete: () => void;
}

export default function TextEditDialog({
  open,
  block,
  onSave,
  onClose,
  onDelete,
}: TextEditDialogProps) {
  const [text, setText] = useState("");
  const [style, setStyle] = useState<TextStyle>("body");
  const [alignment, setAlignment] = useState<TextAlignment>("center");

  useEffect(() => {
    if (block) {
      setText(block.text);
      setStyle(block.style);
      setAlignment(block.alignment);
    }
  }, [block]);

  const handleSave = () => {
    onSave({ text, style, alignment });
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontFamily: "'Manrope', sans-serif", fontWeight: 700 }}>
        Edit Text
      </DialogTitle>
      <DialogContent>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
          <TextField
            autoFocus
            multiline
            rows={3}
            value={text}
            onChange={(e) => setText(e.target.value)}
            fullWidth
            sx={{
              "& .MuiInputBase-root": {
                fontFamily: "'Manrope', sans-serif",
                fontStyle: style === "title" ? "italic" : "normal",
                fontWeight: style === "title" ? 700 : 400,
                fontSize: style === "title" ? "1.5rem" : "1rem",
              },
            }}
          />
          <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
            <Typography sx={{ fontSize: "0.85rem", color: "#666" }}>
              Style:
            </Typography>
            <ToggleButtonGroup
              value={style}
              exclusive
              onChange={(_, v) => v && setStyle(v)}
              size="small"
            >
              <ToggleButton value="title">Title</ToggleButton>
              <ToggleButton value="body">Body</ToggleButton>
            </ToggleButtonGroup>
          </Box>
          <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
            <Typography sx={{ fontSize: "0.85rem", color: "#666" }}>
              Align:
            </Typography>
            <ToggleButtonGroup
              value={alignment}
              exclusive
              onChange={(_, v) => v && setAlignment(v)}
              size="small"
            >
              <ToggleButton value="left">
                <FormatAlignLeftIcon fontSize="small" />
              </ToggleButton>
              <ToggleButton value="center">
                <FormatAlignCenterIcon fontSize="small" />
              </ToggleButton>
              <ToggleButton value="right">
                <FormatAlignRightIcon fontSize="small" />
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onDelete} color="error">
          Delete
        </Button>
        <Box sx={{ flex: 1 }} />
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} variant="contained">
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}
