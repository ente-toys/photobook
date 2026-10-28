"use client";

import { uiColors } from "@/theme/colors";

import { useState } from "react";
import { Box, Typography, Link, Dialog, DialogTitle, DialogContent, IconButton } from "@mui/material";
import { CloseIcon } from "./icons";

export default function Footer({ showPrivacyPolicy = false, light = false }: { showPrivacyPolicy?: boolean; light?: boolean }) {
  const [privacyOpen, setPrivacyOpen] = useState(false);

  return (
    <Box
      component="footer"
      sx={{
        bgcolor: uiColors.background,
        py: 4,
        borderTop: `1px solid ${uiColors.border}`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 1.5,
      }}
    >
      {showPrivacyPolicy && (
        <Link
          component="button"
          underline="hover"
          onClick={() => setPrivacyOpen(true)}
          sx={{
            fontFamily: "var(--font-manrope), sans-serif",
            fontSize: "0.85rem",
            color: uiColors.muted,
            border: "none",
            background: "none",
            cursor: "pointer",
          }}
        >
          Privacy Policy
        </Link>
      )}
      <Typography
        sx={{
          fontFamily: "var(--font-manrope), sans-serif",
          fontSize: "0.75rem",
          color: uiColors.muted,
        }}
      >
        &copy; 2026 Ente Photobook. Handcrafted for your memories.
      </Typography>

      <Dialog open={privacyOpen} onClose={() => setPrivacyOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          Privacy Policy
          <IconButton onClick={() => setPrivacyOpen(false)} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2 }}>
            Ente Photobook runs entirely in your browser. Your photos are never uploaded to any server.
          </Typography>
          <Typography sx={{ mb: 2 }}>
            All processing — layout, editing, and export — happens locally on your device. We do not collect, store, or have access to any of your photos or personal data.
          </Typography>
          <Typography>
            No accounts, no tracking, no cookies. Your memories stay yours.
          </Typography>
        </DialogContent>
      </Dialog>
    </Box>
  );
}
