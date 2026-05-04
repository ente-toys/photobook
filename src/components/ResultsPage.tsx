"use client";

import React, {
  useState,
  useCallback,
  useRef,
  useMemo,
  useEffect,
} from "react";
import {
  Box,
  Button,
  ButtonGroup,
  Typography,
  IconButton,
  CircularProgress,
  LinearProgress,
  Dialog,
  DialogContent,
  Menu,
  MenuItem,
  Snackbar,
  Alert,
} from "@mui/material";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import EditIcon from "@mui/icons-material/Edit";
import DownloadIcon from "@mui/icons-material/Download";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import FolderZipIcon from "@mui/icons-material/FolderZip";
import { useBook } from "@/context/BookContext";
import BookViewer, { type BookViewerHandle } from "./BookViewer";
import {
  exportPdfX4A5,
  exportPdfX4A4Spreads,
  exportPngZip,
  exportPngA4Zip,
  downloadBlob,
} from "@/lib/export";

type ExportType = "pdf-a5" | "pdf-a4" | "png-zip" | "png-a4-zip";

export default function ResultsPage() {
  const { book, photos, setAppView, waitForEnteOriginals } = useBook();
  const viewerRef = useRef<BookViewerHandle>(null);
  // pageIndex is the 0-based page-flip index of the current left-most visible page
  const [pageIndex, setPageIndex] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [downloadAnchor, setDownloadAnchor] = useState<null | HTMLElement>(
    null,
  );
  const [exportError, setExportError] = useState<string | null>(null);
  const [waitingForOriginals, setWaitingForOriginals] = useState(false);
  const [originalsProgress, setOriginalsProgress] = useState({
    done: 0,
    total: 0,
  });
  const pages = book.pages;
  const totalPages = pages.length;
  const photosRef = useRef(photos);
  photosRef.current = photos;

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

  const usedPhotoIds = useMemo(() => {
    const ids = new Set<string>();
    for (const page of pages) {
      for (const slot of page.slots) {
        if (slot.photoId) {
          ids.add(slot.photoId);
        }
      }
    }
    return ids;
  }, [pages]);

  const handlePageChange = useCallback((idx: number) => {
    setPageIndex(idx);
  }, []);

  const getBlockedEntePhotos = useCallback(() => {
    return photosRef.current.filter(
      (photo) =>
        usedPhotoIds.has(photo.id) &&
        photo.source === "ente" &&
        photo.originalStatus !== "ready",
    );
  }, [usedPhotoIds]);

  // Keyboard navigation: left/right arrows flip pages
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if the user is typing into an input/textarea or a menu is open
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }
      if (downloadAnchor) return;

      if (e.key === "ArrowLeft" && !isAtStart) {
        e.preventDefault();
        viewerRef.current?.flipPrev();
      } else if (e.key === "ArrowRight" && !isAtEnd) {
        e.preventDefault();
        viewerRef.current?.flipNext();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isAtStart, isAtEnd, downloadAnchor]);

  const handleExport = useCallback(
    async (type: ExportType) => {
      setDownloadAnchor(null);

      const initiallyBlocked = getBlockedEntePhotos();
      const pendingIds = initiallyBlocked
        .filter((photo) => photo.originalStatus === "pending")
        .map((photo) => photo.id);

      if (pendingIds.length > 0) {
        setWaitingForOriginals(true);
        setOriginalsProgress({ done: 0, total: pendingIds.length });
        try {
          await waitForEnteOriginals(pendingIds, (done, total) => {
            setOriginalsProgress({ done, total });
          });
        } finally {
          setWaitingForOriginals(false);
        }
      }

      const remainingBlocked = getBlockedEntePhotos();
      if (remainingBlocked.length > 0) {
        const failedCount = remainingBlocked.filter(
          (photo) => photo.originalStatus === "failed",
        ).length;
        setExportError(
          failedCount > 0
            ? "Some Ente photos failed to prepare. Re-import the album before exporting."
            : "Ente originals are still being prepared. Please wait a moment and try again.",
        );
        return;
      }

      setExporting(true);
      setExportProgress(0);

      try {
        let blob: Blob;
        let filename: string;

        switch (type) {
          case "pdf-a5":
            blob = await exportPdfX4A5(pages, setExportProgress);
            filename = "photobook-A5-PDFX4-FOGRA39.pdf";
            break;
          case "pdf-a4":
            blob = await exportPdfX4A4Spreads(pages, setExportProgress);
            filename = "photobook-A4-spreads-PDFX4-FOGRA39.pdf";
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
        setExportError("Export failed. Please try again.");
      } finally {
        setExporting(false);
      }
    },
    [getBlockedEntePhotos, pages, waitForEnteOriginals],
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
            alignItems: "stretch",
            justifyContent: "center",
            px: 4,
            py: 1,
            position: "relative",
            minHeight: 0,
          }}
        >
          {/* Left arrow */}
          <IconButton
            onClick={() => viewerRef.current?.flipPrev()}
            disabled={isAtStart}
            sx={{
              position: "absolute",
              left: 24,
              top: "50%",
              transform: "translateY(-50%)",
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
              top: "50%",
              transform: "translateY(-50%)",
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
                <Typography sx={{ color: "rgba(255,255,255,0.2)" }}>
                  /
                </Typography>
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

            <ButtonGroup
              variant="contained"
              sx={{
                borderRadius: 999,
                background: "linear-gradient(135deg, #006E0F 0%, #08C225 100%)",
                boxShadow: "none",
                overflow: "hidden",
                "& .MuiButtonGroup-grouped": {
                  borderColor: "rgba(255,255,255,0.16)",
                  borderRadius: 0,
                  minWidth: 0,
                },
                "& .MuiButton-root": {
                  background: "transparent",
                  fontWeight: 700,
                  boxShadow: "none",
                  "&:hover": {
                    background: "rgba(0,0,0,0.08)",
                    boxShadow: "none",
                  },
                  "&.Mui-disabled": {
                    color: "rgba(255,255,255,0.7)",
                    background: "transparent",
                    opacity: 0.65,
                  },
                },
              }}
            >
              <Button
                startIcon={
                  exporting ? (
                    <CircularProgress size={18} sx={{ color: "white" }} />
                  ) : (
                    <DownloadIcon />
                  )
                }
                disabled={exporting}
                onClick={() => handleExport("pdf-a5")}
                sx={{
                  px: 4,
                  py: 1.5,
                  fontSize: "1rem",
                  lineHeight: 1.25,
                }}
              >
                {exporting ? `Exporting ${exportProgress}%` : "Download"}
              </Button>
              <Button
                aria-label="Choose download format"
                disabled={exporting}
                onClick={(e) => setDownloadAnchor(e.currentTarget)}
                sx={{
                  px: 1.25,
                  py: 1.5,
                }}
              >
                <ArrowDropDownIcon />
              </Button>
            </ButtonGroup>

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
                    minWidth: 300,
                    mb: 1,
                  },
                },
              }}
            >
              {[
                {
                  type: "pdf-a5" as const,
                  label: "Print-ready PDF",
                  detail: "A5 pages",
                  desc: "PDF/X-4, FOGRA39 CMYK",
                  icon: <PictureAsPdfIcon sx={{ fontSize: 20 }} />,
                },
                {
                  type: "pdf-a4" as const,
                  label: "Print-ready PDF",
                  detail: "A4 spreads",
                  desc: "PDF/X-4, FOGRA39 CMYK",
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
                        {" - "}
                        {opt.detail}
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

      <Dialog
        open={waitingForOriginals}
        slotProps={{
          backdrop: { sx: { bgcolor: "rgba(0,0,0,0.25)" } },
        }}
        PaperProps={{
          sx: {
            borderRadius: 3,
            bgcolor: "#fff",
            minWidth: 360,
            boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
          },
        }}
      >
        <Box sx={{ textAlign: "center", px: 3.5, py: 3.5 }}>
          <CircularProgress sx={{ color: "#08C225", mb: 2 }} size={36} />
          <Typography
            sx={{
              fontFamily: "var(--font-nunito), 'Nunito', sans-serif",
              fontWeight: 700,
              fontSize: "1.05rem",
              color: "#222",
              mb: 0.5,
            }}
          >
            Finishing your album download
          </Typography>
          <Typography
            sx={{
              fontFamily: "var(--font-nunito), 'Nunito', sans-serif",
              color: "#777",
              fontSize: "0.8rem",
              lineHeight: 1.6,
              mb: 2.5,
            }}
          >
            We need the full-resolution photos before we can build a print-ready
            file.
          </Typography>
          <LinearProgress
            variant="determinate"
            value={
              originalsProgress.total
                ? (originalsProgress.done / originalsProgress.total) * 100
                : 0
            }
            sx={{
              height: 6,
              borderRadius: 3,
              mb: 1,
              bgcolor: "#e8e8e8",
              "& .MuiLinearProgress-bar": {
                background: "linear-gradient(135deg, #006E0F 0%, #08C225 100%)",
                borderRadius: 3,
              },
            }}
          />
          <Typography
            sx={{
              fontFamily: "var(--font-nunito), 'Nunito', sans-serif",
              color: "#999",
              fontSize: "0.8rem",
            }}
          >
            {originalsProgress.done} / {originalsProgress.total} photos
          </Typography>
        </Box>
      </Dialog>

      <Snackbar
        open={Boolean(exportError)}
        autoHideDuration={6000}
        onClose={() => setExportError(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setExportError(null)}
          severity="error"
          variant="filled"
        >
          {exportError}
        </Alert>
      </Snackbar>
    </Box>
  );
}
