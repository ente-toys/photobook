"use client";

import React, { useMemo } from "react";
import { Box } from "@mui/material";
import {
  getVariantsForCount,
  getVariantPreview,
  getMirrorVariant,
  type LayoutVariant,
} from "@/lib/layouts";

const THUMB_W = 44;
const THUMB_H = Math.round(THUMB_W / (148 / 210)); // A5 aspect

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
  onClick,
}: {
  variant: LayoutVariant;
  isActive: boolean;
  thumbnailUrls: string[];
  onClick: () => void;
}) {
  const slots = useMemo(() => getVariantPreview(variant.key), [variant.key]);

  return (
    <Box
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      sx={{
        width: THUMB_W,
        height: THUMB_H,
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
        const top = (slot.y / 100) * THUMB_H + GAP;
        const width = (slot.width / 100) * THUMB_W - GAP * 2;
        const height = (slot.height / 100) * THUMB_H - GAP * 2;
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

  return (
    <Box
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      sx={{
        width: 20,
        height: 20,
        borderRadius: 0.5,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        bgcolor: active ? "rgba(8, 194, 37, 0.15)" : "rgba(255,255,255,0.08)",
        border: active
          ? "1px solid rgba(8, 194, 37, 0.5)"
          : "1px solid rgba(255,255,255,0.2)",
        transition: "all 0.15s",
        "&:hover": {
          bgcolor: active
            ? "rgba(8, 194, 37, 0.25)"
            : "rgba(255,255,255,0.15)",
        },
      }}
      title={`${isH ? "Horizontal" : "Vertical"} padding: ${level}/${MAX_PADDING}`}
    >
      {/* Arrow icon */}
      <svg
        width="14"
        height="14"
        viewBox="0 0 14 14"
        fill="none"
        style={{
          transform: isH ? "none" : "rotate(90deg)",
        }}
      >
        {/* Left arrow */}
        <path
          d="M1 7L4 4.5V9.5L1 7Z"
          fill={active ? "#08C225" : "rgba(255,255,255,0.5)"}
        />
        {/* Right arrow */}
        <path
          d="M13 7L10 4.5V9.5L13 7Z"
          fill={active ? "#08C225" : "rgba(255,255,255,0.5)"}
        />
        {/* Center bar */}
        <rect
          x="5"
          y="6"
          width="4"
          height="2"
          rx="0.5"
          fill={active ? "#08C225" : "rgba(255,255,255,0.5)"}
        />
      </svg>
      {/* Level dots */}
      {level > 0 && (
        <Box
          sx={{
            position: "absolute",
            bottom: -1,
            right: -1,
            width: 7,
            height: 7,
            borderRadius: "50%",
            bgcolor: "#08C225",
            fontSize: "6px",
            lineHeight: "7px",
            textAlign: "center",
            color: "white",
            fontWeight: 700,
          }}
        >
          {level}
        </Box>
      )}
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
        gap: 0.5,
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
          flexDirection: "row",
          gap: 0.5,
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
