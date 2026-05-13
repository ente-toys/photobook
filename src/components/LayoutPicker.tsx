"use client";

import React, { useMemo } from "react";
import { Box } from "@mui/material";
import {
  getVariantsForCount,
  getVariantPreview,
  getMirrorVariant,
  type LayoutVariant,
} from "@/lib/layouts";
import { getBookFormatAspect, type BookFormatId } from "@/lib/bookFormats";
import { useBook } from "@/context/BookContext";

const THUMB_W = 44;

interface LayoutPickerProps {
  photoCount: number;
  currentVariant?: string;
  thumbnailUrls: string[]; // ordered thumbnail URLs for the photos on this page
  onSelect: (variantKey: string) => void;
  paddingH: number;
  paddingV: number;
  onPaddingChange: (paddingH: number, paddingV: number) => void;
  side: "left" | "right";
  excludeFullScreen?: boolean;
}

function VariantThumbnail({
  variant,
  isActive,
  thumbnailUrls,
  formatId,
  thumbH,
  onClick,
}: {
  variant: LayoutVariant;
  isActive: boolean;
  thumbnailUrls: string[];
  formatId: BookFormatId;
  thumbH: number;
  onClick: () => void;
}) {
  const slots = useMemo(
    () => getVariantPreview(variant.key, formatId),
    [variant.key, formatId],
  );

  return (
    <Box
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      sx={{
        width: THUMB_W,
        height: thumbH,
        bgcolor: "white",
        borderRadius: 0.5,
        position: "relative",
        overflow: "hidden",
        cursor: "pointer",
        flexShrink: 0,
        outline: isActive ? "2px solid #08C225" : "2px solid transparent",
        transition: "outline-color 0.15s",
        "&:hover": {
          outline: isActive
            ? "2px solid #08C225"
            : "2px solid rgba(255,255,255,0.5)",
        },
      }}
    >
      {slots.map((slot, i) => {
        const url = thumbnailUrls[i];
        const GAP = 1.5; // px gap between slots for visibility
        const left = (slot.x / 100) * THUMB_W + GAP;
        const top = (slot.y / 100) * thumbH + GAP;
        const width = (slot.width / 100) * THUMB_W - GAP * 2;
        const height = (slot.height / 100) * thumbH - GAP * 2;
        return (
          <Box
            key={i}
            sx={{
              position: "absolute",
              left: `${left}px`,
              top: `${top}px`,
              width: `${width}px`,
              height: `${height}px`,
              bgcolor: url ? undefined : "#b0b0b0",
              borderRadius: "1px",
              overflow: "hidden",
            }}
          >
            {url && (
              <img
                src={url}
                alt=""
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  display: "block",
                }}
              />
            )}
          </Box>
        );
      })}
    </Box>
  );
}

const MAX_PADDING = 3;

function PaddingButton({
  direction,
  level,
  onClick,
}: {
  direction: "h" | "v";
  level: number;
  onClick: () => void;
}) {
  const isH = direction === "h";
  const active = level > 0;
  const iconColor = active ? "#08C225" : "rgba(255,255,255,0.7)";

  return (
    <Box
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      sx={{
        width: THUMB_W,
        height: 46,
        borderRadius: 1,
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "6px",
        bgcolor: active ? "rgba(8, 194, 37, 0.12)" : "rgba(255,255,255,0.06)",
        border: active
          ? "1px solid rgba(8, 194, 37, 0.45)"
          : "1px solid rgba(255,255,255,0.18)",
        transition: "all 0.15s",
        "&:hover": {
          bgcolor: active
            ? "rgba(8, 194, 37, 0.2)"
            : "rgba(255,255,255,0.12)",
          borderColor: active
            ? "rgba(8, 194, 37, 0.6)"
            : "rgba(255,255,255,0.3)",
        },
      }}
      title={`${isH ? "Horizontal" : "Vertical"} padding: ${level}/${MAX_PADDING}`}
    >
      {/* Two-rectangle icon — the gap between rectangles represents the padding */}
      <svg
        width="22"
        height="22"
        viewBox="0 0 22 22"
        fill="none"
        style={{
          transform: isH ? "none" : "rotate(90deg)",
          flexShrink: 0,
        }}
      >
        <rect x="3" y="4" width="7" height="14" rx="1.25" fill={iconColor} />
        <rect x="12" y="4" width="7" height="14" rx="1.25" fill={iconColor} />
      </svg>
      {/* Level indicator */}
      <Box sx={{ display: "flex", gap: "3px" }}>
        {[1, 2, 3].map((i) => (
          <Box
            key={i}
            sx={{
              width: 4,
              height: 4,
              borderRadius: "50%",
              bgcolor: i <= level ? "#08C225" : "rgba(255,255,255,0.25)",
              transition: "background-color 0.15s",
            }}
          />
        ))}
      </Box>
    </Box>
  );
}

export default function LayoutPicker({
  photoCount,
  currentVariant,
  thumbnailUrls,
  onSelect,
  paddingH,
  paddingV,
  onPaddingChange,
  side,
  excludeFullScreen = false,
}: LayoutPickerProps) {
  const { bookFormat } = useBook();
  const thumbH = Math.round(THUMB_W / getBookFormatAspect(bookFormat));
  const variants = useMemo(
    () => {
      const all = getVariantsForCount(photoCount);
      return excludeFullScreen ? all.filter((v) => v.key !== "1-full") : all;
    },
    [photoCount, excludeFullScreen]
  );

  if (variants.length === 0) return null;

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 1,
        alignItems: "center",
        ...(side === "left" ? { pr: 1 } : { pl: 1 }),
      }}
    >
      {variants.map((v) => {
        // A hidden mirror's primary should show as active
        const mirrorOfCurrent = currentVariant ? getMirrorVariant(currentVariant) : undefined;
        const isActive = v.key === currentVariant || v.key === mirrorOfCurrent;
        return (
          <VariantThumbnail
            key={v.key}
            variant={v}
            isActive={isActive}
            thumbnailUrls={thumbnailUrls}
            formatId={bookFormat.id}
            thumbH={thumbH}
            onClick={() => {
              if (isActive) {
                // Toggle to mirror variant if one exists
                const mirror = getMirrorVariant(currentVariant!);
                if (mirror) onSelect(mirror);
              } else {
                onSelect(v.key);
              }
            }}
          />
        );
      })}

      {/* Padding controls */}
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: 1,
          mt: 0.5,
          pt: 0.75,
          borderTop: "1px solid rgba(255,255,255,0.15)",
        }}
      >
        <PaddingButton
          direction="h"
          level={paddingH}
          onClick={() =>
            onPaddingChange((paddingH + 1) % (MAX_PADDING + 1), paddingV)
          }
        />
        <PaddingButton
          direction="v"
          level={paddingV}
          onClick={() =>
            onPaddingChange(paddingH, (paddingV + 1) % (MAX_PADDING + 1))
          }
        />
      </Box>
    </Box>
  );
}
