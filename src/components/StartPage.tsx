"use client";

import { useCallback, useRef, useState } from "react";
import {
  Box,
  Button,
  Typography,
  LinearProgress,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
} from "@mui/material";
import LinkIcon from "@mui/icons-material/Link";
import { useBook } from "@/context/BookContext";

const ACCEPTED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
];

const MAX_PHOTOS = 800;

type EnteDialogStage = "closed" | "url" | "password";

export default function StartPage() {
  const {
    addPhotos,
    addEntePhotos,
    processingPhotos,
    processingProgress,
    processingMessage,
  } = useBook();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  // --- Ente dialog state --------------------------------------------------
  const [enteStage, setEnteStage] = useState<EnteDialogStage>("closed");
  const [enteUrl, setEnteUrl] = useState("");
  const [entePassword, setEntePassword] = useState("");
  const [enteError, setEnteError] = useState<string | null>(null);
  // Resolver for the password Promise handed back to addEntePhotos.
  const passwordResolverRef = useRef<((pw: string | null) => void) | null>(
    null,
  );

  const openEnteDialog = useCallback(() => {
    setEnteStage("url");
    setEnteError(null);
    setEntePassword("");
  }, []);

  const closeEnteDialog = useCallback(() => {
    // If we're closing while waiting for a password, resolve with null so
    // the import aborts cleanly.
    const resolve = passwordResolverRef.current;
    passwordResolverRef.current = null;
    if (resolve) resolve(null);
    setEnteStage("closed");
    setEnteError(null);
  }, []);

  const requestPassword = useCallback((): Promise<string | null> => {
    return new Promise((resolve) => {
      passwordResolverRef.current = resolve;
      setEntePassword("");
      setEnteError(null);
      setEnteStage("password");
    });
  }, []);

  const handleImportEnte = useCallback(async () => {
    setEnteError(null);
    const url = enteUrl.trim();
    if (!url) {
      setEnteError("Paste the album link first.");
      return;
    }
    // Close the URL dialog so the fullscreen processing UI takes over; we'll
    // re-open it if we need a password.
    setEnteStage("closed");

    try {
      await addEntePhotos(url, requestPassword);
      // Success: addEntePhotos navigates to the edit view, dialog stays closed.
      setEnteUrl("");
    } catch (e) {
      const cancelled = (e as { cancelled?: boolean })?.cancelled === true;
      if (cancelled) {
        // User cancelled the password prompt — drop silently.
        return;
      }
      const msg = e instanceof Error ? e.message : "Something went wrong.";
      // Re-open the URL dialog with the error surfaced.
      setEnteStage("url");
      setEnteError(msg);
    }
  }, [enteUrl, addEntePhotos, requestPassword]);

  const handleSubmitPassword = useCallback(() => {
    const resolve = passwordResolverRef.current;
    passwordResolverRef.current = null;
    setEnteStage("closed");
    if (resolve) resolve(entePassword);
  }, [entePassword]);

  const handleCancelPassword = useCallback(() => {
    const resolve = passwordResolverRef.current;
    passwordResolverRef.current = null;
    setEnteStage("closed");
    if (resolve) resolve(null);
  }, []);

  // --- File picker / drag-drop --------------------------------------------

  const handleFiles = useCallback(
    (files: FileList | File[]) => {
      const valid = Array.from(files)
        .filter((f) => {
          const ext = f.name.toLowerCase().split(".").pop();
          return (
            ACCEPTED_TYPES.includes(f.type) ||
            ext === "heic" ||
            ext === "heif" ||
            ext === "jpg" ||
            ext === "jpeg" ||
            ext === "png" ||
            ext === "webp"
          );
        })
        .slice(0, MAX_PHOTOS);

      if (valid.length > 0) {
        addPhotos(valid, true);
      }
    },
    [addPhotos]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOver(false);
  }, []);

  if (processingPhotos) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          bgcolor: "#fff",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 3,
          pt: 8,
        }}
      >
        <CircularProgress sx={{ color: "#08C225" }} size={48} />
        <Typography
          sx={{
            fontFamily: "var(--font-sora), 'Avenir Next', 'Segoe UI', sans-serif",
            fontWeight: 700,
            fontSize: "1.25rem",
            color: "#1a1c1d",
          }}
        >
          {processingMessage}
        </Typography>
        <Box sx={{ width: 300 }}>
          <LinearProgress
            variant="determinate"
            value={processingProgress}
            sx={{
              height: 6,
              borderRadius: 3,
              bgcolor: "#e8e8e8",
              "& .MuiLinearProgress-bar": {
                background:
                  "linear-gradient(135deg, #006E0F 0%, #08C225 100%)",
                borderRadius: 3,
                transition: "none",
              },
            }}
          />
        </Box>
        <Typography sx={{ color: "#888", fontSize: "0.9rem" }}>
          {processingProgress}% complete
        </Typography>

        {/* The password dialog has to live inside the processing screen too,
            because the import is paused waiting on the user here. */}
        <EntePasswordDialog
          open={enteStage === "password"}
          password={entePassword}
          onPasswordChange={setEntePassword}
          onSubmit={handleSubmitPassword}
          onCancel={handleCancelPassword}
        />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "#fff",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Hero */}
      <Box
        component="main"
        sx={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          position: "relative",
          px: 3,
          pt: { xs: "128px", sm: "170px" },
          pb: 8,
        }}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >

        {/* Drag overlay */}
        {dragOver && (
          <Box
            sx={{
              position: "absolute",
              inset: 0,
              zIndex: 30,
              bgcolor: "rgba(8, 194, 37, 0.08)",
              border: "3px dashed #08C225",
              borderRadius: 2,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Typography
              sx={{
                fontSize: "1.5rem",
                fontWeight: 700,
                color: "#08C225",
              }}
            >
              Drop your photos here
            </Typography>
          </Box>
        )}

        {/* Content */}
        <Box
          sx={{
            position: "relative",
            zIndex: 10,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            maxWidth: 1100,
          }}
        >
          <Typography
            variant="h1"
            sx={{
              fontFamily: "var(--font-sora), 'Avenir Next', 'Segoe UI', sans-serif",
              fontSize: { xs: "2.5rem", md: "4rem" },
              fontWeight: 800,
              letterSpacing: "-0.02em",
              mb: 2,
              lineHeight: 1.1,
              color: "#1a1c1d",
            }}
          >
            Your memories deserve a book
          </Typography>
          <Typography
            sx={{
              fontFamily: "var(--font-sora), 'Avenir Next', 'Segoe UI', sans-serif",
              fontSize: "1.15rem",
              color: "#666",
              maxWidth: 560,
              lineHeight: 1.7,
              mb: 6,
            }}
          >
            Drop in your photos and get a print-ready photobook.
            <br />
            Beautifully arranged, completely private, and free.
          </Typography>

          {/* Preview card */}
          <Box
            sx={{
              mb: 8,
              position: "relative",
              "& .card": {
                transition: "transform 0.5s ease",
              },
              "&:hover .card": {
                transform: "rotate(0deg) !important",
              },
            }}
          >
            <Box
              className="card"
              component="img"
              src="/hero-photo.jpg"
              alt="A photobook page with photos from Delhi"
              draggable={false}
              onDragStart={(e: React.DragEvent) => e.preventDefault()}
              sx={{
                width: { xs: 260, md: 380 },
                height: "auto",
                borderRadius: 2,
                boxShadow: "0px 16px 40px rgba(0, 0, 0, 0.15), 0px 4px 12px rgba(0, 0, 0, 0.08)",
                transform: "rotate(-3deg)",
                position: "relative",
                zIndex: 20,
                userSelect: "none",
                pointerEvents: "none",
              }}
            />
          </Box>

          {/* CTA Button */}
          <Button
            variant="contained"
            size="large"

            onClick={() => fileInputRef.current?.click()}
            sx={{
              background:
                "linear-gradient(135deg, #006E0F 0%, #08C225 100%)",
              fontFamily: "var(--font-sora), 'Avenir Next', 'Segoe UI', sans-serif",
              fontSize: "1.15rem",
              fontWeight: 700,
              px: 6,
              py: 2,
              mb: 0,
              boxShadow: "none",
              "&:hover": {
                transform: "scale(1.02)",
                background:
                  "linear-gradient(135deg, #005309 0%, #06A81F 100%)",
              },
              "&:active": {
                transform: "scale(0.95)",
              },
              transition: "all 0.3s ease",
            }}
          >
            Choose your photos
          </Button>

          <Button
            variant="text"
            disableRipple
            startIcon={<LinkIcon sx={{ fontSize: "1rem !important" }} />}
            onClick={openEnteDialog}
            sx={{
              color: "#08C225",
              fontFamily:
                "var(--font-sora), 'Avenir Next', 'Segoe UI', sans-serif",
              fontSize: "0.9rem",
              fontWeight: 500,
              mb: 3,
              textTransform: "none",
              bgcolor: "transparent",
              "&:hover": {
                color: "#006E0F",
                bgcolor: "transparent",
              },
              transition: "color 0.2s ease",
            }}
          >
            Import from Ente Photos
          </Button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
            multiple
            style={{ display: "none" }}
            onChange={(e) => {
              if (e.target.files) handleFiles(e.target.files);
            }}
          />

          <Typography
            sx={{
              fontFamily: "var(--font-sora), 'Avenir Next', 'Segoe UI', sans-serif",
              fontSize: "0.85rem",
              color: "#999",
              letterSpacing: "0.04em",
            }}
          >
            Print-ready. Auto-arranged. 100% in your browser.
          </Typography>

        </Box>
      </Box>

      {/* Ente URL entry dialog */}
      <EnteUrlDialog
        open={enteStage === "url"}
        url={enteUrl}
        error={enteError}
        onUrlChange={setEnteUrl}
        onSubmit={handleImportEnte}
        onCancel={closeEnteDialog}
      />

      {/* Password dialog shown on top of the processing screen too — but also
          reachable directly if the user hits a password-protected album
          immediately (rare but possible depending on network timing). */}
      <EntePasswordDialog
        open={enteStage === "password"}
        password={entePassword}
        onPasswordChange={setEntePassword}
        onSubmit={handleSubmitPassword}
        onCancel={handleCancelPassword}
      />
    </Box>
  );
}

