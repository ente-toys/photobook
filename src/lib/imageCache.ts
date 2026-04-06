/**
 * Session-level LRU cache of decoded HTMLImageElements keyed by photo id.
 *
 * When PhotoSlotRenderer mounts (e.g. during edit-page virtualization churn),
 * it should be able to draw the photo on its first paint instead of waiting
 * for a fresh `new Image()` + onload round-trip. Keeping the decoded
 * HTMLImageElement alive across remounts removes the "white page → image
 * pops in" flash that was visible while scrolling the edit view.
 *
 * Keyed by photo id (stable across a session) rather than object URL, so the
 * key matches the natural identifier used everywhere else in the app.
 *
 * Each cache entry also tracks the URL it was loaded from. When a higher-
 * resolution URL becomes available (e.g. 256px thumbnail → 1080px preview),
 * `loadImageCached` detects the URL mismatch and reloads. `getCachedImage`
 * returns whatever is cached regardless of URL, so callers can display a
 * low-res placeholder instantly while the upgrade loads in the background.
 *
 * Bounded at MAX_ENTRIES via least-recently-used eviction. Implemented on top
 * of a JavaScript Map, whose iteration order is insertion order, so a "touch"
 * is `delete` + `set` (moving the entry to the most-recent end) and eviction
 * always removes `keys().next().value` (the least-recent entry). Entries are
 * also cleared outright when the underlying thumbnail URLs are revoked
 * (startOver / replace), because the decoded bitmaps would then be stale.
 */

const MAX_ENTRIES = 250;

interface CacheEntry {
  img: HTMLImageElement;
  url: string;
}

const cache = new Map<string, CacheEntry>();

interface PendingEntry {
  url: string;
  promise: Promise<HTMLImageElement>;
}

const pending = new Map<string, PendingEntry>();

function isUsable(img: HTMLImageElement): boolean {
  return img.complete && img.naturalWidth > 0;
}

/** Move `photoId` to the most-recently-used end of the LRU. */
function touch(photoId: string, entry: CacheEntry): void {
  cache.delete(photoId);
  cache.set(photoId, entry);
}

/** Insert `entry` at the MRU end and evict oldest entries over the cap. */
function insert(photoId: string, entry: CacheEntry): void {
  cache.delete(photoId); // ensure we move, not duplicate
  cache.set(photoId, entry);
  while (cache.size > MAX_ENTRIES) {
    const oldest = cache.keys().next();
    if (oldest.done) break;
    cache.delete(oldest.value);
  }
}

/**
 * Returns the cached HTMLImageElement for `photoId` if it is already fully
 * decoded, otherwise null. Returns the image regardless of which URL it was
 * loaded from — callers can show a low-res placeholder while a higher-res
 * version loads asynchronously.
 *
 * Safe to call during render — the LRU touch that happens on a hit is
 * cache-internal bookkeeping and does not trigger any React state change.
 */
export function getCachedImage(photoId: string): HTMLImageElement | null {
  const entry = cache.get(photoId);
  if (entry && isUsable(entry.img)) {
    touch(photoId, entry);
    return entry.img;
  }
  return null;
}

/**
 * Returns the URL that the currently cached image for `photoId` was loaded
 * from, or null if there is no cache entry. Used by PhotoSlotRenderer to
 * decide whether to kick off an upgrade load (thumb → preview).
 */
export function getCachedUrl(photoId: string): string | null {
  const entry = cache.get(photoId);
  return entry ? entry.url : null;
}

/**
 * Returns a promise that resolves to the decoded HTMLImageElement for the
 * photo identified by `photoId`. `url` is the current object URL for that
 * photo; it is only read if a network fetch / decode is required.
 *
 * Coalesces concurrent requests for the same `photoId` + `url` so each
 * combination is only decoded once per eviction cycle.
 */
export function loadImageCached(
  photoId: string,
  url: string
): Promise<HTMLImageElement> {
  const existing = cache.get(photoId);
  if (existing && existing.url === url && isUsable(existing.img)) {
    touch(photoId, existing);
    return Promise.resolve(existing.img);
  }

  // Only coalesce if the in-flight request is for the same URL
  const inflight = pending.get(photoId);
  if (inflight && inflight.url === url) return inflight.promise;

  const promise = new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => {
      insert(photoId, { img, url });
      pending.delete(photoId);
      resolve(img);
    };
    img.onerror = (e) => {
      pending.delete(photoId);
      reject(e);
    };
    img.src = url;
  });
  pending.set(photoId, { url, promise });
  return promise;
}

/**
 * Drops all cached image references. Call this when the underlying object
 * URLs are being revoked (startOver, replace-all) so we don't hold dangling
 * references to now-invalid blobs.
 */
export function clearImageCache(): void {
  cache.clear();
  pending.clear();
}
