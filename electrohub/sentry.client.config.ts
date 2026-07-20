import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.2,
  replaysSessionSampleRate: 0.0,
  replaysOnErrorSampleRate: 1.0,
  environment: process.env.NODE_ENV,
  // Never send PII by default (emails, request bodies with card data, etc).
  sendDefaultPii: false,
  beforeSend(event) {
    if (event.request?.cookies) delete event.request.cookies;
    return event;
  },
});
