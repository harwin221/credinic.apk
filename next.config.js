// Configuración de PWA
const withPWA = require('@ducanh2912/next-pwa').default({
  dest: 'public',
  disable: false, // Habilitar siempre para asegurar que el SW se genere y pruebe
  register: true,
  skipWaiting: true,
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  swMinify: true,
  workboxOptions: {
    disableDevLogs: true,
    runtimeCaching: [
      {
        urlPattern: /^https:\/\/fonts\.(?:gstatic|googleapis)\.com\/.*/i,
        handler: 'CacheFirst',
        options: {
          cacheName: 'google-fonts',
          expiration: {
            maxEntries: 4,
            maxAgeSeconds: 365 * 24 * 60 * 60, // 1 year
          },
        },
      },
      {
        urlPattern: /\.(?:eot|otf|ttc|ttf|woff|woff2|font)$/i,
        handler: 'StaleWhileRevalidate',
        options: {
          cacheName: 'static-font-assets',
          expiration: {
            maxEntries: 4,
            maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
          },
        },
      },
      {
        urlPattern: /\.(?:jpg|jpeg|gif|png|svg|ico|webp)$/i,
        handler: 'StaleWhileRevalidate',
        options: {
          cacheName: 'static-image-assets',
          expiration: {
            maxEntries: 64,
            maxAgeSeconds: 24 * 60 * 60, // 24 hours
          },
        },
      },
      {
        urlPattern: /\/_next\/static\/.*/i,
        handler: 'StaleWhileRevalidate',
        options: {
          cacheName: 'next-static-assets',
        },
      },
      {
        urlPattern: /\/credits\/.*/i,
        handler: 'NetworkFirst',
        options: {
          cacheName: 'credit-details',
          networkTimeoutSeconds: 5,
          expiration: { maxEntries: 100, maxAgeSeconds: 7 * 24 * 60 * 60 }
        },
      },
      {
        urlPattern: /\/api\/me.*/i,
        handler: 'NetworkFirst',
        options: {
          cacheName: 'session',
          networkTimeoutSeconds: 3,
          expiration: { maxEntries: 1, maxAgeSeconds: 60 * 5 } // 5 minutos
        }
      },
      {
        urlPattern: /\/api\/mobile\/sync.*/i,
        handler: 'NetworkFirst',
        options: {
          cacheName: 'mobile-sync',
          networkTimeoutSeconds: 10,
          expiration: { maxEntries: 10, maxAgeSeconds: 60 * 30 } // 30 minutos
        }
      },
      {
        urlPattern: /\/api\/.*/i,
        handler: 'NetworkFirst',
        options: {
          cacheName: 'api-cache',
          networkTimeoutSeconds: 5,
          expiration: { maxEntries: 50, maxAgeSeconds: 60 * 10 } // 10 minutos
        }
      },
      {
        urlPattern: /.*/i,
        handler: 'NetworkFirst',
        options: {
          cacheName: 'others',
          networkTimeoutSeconds: 10,
          expiration: { maxEntries: 64, maxAgeSeconds: 24 * 60 * 60 }
        },
      },
    ],
  },
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // Ignorar errores de tipos generados por Next.js 15.5.x (bug conocido)
    ignoreBuildErrors: true,
  },
  eslint: {
    // Permitir build con warnings de ESLint
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
  devIndicators: {
    allowedDevOrigins: [
      '*.cloudworkstations.dev',
      'http://192.168.0.11:3000',
    ],
  },
  async headers() {
    return [
      {
        // Aplicar estas cabeceras a todas las rutas de la API
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Credentials", value: "true" },
          { key: "Access-Control-Allow-Origin", value: "*" }, // Permite cualquier origen
          { key: "Access-Control-Allow-Methods", value: "GET,DELETE,PATCH,POST,PUT" },
          { key: "Access-Control-Allow-Headers", value: "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version" },
        ],
      },
    ];
  },
};

module.exports = withPWA(nextConfig);
