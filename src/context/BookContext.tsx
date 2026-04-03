"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
} from "react";
import { v4 as uuid } from "uuid";
import type {
  AppView,
  BookPage,
  BookState,
  Photo,
  PhotoSlot,
  TextBlock,
} from "@/lib/types";
import {
  saveBookState,
  getBookState,
  savePhotos,
  getPhotos,
  savePhotoBlob,
  getPhotoBlob,
  saveThumbnail,
  getThumbnail,
  saveAppView,
  getAppView,
  clearAll,
} from "@/lib/db";
import { generateAutoLayout } from "@/lib/layouts";
import { extractExifDate, createThumbnail } from "@/lib/images";

interface BookContextValue {
  // App state
  appView: AppView;
  setAppView: (view: AppView) => void;
  loading: boolean;
  restored: boolean;
  setRestored: (v: boolean) => void;

  // Photos
  photos: Photo[];
  photoUrls: Map<string, string>; // id -> objectURL (full)
  thumbnailUrls: Map<string, string>; // id -> objectURL (thumb)
  addPhotos: (files: File[]) => Promise<void>;
  processingPhotos: boolean;
  processingProgress: number;

  // Book state
  book: BookState;
  setBook: React.Dispatch<React.SetStateAction<BookState>>;
  currentSpreadIndex: number;
  setCurrentSpreadIndex: (idx: number) => void;

  // Page operations
  addPage: (afterIndex?: number) => void;
  removePage: (pageId: string) => void;
  reorderPages: (fromIndex: number, toIndex: number) => void;
  updatePage: (pageId: string, updates: Partial<BookPage>) => void;
  updateSlot: (
    pageId: string,
    slotId: string,
    updates: Partial<PhotoSlot>
  ) => void;
  removeSlot: (pageId: string, slotId: string) => void;
  swapPhotos: (
    fromPageId: string,
    fromSlotId: string,
    toPageId: string,
    toSlotId: string
  ) => void;
  addTextBlock: (pageId: string) => TextBlock;
  updateTextBlock: (
    pageId: string,
    blockId: string,
    updates: Partial<TextBlock>
  ) => void;
  removeTextBlock: (pageId: string, blockId: string) => void;

  // Session
  startOver: () => void;
}

const BookContext = createContext<BookContextValue | null>(null);

export function useBook() {
  const ctx = useContext(BookContext);
  if (!ctx) throw new Error("useBook must be used within BookProvider");
  return ctx;
}

const emptyBook: BookState = {
  pages: [],
  currentSpreadIndex: 0,
};