interface EnteUrlDialogProps {
  open: boolean;
  url: string;
  error: string | null;
  onUrlChange: (v: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
}

function EnteUrlDialog({
  open,
  url,
  error,
  onUrlChange,
  onSubmit,
  onCancel,
}: EnteUrlDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onCancel}
      maxWidth="xs"
      fullWidth
      slotProps={{
        backdrop: { sx: { bgcolor: "transparent" } },
      }}
      PaperProps={{
        sx: {
          borderRadius: 3,
          bgcolor: "#fff",
          overflow: "hidden",
          boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
        },
      }}
    >
      <Box sx={{ px: 3.5, pt: 3.5, pb: 3.5, textAlign: "center" }}>
        <Typography
          sx={{
            fontFamily: "var(--font-nunito), 'Nunito', sans-serif",
            fontWeight: 700,
            fontSize: "1.15rem",
            color: "#222",
            mb: 0.75,
          }}
        >
          Import from Ente Photos
        </Typography>
        <Typography
          sx={{
            fontFamily: "var(--font-nunito), 'Nunito', sans-serif",
            color: "#777",
            mb: 2.5,
            fontSize: "0.8rem",
            lineHeight: 1.6,
          }}
        >
          Paste a public album link. Photos are downloaded and
          decrypted locally in your browser.
        </Typography>
        <TextField
          autoFocus
          fullWidth
          variant="outlined"
          placeholder="https://albums.ente.io/?t=…#…"
          value={url}
          onChange={(e) => onUrlChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onSubmit();
            }
          }}
          slotProps={{
            input: {
              sx: {
                fontFamily: "ui-monospace, monospace",
                fontSize: "0.85rem",
                borderRadius: 2,
                color: "#333",
              },
            },
          }}
          sx={{
            "& .MuiOutlinedInput-root": {
              "& fieldset": { borderColor: "#ddd" },
              "&:hover fieldset": { borderColor: "#bbb" },
              "&.Mui-focused fieldset": { borderColor: "#08C225" },
            },
          }}
        />
        {error && (
          <Alert severity="error" sx={{ mt: 2, borderRadius: 2 }}>
            {error}
          </Alert>
        )}
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: 1.5,
            mt: 3,
          }}
        >
          <Button
            onClick={onCancel}
            sx={{
              fontFamily: "var(--font-nunito), 'Nunito', sans-serif",
              color: "#999",
              fontWeight: 600,
              textTransform: "none",
              px: 3,
              "&:hover": { color: "#555", bgcolor: "transparent" },
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={onSubmit}
            variant="contained"
            disableElevation
            sx={{
              fontFamily: "var(--font-nunito), 'Nunito', sans-serif",
              background:
                "linear-gradient(135deg, #006E0F 0%, #08C225 100%)",
              fontWeight: 700,
              textTransform: "none",
              borderRadius: 2,
              px: 3,
              boxShadow: "none",
              "&:hover": {
                background:
                  "linear-gradient(135deg, #005309 0%, #06A81F 100%)",
                boxShadow: "none",
              },
            }}
          >
            Import
          </Button>
        </Box>
      </Box>
    </Dialog>
  );
}

