"use client";

import { useEffect, useState } from "react";
import { Box, Button, IconButton, Menu, MenuItem, Typography } from "@mui/material";
import ViewSidebarIcon from "@mui/icons-material/ViewSidebar";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import { useBook } from "@/context/BookContext";
import {
  BOOK_FORMAT_CHOICES,
  type BookFormatId,
} from "@/lib/bookFormats";

const mobileNavQuery = "(max-width: 640px)";

type NavItem =
  | { label: string; href: string }

const navItems: NavItem[] = [
  { label: "Home", href: "https://ente.com/" },
  { label: "About", href: "https://ente.com/about" },
  { label: "Blog", href: "https://ente.com/blog" },
  { label: "Download", href: "https://ente.com/download" },
];

const editFormatLabels: Record<BookFormatId, string> = {
  "square-210": "Square",
  "a5-portrait": "Portrait",
};

function StartNavBar({ onLogoClick }: { onLogoClick: () => void }) {
  const [isMobileNav, setIsMobileNav] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia(mobileNavQuery).matches,
  );
  const [isNavOpen, setIsNavOpen] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(mobileNavQuery);
    const handler = (e: MediaQueryListEvent) => setIsMobileNav(e.matches);
    setIsMobileNav(mql.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    if (!isMobileNav) setIsNavOpen(false);
  }, [isMobileNav]);

  useEffect(() => {
    if (!isNavOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsNavOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isNavOpen]);

  const closeNav = () => {
    if (isMobileNav) setIsNavOpen(false);
  };

  return (
    <Box
      component="header"
      sx={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        p: { xs: "16px", sm: "28px 24px" },
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: isNavOpen ? "stretch" : "center",
          flexDirection: isNavOpen ? "column" : "row",
          justifyContent: "space-between",
          gap: isNavOpen ? "14px" : "18px",
          padding: isNavOpen ? "18px" : "14px 18px",
          border: "1px solid rgba(21, 21, 21, 0.08)",
          borderRadius: isNavOpen ? "28px" : "999px",
          background: "rgba(255, 255, 255, 0.76)",
          backdropFilter: "blur(28px)",
          boxShadow: "0 20px 48px rgba(18, 18, 18, 0.07)",
          maxWidth: 1100,
          mx: "auto",
          animation: "navSlideIn 0.45s cubic-bezier(0.22, 1, 0.36, 1)",
          "@keyframes navSlideIn": {
            from: { opacity: 0, transform: "translateY(-16px)" },
            to: { opacity: 1, transform: "translateY(0)" },
          },
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: isMobileNav ? "space-between" : "flex-start",
            width: isMobileNav ? "100%" : "auto",
            gap: "12px",
          }}
        >
          <Box
            component="a"
            href="https://ente.com/"
            target="_blank"
            rel="noopener"
            onClick={closeNav}
            sx={{
              display: "inline-flex",
              alignItems: "center",
              ml: isMobileNav ? 0 : "10px",
              minHeight: isMobileNav ? 40 : "auto",
              cursor: "pointer",
              textDecoration: "none",
            }}
          >
            <Box
              component="img"
              alt="Ente"
              src="/ente-branding.svg"
              sx={{
                display: "block",
                width: "auto",
                height: { xs: "21.6px", sm: "25.2px" },
              }}
            />
          </Box>

          {isMobileNav && (
            <Box
              component="button"
              onClick={() => setIsNavOpen((c) => !c)}
              aria-label={isNavOpen ? "Close navigation menu" : "Open navigation menu"}
              aria-expanded={isNavOpen}
              sx={{
                display: "inline-flex",
                width: 44,
                minHeight: 44,
                p: 0,
                border: "1px solid rgba(21, 21, 21, 0.08)",
                borderRadius: "14px",
                background: "rgba(255, 255, 255, 0.62)",
                color: "rgba(21, 21, 21, 0.84)",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                transition: "transform 220ms ease, border-color 220ms ease, background 220ms ease",
                "&:hover": {
                  transform: "translateY(-1px)",
                  borderColor: "rgba(21, 21, 21, 0.14)",
                  background: "rgba(255, 255, 255, 0.78)",
                },
              }}
            >
              <Box
                component="span"
                aria-hidden="true"
                sx={{
                  display: "grid",
                  gap: "4px",
                  "& span": {
                    display: "block",
                    width: 18,
                    height: 2,
                    borderRadius: "999px",
                    background: "currentColor",
                    transformOrigin: "center",
                    transition: "transform 220ms ease, opacity 220ms ease",
                  },
                  ...(isNavOpen && {
                    "& span:nth-of-type(1)": {
                      transform: "translateY(6px) rotate(45deg)",
                    },
                    "& span:nth-of-type(2)": {
                      opacity: 0,
                    },
                    "& span:nth-of-type(3)": {
                      transform: "translateY(-6px) rotate(-45deg)",
                    },
                  }),
                }}
              >
                <span />
                <span />
                <span />
              </Box>
            </Box>
          )}
        </Box>

        {(!isMobileNav || isNavOpen) && (
          <Box
            component="nav"
            aria-label="Primary"
            sx={{
              display: isMobileNav ? "grid" : "flex",
              gridTemplateColumns: isMobileNav ? "1fr" : undefined,
              flexWrap: "wrap",
              justifyContent: isMobileNav ? undefined : "flex-end",
              gap: isMobileNav ? "8px" : "10px",
              width: isMobileNav ? "100%" : "auto",
            }}
          >
            {navItems.map((item) => (
              <Box
                key={item.label}
                component="a"
                href={item.href}
                target="_blank"
                rel="noopener"
                onClick={closeNav}
                sx={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: isMobileNav ? "flex-start" : "center",
                  minHeight: isMobileNav ? 44 : 42,
                  px: isMobileNav ? "16px" : "18px",
                  borderRadius: "999px",
                  border: "1px solid",
                  borderColor: isMobileNav
                    ? "rgba(21, 21, 21, 0.06)"
                    : "transparent",
                  background: isMobileNav
                    ? "rgba(255, 255, 255, 0.52)"
                    : "transparent",
                  color: "rgba(21, 21, 21, 0.76)",
                  fontFamily: "var(--font-sora), 'Avenir Next', 'Segoe UI', sans-serif",
                  fontSize: "0.92rem",
                  fontWeight: 500,
                  letterSpacing: 0,
                  textDecoration: "none",
                  textAlign: isMobileNav ? "left" : "center",
                  transition:
                    "transform 220ms ease, border-color 220ms ease, background 220ms ease, color 220ms ease",
                  "&:hover": {
                    transform: "translateY(-1px)",
                    borderColor: "rgba(21, 21, 21, 0.08)",
                    background: "rgba(255, 255, 255, 0.65)",
                    color: "#151515",
                  },
                }}
              >
                {item.label}
              </Box>
            ))}
          </Box>
        )}
      </Box>
    </Box>
  );
}

