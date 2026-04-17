// Vendored from /Users/laurens/dev/ente_repo/ente/web/packages/wasm/pkg.
// Keep `ente_wasm.js`, `ente_wasm.d.ts`, `ente_wasm_bg.js`, `ente_wasm_bg.wasm`,
// and `ente_wasm_bg.wasm.d.ts` in this directory untouched — they are built
// artifacts from `wasm-pack build --target bundler` and must stay together.

type EnteWasmModule = typeof import("./ente_wasm");

let modulePromise: Promise<EnteWasmModule> | undefined;
let readyPromise: Promise<EnteWasmModule> | undefined;

/**
 * Load the vendored `ente-wasm` module once. Later calls share the promise.
 */
export function loadEnteWasm(): Promise<EnteWasmModule> {
  return (modulePromise ??= import("./ente_wasm").catch((err: unknown) => {
    modulePromise = undefined;
    throw err;
  }));
}

/**
 * Load the module and call `crypto_init()` once. All crypto calls should
 * await this helper first.
 */
export function loadCryptoReady(): Promise<EnteWasmModule> {
  return (readyPromise ??= loadEnteWasm()
    .then((m) => {
      m.crypto_init();
      return m;
    })
    .catch((err: unknown) => {
      readyPromise = undefined;
      throw err;
    }));
}