interface EntePasswordDialogProps {
  open: boolean;
  password: string;
  onPasswordChange: (v: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
}

function EntePasswordDialog({
  open,
  password,
  onPasswordChange,
  onSubmit,
  onCancel,
}: EntePasswordDialogProps) {
  return (
    <Dialog open={open} onClose={onCancel} maxWidth="xs" fullWidth>
      <DialogTitle
        sx={{
          fontFamily: "var(--font-sora), sans-serif",
          fontWeight: 700,
        }}
      >
        Album password
      </DialogTitle>
      <DialogContent>
        <Typography sx={{ color: "#666", mb: 2, fontSize: "0.95rem" }}>
          This album is password-protected. Enter the password shared with you.
        </Typography>
        <TextField
          autoFocus
          fullWidth
          variant="outlined"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => onPasswordChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onSubmit();
            }
          }}
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onCancel} sx={{ color: "#666" }}>
          Cancel
        </Button>
        <Button
          onClick={onSubmit}
          variant="contained"
          sx={{
            background: "linear-gradient(135deg, #006E0F 0%, #08C225 100%)",
            fontWeight: 700,
            "&:hover": {
              background: "linear-gradient(135deg, #005309 0%, #06A81F 100%)",
            },
          }}
        >
          Unlock
        </Button>
      </DialogActions>
    </Dialog>
  );
}
