import { loadCryptoReady } from "@/vendor/ente-wasm";
import { base64ToBytes, bytesToBase64 } from "./base64";

/**
 * Decrypt a per-file key. Ente wraps each file's key with the collection key
 * using libsodium SecretBox (XSalsa20-Poly1305).
 *
 * Returns the file key as base64 — the same encoding the other crypto calls
 * expect, so callers can thread it through without re-encoding.
 */
export async function decryptFileKey(
  encryptedKey: string,
  nonce: string,
  collectionKey: string,
): Promise<string> {
  const wasm = await loadCryptoReady();
  return wasm.crypto_decrypt_box(encryptedKey, nonce, collectionKey);
}

/**
 * Decrypt a single-message blob (used for metadata JSON and thumbnails).
 * Blobs are XChaCha20-Poly1305 secretstream messages with a final tag.
 */
export async function decryptBlobBytes(
  encryptedData: string | Uint8Array,
  decryptionHeader: string,
  key: string,
): Promise<Uint8Array> {
  const wasm = await loadCryptoReady();
  const encB64 =
    typeof encryptedData === "string"
      ? encryptedData
      : bytesToBase64(encryptedData);
  const plainB64 = wasm.crypto_decrypt_blob(encB64, decryptionHeader, key);
  return base64ToBytes(plainB64);
}

/**
 * Decrypt metadata JSON (encrypted as a blob) into a parsed JS object.
 */
export async function decryptMetadataJson(
  encryptedData: string,
  decryptionHeader: string,
  key: string,
): Promise<unknown> {
  const bytes = await decryptBlobBytes(encryptedData, decryptionHeader, key);
  const text = new TextDecoder().decode(bytes);
  return JSON.parse(text);
}

/**
 * Decrypt file content. Ente encrypts originals with a chunked secretstream
 * (4 MB chunks). We rely on the wasm helper that handles the whole stream in
 * one call — fine for photobook sources, which are generally ≤30 MB.
 */
export async function decryptFileBytes(
  encryptedData: Uint8Array,
  decryptionHeader: string,
  key: string,
): Promise<Uint8Array> {
  const wasm = await loadCryptoReady();
  const encB64 = bytesToBase64(encryptedData);
  const plainB64 = wasm.crypto_decrypt_stream(encB64, decryptionHeader, key);
  return base64ToBytes(plainB64);
}

/**
 * Argon2id key derivation — used to hash a password before sending it to the
 * server for password-protected album verification.
 *
 * Note arg order: the JS libsodium wrapper takes (password, salt, opsLimit,
 * memLimit); the wasm binding takes (password, salt, memLimit, opsLimit).
 */
export async function deriveArgonKey(
  password: string,
  saltB64: string,
  opsLimit: number,
  memLimit: number,
): Promise<string> {
  const wasm = await loadCryptoReady();
  return wasm.crypto_derive_key(password, saltB64, memLimit, opsLimit);
}
