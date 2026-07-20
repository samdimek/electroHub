# ElectroHub

A multi-vendor marketplace that only lets electronics vendors open a store and sell. Built with Next.js
(TypeScript, App Router) for both frontend and backend, Postgres via Prisma, Redis (Upstash) for caching
and rate limiting, S3 for storage, Resend for transactional email, Sentry for monitoring, and Stripe for
tokenized payments.

## What's implemented

**Storefront**: product catalog with search/category filters, product detail pages with SEO metadata +
JSON-LD, cart, Stripe Elements checkout, account/order history, warranty claim filing.

**Vendor onboarding**: application form restricted to electronics categories — both the application API
and the approval API re-verify every selected category is flagged `isElectronics = true` before a store
can go live.

**Admin panel**: vendor approval queue, product management, bulk CSV/Excel import, inventory adjustments
with movement history, order processing (status transitions), customer management, promotions/coupons,
analytics dashboards (revenue, top products, low stock), warranty tracking + claims, role-based
permissions, and an immutable audit log viewer.

**Security**: HTTPS enforced via HSTS + Vercel's default TLS, Argon2id password hashing, CSRF via
double-submit cookie, security headers + CSP, SQL injection prevention via Prisma's parameterized
queries, rate limiting (Upstash) on auth/checkout/write/read tiers, Cloudflare Turnstile CAPTCHA on
auth and vendor-application forms, Stripe tokenization (card data never touches the server), env-var
based secrets management, and an audit log written on every state-changing action.

## Project layout

```
prisma/schema.prisma       Data model (users/RBAC, vendors, products, orders, coupons, warranty, audit log)
prisma/seed.ts             Seeds electronics categories + an optional super admin
src/lib/                   auth, rbac, audit, redis, s3, email, stripe, csrf, captcha, rate limiting, validation
src/middleware.ts          Edge-level rate limiting, CSRF check, coarse auth gating
src/app/api/               All backend routes (Next.js Route Handlers)
src/app/                   Storefront, vendor dashboard, and admin panel pages
```

## 1. Prerequisites

You'll need accounts/keys for:

| Service | Used for | Free tier? |
|---|---|---|
| [Neon](https://neon.tech) or [Vercel Postgres](https://vercel.com/storage/postgres) | Postgres database | Yes |
| [Upstash](https://upstash.com) | Redis (caching, rate limiting) | Yes |
| AWS S3 (or Cloudflare R2 / MinIO) | Product image & bulk-import file storage | Pay-as-you-go |
| [Resend](https://resend.com) | Transactional email | Yes |
| [Stripe](https://stripe.com) | Payment tokenization | Pay-as-you-go |
| [Sentry](https://sentry.io) | Error monitoring | Yes |
| [Cloudflare Turnstile](https://developers.cloudflare.com/turnstile/) | CAPTCHA | Yes |

## 2. Local setup

```bash
cp .env.example .env      # fill in the values described above
npm install                # this also runs `prisma generate` via postinstall
```

**Local database via Docker** (Postgres + Redis + MinIO for S3-compatible local storage):

```bash
docker compose up -d postgres redis minio
npx prisma migrate dev     # creates tables
SEED_ADMIN_EMAIL=admin@electrohub.example SEED_ADMIN_PASSWORD='ChangeMe123!' npx prisma db seed
npm run dev
```

Visit `http://localhost:3000`. Sign in with the seeded admin account at `/login`, then visit `/admin`.

> **Note on Docker**: `docker-compose.yml` and `Dockerfile` give you local-dev parity and a self-hosting
> fallback. **Vercel does not run this Dockerfile** — it builds the Next.js app directly from source
> using its own build pipeline. On Vercel you'll point `DATABASE_URL` / Redis / S3 env vars at managed
> services (Neon, Upstash, AWS S3) instead of the local containers.

## 3. Deploying to Vercel

1. **Push this project to a GitHub repository.**
2. **Import it in Vercel** → New Project → select the repo. Vercel auto-detects Next.js; no build
   command changes are needed (`npm run build` already runs `prisma generate` first).
3. **Add every variable from `.env.example`** to Vercel's Project Settings → Environment Variables
   (use your real Neon/Upstash/S3/Resend/Stripe/Sentry/Turnstile values, not the placeholders).
   - Set `APP_URL` to your production domain (e.g. `https://www.yourdomain.com`) once you know it.
4. **Run the database migration** against your production Postgres before or right after the first
   deploy:
   ```bash
   DATABASE_URL="<your production URL>" npx prisma migrate deploy
   DATABASE_URL="<your production URL>" SEED_ADMIN_EMAIL=you@company.com SEED_ADMIN_PASSWORD='...' npx prisma db seed
   ```
5. **Deploy.** Vercel will build and give you a `*.vercel.app` URL — confirm the storefront and
   `/admin` login work there before moving to your custom domain.
6. **Add your domain**: Project Settings → Domains → Add → enter the domain you'll share with me. Vercel
   gives you either an `A`/`ALIAS` record (apex domain) or a `CNAME` record (subdomain like `www`) to add
   at your DNS provider. Once DNS propagates, Vercel automatically issues and renews the TLS certificate
   — HTTPS is on by default, nothing else to configure.
7. **Configure the Stripe webhook** to point at `https://yourdomain.com/api/webhooks/stripe` (event
   types: `payment_intent.succeeded`, `payment_intent.payment_failed`, `charge.refunded`) and put the
   resulting signing secret in `STRIPE_WEBHOOK_SECRET`.

Send me the domain when you're ready and I'll walk through the DNS records with you.

## 4. Post-launch checklist

- [ ] Rotate `AUTH_SECRET` to a fresh `openssl rand -base64 48` value in production (don't reuse the dev one)
- [ ] Confirm S3 bucket has versioning + lifecycle rules if you want extra recovery protection
- [ ] Set up scheduled Postgres backups (Neon/Vercel Postgres/RDS do point-in-time recovery automatically;
      self-hosted Postgres needs `pg_dump` on a cron — see `scripts/` if you go that route)
- [ ] Swap the placeholder `TAX_RATE` in `src/app/api/checkout/route.ts` for a real tax provider
      (Stripe Tax, TaxJar) before accepting real orders across multiple states
- [ ] Review Sentry alert rules so payment/webhook failures page someone
- [ ] Turn Stripe from test mode to live mode keys

## 5. SEO notes

- `src/app/sitemap.ts` and `src/app/robots.ts` are generated dynamically from the live product/category
  catalog — no manual sitemap maintenance needed.
- Every product page sets per-product `<title>`/description via `generateMetadata` (falling back to the
  vendor's own meta fields) and emits `Product` JSON-LD (price, availability, brand, seller) for rich
  results.
- Admin/vendor/cart/checkout routes are excluded from the sitemap and disallowed in `robots.txt` since
  they're not meant to be indexed.
- Product URLs are slug-based and stable; archiving a product (rather than hard-deleting) avoids 404s on
  previously-indexed URLs — consider adding 301s if you ever change a slug.

## 6. A note on scope

This is a complete, working full-stack scaffold — every route and page described above is real,
connected code, not a mock. That said, a production launch of a marketplace this size normally involves
iteration once real traffic and edge cases show up (tax rules, fraud rules, shipping-rate logic, review
moderation, etc. are all left as clearly-marked extension points rather than fully built out). Treat the
first Vercel deploy as the start of that iteration loop — paste me any build errors or behavior you want
changed and I'll fix them directly.
