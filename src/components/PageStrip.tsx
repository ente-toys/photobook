"use client";

import React, { useRef, useState, useEffect, useCallback, type RefCallback } from "react";
import { Box, Typography } from "@mui/material";
import { Stage, Layer } from "react-konva";
import { useBook } from "@/context/BookContext";
import PageCanvas from "./PageCanvas";
import { useSpreads } from "@/hooks/useSpreads";

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
  const stripContainerRef = useRef<HTMLDivElement | null>(null);

  const spreads = useSpreads(pages.length);

  // Virtualization: only render visible spread thumbnails
  const [visibleSpreads, setVisibleSpreads] = useState<Set<number>>(() => new Set([0, 1, 2, 3, 4, 5, 6, 7]));
  const stripElsRef = useRef<Map<number, Element>>(new Map());
  const stripObserverRef = useRef<IntersectionObserver | null>(null);

  // Combine external scrollContainerRef with our internal ref
  const setScrollRef = useCallback(
    (el: HTMLDivElement | null) => {
      stripContainerRef.current = el;
      if (scrollContainerRef && "current" in scrollContainerRef) {
        (scrollContainerRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
      }
    },
    [scrollContainerRef]
  );

  useEffect(() => {
    const root = stripContainerRef.current;
    if (!root) return;

    const observer = new IntersectionObserver(
      (entries) => {
        setVisibleSpreads((prev) => {
          const next = new Set(prev);
          for (const entry of entries) {
            const idx = Number((entry.target as HTMLElement).dataset.stripSpreadIndex);
            if (!isNaN(idx)) {
              if (entry.isIntersecting) next.add(idx);
              else next.delete(idx);
            }
          }
          if (next.size === prev.size && [...next].every((v) => prev.has(v)))
            return prev;
          return next;
        });
      },
      { root, rootMargin: "300px 0px" }
    );
    stripObserverRef.current = observer;

    stripElsRef.current.forEach((el) => observer.observe(el));

    return () => {
      observer.disconnect();
      stripObserverRef.current = null;
    };
  }, [spreads.length]);

  const stripSpreadRefCallback = useCallback(
    (idx: number): RefCallback<HTMLDivElement> =>
      (el) => {
        const prev = stripElsRef.current.get(idx);
        if (prev && stripObserverRef.current) stripObserverRef.current.unobserve(prev);

        if (el) {
          stripElsRef.current.set(idx, el);
          if (stripObserverRef.current) stripObserverRef.current.observe(el);
        } else {
          stripElsRef.current.delete(idx);
        }
      },
    []
  );

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
      ref={setScrollRef}
      sx={{
        width: 192,
        bgcolor: "#141617",
        display: "flex",
        flexDirection: "column",
        pt: 1,
        pb: 3,
        px: 2,
        flex: 1,
        overflowY: "auto",
      }}
    >
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
        {spreads.map((spread, spreadIdx) => {
          const isVisible = visibleSpreads.has(spreadIdx);
          const leftPage = spread.left !== null ? pages[spread.left] : null;
          const rightPage = spread.right !== null ? pages[spread.right] : null;

          return (
            <Box
              key={spreadIdx}
              ref={stripSpreadRefCallback(spreadIdx)}
              data-strip-spread-index={spreadIdx}
              onClick={() => onSpreadClick?.(spreadIdx)}
              draggable
              onDragStart={() => handleDragStart(spreadIdx)}
              onDragEnter={() => handleDragEnter(spreadIdx)}
              onDragEnd={handleDragEnd}
              sx={{
                cursor: "pointer",
                borderRadius: 1.5,
                p: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                minHeight: THUMB_PAGE_H + 24,
                "&:hover": {
                  bgcolor: "rgba(255,255,255,0.06)",
                },
                transition: "all 0.2s",
              }}
            >
              {isVisible && (
                <>
                  <Box
                    sx={{
                      display: "flex",
                      gap: "2px",
                      justifyContent: leftPage ? "flex-start" : "flex-end",
                      width: THUMB_PAGE_W * 2 + 2,
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
                              isFrontCover={spread.left === 0}
                              isBackCover={spread.left === pages.length - 1}
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
                              isFrontCover={spread.right === 0}
                              isBackCover={spread.right === pages.length - 1}
                            />
                          </Layer>
                        </Stage>
                      </Box>
                    )}
                  </Box>
                  <Box
                    sx={{
                      display: "flex",
                      width: THUMB_PAGE_W * 2 + 2,
                      mt: 0.5,
                    }}
                  >
                    {leftPage && (
                      <Typography
                        sx={{
                          width: THUMB_PAGE_W,
                          fontSize: "0.75rem",
                          fontWeight: 600,
                          color: "rgba(255,255,255,0.45)",
                          textAlign: "center",
                        }}
                      >
                        {spread.left! === 0 ? "Cover" : spread.left! === pages.length - 1 ? "Back cover" : spread.left!}
                      </Typography>
                    )}
                    {rightPage && (
                      <Typography
                        sx={{
                          width: THUMB_PAGE_W,
                          fontSize: "0.75rem",
                          fontWeight: 600,
                          color: "rgba(255,255,255,0.45)",
                          textAlign: "center",
                          ml: leftPage ? "2px" : "auto",
                        }}
                      >
                        {spread.right! === 0 ? "Cover" : spread.right! === pages.length - 1 ? "Back cover" : spread.right!}
                      </Typography>
                    )}
                  </Box>
                </>
              )}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
