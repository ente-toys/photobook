"use client";

import React, { useMemo, useRef } from "react";
import { Box, Typography } from "@mui/material";
import { Stage, Layer } from "react-konva";
import { useBook } from "@/context/BookContext";
import PageCanvas from "./PageCanvas";

const THUMB_PAGE_W = 60;
const THUMB_PAGE_H = Math.round(THUMB_PAGE_W / (148 / 210)); // A5 aspect

interface PageStripProps {
  scrollContainerRef?: React.RefObject<HTMLDivElement | null>;
  onSpreadClick?: (spreadIdx: number) => void;
}

export default function PageStrip({
  scrollContainerRef,
  onSpreadClick,
}: PageStripProps) {
  const { book, reorderPages } = useBook();
  const pages = book.pages;
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  // Same spread grouping as EditPage: cover alone on right, interior paired, back cover alone on left
  const spreads = useMemo(() => {
    const result: { left: number | null; right: number | null }[] = [];
    if (pages.length === 0) return result;
    if (pages.length === 1) return [{ left: null, right: 0 }];

    result.push({ left: null, right: 0 });

    for (let i = 1; i <= pages.length - 2; i += 2) {
      result.push({
        left: i,
        right: i + 1 <= pages.length - 2 ? i + 1 : null,
      });
    }

    result.push({ left: pages.length - 1, right: null });

    return result;
  }, [pages.length]);

  const handleDragStart = (idx: number) => {
    dragItem.current = idx;
  };

  const handleDragEnter = (idx: number) => {
    dragOverItem.current = idx;
  };

  const handleDragEnd = () => {
    if (
      dragItem.current !== null &&
      dragOverItem.current !== null &&
      dragItem.current !== dragOverItem.current
    ) {
      reorderPages(dragItem.current, dragOverItem.current);
    }
    dragItem.current = null;
    dragOverItem.current = null;
  };

  return (
    <Box
      ref={scrollContainerRef}
      sx={{
        width: 192,
        bgcolor: "#141617",
        display: "flex",
        flexDirection: "column",
        py: 3,
        px: 2,
        height: "100%",
        overflowY: "auto",
        borderLeft: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <Typography
        sx={{
          fontSize: "0.6rem",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          color: "#08C225",
          mb: 0.5,
          fontWeight: 500,
        }}
      >
        Preview
      </Typography>
      <Typography
        sx={{
          fontSize: "0.85rem",
          fontWeight: 900,
          color: "#ddd",
          mb: 2,
        }}
      >
        Pages
      </Typography>

      <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
        {spreads.map((spread, spreadIdx) => {
          const leftPage = spread.left !== null ? pages[spread.left] : null;
          const rightPage = spread.right !== null ? pages[spread.right] : null;

          return (
            <Box
              key={spreadIdx}
              onClick={() => onSpreadClick?.(spreadIdx)}
              draggable
              onDragStart={() => handleDragStart(spreadIdx)}
              onDragEnter={() => handleDragEnter(spreadIdx)}
              onDragEnd={handleDragEnd}
              sx={{
                cursor: "pointer",
                borderRadius: 1.5,
                p: 1,
                "&:hover": {
                  bgcolor: "rgba(255,255,255,0.06)",
                },
                transition: "all 0.2s",
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  gap: "2px",
                  width: THUMB_PAGE_W * 2 + 2, // fixed width matching two thumbnails + gap
                  justifyContent: leftPage ? "flex-start" : "flex-end",
                }}
              >
                {/* Left page thumbnail */}
                {leftPage && (
                  <Box
                    sx={{
                      flex: "0 0 auto",
                      width: THUMB_PAGE_W,
                      aspectRatio: `${148}/${210}`,
                      bgcolor: "white",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 0.5,
                      overflow: "hidden",
                    }}
                  >
                    <Stage
                      width={THUMB_PAGE_W}
                      height={THUMB_PAGE_H}
                      listening={false}
                      style={{ pointerEvents: "none" }}
                    >
                      <Layer>
                        <PageCanvas
                          page={leftPage}
                          pageWidth={THUMB_PAGE_W}
                          pageHeight={THUMB_PAGE_H}
                        />
                      </Layer>
                    </Stage>
                  </Box>
                )}
                {/* Right page thumbnail */}
                {rightPage && (
                  <Box
                    sx={{
                      flex: "0 0 auto",
                      width: THUMB_PAGE_W,
                      aspectRatio: `${148}/${210}`,
                      bgcolor: "white",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 0.5,
                      overflow: "hidden",
                    }}
                  >
                    <Stage
                      width={THUMB_PAGE_W}
                      height={THUMB_PAGE_H}
                      listening={false}
                      style={{ pointerEvents: "none" }}
                    >
                      <Layer>
                        <PageCanvas
                          page={rightPage}
                          pageWidth={THUMB_PAGE_W}
                          pageHeight={THUMB_PAGE_H}
                        />
                      </Layer>
                    </Stage>
                  </Box>
                )}
              </Box>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: leftPage && rightPage ? "space-between" : leftPage ? "flex-start" : "flex-end",
                  width: THUMB_PAGE_W * 2 + 2,
                  px: 0.5,
                  mt: 0.5,
                }}
              >
                {leftPage && (
                  <Typography
                    sx={{
                      fontSize: "0.5rem",
                      fontWeight: 700,
                      color: "#666",
                    }}
                  >
                    {spread.left! === 0 ? "Cover" : spread.left! === pages.length - 1 ? "Back Cover" : spread.left!}
                  </Typography>
                )}
                {rightPage && (
                  <Typography
                    sx={{
                      fontSize: "0.5rem",
                      fontWeight: 700,
                      color: "#666",
                    }}
                  >
                    {spread.right! === 0 ? "Cover" : spread.right! === pages.length - 1 ? "Back Cover" : spread.right!}
                  </Typography>
                )}
              </Box>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
