"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from "react";
import { v4 as uuid } from "uuid";
import type {
  AppView,
  BookPage,
  BookState,
  Photo,
  PhotoOriginalStatus,
  PhotoSlot,
  TextBlock,
} from "@/lib/types";
import {
  saveBookState,
  getBookState,
  savePhotos,
  getPhotos,
  savePhotoBlob,
  saveThumbnail,
  getThumbnail,
  savePreview,
  getPreview,
  saveAppView,
  getAppView,
  clearAll,
} from "@/lib/db";
import { generateAutoLayout, chooseBestLayout, chooseBestVariantKey, defaultVariantKeyForCount, applyVariant, getDefaultPadding, getVariantsForCount } from "@/lib/layouts";
import {
  extractExifDate,
  createThumbnail,
  normalizeImportedImageBlob,
} from "@/lib/images";
import { clearImageCache } from "@/lib/imageCache";
import type { EnteCredentials, EnteFileDescriptor } from "@/lib/ente/types";
import {
  prepareEnteAlbum,
  fetchAndDecryptThumbnail,
  fetchAndDecryptOriginal,
} from "@/lib/ente/import";

interface BookContextValue {
  // App state
  appView: AppView;
  setAppView: (view: AppView) => void;
  loading: boolean;
  restored: boolean;
  setRestored: (v: boolean) => void;

  // Photos
  photos: Photo[];
  thumbnailUrls: Map<string, string>; // id -> objectURL (256px thumb)
  photoUrls: Map<string, string>; // id -> objectURL (preview if loaded, else thumb)
  loadPreviews: (photoIds: string[]) => void;
  addPhotos: (files: File[], replace?: boolean) => Promise<void>;
  addEntePhotos: (
    albumUrl: string,
    requestPassword: () => Promise<string | null>,
  ) => Promise<void>;
  processingPhotos: boolean;
  processingProgress: number;
  processingMessage: string;
  /**
   * Photo IDs whose full-resolution blob is still being downloaded from Ente.
   * Empty unless an Ente import is in flight or was interrupted.
   */
  pendingEnteOriginals: Set<string>;
  /**
   * Await all pending Ente originals; calls back with (done, total) after each
   * one resolves. If photoIds are provided, waits only for that subset.
   */
  waitForEnteOriginals: (
    photoIds?: string[],
    onProgress?: (done: number, total: number) => void,
  ) => Promise<void>;

  // Book state
  book: BookState;
  setBook: React.Dispatch<React.SetStateAction<BookState>>;
  currentSpreadIndex: number;
  setCurrentSpreadIndex: (idx: number) => void;

  // Undo/Redo
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;

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
  movePhotoToPage: (
    fromPageId: string,
    fromSlotId: string,
    toPageId: string
  ) => void;
  setPageLayout: (pageId: string, variantKey: string) => void;
  setPagePadding: (pageId: string, paddingH: number, paddingV: number) => void;
  addTextBlock: (pageId: string) => TextBlock;
  updateTextBlock: (
    pageId: string,
    blockId: string,
    updates: Partial<TextBlock>
  ) => void;
  removeTextBlock: (pageId: string, blockId: string) => void;

