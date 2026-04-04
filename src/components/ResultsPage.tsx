"use client";

import React, { useState, useCallback, useRef, useMemo } from "react";
import {
  Box,
  Button,
  Typography,
  IconButton,
  CircularProgress,
  Menu,
  MenuItem,
  Snackbar,
  Alert,
} from "@mui/material";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import EditIcon from "@mui/icons-material/Edit";
import DownloadIcon from "@mui/icons-material/Download";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import FolderZipIcon from "@mui/icons-material/FolderZip";
import { useBook } from "@/context/BookContext";
import BookViewer, { type BookViewerHandle } from "./BookViewer";
import {
  exportPdfA5,
  exportPdfA4Spreads,
  exportPngZip,
  exportPngA4Zip,
  downloadBlob,
} from "@/lib/export";

export default function ResultsPage() {
  const { book, setAppView } = useBook();
  const viewerRef = useRef<BookViewerHandle>(null);
  // pageIndex is the 0-based page-flip index of the current left-most visible page
  const [pageIndex, setPageIndex] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [downloadAnchor, setDownloadAnchor] = useState<null | HTMLElement>(
    null
  );
  const [exportError, setExportError] = useState(false);
  const pages = book.pages;
  const totalPages = pages.length;

  // With showCover: true, page-flip treats page 0 as front cover (single),
  // last page as back cover (single), and everything in between as spreads.
  // The flip event gives us the 0-based index of the page being shown.
  //
  // Page display logic:
  //   index 0          → "Cover"
  //   index 1          → "1-2"        (first interior spread, counting from 1 after cover)
  //   index 3          → "3-4"
  //   index N-1        → "Back cover"
  const pageLabel = useMemo(() => {
    if (totalPages === 0) return "";
    if (pageIndex === 0) return "Cover";
    if (pageIndex >= totalPages - 1) return "Back cover";
    // Interior spread: pages count from 1 after the cover
    return `${pageIndex}-${pageIndex + 1}`;
  }, [pageIndex, totalPages]);

  const isAtStart = pageIndex === 0;
  const isAtEnd = pageIndex >= totalPages - 1;

  const handlePageChange = useCallback((idx: number) => {
    setPageIndex(idx);
  }, []);

  const handleExport = useCallback(
    async (type: "pdf-a5" | "pdf-a4" | "png-zip" | "png-a4-zip") => {
      setDownloadAnchor(null);
      setExporting(true);
      setExportProgress(0);

      try {
        let blob: Blob;
        let filename: string;

        switch (type) {
          case "pdf-a5":
            blob = await exportPdfA5(pages, setExportProgress);
            filename = "photobook-A5.pdf";
            break;
          case "pdf-a4":
            blob = await exportPdfA4Spreads(
              pages,
              setExportProgress
            );
            filename = "photobook-A4-spreads.pdf";
            break;
          case "png-zip":
            blob = await exportPngZip(pages, setExportProgress);
            filename = "photobook-pages.zip";
            break;
          case "png-a4-zip":
            blob = await exportPngA4Zip(pages, setExportProgress);
            filename = "photobook-A4-spreads.zip";
            break;
        }

        downloadBlob(blob, filename);
      } catch (e) {
        console.error("Export failed:", e);
        setExportError(true);
      } finally {
        setExporting(false);
      }
    },
    [pages]
  );

  return (
    <Box sx={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Dark viewer area */}
      <Box
        sx={{
          flex: 1,
          pt: "64px",
          bgcolor: "#1a1c1d",
          display: "flex",
          flexDirection: "column",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Navigation arrows + viewer */}
        <Box
          sx={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            px: 4,
            py: 1,
            position: "relative",
          }}
        >
          {/* Left arrow */}
          <IconButton
            onClick={() => viewerRef.current?.flipPrev()}
            disabled={isAtStart}
            sx={{
              position: "absolute",
              left: 24,
              zIndex: 10,
              width: 48,
              height: 48,
              color: "white",
              bgcolor: "rgba(226, 226, 228, 0.15)",
              backdropFilter: "blur(10px)",
              "&:hover": { bgcolor: "rgba(226, 226, 228, 0.3)" },
              "&.Mui-disabled": { opacity: 0.3 },
            }}
          >
            <ChevronLeftIcon sx={{ fontSize: 32 }} />
          </IconButton>

          {/* Book viewer */}
          <BookViewer
            ref={viewerRef}
            pages={pages}
            onPageChange={handlePageChange}
          />

          {/* Right arrow */}
          <IconButton
            onClick={() => viewerRef.current?.flipNext()}
            disabled={isAtEnd}
            sx={{
              position: "absolute",
              right: 24,
              zIndex: 10,
              width: 48,
              height: 48,
              color: "white",
              bgcolor: "rgba(226, 226, 228, 0.15)",
              backdropFilter: "blur(10px)",
              "&:hover": { bgcolor: "rgba(226, 226, 228, 0.3)" },
              "&.Mui-disabled": { opacity: 0.3 },
            }}
          >
            <ChevronRightIcon sx={{ fontSize: 32 }} />
          </IconButton>
        </Box>

        {/* Bottom controls */}
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 1.5,
            pb: 2,
          }}
        >
          {/* Page indicator */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 1.5,
              bgcolor: "rgba(226, 226, 228, 0.1)",
              backdropFilter: "blur(20px)",
              border: "1px solid rgba(255,255,255,0.05)",
              px: 3,
              py: 1,
              borderRadius: 999,
              minWidth: 180,
              minHeight: 56,
            }}
          >
            <Typography
              sx={{
                color: "rgba(255,255,255,0.4)",
                fontSize: "0.7rem",
                textTransform: "uppercase",
                letterSpacing: "0.2em",
                fontWeight: 500,
              }}
            >
              Page
            </Typography>
            <Typography
              sx={{ color: "#08C225", fontWeight: 700, fontSize: "0.85rem" }}
            >
              {pageLabel}
            </Typography>
            {pageIndex > 0 && pageIndex < totalPages - 1 && (
              <>
                <Typography sx={{ color: "rgba(255,255,255,0.2)" }}>/</Typography>
                <Typography
                  sx={{
                    color: "rgba(255,255,255,0.6)",
                    fontWeight: 500,
                    fontSize: "0.85rem",
                  }}
                >
                  {totalPages - 2}
                </Typography>
              </>
            )}
          </Box>

          {/* Action buttons */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 4 }}>
            <Button
              startIcon={<EditIcon />}
              onClick={() => setAppView("edit")}
              sx={{
                color: "rgba(255,255,255,0.7)",
                fontWeight: 500,
                textTransform: "uppercase",
                fontSize: "0.8rem",
                letterSpacing: "0.05em",
                "&:hover": { color: "white" },
              }}
            >
              Edit photobook
            </Button>

            <Button
              variant="contained"
              startIcon={
                exporting ? (
                  <CircularProgress size={18} sx={{ color: "white" }} />
                ) : (
                  <DownloadIcon />
                )
              }
              disabled={exporting}
              onClick={(e) => setDownloadAnchor(e.currentTarget)}
              sx={{
                background:
                  "linear-gradient(135deg, #006E0F 0%, #08C225 100%)",
                fontWeight: 700,
                fontSize: "0.85rem",
                px: 4,
                py: 1.5,
                "&:hover": {
                  background:
                    "linear-gradient(135deg, #005C0D 0%, #07A820 100%)",
                },
              }}
            >
              {exporting ? `Exporting ${exportProgress}%` : "Download"}
            </Button>

            <Menu
              anchorEl={downloadAnchor}
              open={Boolean(downloadAnchor)}
              onClose={() => setDownloadAnchor(null)}
              anchorOrigin={{ vertical: "top", horizontal: "center" }}
              transformOrigin={{ vertical: "bottom", horizontal: "center" }}
              slotProps={{
                paper: {
                  sx: {
                    bgcolor: "rgba(30, 32, 34, 0.85)",
                    backdropFilter: "blur(24px)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 3,
                    boxShadow: "0 16px 48px rgba(0,0,0,0.4)",
                    p: 1,
                    minWidth: 260,
                    mb: 1,
                  },
                },
              }}
            >
              {[
                {
                  type: "pdf-a5" as const,
                  label: "PDF",
                  detail: "A5 pages",
                  desc: "One page per PDF page",
                  icon: <PictureAsPdfIcon sx={{ fontSize: 20 }} />,
                },
                {
                  type: "pdf-a4" as const,
                  label: "PDF",
                  detail: "A4 spreads",
                  desc: "Two pages per PDF page",
                  icon: <PictureAsPdfIcon sx={{ fontSize: 20 }} />,
                },
                {
                  type: "png-zip" as const,
                  label: "ZIP",
                  detail: "A5 PNGs",
                  desc: "High-res PNG per page",
                  icon: <FolderZipIcon sx={{ fontSize: 20 }} />,
                },
                {
                  type: "png-a4-zip" as const,
                  label: "ZIP",
                  detail: "A4 spread PNGs",
                  desc: "Two pages per image",
                  icon: <FolderZipIcon sx={{ fontSize: 20 }} />,
                },
              ].map((opt) => (
                <MenuItem
                  key={opt.type}
                  onClick={() => handleExport(opt.type)}
                  sx={{
                    borderRadius: 2,
                    px: 2,
                    py: 1.25,
                    mb: 0.5,
                    gap: 1.5,
                    "&:last-child": { mb: 0 },
                    "&:hover": {
                      bgcolor: "rgba(255,255,255,0.06)",
                    },
                  }}
                >
                  <Box
                    sx={{
                      width: 36,
                      height: 36,
                      borderRadius: 1.5,
                      bgcolor: "rgba(255,255,255,0.06)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "rgba(255,255,255,0.5)",
                      flexShrink: 0,
                    }}
                  >
                    {opt.icon}
                  </Box>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography
                      sx={{
                        color: "rgba(255,255,255,0.92)",
                        fontSize: "0.85rem",
                        fontWeight: 600,
                        lineHeight: 1.3,
                      }}
                    >
                      {opt.label}
                      <Typography
                        component="span"
                        sx={{
                          color: "rgba(255,255,255,0.45)",
                          fontWeight: 400,
                          ml: 0.75,
                        }}
                      >
                        — {opt.detail}
                      </Typography>
                    </Typography>
                    <Typography
                      sx={{
                        color: "rgba(255,255,255,0.35)",
                        fontSize: "0.75rem",
                        lineHeight: 1.3,
                      }}
                    >
                      {opt.desc}
                    </Typography>
                  </Box>
                </MenuItem>
              ))}
            </Menu>
          </Box>
        </Box>
      </Box>

      <Snackbar
        open={exportError}
        autoHideDuration={6000}
        onClose={() => setExportError(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setExportError(false)}
          severity="error"
          variant="filled"
        >
          Export failed. Please try again.
        </Alert>
      </Snackbar>
    </Box>
  );
}
