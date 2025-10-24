import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  experimental: {
    ppr: true,
    clientSegmentCache: true,
    nodeMiddleware: true
  },
  // Disable CSS optimization to prevent 404 errors
  webpack: (config, { isServer }) => {
    config.optimization = {
      ...config.optimization,
      splitChunks: {
        ...config.optimization?.splitChunks,
        cacheGroups: {
          ...config.optimization?.splitChunks?.cacheGroups,
          styles: false,
        },
      },
    };

    // Add WebAssembly support for harper.js
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      layers: true,
    };

    // Handle .wasm files
    config.module.rules.push({
      test: /\.wasm$/,
      type: 'asset/resource',
    });

    // Ignore Tauri-specific modules in web build
    config.resolve.alias = {
      ...config.resolve.alias,
      '@tauri-apps/plugin-fs': false,
      '@tauri-apps/api': false,
    };

    return config;
  },
};

export default withNextIntl(nextConfig);
