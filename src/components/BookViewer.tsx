"use client";

import React, {
  useRef,
  useEffect,
  useState,
  useCallback,
  useMemo,
  forwardRef,
  useImperativeHandle,
} from "react";
import { Box } from "@mui/material";
import { PageFlip } from "page-flip";
import { Stage, Layer } from "react-konva";
import type { BookPage } from "@/lib/types";
import { useBook } from "@/context/BookContext";
import PageCanvas from "./PageCanvas";

export interface BookViewerHandle {
  flipNext: () => void;
  flipPrev: () => void;
}

interface BookViewerProps {
  pages: BookPage[];
  onPageChange: (pageIndex: number) => void;
}

const PAGE_ASPECT = 148 / 210;

const BookViewer = forwardRef<BookViewerHandle, BookViewerProps>(
  function BookViewer({ pages, onPageChange }, ref) {
    const { photoUrls, loadPreviews } = useBook();
    const containerRef = useRef<HTMLDivElement>(null);
    const bookRef = useRef<HTMLDivElement>(null);
    const pageFlipRef = useRef<PageFlip | null>(null);
    const [dimensions, setDimensions] = useState({ width: 800, height: 500 });
    // Ref to hold latest onPageChange to avoid stale closures in event handler
    const onPageChangeRef = useRef(onPageChange);
    onPageChangeRef.current = onPageChange;
    // Remembered page index so re-initializing PageFlip (e.g. after a resize)
    // does not jump the reader back to the cover.
    const startPageRef = useRef(0);

    // Load 1080px previews for all pages in the book
    const allPhotoIds = useMemo(
      () => pages.flatMap((p) => p.slots.filter((s) => s.photoId).map((s) => s.photoId!)),
      [pages]
    );
    useEffect(() => {
      if (allPhotoIds.length > 0) loadPreviews(allPhotoIds);
    }, [allPhotoIds, loadPreviews]);

    useEffect(() => {
      let debounceTimer: ReturnType<typeof setTimeout> | null = null;

      const applySize = () => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        setDimensions((prev) => {
          // Ignore no-op resize events — browsers fire `resize` for layout
          // changes that don't actually change our container size. Re-running
          // the PageFlip init effect on no-op resizes is what caused the book
          // view to randomly vanish.
          if (
            Math.abs(prev.width - rect.width) < 0.5 &&
            Math.abs(prev.height - rect.height) < 0.5
          ) {
            return prev;
          }
          return { width: rect.width, height: rect.height };
        });
      };

      // Initial measurement runs synchronously so the first render uses real
      // dimensions as soon as possible.
      applySize();

      const onResize = () => {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(applySize, 150);
      };
      window.addEventListener("resize", onResize);
      return () => {
        if (debounceTimer) clearTimeout(debounceTimer);
        window.removeEventListener("resize", onResize);
      };
    }, []);

    // Size pages to fill available space — constrained by both height and width
    // Two pages sit side-by-side, so spread width = 2 * pageWidth
    const maxByHeight = dimensions.height * 0.6;
    const maxByWidth = ((dimensions.width - 160) / 2 / PAGE_ASPECT) * 0.6; // 160px for arrow buttons
    const pageHeight = Math.max(300, Math.min(maxByHeight, maxByWidth, 1200));
    const pageWidth = Math.round(pageHeight * PAGE_ASPECT);

    // Expose navigation methods to parent
    useImperativeHandle(
      ref,
      () => ({
        flipNext: () => {
          pageFlipRef.current?.flipNext("bottom");
        },
        flipPrev: () => {
          pageFlipRef.current?.flipPrev("top");
        },
      }),
      []
    );

    const safeDestroy = useCallback(() => {
      if (pageFlipRef.current) {
        try {
          // Remember the current page so we can restore it after a re-init
          // (e.g. triggered by a window resize).
          const current = pageFlipRef.current.getCurrentPageIndex?.();
          if (typeof current === "number" && current >= 0) {
            startPageRef.current = current;
          }
        } catch {
          // ignore — fall back to last remembered value
        }
        try {
          pageFlipRef.current.destroy();
        } catch {
          // page-flip can throw if UI wasn't fully initialized
        }
        pageFlipRef.current = null;
      }
    }, []);

    // Initialize page-flip
    useEffect(() => {
      if (!bookRef.current || pages.length === 0 || pageWidth <= 0) return;

      safeDestroy();

      const timerId = setTimeout(() => {
        if (!bookRef.current) return;

        const pageElements =
          bookRef.current.querySelectorAll(".page-flip-page");
        if (pageElements.length === 0) return;

        // Clamp remembered start page against the current page count in case
        // pages were removed while we were unmounted.
        const startPage = Math.min(
          Math.max(startPageRef.current, 0),
          Math.max(pages.length - 1, 0)
        );

        try {
          const pf = new PageFlip(bookRef.current, {
            width: pageWidth,
            height: pageHeight,
            size: "fixed",
            showCover: true,
            maxShadowOpacity: 0.3,
            mobileScrollSupport: false,
            flippingTime: 800,
            useMouseEvents: true,
            swipeDistance: 30,
            startPage,
            drawShadow: true,
            showPageCorners: true,
            usePortrait: false,
          });

          pf.loadFromHTML(Array.from(pageElements) as HTMLElement[]);

          pf.on("flip", (e: any) => {
            const pageIndex = e.data as number;
            startPageRef.current = pageIndex;
            onPageChangeRef.current(pageIndex);
          });

          pageFlipRef.current = pf;

          // Report initial page so the parent label matches what is shown.
          onPageChangeRef.current(startPage);
        } catch (e) {
          console.warn("PageFlip initialization failed:", e);
        }
      }, 100);

      return () => {
        clearTimeout(timerId);
        safeDestroy();
      };
    }, [pageWidth, pageHeight, pages.length, safeDestroy]);

    return (
      <Box
        ref={containerRef}
        sx={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          minHeight: 400,
        }}
      >
        <Box
          // CRITICAL: key includes every value the PageFlip init effect
          // depends on. PageFlip.destroy() removes this very element from the
          // DOM (see node_modules/page-flip/src/PageFlip.ts: `this.block.remove()`
          // and UI.destroy clearing its children). Without a key, React
          // keeps reusing the detached element across re-inits and the book
          // silently vanishes. Re-keying guarantees a fresh, attached DOM
          // subtree every time the effect runs.
          key={`book-${pageWidth}x${pageHeight}-${pages.length}`}
          ref={bookRef}
          sx={{
            width: pageWidth * 2,
            height: pageHeight,
            position: "relative",
            boxShadow: "0 40px 100px -20px rgba(0,0,0,0.6)",
            borderRadius: 0.5,
            "&::after": {
              content: '""',
              position: "absolute",
              top: 0,
              left: "50%",
              width: "1px",
              height: "100%",
              backgroundColor: "rgba(0,0,0,0.12)",
              zIndex: 10,
              pointerEvents: "none",
            },
          }}
        >
          {pages.map((page, i) => (
            <PageElement
              key={page.id}
              page={page}
              pageWidth={pageWidth}
              pageHeight={pageHeight}
              photoUrls={photoUrls}
              isBackCover={i === pages.length - 1}
            />
          ))}
        </Box>
      </Box>
    );
  }
);

export default BookViewer;

function PageElement({
  page,
  pageWidth,
  pageHeight,
  photoUrls,
  isBackCover,
}: {
  page: BookPage;
  pageWidth: number;
  pageHeight: number;
  photoUrls?: Map<string, string>;
  isBackCover: boolean;
}) {
  return (
    <div
      className="page-flip-page"
      style={{
        width: pageWidth,
        height: pageHeight,
        background: "white",
        overflow: "hidden",
      }}
    >
      <Stage width={pageWidth} height={pageHeight} listening={false}>
        <Layer>
          <PageCanvas
            page={page}
            photoUrls={photoUrls}
            pageWidth={pageWidth}
            pageHeight={pageHeight}
            isBackCover={isBackCover}
          />
        </Layer>
      </Stage>
    </div>
  );
}
