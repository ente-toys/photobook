"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import type { TextBlock } from "@/lib/types";

const PRESET_COLORS = [
  "#1a1c1d",
  "#ffffff",
  "#08C225",
  "#3B82F6",
  "#EF4444",
  "#F59E0B",
  "#8B5CF6",
  "#EC4899",
];

const FONT_SIZES = [
  { label: "S", value: 2 },
  { label: "M", value: 3 },
  { label: "L", value: 4.5 },
  { label: "XL", value: 6 },
];

interface TextToolbarProps {
  block: TextBlock;
  pageWidth: number;
  pageHeight: number;
  onUpdate: (updates: Partial<TextBlock>) => void;
  onDelete: () => void;
  onEdit: () => void;
}

export default function TextToolbar({
  block,
  pageWidth,
  pageHeight,
  onUpdate,
  onDelete,
  onEdit,
}: TextToolbarProps) {
  const [showColors, setShowColors] = useState(false);
  const [showRotation, setShowRotation] = useState(false);
  const colorRef = useRef<HTMLDivElement>(null);
  const rotationRef = useRef<HTMLDivElement>(null);

  // Close popups on outside click
  useEffect(() => {
    if (!showColors && !showRotation) return;
    const handler = (e: MouseEvent) => {
      if (showColors && colorRef.current && !colorRef.current.contains(e.target as Node)) {
        setShowColors(false);
      }
      if (showRotation && rotationRef.current && !rotationRef.current.contains(e.target as Node)) {
        setShowRotation(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showColors, showRotation]);

  const bx = (block.x / 100) * pageWidth;
  const by = (block.y / 100) * pageHeight;
  const bw = (block.width / 100) * pageWidth;

  // Position toolbar above the text block, centered
  const toolbarLeft = bx + bw / 2;
  const toolbarTop = by - 44;

  const currentSize = FONT_SIZES.find((s) => Math.abs(s.value - (block.fontSize ?? 2.5)) < 0.3);

  const btnStyle: React.CSSProperties = {
    width: 28,
    height: 28,
    border: "none",
    background: "transparent",
    color: "rgba(255,255,255,0.8)",
    cursor: "pointer",
    borderRadius: 4,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 13,
    fontFamily: "'Manrope', sans-serif",
    padding: 0,
    transition: "background 0.15s",
  };

  const activeBtnStyle: React.CSSProperties = {
    ...btnStyle,
    background: "rgba(255,255,255,0.15)",
    color: "#fff",
  };

  const handleSizeChange = () => {
    const currentIdx = FONT_SIZES.findIndex(
      (s) => Math.abs(s.value - (block.fontSize ?? 2.5)) < 0.3
    );
    const nextIdx = (currentIdx + 1) % FONT_SIZES.length;
    onUpdate({
      fontSize: FONT_SIZES[nextIdx].value,
      style: FONT_SIZES[nextIdx].value >= 4 ? "title" : "body",
    });
  };

  const rotation = block.rotation ?? 0;

  return (
    <div
      style={{
        position: "absolute",
        left: toolbarLeft,
        top: toolbarTop,
        transform: "translateX(-50%)",
        zIndex: 20,
        display: "flex",
        alignItems: "center",
        gap: 2,
        background: "rgba(30,32,34,0.95)",
        backdropFilter: "blur(12px)",
        borderRadius: 8,
        padding: "3px 4px",
        boxShadow: "0 4px 20px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.08)",
      }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* Edit text */}
      <button
        style={btnStyle}
        onClick={onEdit}
        onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.1)")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        title="Edit text"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 000-1.41l-2.34-2.34a1 1 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" fill="currentColor"/>
        </svg>
      </button>

      <div style={{ width: 1, height: 18, background: "rgba(255,255,255,0.12)" }} />

      {/* Font size cycle */}
      <button
        style={{ ...btnStyle, fontWeight: 700, fontSize: 12, width: 32 }}
        onClick={handleSizeChange}
        onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.1)")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        title="Font size"
      >
        {currentSize?.label ?? "M"}
      </button>

      {/* Color */}
      <div ref={colorRef} style={{ position: "relative" }}>
        <button
          style={btnStyle}
          onClick={() => { setShowColors(!showColors); setShowRotation(false); }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.1)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          title="Text color"
        >
          <div
            style={{
              width: 16,
              height: 16,
              borderRadius: 3,
              background: block.color ?? "#1a1c1d",
              border: "2px solid rgba(255,255,255,0.3)",
            }}
          />
        </button>
        {showColors && (
          <div
            style={{
              position: "absolute",
              top: "calc(100% + 6px)",
              left: "50%",
              transform: "translateX(-50%)",
              background: "rgba(30,32,34,0.95)",
              backdropFilter: "blur(12px)",
              borderRadius: 8,
              padding: 6,
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 4,
              boxShadow: "0 4px 20px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.08)",
            }}
          >
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => {
                  onUpdate({ color: c });
                  setShowColors(false);
                }}
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 4,
                  background: c,
                  border:
                    (block.color ?? "#1a1c1d") === c
                      ? "2px solid #08C225"
                      : c === "#ffffff"
                        ? "1px solid rgba(255,255,255,0.3)"
                        : "1px solid rgba(255,255,255,0.1)",
                  cursor: "pointer",
                  padding: 0,
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Rotation */}
      <div ref={rotationRef} style={{ position: "relative" }}>
        <button
          style={rotation !== 0 ? activeBtnStyle : btnStyle}
          onClick={() => { setShowRotation(!showRotation); setShowColors(false); }}
          onMouseEnter={(e) => {
            if (rotation === 0)
              e.currentTarget.style.background = "rgba(255,255,255,0.1)";
          }}
          onMouseLeave={(e) => {
            if (rotation === 0)
              e.currentTarget.style.background = "transparent";
          }}
          title={`Rotate (${Math.round(rotation)}°)`}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M7.11 8.53L5.7 7.11C4.8 8.27 4.24 9.61 4.07 11h2.02c.14-.87.49-1.72 1.02-2.47zM6.09 13H4.07c.17 1.39.72 2.73 1.62 3.89l1.41-1.42c-.52-.75-.87-1.59-1.01-2.47zm1.01 5.32c1.16.9 2.51 1.44 3.9 1.61V17.9c-.87-.15-1.71-.49-2.46-1.03L7.1 18.32zM13 4.07V1L8.45 5.55 13 10V6.09c2.84.48 5 2.94 5 5.91s-2.16 5.43-5 5.91v2.02c3.95-.49 7-3.85 7-7.93s-3.05-7.44-7-7.93z"/>
          </svg>
        </button>
        {showRotation && (
          <div
            style={{
              position: "absolute",
              top: "calc(100% + 6px)",
              left: "50%",
              transform: "translateX(-50%)",
              background: "rgba(30,32,34,0.95)",
              backdropFilter: "blur(12px)",
              borderRadius: 8,
              padding: "8px 12px",
              boxShadow: "0 4px 20px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.08)",
              display: "flex",
              alignItems: "center",
              gap: 8,
              whiteSpace: "nowrap",
            }}
          >
            <input
              type="range"
              min={-180}
              max={180}
              step={1}
              value={rotation}
              onChange={(e) => onUpdate({ rotation: Number(e.target.value) })}
              style={{
                width: 120,
                accentColor: "#08C225",
                cursor: "pointer",
              }}
            />
            <span
              style={{
                color: "rgba(255,255,255,0.7)",
                fontSize: 11,
                fontFamily: "'Manrope', sans-serif",
                minWidth: 32,
                textAlign: "right",
              }}
            >
              {Math.round(rotation)}°
            </span>
            {rotation !== 0 && (
              <button
                onClick={() => onUpdate({ rotation: 0 })}
                style={{
                  ...btnStyle,
                  width: 20,
                  height: 20,
                  fontSize: 11,
                  color: "rgba(255,255,255,0.5)",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.1)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                title="Reset rotation"
              >
                ×
              </button>
            )}
          </div>
        )}
      </div>

      <div style={{ width: 1, height: 18, background: "rgba(255,255,255,0.12)" }} />

      {/* Delete */}
      <button
        style={{ ...btnStyle, color: "rgba(255,120,120,0.8)" }}
        onClick={onDelete}
        onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,80,80,0.15)")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        title="Delete text"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
        </svg>
      </button>
    </div>
  );
}
