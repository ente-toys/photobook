"use client";

import React, {
  useRef,
  useEffect,
  useState,
  useCallback,
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
    const containerRef = useRef<HTMLDivElement>(null);
    const bookRef = useRef<HTMLDivElement>(null);
    const pageFlipRef = useRef<PageFlip | null>(null);
    const [dimensions, setDimensions] = useState({ width: 800, height: 500 });
    // Ref to hold latest onPageChange to avoid stale closures in event handler
    const onPageChangeRef = useRef(onPageChange);
    onPageChangeRef.current = onPageChange;

    useEffect(() => {
      const updateSize = () => {
        if (containerRef.current) {
          const rect = containerRef.current.getBoundingClientRect();
          setDimensions({ width: rect.width, height: rect.height });
        }
      };
      updateSize();
      window.addEventListener("resize", updateSize);
      return () => window.removeEventListener("resize", updateSize);
    }, []);

    const pageHeight = Math.min(dimensions.height * 0.85, 600);
    const pageWidth = Math.round(pageHeight * PAGE_ASPECT);

    // Expose navigation methods to parent
    useImperativeHandle(
      ref,
      () => ({
        flipNext: () => {
          pageFlipRef.current?.turnToNextPage();
        },
        flipPrev: () => {
          pageFlipRef.current?.turnToPrevPage();
        },
      }),
      []
    );

    const safeDestroy = useCallback(() => {
      if (pageFlipRef.current) {
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
            startPage: 0,
            drawShadow: true,
            showPageCorners: true,
            usePortrait: false,
          });

          pf.loadFromHTML(Array.from(pageElements) as HTMLElement[]);

          pf.on("flip", (e: any) => {
            const pageIndex = e.data as number;
            onPageChangeRef.current(pageIndex);
          });

          pageFlipRef.current = pf;

          // Report initial page
          onPageChangeRef.current(0);
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
          ref={bookRef}
          sx={{
            width: pageWidth * 2,
            height: pageHeight,
            position: "relative",
            boxShadow: "0 40px 100px -20px rgba(0,0,0,0.6)",
            borderRadius: 0.5,
          }}
        >
          {pages.map((page, idx) => (
            <PageElement
              key={page.id}
              page={page}
              pageWidth={pageWidth}
              pageHeight={pageHeight}
              pageNumber={idx + 1}
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
  pageNumber,
}: {
  page: BookPage;
  pageWidth: number;
  pageHeight: number;
  pageNumber: number;
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
            pageWidth={pageWidth}
            pageHeight={pageHeight}
          />
        </Layer>
      </Stage>
    </div>
  );
}
