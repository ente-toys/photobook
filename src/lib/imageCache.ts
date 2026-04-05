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
 * Bounded at MAX_ENTRIES via least-recently-used eviction. Implemented on top
 * of a JavaScript Map, whose iteration order is insertion order, so a "touch"
 * is `delete` + `set` (moving the entry to the most-recent end) and eviction
 * always removes `keys().next().value` (the least-recent entry). Entries are
 * also cleared outright when the underlying thumbnail URLs are revoked
 * (startOver / replace), because the decoded bitmaps would then be stale.
 */

const MAX_ENTRIES = 250;

const cache = new Map<string, HTMLImageElement>();
const pending = new Map<string, Promise<HTMLImageElement>>();

function isUsable(img: HTMLImageElement): boolean {
  return img.complete && img.naturalWidth > 0;
}

/** Move `photoId` to the most-recently-used end of the LRU. */
function touch(photoId: string, img: HTMLImageElement): void {
  cache.delete(photoId);
  cache.set(photoId, img);
}

/** Insert `img` at the MRU end and evict oldest entries over the cap. */
function insert(photoId: string, img: HTMLImageElement): void {
  cache.delete(photoId); // ensure we move, not duplicate
  cache.set(photoId, img);
  while (cache.size > MAX_ENTRIES) {
    const oldest = cache.keys().next();
    if (oldest.done) break;
    cache.delete(oldest.value);
  }
}

/**
 * Returns the cached HTMLImageElement for `photoId` if it is already fully
 * decoded, otherwise null. Safe to call during render — the LRU touch that
 * happens on a hit is cache-internal bookkeeping and does not trigger any
 * React state change.
 */
export function getCachedImage(photoId: string): HTMLImageElement | null {
  const img = cache.get(photoId);
  if (img && isUsable(img)) {
    touch(photoId, img);
    return img;
  }
  return null;
}

/**
 * Returns a promise that resolves to the decoded HTMLImageElement for the
 * photo identified by `photoId`. `url` is the current thumbnail object URL
 * for that photo; it is only read if a network fetch / decode is required.
 *
 * Coalesces concurrent requests for the same `photoId` so each photo is only
 * decoded once per eviction cycle.
 */
export function loadImageCached(
  photoId: string,
  url: string
): Promise<HTMLImageElement> {
  const existing = cache.get(photoId);
  if (existing && isUsable(existing)) {
    touch(photoId, existing);
    return Promise.resolve(existing);
  }

  const inflight = pending.get(photoId);
  if (inflight) return inflight;

  const promise = new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => {
      insert(photoId, img);
      pending.delete(photoId);
      resolve(img);
    };
    img.onerror = (e) => {
      pending.delete(photoId);
      reject(e);
    };
    img.src = url;
  });
  pending.set(photoId, promise);
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
