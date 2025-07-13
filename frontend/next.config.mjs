/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  
  // Enable experimental features
  experimental: {
    // Enable React Server Components
    serverActions: {
      bodySizeLimit: '2mb',
    },
    // Turbopack for faster dev builds
    turbo: {
      resolveAlias: {
        '@': './app',
        '@/components': './components',
        '@/lib': './lib',
        '@/types': './types',
        '@/hooks': './hooks',
      },
    },
  },
  
  // API rewrites for development
  async rewrites() {
    return [
      {
        source: '/api/backend/:path*',
        destination: 'http://localhost:8000/api/:path*',
      },
      {
        source: '/ws/:path*',
        destination: 'http://localhost:8000/ws/:path*',
      },
    ];
  },
  
  // Headers for security
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ];
  },
};

export default nextConfig;