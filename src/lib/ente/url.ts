import { base58Decode } from "./base58";
import { bytesToBase64 } from "./base64";

const DEFAULT_API_ORIGIN = "https://api.ente.io";
const DEFAULT_ALBUMS_ORIGIN = "https://public-albums.ente.io";

export interface ParsedEnteAlbumUrl {
  accessToken: string;
  /** 32-byte collection key, base64-encoded (matching the wasm API format). */
  collectionKey: string;
  /**
   * Candidate API origins to try, in priority order. The pasted album link is
   * the source of truth; env-configured endpoints are only used when they match
   * that deployment or as an explicit fallback.
   */
  apiOrigins: string[];
  albumsOrigin: string;
}

/**
 * Parse an Ente public album URL like:
 *
 *     https://albums.ente.io/?t=ABC0123xyz#<collectionKey>
 *
 * The access token is the `?t=` query param. The collection key lives in the
 * URL fragment (never sent to the server), encoded either as base58 (newer
 * links, len < 50) or as hex (legacy links, len >= 50).
 */
export function parseEnteAlbumUrl(input: string): ParsedEnteAlbumUrl {
  const trimmed = input.trim();
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    throw new Error("That doesn't look like a valid URL.");
  }

  const accessToken = url.searchParams.get("t");
  if (!accessToken) {
    throw new Error("Album link is missing the access token (?t=…).");
  }

  const hash = url.hash.replace(/^#/, "");
  if (!hash) {
    throw new Error("Album link is missing the decryption key (the #… at the end).");
  }

  let keyBytes: Uint8Array;
  try {
    keyBytes = hash.length < 50 ? base58Decode(hash) : fromHex(hash);
  } catch (e) {
    throw new Error(
      `Album decryption key is malformed: ${e instanceof Error ? e.message : String(e)}`,
    );
  }
  if (keyBytes.length !== 32) {
    throw new Error(
      `Album decryption key has wrong length: expected 32 bytes, got ${keyBytes.length}.`,
    );
  }

  const { apiOrigins, albumsOrigin } = resolveOrigins(url);

  return {
    accessToken,
    collectionKey: bytesToBase64(keyBytes),
    apiOrigins,
    albumsOrigin,
  };
}

function resolveOrigins(url: URL): {
  apiOrigins: string[];
  albumsOrigin: string;
} {
  const configuredApiOrigin = sanitizeOrigin(process.env.NEXT_PUBLIC_ENTE_API_ENDPOINT);
  const configuredAlbumsOrigin = sanitizeOrigin(
    process.env.NEXT_PUBLIC_ENTE_ALBUMS_ENDPOINT,
  );
  const inputOrigin = sanitizeOrigin(url.origin)!;
  const host = url.hostname;
  const siblingApiOrigin = inferSiblingApiOrigin(url);

  const apiOrigins = uniqueOrigins([
    configuredAlbumsOrigin && configuredAlbumsOrigin === inputOrigin
      ? configuredApiOrigin
      : undefined,
    isDefaultHostedAlbumsHost(host) ? DEFAULT_API_ORIGIN : undefined,
    siblingApiOrigin,
    !isDefaultHostedAlbumsHost(host) ? inputOrigin : undefined,
    configuredApiOrigin,
    DEFAULT_API_ORIGIN,
  ]);

  return {
    apiOrigins,
    albumsOrigin: isDefaultHostedAlbumsHost(host) ? DEFAULT_ALBUMS_ORIGIN : inputOrigin,
  };
}

function inferSiblingApiOrigin(url: URL): string | undefined {
  const labels = url.hostname.split(".");
  if (labels.length < 2) return undefined;

  labels[0] = "api";

  return `${url.protocol}//${labels.join(".")}${url.port ? `:${url.port}` : ""}`;
}

function sanitizeOrigin(origin: string | undefined): string | undefined {
  return origin?.replace(/\/+$/, "");
}

function uniqueOrigins(origins: Array<string | undefined>): string[] {
  return Array.from(new Set(origins.filter((origin): origin is string => !!origin)));
}

function isDefaultHostedAlbumsHost(host: string): boolean {
  return host === "albums.ente.io" || host === "public-albums.ente.io";
}

function fromHex(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) throw new Error("hex string has odd length");
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) {
    const byte = parseInt(hex.substr(i * 2, 2), 16);
    if (Number.isNaN(byte)) throw new Error("invalid hex character");
    out[i] = byte;
  }
  return out;
}
