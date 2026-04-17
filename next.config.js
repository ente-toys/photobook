/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  images: {
    unoptimized: true,
  },
  webpack: (config, { isServer }) => {
    config.externals = [...(config.externals || []), { canvas: "canvas" }];

    // ente-wasm uses `import * as wasm from "./ente_wasm_bg.wasm"`, which
    // requires webpack's async WebAssembly experiment.
    config.experiments = {
      ...(config.experiments || {}),
      asyncWebAssembly: true,
      topLevelAwait: true,
    };

    // The vendored ente-wasm is browser-only; never bundle it into the
    // server build (we use `output: "export"`, but Next still does an RSC
    // pass during build).
    if (isServer) {
      config.externals.push(({ request }, callback) => {
        if (request && request.includes("vendor/ente-wasm")) {
          return callback(null, "commonjs " + request);
        }
        callback();
      });
    }

    return config;
  },
};

module.exports = nextConfig;
