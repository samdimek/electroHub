import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.2,
  environment: process.env.NODE_ENV,
  sendDefaultPii: false,
  beforeSend(event) {
    // Strip auth/session cookies and Authorization headers before events
    // ever leave the server.
    if (event.request?.headers) {
      delete (event.request.headers as Record<string, string>)['authorization'];
      delete (event.request.headers as Record<string, string>)['cookie'];
    }
    return event;
  },
});