export function BookProvider({ children }: { children: React.ReactNode }) {
  const [appView, setAppViewState] = useState<AppView>("start");
  const [loading, setLoading] = useState(true);
  const [restored, setRestored] = useState(false);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [photoUrls, setPhotoUrls] = useState<Map<string, string>>(new Map());
  const [thumbnailUrls, setThumbnailUrls] = useState<Map<string, string>>(
    new Map()
  );
  const [book, setBook] = useState<BookState>(emptyBook);
  const [currentSpreadIndex, setCurrentSpreadIndex] = useState(0);
  const [processingPhotos, setProcessingPhotos] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Persist on changes (debounced)
  useEffect(() => {
    if (loading) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      saveBookState({ ...book, currentSpreadIndex });
      savePhotos(photos);
      saveAppView(appView);
    }, 500);
  }, [book, photos, appView, currentSpreadIndex, loading]);

  // Restore session on mount
  useEffect(() => {
    (async () => {
      try {
        const [savedView, savedPhotos, savedBook] = await Promise.all([
          getAppView(),
          getPhotos(),
          getBookState(),
        ]);

        if (savedPhotos && savedPhotos.length > 0 && savedBook) {
          // Restore photo URLs from IndexedDB
          const fullUrls = new Map<string, string>();
          const thumbUrls = new Map<string, string>();

          await Promise.all(
            savedPhotos.map(async (photo) => {
              const [blob, thumb] = await Promise.all([
                getPhotoBlob(photo.id),
                getThumbnail(photo.id),
              ]);
              if (blob) {
                fullUrls.set(photo.id, URL.createObjectURL(blob));
              }
              if (thumb) {
                thumbUrls.set(photo.id, URL.createObjectURL(thumb));
              }
            })
          );

          setPhotos(savedPhotos);
          setPhotoUrls(fullUrls);
          setThumbnailUrls(thumbUrls);
          setBook(savedBook);
          setCurrentSpreadIndex(savedBook.currentSpreadIndex);

          if (savedView === "edit" || savedView === "results") {
            setAppViewState(savedView as AppView);
            setRestored(true);
          }
        }
      } catch (e) {
        console.error("Failed to restore session:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const setAppView = useCallback((view: AppView) => {
    setAppViewState(view);
  }, []);

  const addPhotos = useCallback(
    async (files: File[]) => {
      setProcessingPhotos(true);
      setProcessingProgress(0);

      const newPhotos: Photo[] = [];
      const newFullUrls = new Map(photoUrls);
      const newThumbUrls = new Map(thumbnailUrls);

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        let blob: Blob = file;

        // Convert HEIC/HEIF
        if (
          file.type === "image/heic" ||
          file.type === "image/heif" ||
          file.name.toLowerCase().endsWith(".heic") ||
          file.name.toLowerCase().endsWith(".heif")
        ) {
          try {
            const heic2any = (await import("heic2any")).default;
            const converted = await heic2any({
              blob: file,
              toType: "image/jpeg",
              quality: 0.92,
            });
            blob = Array.isArray(converted) ? converted[0] : converted;
          } catch (e) {
            console.warn("HEIC conversion failed for", file.name, e);
            continue;
          }
        }

        // Get dimensions
        const url = URL.createObjectURL(blob);
        const img = await loadImage(url);
        const dateTaken = await extractExifDate(file);
        const thumb = await createThumbnail(img, 1080);

        const photo: Photo = {
          id: uuid(),
          fileName: file.name,
          width: img.naturalWidth,
          height: img.naturalHeight,
          dateTaken: dateTaken || file.lastModified || Date.now(),
        };

        // Save to IndexedDB
        await savePhotoBlob(photo.id, blob);
        await saveThumbnail(photo.id, thumb);

        const thumbUrl = URL.createObjectURL(thumb);
        newFullUrls.set(photo.id, url);
        newThumbUrls.set(photo.id, thumbUrl);
        newPhotos.push(photo);

        setProcessingProgress(Math.round(((i + 1) / files.length) * 100));
      }

      const allPhotos = [...photos, ...newPhotos];
      setPhotos(allPhotos);
      setPhotoUrls(newFullUrls);
      setThumbnailUrls(newThumbUrls);

      // Generate auto layout
      const pages = generateAutoLayout(allPhotos);
      setBook({ pages, currentSpreadIndex: 0 });
      setCurrentSpreadIndex(0);

      setProcessingPhotos(false);
      setAppViewState("edit");
    },
    [photos, photoUrls, thumbnailUrls]
  );

  const addPage = useCallback(
    (afterIndex?: number) => {
      const newPage: BookPage = {
        id: uuid(),
        slots: [],
        textBlocks: [],
        topCaption: "",
        bottomCaption: "",
      };
      setBook((prev) => {
        const pages = [...prev.pages];
        const idx =
          afterIndex !== undefined ? afterIndex + 1 : pages.length;
        pages.splice(idx, 0, newPage);
        return { ...prev, pages };
      });
    },
    []
  );

  const removePage = useCallback((pageId: string) => {
    setBook((prev) => ({
      ...prev,
      pages: prev.pages.filter((p) => p.id !== pageId),
    }));
  }, []);

  const reorderPages = useCallback((fromIndex: number, toIndex: number) => {
    setBook((prev) => {
      const pages = [...prev.pages];
      const [moved] = pages.splice(fromIndex, 1);
      pages.splice(toIndex, 0, moved);
      return { ...prev, pages };
    });
  }, []);

  const updatePage = useCallback(
    (pageId: string, updates: Partial<BookPage>) => {
      setBook((prev) => ({
        ...prev,
        pages: prev.pages.map((p) =>
          p.id === pageId ? { ...p, ...updates } : p
        ),
      }));
    },
    []
  );

  const updateSlot = useCallback(
    (pageId: string, slotId: string, updates: Partial<PhotoSlot>) => {
      setBook((prev) => ({
        ...prev,
        pages: prev.pages.map((p) =>
          p.id === pageId
            ? {
                ...p,
                slots: p.slots.map((s) =>
                  s.id === slotId ? { ...s, ...updates } : s
                ),
              }
            : p
        ),
      }));
    },
    []
  );

  const removeSlot = useCallback(
    (pageId: string, slotId: string) => {
      setBook((prev) => ({
        ...prev,
        pages: prev.pages.map((p) =>
          p.id === pageId
            ? { ...p, slots: p.slots.filter((s) => s.id !== slotId) }
            : p
        ),
      }));
    },
    []
  );

  const swapPhotos = useCallback(
    (
      fromPageId: string,
      fromSlotId: string,
      toPageId: string,
      toSlotId: string
    ) => {
      setBook((prev) => {
        const pages = prev.pages.map((p) => ({ ...p, slots: [...p.slots] }));
        let fromSlot: PhotoSlot | undefined;
        let toSlot: PhotoSlot | undefined;

        for (const page of pages) {
          for (const slot of page.slots) {
            if (page.id === fromPageId && slot.id === fromSlotId)
              fromSlot = slot;
            if (page.id === toPageId && slot.id === toSlotId) toSlot = slot;
          }
        }

        if (fromSlot && toSlot) {
          const tempPhotoId = fromSlot.photoId;
          fromSlot.photoId = toSlot.photoId;
          toSlot.photoId = tempPhotoId;
        }

        return { ...prev, pages };
      });
    },
    []
  );

  const addTextBlock = useCallback((pageId: string): TextBlock => {
    const block: TextBlock = {
      id: uuid(),
      text: "",
      x: 10,
      y: 40,
      width: 80,
      height: 15,
      style: "body",
      alignment: "center",
    };
    setBook((prev) => ({
      ...prev,
      pages: prev.pages.map((p) =>
        p.id === pageId
          ? { ...p, textBlocks: [...p.textBlocks, block] }
          : p
      ),
    }));
    return block;
  }, []);

  const updateTextBlock = useCallback(
    (pageId: string, blockId: string, updates: Partial<TextBlock>) => {
      setBook((prev) => ({
        ...prev,
        pages: prev.pages.map((p) =>
          p.id === pageId
            ? {
                ...p,
                textBlocks: p.textBlocks.map((t) =>
                  t.id === blockId ? { ...t, ...updates } : t
                ),
              }
            : p
        ),
      }));
    },
    []
  );

  const removeTextBlock = useCallback((pageId: string, blockId: string) => {
    setBook((prev) => ({
      ...prev,
      pages: prev.pages.map((p) =>
        p.id === pageId
          ? { ...p, textBlocks: p.textBlocks.filter((t) => t.id !== blockId) }
          : p
      ),
    }));
  }, []);

  const startOver = useCallback(async () => {
    // Revoke all URLs
    photoUrls.forEach((url) => URL.revokeObjectURL(url));
    thumbnailUrls.forEach((url) => URL.revokeObjectURL(url));

    await clearAll();
    setPhotos([]);
    setPhotoUrls(new Map());
    setThumbnailUrls(new Map());
    setBook(emptyBook);
    setCurrentSpreadIndex(0);
    setAppViewState("start");
    setRestored(false);
  }, [photoUrls, thumbnailUrls]);

  return (
    <BookContext.Provider
      value={{
        appView,
        setAppView,
        loading,
        restored,
        setRestored,
        photos,
        photoUrls,
        thumbnailUrls,
        addPhotos,
        processingPhotos,
        processingProgress,
        book,
        setBook,
        currentSpreadIndex,
        setCurrentSpreadIndex,
        addPage,
        removePage,
        reorderPages,
        updatePage,
        updateSlot,
        removeSlot,
        swapPhotos,
        addTextBlock,
        updateTextBlock,
        removeTextBlock,
        startOver,
      }}
    >
      {children}
    </BookContext.Provider>
  );
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