  // UI state
  showPageStrip: boolean;
  setShowPageStrip: React.Dispatch<React.SetStateAction<boolean>>;

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

function isPendingEnteOriginal(photo: Photo): boolean {
  return photo.source === "ente" && photo.originalStatus === "pending";
}

function buildEnteOriginalDownloadJob(photo: Photo):
  | {
      credentials: EnteCredentials;
      descriptor: EnteFileDescriptor;
    }
  | null {
  const data = photo.enteOriginal;
  if (!data) return null;

  return {
    credentials: {
      apiOrigin: data.apiOrigin,
      albumsOrigin: data.albumsOrigin,
      accessToken: data.accessToken,
      accessTokenJWT: data.accessTokenJWT,
      collectionKey: "",
    },
    descriptor: {
      enteFileId: data.enteFileId,
      fileKey: data.fileKey,
      thumbnailDecryptionHeader: "",
      fileDecryptionHeader: data.fileDecryptionHeader,
      fileName: photo.fileName,
      dateTaken: photo.dateTaken,
      width: photo.width,
      height: photo.height,
      isImage: true,
    },
  };
}

export function BookProvider({ children }: { children: React.ReactNode }) {
  const [appView, setAppViewState] = useState<AppView>("start");
  const [loading, setLoading] = useState(true);
  const [restored, setRestored] = useState(false);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const photosRef = useRef<Photo[]>(photos);
  photosRef.current = photos;
  const [thumbnailUrls, setThumbnailUrls] = useState<Map<string, string>>(
    new Map()
  );
  const thumbnailUrlsRef = useRef<Map<string, string>>(thumbnailUrls);
  thumbnailUrlsRef.current = thumbnailUrls;
  const [previewUrls, setPreviewUrls] = useState<Map<string, string>>(
    new Map()
  );
  const previewUrlsRef = useRef<Map<string, string>>(previewUrls);
  previewUrlsRef.current = previewUrls;
  const [book, setBookRaw] = useState<BookState>(emptyBook);
  const [currentSpreadIndex, setCurrentSpreadIndex] = useState(0);

  // Revoke all object URLs on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      thumbnailUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  // Undo/Redo history
  const undoStackRef = useRef<BookState[]>([]);
  const redoStackRef = useRef<BookState[]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const MAX_HISTORY = 50;

  const setBook: React.Dispatch<React.SetStateAction<BookState>> = useCallback(
    (action) => {
      setBookRaw((prev) => {
        undoStackRef.current = [
          ...undoStackRef.current.slice(-(MAX_HISTORY - 1)),
          prev,
        ];
        redoStackRef.current = [];
        return typeof action === "function" ? action(prev) : action;
      });
      setCanUndo(true);
      setCanRedo(false);
    },
    []
  );

  const undo = useCallback(() => {
    if (undoStackRef.current.length === 0) return;
    setBookRaw((current) => {
      const prev = undoStackRef.current.pop()!;
      redoStackRef.current = [...redoStackRef.current, current];
      setCanUndo(undoStackRef.current.length > 0);
      setCanRedo(true);
      return prev;
    });
  }, []);

  const redo = useCallback(() => {
    if (redoStackRef.current.length === 0) return;
    setBookRaw((current) => {
      const next = redoStackRef.current.pop()!;
      undoStackRef.current = [...undoStackRef.current, current];
      setCanUndo(true);
      setCanRedo(redoStackRef.current.length > 0);
      return next;
    });
  }, []);
  // Merged URL map: preview (1080px) if loaded, else thumbnail (256px).
  // Consumers that need high-res (SpreadPage, BookViewer) use this + loadPreviews.
  // Consumers that only need tiny images (PageStrip) use thumbnailUrls directly.
  const photoUrls = useMemo(() => {
    if (previewUrls.size === 0) return thumbnailUrls;
    const merged = new Map(thumbnailUrls);
    for (const [id, url] of previewUrls) {
      merged.set(id, url);
    }
    return merged;
  }, [thumbnailUrls, previewUrls]);

  // Tracks which photo IDs are currently being loaded from IndexedDB to
  // prevent redundant concurrent reads when multiple components request
  // the same previews.
  const loadingPreviewsRef = useRef<Set<string>>(new Set());

  const loadPreviews = useCallback(async (photoIds: string[]) => {
    const missing = photoIds.filter(
      (id) =>
        !previewUrlsRef.current.has(id) && !loadingPreviewsRef.current.has(id)
    );
    if (missing.length === 0) return;

    missing.forEach((id) => loadingPreviewsRef.current.add(id));

    const loaded = new Map<string, string>();
    await Promise.all(
      missing.map(async (id) => {
        try {
          const blob = await getPreview(id);
          if (blob) {
            loaded.set(id, URL.createObjectURL(blob));
          }
        } finally {
          loadingPreviewsRef.current.delete(id);
        }
      })
    );

    if (loaded.size > 0) {
      setPreviewUrls((prev) => {
        const next = new Map(prev);
        for (const [id, url] of loaded) next.set(id, url);
        return next;
      });
    }
  }, []);

  const [showPageStrip, setShowPageStrip] = useState(
    () =>
      typeof window === "undefined" ||
      !window.matchMedia("(max-width: 640px)").matches,
  );
  const [processingPhotos, setProcessingPhotos] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [processingMessage, setProcessingMessage] = useState(
    "Processing your photos...",
  );
  const pendingEnteOriginals = useMemo(() => {
    const next = new Set<string>();
    for (const photo of photos) {
      if (isPendingEnteOriginal(photo)) {
        next.add(photo.id);
      }
    }
    return next;
  }, [photos]);
  const pendingEnteOriginalsRef = useRef<Set<string>>(pendingEnteOriginals);
  pendingEnteOriginalsRef.current = pendingEnteOriginals;
  const activeEnteOriginalDownloadsRef = useRef<Set<string>>(new Set());
  /**
   * Per-pending-photo resolvers, used by waitForEnteOriginals() so consumers
   * can block on all outstanding downloads without re-polling.
   */
  const enteOriginalWaitersRef = useRef<
    Map<string, Array<() => void>>
  >(new Map());
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Persist on changes (debounced)
  useEffect(() => {
    if (loading || processingPhotos) return;
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
          // Restore thumbnail URLs from IndexedDB (full-res loaded on demand for export)
          const thumbUrls = new Map<string, string>();

          await Promise.all(
            savedPhotos.map(async (photo) => {
              const thumb = await getThumbnail(photo.id);
              if (thumb) {
                thumbUrls.set(photo.id, URL.createObjectURL(thumb));
              }
            })
          );

          setPhotos(savedPhotos);
          setThumbnailUrls(thumbUrls);
          setBookRaw(savedBook);
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

  const progressRef = useRef(0);
  const rafRef = useRef<number>(0);

  const addPhotos = useCallback(
    async (files: File[], replace = false) => {
      setProcessingPhotos(true);
      progressRef.current = 0;
      setProcessingProgress(0);
      setProcessingMessage("Processing your photos...");

      if (replace) {
        // Clear previous session when starting fresh from start page
        thumbnailUrls.forEach((url) => URL.revokeObjectURL(url));
        previewUrls.forEach((url) => URL.revokeObjectURL(url));
        clearImageCache();
        await clearAll();
      }

      const newPhotos: Photo[] = [];
      const newThumbUrls = replace ? new Map<string, string>() : new Map(thumbnailUrls);
      const newPreviewUrls = replace ? new Map<string, string>() : new Map(previewUrls);

      // Flush progress to state only on animation frames
      const scheduleProgressUpdate = (value: number) => {
        progressRef.current = value;
        if (!rafRef.current) {
          rafRef.current = requestAnimationFrame(() => {
            rafRef.current = 0;
            setProcessingProgress(progressRef.current);
          });
        }
      };

      // Process each photo: HEIC conversion, dimensions, thumbnail, IndexedDB save
      type PhotoResult = { photo: Photo; thumbUrl: string; previewUrl: string };
      const results: (PhotoResult | null)[] = new Array(files.length).fill(null);
      let completed = 0;

      const processPhoto = async (file: File, index: number) => {
        let blob: Blob;
        try {
          blob = await normalizeImportedImageBlob(file, file.name);
        } catch (e) {
          console.warn("HEIC conversion failed for", file.name, e);
          completed++;
          scheduleProgressUpdate(Math.round((completed / files.length) * 100));
          return;
        }

        // Get dimensions (temporary URL, revoked after use to save memory)
        const tempUrl = URL.createObjectURL(blob);
        const img = await loadImage(tempUrl);
        URL.revokeObjectURL(tempUrl);
        const dateTaken = await extractExifDate(file);
        const thumb = await createThumbnail(img, 256);
        const preview = await createThumbnail(img, 1080);

        const photo: Photo = {
          id: uuid(),
          fileName: file.name,
          width: img.naturalWidth,
          height: img.naturalHeight,
          dateTaken: dateTaken || file.lastModified || Date.now(),
          source: "local",
          originalStatus: "ready",
        };

        // Save to IndexedDB
        await savePhotoBlob(photo.id, blob);
        await saveThumbnail(photo.id, thumb);
        await savePreview(photo.id, preview);

        const thumbUrl = URL.createObjectURL(thumb);
        const previewUrl = URL.createObjectURL(preview);
        results[index] = { photo, thumbUrl, previewUrl };
        completed++;
        scheduleProgressUpdate(Math.round((completed / files.length) * 100));
      };

      // Run with concurrency limit of 6
      const CONCURRENCY = 6;
      const taskQueue = files.map((f, i) => () => processPhoto(f, i));
      const workers = Array.from(
        { length: Math.min(CONCURRENCY, files.length) },
        async () => {
          while (taskQueue.length > 0) {
            const task = taskQueue.shift()!;
            await task();
          }
        }
      );
      await Promise.all(workers);

      // Collect results in original file order
      for (const result of results) {
        if (result) {
          newThumbUrls.set(result.photo.id, result.thumbUrl);
          newPreviewUrls.set(result.photo.id, result.previewUrl);
          newPhotos.push(result.photo);
        }
      }

      // Cancel any pending frame and flush final progress
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = 0;
      }
      setProcessingProgress(100);

      const allPhotos = replace ? newPhotos : [...photos, ...newPhotos];
      setPhotos(allPhotos);
      setThumbnailUrls(newThumbUrls);
      setPreviewUrls(newPreviewUrls);

      if (replace) {
        // Fresh session: generate auto layout from scratch (bypass undo tracking)
        const pages = generateAutoLayout(allPhotos);
        setBookRaw({ pages, currentSpreadIndex: 0 });
        undoStackRef.current = [];
        redoStackRef.current = [];
        setCanUndo(false);
        setCanRedo(false);
        setCurrentSpreadIndex(0);
      } else if (newPhotos.length > 0) {
        // Add-to-existing: insert each new photo as its own new page at the
        // chronologically correct position, leaving existing pages untouched
        // so the user's layout edits are preserved.
        const photoMap = new Map(allPhotos.map((p) => [p.id, p]));
        const sortedNew = [...newPhotos].sort(
          (a, b) => a.dateTaken - b.dateTaken
        );

        setBook((prev) => {
          const pages = [...prev.pages];
          const pageDates: (number | null)[] = pages.map((page) => {
            let max: number | null = null;
            for (const slot of page.slots) {
              if (!slot.photoId) continue;
              const ph = photoMap.get(slot.photoId);
              if (ph && (max === null || ph.dateTaken > max)) max = ph.dateTaken;
            }
            return max;
          });

          for (const photo of sortedNew) {
            // Find last non-blank page whose latest photo date <= new photo's date
            let insertAfter = -1;
            for (let i = 0; i < pages.length; i++) {
              const d = pageDates[i];
              if (d !== null && d <= photo.dateTaken) insertAfter = i;
            }
            // If the new photo predates everything, still insert after the
            // cover (page 0) so the cover stays put.
            const idx =
              insertAfter >= 0 ? insertAfter + 1 : Math.min(1, pages.length);
            const newPage: BookPage = {
              id: uuid(),
              slots: chooseBestLayout([photo]),
              layoutVariant: chooseBestVariantKey([photo]),
              textBlocks: [],
              topCaption: "",
              bottomCaption: "",
            };
            pages.splice(idx, 0, newPage);
            pageDates.splice(idx, 0, photo.dateTaken);
          }

          return { ...prev, pages };
        });
      }

      setProcessingPhotos(false);
      setAppViewState("edit");
    },
    [photos, thumbnailUrls, previewUrls]
  );

  const markEnteOriginalDone = useCallback((
    photoId: string,
    status: PhotoOriginalStatus,
    originalError?: string,
  ) => {
    setPhotos((prev) =>
      prev.map((photo) => {
        if (photo.id !== photoId || photo.source !== "ente") {
          return photo;
        }

        const next: Photo = {
          ...photo,
          originalStatus: status,
          originalError,
        };
        if (status === "ready") {
          next.enteOriginal = undefined;
        }
        return next;
      }),
    );
    const waiters = enteOriginalWaitersRef.current.get(photoId);
    if (waiters) {
      enteOriginalWaitersRef.current.delete(photoId);
      for (const w of waiters) w();
    }
  }, []);

  const startEnteOriginalDownloads = useCallback(
    async (photoIds: string[]) => {
      const entries = photoIds
        .map((photoId) => {
          const photo = photosRef.current.find((candidate) => candidate.id === photoId);
          if (!photo || !isPendingEnteOriginal(photo)) {
            return null;
          }
          const job = buildEnteOriginalDownloadJob(photo);
          if (!job) {
            markEnteOriginalDone(
              photoId,
              "failed",
              "Missing Ente download metadata.",
            );
            return null;
          }
          return { photoId, fileName: photo.fileName, ...job };
        })
        .filter(
          (
            entry,
          ): entry is {
            photoId: string;
            fileName: string;
            credentials: EnteCredentials;
            descriptor: EnteFileDescriptor;
          } => entry !== null,
        );

      // Ente's CDN tolerates a few parallel requests; match Ente web's default.
      const CONCURRENCY = 3;
      let cursor = 0;
      const workers = Array.from(
        { length: Math.min(CONCURRENCY, entries.length) },
        async () => {
          while (cursor < entries.length) {
            const i = cursor++;
            const { photoId, fileName, credentials, descriptor } = entries[i]!;
            try {
              const blob = await fetchAndDecryptOriginal(
                credentials,
                descriptor,
              );
              const normalizedBlob = await normalizeImportedImageBlob(
                blob,
                fileName,
              );
              const currentPhoto = photosRef.current.find(
                (candidate) => candidate.id === photoId,
              );
              if (!currentPhoto || !isPendingEnteOriginal(currentPhoto)) {
                continue;
              }
              await savePhotoBlob(photoId, normalizedBlob);
              markEnteOriginalDone(photoId, "ready");
            } catch (e) {
              const currentPhoto = photosRef.current.find(
                (candidate) => candidate.id === photoId,
              );
              if (currentPhoto && isPendingEnteOriginal(currentPhoto)) {
                const message =
                  e instanceof Error
                    ? e.message
                    : "Failed to prepare the original photo.";
                console.warn(
                  `Ente: failed to download original for "${fileName}"`,
                  e,
                );
                markEnteOriginalDone(photoId, "failed", message);
              }
            } finally {
              activeEnteOriginalDownloadsRef.current.delete(photoId);
            }
          }
        },
      );
      await Promise.all(workers);
    },
    [markEnteOriginalDone],
  );

  const addEntePhotos = useCallback(
    async (
      albumUrl: string,
      requestPassword: () => Promise<string | null>,
    ) => {
      setProcessingPhotos(true);
      progressRef.current = 0;
      setProcessingProgress(0);
      setProcessingMessage("Connecting to Ente…");

      // Ente import always replaces the current session (same convention as
      // the file picker from StartPage).
      thumbnailUrls.forEach((url) => URL.revokeObjectURL(url));
      previewUrls.forEach((url) => URL.revokeObjectURL(url));
      clearImageCache();
      await clearAll();
      activeEnteOriginalDownloadsRef.current.clear();
      enteOriginalWaitersRef.current = new Map();

      let preparation;
      try {
        preparation = await prepareEnteAlbum(
          albumUrl,
          requestPassword,
          (phase) => {
            if (phase === "connecting") setProcessingMessage("Connecting to Ente…");
            else if (phase === "listing") setProcessingMessage("Listing album…");
            else if (phase === "preparing")
              setProcessingMessage("Decrypting metadata…");
          },
        );
      } catch (e) {
        setProcessingPhotos(false);
        setProcessingMessage("Processing your photos...");
        throw e;
      }

      const { credentials, files } = preparation;
      // Keep parity with the file picker's 400-photo cap.
      const MAX_PHOTOS = 400;
      const limited = files.slice(0, MAX_PHOTOS);

      if (limited.length === 0) {
        setProcessingPhotos(false);
        setProcessingMessage("Processing your photos...");
        throw new Error("This album has no photos we can import.");
      }

      setProcessingMessage("Decrypting thumbnails…");

      type ThumbResult = {
        photo: Photo;
        thumbUrl: string;
        previewUrl: string;
      };
      const thumbResults: (ThumbResult | null)[] = new Array(
        limited.length,
      ).fill(null);
      let completed = 0;

      const scheduleProgressUpdate = (value: number) => {
        progressRef.current = value;
        if (!rafRef.current) {
          rafRef.current = requestAnimationFrame(() => {
            rafRef.current = 0;
            setProcessingProgress(progressRef.current);
          });
        }
      };

      const processOne = async (index: number) => {
        const descriptor = limited[index]!;
        try {
          const thumbBlob = await fetchAndDecryptThumbnail(
            credentials,
            descriptor,
          );

          // Trust magic-metadata dimensions if present; otherwise fall back to
          // the thumbnail's own dimensions. The thumbnail preserves aspect
          // ratio, so that's enough for the photobook's auto-layout picker.
          let width = descriptor.width;
          let height = descriptor.height;
          if (!width || !height) {
            const tempUrl = URL.createObjectURL(thumbBlob);
            try {
              const img = await loadImage(tempUrl);
              width = img.naturalWidth;
              height = img.naturalHeight;
            } finally {
              URL.revokeObjectURL(tempUrl);
            }
          }

          const photoId = uuid();
          const photo: Photo = {
            id: photoId,
            fileName: descriptor.fileName,
            width,
            height,
            dateTaken: descriptor.dateTaken,
            source: "ente",
            originalStatus: "pending",
            enteOriginal: {
              apiOrigin: credentials.apiOrigin,
              albumsOrigin: credentials.albumsOrigin,
              accessToken: credentials.accessToken,
              accessTokenJWT: credentials.accessTokenJWT,
              enteFileId: descriptor.enteFileId,
              fileKey: descriptor.fileKey,
              fileDecryptionHeader: descriptor.fileDecryptionHeader,
            },
          };

          // Save the decrypted thumbnail for immediate rendering. The original
          // blob is written later once the background download succeeds.
          await Promise.all([
            saveThumbnail(photoId, thumbBlob),
            savePreview(photoId, thumbBlob),
          ]);

          thumbResults[index] = {
            photo,
            thumbUrl: URL.createObjectURL(thumbBlob),
            previewUrl: URL.createObjectURL(thumbBlob),
          };
        } catch (e) {
          console.warn(
            `Ente: failed to prepare "${descriptor.fileName}"`,
            e,
          );
        } finally {
          completed++;
          scheduleProgressUpdate(
            Math.round((completed / limited.length) * 100),
          );
        }
      };

      const THUMB_CONCURRENCY = 6;
      let cursor = 0;
      const workers = Array.from(
        { length: Math.min(THUMB_CONCURRENCY, limited.length) },
        async () => {
          while (cursor < limited.length) {
            const i = cursor++;
            await processOne(i);
          }
        },
      );
      await Promise.all(workers);

      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = 0;
      }
      setProcessingProgress(100);

      const successful = thumbResults.filter(
        (r): r is ThumbResult => r !== null,
      );
      successful.sort((a, b) => a.photo.dateTaken - b.photo.dateTaken);

      const newPhotos: Photo[] = successful.map((r) => r.photo);
      const newThumbUrls = new Map<string, string>();
      const newPreviewUrls = new Map<string, string>();
      for (const r of successful) {
        newThumbUrls.set(r.photo.id, r.thumbUrl);
        newPreviewUrls.set(r.photo.id, r.previewUrl);
      }

      const pages = generateAutoLayout(newPhotos);
      setPhotos(newPhotos);
      setThumbnailUrls(newThumbUrls);
      setPreviewUrls(newPreviewUrls);
      setBookRaw({ pages, currentSpreadIndex: 0 });
      undoStackRef.current = [];
      redoStackRef.current = [];
      setCanUndo(false);
      setCanRedo(false);
      setCurrentSpreadIndex(0);

      setProcessingPhotos(false);
      setProcessingMessage("Processing your photos...");
      setAppViewState("edit");
    },
    [thumbnailUrls, previewUrls],
  );

  const waitForEnteOriginals = useCallback(
    async (
      photoIds?: string[],
      onProgress?: (done: number, total: number) => void,
    ) => {
      const requested = photoIds ?? Array.from(pendingEnteOriginalsRef.current);
      const pending = requested.filter((id) => pendingEnteOriginalsRef.current.has(id));
      if (pending.length === 0) return;
      const total = pending.length;
      let done = 0;
      onProgress?.(done, total);
      await Promise.all(
        pending.map(
          (id) =>
            new Promise<void>((resolve) => {
              // If it already resolved between the snapshot and now, short-circuit.
              if (!pendingEnteOriginalsRef.current.has(id)) {
                done++;
                onProgress?.(done, total);
                resolve();
                return;
              }
              const existing = enteOriginalWaitersRef.current.get(id) ?? [];
              existing.push(() => {
                done++;
                onProgress?.(done, total);
                resolve();
              });
              enteOriginalWaitersRef.current.set(id, existing);
            }),
        ),
      );
    },
    [],
  );

  useEffect(() => {
    if (loading || processingPhotos) return;

    const queue = photos
      .filter(
        (photo) =>
          isPendingEnteOriginal(photo) &&
          !activeEnteOriginalDownloadsRef.current.has(photo.id),
      )
      .map((photo) => photo.id);

    if (queue.length === 0) return;

    queue.forEach((photoId) => activeEnteOriginalDownloadsRef.current.add(photoId));
    void startEnteOriginalDownloads(queue);
  }, [loading, photos, processingPhotos, startEnteOriginalDownloads]);

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
    setBook((prev) => {
      const filtered = prev.pages.filter((p) => p.id !== pageId);
      // Prevent deleting below 2 pages
      if (filtered.length < 2) return prev;
      // Ensure even page count for spreads
      if (filtered.length % 2 !== 0) {
        // Check if there's already an empty interior page we can remove instead of appending
        const isBlank = (p: typeof filtered[number]) =>
          p.slots.length === 0 &&
          p.textBlocks.length === 0 &&
          !p.topCaption &&
          !p.bottomCaption;
        // Look for a blank interior page (not cover or back cover)
        const blankIdx = filtered.findIndex(
          (p, i) => i > 0 && i < filtered.length - 1 && isBlank(p)
        );
        if (blankIdx !== -1 && filtered.length - 1 >= 2) {
          filtered.splice(blankIdx, 1);
        } else {
          filtered.push({
            id: uuid(),
            slots: [],
            textBlocks: [],
            topCaption: "",
            bottomCaption: "",
          });
        }
      }
      return { ...prev, pages: filtered };
    });
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
      setBook((prev) => {
        const page = prev.pages.find((p) => p.id === pageId);
        if (!page) return prev;

        const remainingPhotos = page.slots
          .filter((s) => s.id !== slotId && s.photoId)
          .map((s) => s.photoId!);

        if (remainingPhotos.length === 0) {
          return {
            ...prev,
            pages: prev.pages.map((p) =>
              p.id === pageId ? { ...p, slots: [], layoutVariant: undefined } : p
            ),
          };
        }

        // Pick the first layout variant for the new count and re-apply
        const variants = getVariantsForCount(remainingPhotos.length);
        const variantKey = variants[0]?.key;
        if (!variantKey) {
          return {
            ...prev,
            pages: prev.pages.map((p) =>
              p.id === pageId
                ? { ...p, slots: p.slots.filter((s) => s.id !== slotId) }
                : p
            ),
          };
        }

        const defaults = getDefaultPadding(variantKey);
        const paddingH = defaults.h || (page.paddingH ?? 0);
        const paddingV = defaults.v || (page.paddingV ?? 0);
        const newSlots = applyVariant(variantKey, remainingPhotos, paddingH, paddingV);

        return {
          ...prev,
          pages: prev.pages.map((p) =>
            p.id === pageId
              ? { ...p, slots: newSlots, layoutVariant: variantKey, paddingH, paddingV }
              : p
          ),
        };
      });
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
        const pages = prev.pages.map((p) => ({
          ...p,
          slots: p.slots.map((s) => {
            if (p.id === fromPageId && s.id === fromSlotId) {
              return { ...s };
            }
            if (p.id === toPageId && s.id === toSlotId) {
              return { ...s };
            }
            return s;
          }),
        }));

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

  const movePhotoToPage = useCallback(
    (fromPageId: string, fromSlotId: string, toPageId: string) => {
      setBook((prev) => {
        const fromPage = prev.pages.find((p) => p.id === fromPageId);
        const toPage = prev.pages.find((p) => p.id === toPageId);
        if (!fromPage || !toPage) return prev;

        const fromSlot = fromPage.slots.find((s) => s.id === fromSlotId);
        if (!fromSlot || !fromSlot.photoId) return prev;

        const movedPhotoId = fromSlot.photoId;

        // Collect photoIds for each page after the move
        const sourcePhotoIds = fromPage.slots
          .map((s) => s.photoId)
          .filter((id): id is string => id !== null && id !== movedPhotoId);
        const targetPhotoIds = [
          ...toPage.slots
            .map((s) => s.photoId)
            .filter((id): id is string => id !== null),
          movedPhotoId,
        ];

        if (targetPhotoIds.length > 4) return prev;

        // Build fake Photo objects for chooseBestLayout (it needs width/height for orientation)
        const makePhotoStub = (photoId: string): Photo => {
          const photo = photos.find((p) => p.id === photoId);
          return photo || { id: photoId, fileName: "", width: 1, height: 1, dateTaken: 0 };
        };

        const newPages = prev.pages.map((p) => {
          if (p.id === fromPageId) {
            if (sourcePhotoIds.length === 0) {
              return { ...p, slots: [], layoutVariant: undefined };
            }
            const srcPhotos = sourcePhotoIds.map(makePhotoStub);
            return {
              ...p,
              slots: chooseBestLayout(srcPhotos),
              layoutVariant: chooseBestVariantKey(srcPhotos),
            };
          }
          if (p.id === toPageId) {
            const tgtPhotos = targetPhotoIds.map(makePhotoStub);
            return {
              ...p,
              slots: chooseBestLayout(tgtPhotos),
              layoutVariant: chooseBestVariantKey(tgtPhotos),
            };
          }
          return p;
        });

        return { ...prev, pages: newPages };
      });
    },
    [photos]
  );

  const setPageLayout = useCallback(
    (pageId: string, variantKey: string) => {
      setBook((prev) => {
        const page = prev.pages.find((p) => p.id === pageId);
        if (!page) return prev;
        const photoIds = page.slots
          .map((s) => s.photoId)
          .filter((id): id is string => id !== null);
        const defaults = getDefaultPadding(variantKey);
        const paddingH = defaults.h || (page.paddingH ?? 0);
        const paddingV = defaults.v || (page.paddingV ?? 0);
        const newSlots = applyVariant(variantKey, photoIds, paddingH, paddingV);
        if (newSlots.length === 0) return prev;
        return {
          ...prev,
          pages: prev.pages.map((p) =>
            p.id === pageId
              ? { ...p, slots: newSlots, layoutVariant: variantKey, paddingH, paddingV }
              : p
          ),
        };
      });
    },
    []
  );

  const setPagePadding = useCallback(
    (pageId: string, paddingH: number, paddingV: number) => {
      setBook((prev) => {
        const page = prev.pages.find((p) => p.id === pageId);
        if (!page) return prev;
        const photoIds = page.slots
          .map((s) => s.photoId)
          .filter((id): id is string => id !== null);
        if (photoIds.length === 0) return prev;
        // Fall back to a default variant key if the page doesn't have one
        // yet (e.g. auto-laid-out pages from older sessions). Without this,
        // the padding buttons silently do nothing until the user clicks a
        // layout thumbnail first.
        const variantKey =
          page.layoutVariant ?? defaultVariantKeyForCount(photoIds.length);
        const newSlots = applyVariant(variantKey, photoIds, paddingH, paddingV);
        if (newSlots.length === 0) return prev;
        return {
          ...prev,
          pages: prev.pages.map((p) =>
            p.id === pageId
              ? { ...p, slots: newSlots, layoutVariant: variantKey, paddingH, paddingV }
              : p
          ),
        };
      });
    },
    []
  );

  const addTextBlock = useCallback((pageId: string): TextBlock => {
    const block: TextBlock = {
      id: uuid(),
      text: "",
      x: 50,
      y: 40,
      width: 45,
      height: 15,
      style: "body",
      alignment: "right",
      color: "#555555",
      rotation: 0,
      fontSize: 2.5,
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
    thumbnailUrls.forEach((url) => URL.revokeObjectURL(url));
    previewUrls.forEach((url) => URL.revokeObjectURL(url));
    clearImageCache();

    await clearAll();
    setPhotos([]);
    setThumbnailUrls(new Map());
    setPreviewUrls(new Map());
    setBookRaw(emptyBook);
    undoStackRef.current = [];
    redoStackRef.current = [];
    setCanUndo(false);
    setCanRedo(false);
    setCurrentSpreadIndex(0);
    setAppViewState("start");
    setRestored(false);
    activeEnteOriginalDownloadsRef.current.clear();
    enteOriginalWaitersRef.current = new Map();
  }, [thumbnailUrls, previewUrls]);

  return (
    <BookContext.Provider
      value={{
        appView,
        setAppView,
        loading,
        restored,
        setRestored,
        photos,
        thumbnailUrls,
        photoUrls,
        loadPreviews,
        addPhotos,
        addEntePhotos,
        processingPhotos,
        processingProgress,
        processingMessage,
        pendingEnteOriginals,
        waitForEnteOriginals,
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
        movePhotoToPage,
        setPageLayout,
        setPagePadding,
        addTextBlock,
        updateTextBlock,
        removeTextBlock,
        undo,
        redo,
        canUndo,
        canRedo,
        showPageStrip,
        setShowPageStrip,
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
