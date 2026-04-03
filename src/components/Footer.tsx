"use client";

import { useState } from "react";
import { Box, Typography, Link, Dialog, DialogTitle, DialogContent, IconButton } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

export default function Footer({ showPrivacyPolicy = false }: { showPrivacyPolicy?: boolean }) {
  const [privacyOpen, setPrivacyOpen] = useState(false);

  return (
    <Box
      component="footer"
      sx={{
        bgcolor: "#141617",
        py: 4,
        borderTop: "1px solid rgba(255,255,255,0.06)",
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
            fontFamily: "'Manrope', sans-serif",
            fontSize: "0.85rem",
            color: "#777",
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
          fontFamily: "'Manrope', sans-serif",
          fontSize: "0.75rem",
          color: "#666",
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
