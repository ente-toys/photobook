"use client";

import React, { useMemo } from "react";
import { Box } from "@mui/material";
import {
  getVariantsForCount,
  getVariantPreview,
  type LayoutVariant,
} from "@/lib/layouts";

const THUMB_W = 44;
const THUMB_H = Math.round(THUMB_W / (148 / 210)); // A5 aspect

interface LayoutPickerProps {
  photoCount: number;
  currentVariant?: string;
  thumbnailUrls: string[]; // ordered thumbnail URLs for the photos on this page
  onSelect: (variantKey: string) => void;
  side: "left" | "right";
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
        const left = (slot.x / 100) * THUMB_W;
        const top = (slot.y / 100) * THUMB_H;
        const width = (slot.width / 100) * THUMB_W;
        const height = (slot.height / 100) * THUMB_H;
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

export default function LayoutPicker({
  photoCount,
  currentVariant,
  thumbnailUrls,
  onSelect,
  side,
}: LayoutPickerProps) {
  const variants = useMemo(
    () => getVariantsForCount(photoCount),
    [photoCount]
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
      {variants.map((v) => (
        <VariantThumbnail
          key={v.key}
          variant={v}
          isActive={v.key === currentVariant}
          thumbnailUrls={thumbnailUrls}
          onClick={() => onSelect(v.key)}
        />
      ))}
    </Box>
  );
}
