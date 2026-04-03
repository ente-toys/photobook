/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  basePath: "/photobook",
  images: {
    unoptimized: true,
  },
  webpack: (config) => {
    config.externals = [...(config.externals || []), { canvas: "canvas" }];
    return config;
  },
};

module.exports = nextConfig;