export default function NavBar() {
  const {
    appView,
    setAppView,
    bookFormat,
    setBookFormat,
    showPageStrip,
    setShowPageStrip,
  } = useBook();
  const [formatAnchor, setFormatAnchor] = useState<HTMLElement | null>(null);
  const isStart = appView === "start";

  if (isStart) {
    return <StartNavBar onLogoClick={() => setAppView("start")} />;
  }

  const closeFormatMenu = () => setFormatAnchor(null);

  const handleFormatSelect = (formatId: BookFormatId) => {
    closeFormatMenu();
    if (formatId !== bookFormat.id) {
      setBookFormat(formatId);
    }
  };

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
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          cursor: "pointer",
        }}
        onClick={() => setAppView("start")}
      >
        <Typography
          sx={{
            fontSize: "1.25rem",
            fontWeight: 700,
            fontFamily: "var(--font-manrope), sans-serif",
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
              variant="outlined"
              endIcon={<ArrowDropDownIcon sx={{ fontSize: 18 }} />}
              onClick={(e) => setFormatAnchor(e.currentTarget)}
              sx={{
                height: 42,
                color: "#F2F3F3",
                borderColor: "rgba(255,255,255,0.22)",
                borderRadius: 999,
                px: 2,
                minWidth: 108,
                bgcolor: "rgba(255,255,255,0.04)",
                justifyContent: "center",
                textTransform: "none",
                fontWeight: 800,
                fontSize: "0.9rem",
                lineHeight: 1,
                "& .MuiButton-endIcon": {
                  ml: 0.5,
                  color: "rgba(255,255,255,0.72)",
                },
                "&:hover": {
                  borderColor: "rgba(255,255,255,0.34)",
                  bgcolor: "rgba(255,255,255,0.08)",
                },
              }}
            >
              {editFormatLabels[bookFormat.id]}
            </Button>
            <Menu
              anchorEl={formatAnchor}
              open={Boolean(formatAnchor)}
              onClose={closeFormatMenu}
              anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
              transformOrigin={{ vertical: "top", horizontal: "right" }}
              slotProps={{
                paper: {
                  sx: {
                    mt: 1,
                    minWidth: 164,
                    borderRadius: 2,
                    bgcolor: "#1B1D1E",
                    color: "#F2F3F3",
                    border: "1px solid rgba(255,255,255,0.1)",
                    boxShadow: "0 16px 40px rgba(0,0,0,0.35)",
                    p: 1,
                    "& .MuiList-root": {
                      p: 0,
                      display: "grid",
                      gap: 0.85,
                    },
                  },
                },
              }}
            >
              {BOOK_FORMAT_CHOICES.map((format) => {
                const selected = format.id === bookFormat.id;
                return (
                  <MenuItem
                    key={format.id}
                    selected={selected}
                    onClick={() => handleFormatSelect(format.id)}
                    sx={{
                      minHeight: 42,
                      borderRadius: 1.5,
                      px: 2,
                      color: "#F2F3F3",
                      justifyContent: "center",
                      textAlign: "center",
                      lineHeight: 1,
                      fontWeight: selected ? 800 : 700,
                      "&.Mui-selected": {
                        bgcolor: "rgba(255,255,255,0.08)",
                      },
                      "&.Mui-selected:hover": {
                        bgcolor: "rgba(255,255,255,0.11)",
                      },
                      "&:hover": {
                        bgcolor: "rgba(255,255,255,0.08)",
                      },
                    }}
                  >
                    {editFormatLabels[format.id]}
                  </MenuItem>
                );
              })}
            </Menu>
            <Button
              variant="contained"
              onClick={() => setAppView("results")}
              sx={{
                height: 42,
                borderRadius: 999,
                background:
                  "linear-gradient(135deg, #006E0F 0%, #08C225 100%)",
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
