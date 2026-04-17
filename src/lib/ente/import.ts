import type {
  EnteCredentials,
  EnteFileDescriptor,
  EnteFileMetadata,
  EntePublicCollectionInfo,
  EnteRemoteFile,
  EntePublicMagicMetadata,
} from "./types";
import {
  decryptBlobBytes,
  decryptFileBytes,
  decryptFileKey,
  decryptMetadataJson,
} from "./crypto";
import {
  downloadEncryptedFile,
  downloadEncryptedThumbnail,
  fetchAllFiles,
  fetchCollectionInfo,
  verifyAlbumPassword,
  EnteApiError,
} from "./api";
import { parseEnteAlbumUrl } from "./url";

/** Ente's fileType values. */
const FILE_TYPE_IMAGE = 0;
// const FILE_TYPE_VIDEO = 1;
// const FILE_TYPE_LIVE_PHOTO = 2;

export type EnteImportPhase =
  | "connecting"
  | "password-required"
  | "listing"
  | "preparing";

export interface EnteImportPreparation {
  credentials: EnteCredentials;
  info: EntePublicCollectionInfo;
  files: EnteFileDescriptor[];
}

/**
 * Phase A: resolve the album URL, verify password (if needed), fetch the file
 * list, and decrypt per-file metadata + keys.
 *
 * Returns the list of photo descriptors ready for thumbnail decryption +
 * background original downloads. Video / live-photo files are filtered out.
 *
 * {@link requestPassword} is invoked only if the album is password-protected.
 * Throwing from it (or returning `null`) aborts the import.
 */
export async function prepareEnteAlbum(
  albumUrl: string,
  requestPassword: () => Promise<string | null>,
  onPhase: (phase: EnteImportPhase) => void,
  signal?: AbortSignal,
): Promise<EnteImportPreparation> {
  onPhase("connecting");
  const parsed = parseEnteAlbumUrl(albumUrl);
  let credentials: EnteCredentials = {
    apiOrigin: parsed.apiOrigin,
    albumsOrigin: parsed.albumsOrigin,
    accessToken: parsed.accessToken,
    collectionKey: parsed.collectionKey,
  };

  let info = await fetchCollectionInfo(
    credentials.apiOrigin,
    credentials.accessToken,
    undefined,
    signal,
  );

  if (info.publicURL.passwordEnabled) {
    if (!info.publicURL.password) {
      throw new Error("Album is password-protected but server omitted the password parameters.");
    }
    onPhase("password-required");
    const password = await requestPassword();
    if (!password) {
      const e = new Error("Album import cancelled.");
      (e as Error & { cancelled?: boolean }).cancelled = true;
      throw e;
    }
    let jwt: string;
    try {
      jwt = await verifyAlbumPassword(
        credentials.apiOrigin,
        credentials.accessToken,
        password,
        info.publicURL.password,
        signal,
      );
    } catch (e) {
      if (e instanceof EnteApiError && e.status === 401) {
        throw new Error("That password is incorrect.");
      }
      throw e;
    }
    credentials = { ...credentials, accessTokenJWT: jwt };
    // Server may return a refreshed info once unlocked, but our only dependency
    // is the password params which we already have, so skip the refetch.
  }

  onPhase("listing");
  const rawFiles = await fetchAllFiles(credentials, undefined, signal);

  onPhase("preparing");
  const descriptors = await decryptFileDescriptors(
    credentials.collectionKey,
    rawFiles,
    signal,
  );

  return { credentials, info, files: descriptors };
}

/**
 * Fetch + decrypt a single file's thumbnail, returning a Blob ready for the
 * photobook's thumbnail / preview stores.
 */
export async function fetchAndDecryptThumbnail(
  credentials: EnteCredentials,
  file: EnteFileDescriptor,
  signal?: AbortSignal,
): Promise<Blob> {
  const encrypted = await downloadEncryptedThumbnail(
    credentials,
    file.enteFileId,
    signal,
  );
  const plain = await decryptBlobBytes(
    encrypted,
    file.thumbnailDecryptionHeader,
    file.fileKey,
  );
  // Ente thumbnails are typically JPEG; the browser will sniff the content
  // type from the bytes, so a bare image/* Blob is fine.
  return new Blob([plain as BlobPart], { type: "image/jpeg" });
}

