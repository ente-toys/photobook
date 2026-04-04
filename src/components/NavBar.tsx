"use client";

import { Box, Button, IconButton, Typography } from "@mui/material";
import ViewSidebarIcon from "@mui/icons-material/ViewSidebar";
import { useBook } from "@/context/BookContext";

export default function NavBar() {
  const { appView, setAppView, book, showPageStrip, setShowPageStrip } = useBook();

  return (
    <Box
      component="header"
      sx={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        bgcolor: "#141617",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        px: 4,
        height: 64,
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <Box
        sx={{ display: "flex", alignItems: "center", gap: 1, cursor: "pointer" }}
        onClick={() => setAppView("start")}
      >
        <Typography
          sx={{
            fontSize: "1.25rem",
            fontWeight: 700,
            fontFamily: "'Manrope', sans-serif",
            color: "#E2E2E4",
          }}
        >
          Ente Photobook
        </Typography>
      </Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
        {appView === "edit" && (
          <>
            {!showPageStrip && (
              <IconButton
                onClick={() => setShowPageStrip(true)}
                size="small"
                sx={{
                  color: "rgba(255,255,255,0.6)",
                  "&:hover": { color: "rgba(255,255,255,0.9)" },
                }}
              >
                <ViewSidebarIcon fontSize="small" />
              </IconButton>
            )}
            <Button
              variant="contained"
              onClick={() => setAppView("results")}
              sx={{
                background: "linear-gradient(135deg, #006E0F 0%, #08C225 100%)",
                fontWeight: 700,
                px: 4,
                "&:hover": {
                  background:
                    "linear-gradient(135deg, #005309 0%, #06A81F 100%)",
                },
              }}
            >
              Next
            </Button>
          </>
        )}
      </Box>
    </Box>
  );
}
