"use client";

import { useEffect, useState } from "react";
import { Box, CircularProgress, Snackbar, Alert, Button, Dialog, DialogContent, Typography, IconButton } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { BookProvider, useBook } from "@/context/BookContext";
import NavBar from "@/components/NavBar";
import StartPage from "@/components/StartPage";
import EditPage from "@/components/EditPage";
import ResultsPage from "@/components/ResultsPage";

function AppContent() {
  const { appView, loading, restored, setRestored, startOver, importNotice, clearImportNotice } = useBook();
  const [showMobileHint, setShowMobileHint] = useState(false);

  useEffect(() => {
    if (
      appView === "edit" &&
      typeof window !== "undefined" &&
      window.matchMedia("(max-width: 640px)").matches
    ) {
      const dismissed = sessionStorage.getItem("mobile-hint-dismissed");
      if (!dismissed) setShowMobileHint(true);
    }
  }, [appView]);

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <CircularProgress sx={{ color: "#08C225" }} />
      </Box>
    );
  }

  return (
    <>
      <NavBar />
      {appView === "start" && <StartPage />}
      {appView === "edit" && <EditPage />}
      {appView === "results" && <ResultsPage />}

      {/* Session restored banner */}
      <Snackbar
        open={restored}
        autoHideDuration={8000}
        onClose={() => setRestored(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
      >
        <Alert
          severity="success"
          onClose={() => setRestored(false)}
          sx={{
            bgcolor: "white",
            color: "#1a1c1d",
            boxShadow: "0px 12px 32px rgba(26, 28, 29, 0.1)",
            "& .MuiAlert-icon": { color: "#08C225" },
          }}
          action={
            <Button
              size="small"
              onClick={startOver}
              sx={{ color: "#ba1a1a", fontWeight: 600 }}
            >
              Start over
            </Button>
          }
        >
          Welcome back — your book has been restored.
        </Alert>
      </Snackbar>

      {/* Import truncation notice */}
      <Snackbar
        open={Boolean(importNotice)}
        autoHideDuration={10000}
        onClose={clearImportNotice}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          severity="info"
          onClose={clearImportNotice}
          sx={{
            bgcolor: "white",
            color: "#1a1c1d",
            boxShadow: "0px 12px 32px rgba(26, 28, 29, 0.1)",
            "& .MuiAlert-icon": { color: "#08C225" },
          }}
        >
          {importNotice}
        </Alert>
      </Snackbar>

      {/* Mobile hint dialog */}
      <Dialog
        open={showMobileHint}
        onClose={() => {
          setShowMobileHint(false);
          sessionStorage.setItem("mobile-hint-dismissed", "1");
        }}
        PaperProps={{
          sx: {
            borderRadius: 4,
            maxWidth: 300,
            mx: 2,
            p: 0,
            bgcolor: "#fff",
            boxShadow: "0px 20px 60px rgba(0,0,0,0.18)",
          },
        }}
      >
        <DialogContent sx={{ textAlign: "center", py: 3.5, px: 3, position: "relative" }}>
          <IconButton
            onClick={() => {
              setShowMobileHint(false);
              sessionStorage.setItem("mobile-hint-dismissed", "1");
            }}
            size="small"
            sx={{
              position: "absolute",
              top: 6,
              right: 6,
              color: "rgba(0,0,0,0.3)",
              "&:hover": { color: "rgba(0,0,0,0.6)" },
            }}
          >
            <CloseIcon sx={{ fontSize: 18 }} />
          </IconButton>
          <Typography variant="subtitle1" sx={{ fontFamily: "var(--font-nunito)", fontWeight: 700, mb: 0.5, color: "#1a1c1d", fontSize: "1rem" }}>
            Best on desktop
          </Typography>
          <Typography variant="body2" sx={{ fontFamily: "var(--font-nunito)", color: "rgba(0,0,0,0.5)", lineHeight: 1.55, fontSize: "0.835rem" }}>
            The photobook editor works best on a larger screen. For the full experience, try it on a desktop or laptop.
          </Typography>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function AppShell() {
  return (
    <BookProvider>
      <AppContent />
    </BookProvider>
  );
}
