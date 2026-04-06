"use client";

import { useCallback, useRef, useState } from "react";
import {
  Box,
  Button,
  Typography,
  LinearProgress,
  CircularProgress,
} from "@mui/material";
import { useBook } from "@/context/BookContext";

const ACCEPTED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
];

const MAX_PHOTOS = 400;

export default function StartPage() {
  const { addPhotos, processingPhotos, processingProgress } = useBook();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFiles = useCallback(
    (files: FileList | File[]) => {
      const valid = Array.from(files)
        .filter((f) => {
          const ext = f.name.toLowerCase().split(".").pop();
          return (
            ACCEPTED_TYPES.includes(f.type) ||
            ext === "heic" ||
            ext === "heif" ||
            ext === "jpg" ||
            ext === "jpeg" ||
            ext === "png" ||
            ext === "webp"
          );
        })
        .slice(0, MAX_PHOTOS);

      if (valid.length > 0) {
        addPhotos(valid, true);
      }
    },
    [addPhotos]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOver(false);
  }, []);

  if (processingPhotos) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          bgcolor: "#fff",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 3,
          pt: 8,
        }}
      >
        <CircularProgress sx={{ color: "#08C225" }} size={48} />
        <Typography
          sx={{
            fontFamily: "var(--font-sora), 'Avenir Next', 'Segoe UI', sans-serif",
            fontWeight: 700,
            fontSize: "1.25rem",
            color: "#1a1c1d",
          }}
        >
          Processing your photos...
        </Typography>
        <Box sx={{ width: 300 }}>
          <LinearProgress
            variant="determinate"
            value={processingProgress}
            sx={{
              height: 6,
              borderRadius: 3,
              bgcolor: "#e8e8e8",
              "& .MuiLinearProgress-bar": {
                background:
                  "linear-gradient(135deg, #006E0F 0%, #08C225 100%)",
                borderRadius: 3,
                transition: "none",
              },
            }}
          />
        </Box>
        <Typography sx={{ color: "#888", fontSize: "0.9rem" }}>
          {processingProgress}% complete
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "#fff",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Hero */}
      <Box
        component="main"
        sx={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          position: "relative",
          px: 3,
          pt: { xs: "128px", sm: "170px" },
          pb: 8,
        }}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >

        {/* Drag overlay */}
        {dragOver && (
          <Box
            sx={{
              position: "absolute",
              inset: 0,
              zIndex: 30,
              bgcolor: "rgba(8, 194, 37, 0.08)",
              border: "3px dashed #08C225",
              borderRadius: 2,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Typography
              sx={{
                fontSize: "1.5rem",
                fontWeight: 700,
                color: "#08C225",
              }}
            >
              Drop your photos here
            </Typography>
          </Box>
        )}

        {/* Content */}
        <Box
          sx={{
            position: "relative",
            zIndex: 10,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            maxWidth: 1100,
          }}
        >
          <Typography
            variant="h1"
            sx={{
              fontFamily: "var(--font-sora), 'Avenir Next', 'Segoe UI', sans-serif",
              fontSize: { xs: "2.5rem", md: "4rem" },
              fontWeight: 800,
              letterSpacing: "-0.02em",
              mb: 2,
              lineHeight: 1.1,
              color: "#1a1c1d",
            }}
          >
            Your memories deserve a book
          </Typography>
          <Typography
            sx={{
              fontFamily: "var(--font-sora), 'Avenir Next', 'Segoe UI', sans-serif",
              fontSize: "1.15rem",
              color: "#666",
              maxWidth: 560,
              lineHeight: 1.7,
              mb: 6,
            }}
          >
            Drop in your photos, get a print-ready photobook.
            <br />
            Beautifully arranged, completely private, and free.
          </Typography>

          {/* Preview card */}
          <Box
            sx={{
              mb: 8,
              position: "relative",
              "& .card": {
                transition: "transform 0.5s ease",
              },
              "&:hover .card": {
                transform: "rotate(0deg) !important",
              },
            }}
          >
            <Box
              className="card"
              component="img"
              src="/hero-photo.jpg"
              alt="A photobook page with photos from Delhi"
              draggable={false}
              onDragStart={(e: React.DragEvent) => e.preventDefault()}
              sx={{
                width: { xs: 260, md: 380 },
                height: "auto",
                borderRadius: 2,
                boxShadow: "0px 16px 40px rgba(0, 0, 0, 0.15), 0px 4px 12px rgba(0, 0, 0, 0.08)",
                transform: "rotate(-3deg)",
                position: "relative",
                zIndex: 20,
                userSelect: "none",
                pointerEvents: "none",
              }}
            />
          </Box>

          {/* CTA Button */}
          <Button
            variant="contained"
            size="large"

            onClick={() => fileInputRef.current?.click()}
            sx={{
              background:
                "linear-gradient(135deg, #006E0F 0%, #08C225 100%)",
              fontFamily: "var(--font-sora), 'Avenir Next', 'Segoe UI', sans-serif",
              fontSize: "1.15rem",
              fontWeight: 700,
              px: 6,
              py: 2,
              mb: 3,
              boxShadow: "none",
              "&:hover": {
                transform: "scale(1.02)",
                background:
                  "linear-gradient(135deg, #005309 0%, #06A81F 100%)",
              },
              "&:active": {
                transform: "scale(0.95)",
              },
              transition: "all 0.3s ease",
            }}
          >
            Choose your photos
          </Button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
            multiple
            style={{ display: "none" }}
            onChange={(e) => {
              if (e.target.files) handleFiles(e.target.files);
            }}
          />

          <Typography
            sx={{
              fontFamily: "var(--font-sora), 'Avenir Next', 'Segoe UI', sans-serif",
              fontSize: "0.85rem",
              color: "#999",
              letterSpacing: "0.04em",
            }}
          >
            Print-ready. Auto-arranged. 100% in your browser.
          </Typography>

        </Box>
      </Box>

    </Box>
  );
}
