import { withSentryConfig } from '@sentry/nextjs';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  output: process.env.DOCKER_BUILD ? 'standalone' : undefined,
  experimental: {
    // @node-rs/argon2 ships a native .node binary. Without this, webpack
    // tries to parse that binary as JavaScript and the build fails.
    serverComponentsExternalPackages: ['@node-rs/argon2'],
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.amazonaws.com' },
      { protocol: 'https', hostname: process.env.CDN_HOSTNAME || 'cdn.example.com' },
    ],
  },
  async headers() {
    return [
      {
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

const sentryOptions = {
  silent: true,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
};

// Skip the Sentry build plugin entirely if no auth token is configured,
// so a Sentry hiccup can never take down the whole deploy again.
export default process.env.SENTRY_AUTH_TOKEN
  ? withSentryConfig(nextConfig, sentryOptions, {
      widenClientFileUpload: true,
      hideSourceMaps: true,
      disableLogger: true,
    })
  : nextConfig;
