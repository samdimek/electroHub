import { withSentryConfig } from '@sentry/nextjs';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // 'standalone' only matters for the Docker/self-hosted build path;
  // Vercel ignores it and uses its own optimized output.
  output: process.env.DOCKER_BUILD ? 'standalone' : undefined,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.amazonaws.com',
      },
      {
        protocol: 'https',
        hostname: process.env.CDN_HOSTNAME || 'cdn.example.com',
      },
    ],
  },
  async headers() {
    return [
      {
        // Security headers applied to every route. HTTPS is enforced by
        // Vercel at the edge; HSTS below reinforces it at the browser level.
        source: '/:path*',
        headers: [
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' https://js.stripe.com https://challenges.cloudflare.com",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https://*.amazonaws.com https:",
              "connect-src 'self' https://api.stripe.com https://*.sentry.io",
              "frame-src https://js.stripe.com https://challenges.cloudflare.com",
              "font-src 'self' data:",
            ].join('; '),
          },
        ],
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  silent: true,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
}, {
  widenClientFileUpload: true,
  hideSourceMaps: true,
  disableLogger: true,
});