/**
 * Fetch + decrypt a single file's original bytes.
 */
export async function fetchAndDecryptOriginal(
  credentials: EnteCredentials,
  file: EnteFileDescriptor,
  signal?: AbortSignal,
): Promise<Blob> {
  const encrypted = await downloadEncryptedFile(
    credentials,
    file.enteFileId,
    signal,
  );
  const plain = await decryptFileBytes(
    encrypted,
    file.fileDecryptionHeader,
    file.fileKey,
  );
  return new Blob([plain as BlobPart], {
    type: guessMimeFromName(file.fileName),
  });
}

// --- internals --------------------------------------------------------------

async function decryptFileDescriptors(
  collectionKey: string,
  files: EnteRemoteFile[],
  signal?: AbortSignal,
): Promise<EnteFileDescriptor[]> {
  // Skip tombstones and obvious non-photo file types before spending crypto
  // cycles on them.
  const live = files.filter((f) => !f.isDeleted);
  const out: EnteFileDescriptor[] = [];

  // Modest parallelism: decrypting metadata is CPU-bound; 6 in flight matches
  // the photobook's existing ingest worker pool.
  const CONCURRENCY = 6;
  let cursor = 0;
  const workers = Array.from({ length: Math.min(CONCURRENCY, live.length) }, async () => {
    while (cursor < live.length) {
      if (signal?.aborted) return;
      const i = cursor++;
      const f = live[i]!;
      try {
        const d = await decryptOne(collectionKey, f);
        if (d && d.isImage) out.push(d);
      } catch (e) {
        console.warn(`Ente: failed to decrypt metadata for file ${f.id}`, e);
      }
    }
  });
  await Promise.all(workers);

  // Chronological order by dateTaken for the photobook's auto-layout.
  out.sort((a, b) => a.dateTaken - b.dateTaken);
  return out;
}

async function decryptOne(
  collectionKey: string,
  f: EnteRemoteFile,
): Promise<EnteFileDescriptor | null> {
  const fileKey = await decryptFileKey(
    f.encryptedKey,
    f.keyDecryptionNonce,
    collectionKey,
  );

  let metadata: EnteFileMetadata | null = null;
  if (f.metadata.encryptedData) {
    metadata = (await decryptMetadataJson(
      f.metadata.encryptedData,
      f.metadata.decryptionHeader,
      fileKey,
    )) as EnteFileMetadata;
  }
  if (!metadata) return null;

  let pubMagic: EntePublicMagicMetadata | undefined;
  if (f.pubMagicMetadata?.encryptedData) {
    const generic = (await decryptMetadataJson(
      f.pubMagicMetadata.encryptedData,
      f.pubMagicMetadata.decryptionHeader,
      fileKey,
    )) as { data?: EntePublicMagicMetadata };
    pubMagic = generic?.data;
  }

  const fileName = pubMagic?.editedName ?? metadata.title ?? `photo-${f.id}`;
  // Ente stores creationTime in microseconds since epoch.
  const creationMicros = pubMagic?.editedTime ?? metadata.creationTime;
  const dateTaken = Math.round(creationMicros / 1000);

  return {
    enteFileId: f.id,
    fileKey,
    thumbnailDecryptionHeader: f.thumbnail.decryptionHeader,
    fileDecryptionHeader: f.file.decryptionHeader,
    fileName,
    dateTaken,
    width: pubMagic?.w ?? 0,
    height: pubMagic?.h ?? 0,
    fileSize: f.info?.fileSize,
    isImage: metadata.fileType === FILE_TYPE_IMAGE,
  };
}

function guessMimeFromName(name: string): string {
  const ext = name.toLowerCase().split(".").pop() ?? "";
  switch (ext) {
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "png":
      return "image/png";
    case "webp":
      return "image/webp";
    case "heic":
      return "image/heic";
    case "heif":
      return "image/heif";
    case "gif":
      return "image/gif";
    default:
      return "image/jpeg";
  }
}
