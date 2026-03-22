/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Turbopack config for Next.js 16 (handles WASM for PGlite)
  turbopack: {
    rules: {
      '*.wasm': {
        loaders: ['file-loader'],
        as: '*.wasm',
      },
    },
    resolveAlias: {
      fs: { browser: './empty-module.js' },
      path: { browser: './empty-module.js' },
      crypto: { browser: './empty-module.js' },
    },
  },
  experimental: {
    // Enable WASM support
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
}

export default nextConfig
