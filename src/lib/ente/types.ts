// Types for the Ente public album integration. Mirrors the shapes in
// ente-media (web/packages/media/) but kept permissive — we accept unknown
// fields and only validate what we use.

/**
 * Credentials for a public album: how to identify and authenticate requests,
 * plus the key to decrypt the collection and its files.
 */
export interface EnteCredentials {
  /** e.g. "https://api.ente.io" */
  apiOrigin: string;
  /** e.g. "https://public-albums.ente.io" (used for file/thumb downloads) */
  albumsOrigin: string;
  /** From URL ?t=... — goes in X-Auth-Access-Token. 10 alphanumeric chars. */
  accessToken: string;
  /** Base64-encoded 32-byte collection key (parsed from URL fragment). */
  collectionKey: string;
  /** Present after successful password verification. */
  accessTokenJWT?: string;
}

/** Argon2id params attached to a password-protected public URL. */
export interface EntePasswordParams {
  nonce: string;
  opsLimit: number;
  memLimit: number;
}

/** Result of GET /public-collection/info (subset we care about). */
export interface EntePublicCollectionInfo {
  referralCode?: string;
  /** The single active publicURL entry for this share. */
  publicURL: {
    passwordEnabled: boolean;
    password?: EntePasswordParams;
    enableDownload: boolean;
    validTill: number;
    deviceLimit: number;
  };
  /** Encrypted collection metadata, for decrypting the album name. */
  encryptedName?: string;
  nameDecryptionNonce?: string;
  plainName?: string;
  updationTime: number;
}

/** One file as returned by GET /public-collection/diff (subset we care about). */
export interface EnteRemoteFile {
  id: number;
  encryptedKey: string;
  keyDecryptionNonce: string;
  file: { decryptionHeader: string };
  thumbnail: { decryptionHeader: string };
  metadata: { encryptedData: string; decryptionHeader: string };
  pubMagicMetadata?: {
    encryptedData?: string;
    decryptionHeader: string;
  };
  info?: { fileSize?: number; thumbSize?: number };
  updationTime: number;
  isDeleted?: boolean;
}

/** Decrypted per-file metadata JSON payload. */
export interface EnteFileMetadata {
  fileType: number; // 0=image, 1=video, 2=live-photo
  title: string;
  creationTime: number; // microseconds since epoch
  modificationTime: number; // microseconds since epoch
  hash?: string;
}

/** Decrypted per-file public magic metadata (may override creation time / name). */
export interface EntePublicMagicMetadata {
  editedTime?: number;
  editedName?: string;
  w?: number;
  h?: number;
  dateTime?: string;
}

/**
 * A file from an Ente public album after metadata has been decrypted, but
 * before the thumbnail / original content has been fetched.
 */
export interface EnteFileDescriptor {
  enteFileId: number;
  /** Base64 file key used to decrypt thumbnail + file content + magic metadata. */
  fileKey: string;
  thumbnailDecryptionHeader: string;
  fileDecryptionHeader: string;
  fileName: string;
  /** Milliseconds since epoch. */
  dateTaken: number;
  /** Pixel dimensions if known from magic metadata; else 0. */
  width: number;
  height: number;
  /** Declared size of the original file in bytes (if known). */
  fileSize?: number;
  isImage: boolean;
}
