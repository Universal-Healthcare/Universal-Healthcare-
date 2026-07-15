# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

Feature milestone: playlist module + full web/mobile surfaces + CI fixes.

### Added

- **Playlists module** (full vertical slice across `packages/shared` and
  `apps/api`). Playlist + Track models (already in schema), full
  repository with DB-level pagination on `listByUserId` (skip/take +
  `Promise.all` for count) and an atomic `update` method that wraps
  metadata+tracks changes in `prisma.$transaction` so a playlist is
  never half-updated. New endpoints: `GET /api/playlists/public/:id`
  (public), `GET /api/playlists` (auth, paginated),
  `GET /api/playlists/:id` (auth, owner can view private),
  `POST /api/playlists` (auth), `PUT /api/playlists/:id` (auth, owner,
  atomic tracks+metadata), `DELETE /api/playlists/:id` (auth, owner, 204).
  20 service + route tests covering create, public/private access,
  pagination, update (tracks + metadata), non-owner 403, and 404.
- **Web playlist surface**. New files: `apps/web/lib/playlist-client.ts`
  (public + auth endpoints, `apiFetch` wrapper matching existing client
  pattern), `apps/web/app/playlists/page.tsx` (auth-gated list with
  inline create form, per-card delete with error feedback, press-feedback
  hover states, and navigation links from each card to its detail page),
  `apps/web/app/playlists/[id]/page.tsx` (detail page with track table,
  public/private badge, auth-aware fetch trying owner endpoint first then
  public fallback, and an inline edit form for title/visibility).
- **Mobile playlist surface**. New files:
  `apps/mobile/src/hooks/usePlaylists.ts` — `usePlaylists` read hook
  (fetches auth user's playlists) and `usePlaylistActions` write hook
  (create, update, remove) following the `useComments`/`useFollows`
  pattern. `apps/mobile/src/screens/PlaylistsScreen.tsx` — FlatList with
  inline create form (title + public checkbox), per-card delete with
  activity indicator, pull-to-refresh with first-load spinner gate
  (`hasLoadedOnce` ref), inline error banner for post-first-load refresh
  failures, and card tap navigation to detail.
  `apps/mobile/src/screens/PlaylistDetailScreen.tsx` — track list with
  position/title/artist/duration columns, public/private badge,
  pull-to-refresh, inline error banner, "Edit Tracks" mode with — Add
  Track form (title, artist, duration in seconds) and per-track remove
  buttons (×), race-condition guard disabling all editing controls
  during save/remove.
- **Web home page "My Playlists" link** — green button linking to
  `/playlists`, visible only to authenticated users.

### Fixed

- **Docs workflow Node incompatibility** — `markdownlint-cli2@0.23.0`
  does not support Node 20. Changed `.github/workflows/docs.yml` from
  `node-version: 20` to `node-version: 18` and reordered setup-node
  before `pnpm/action-setup`.
- **Mobile act() warnings** — `AuthProvider`'s async `useEffect` load
  called `setIsLoading(false)` in a `finally` block after
  `AsyncStorage.getItem`, triggering React Testing Library act()
  warnings in `login-screen.test.tsx` and `register-screen.test.tsx`.
  Wrapped all assertions in `await waitFor(() => {...})`.

## [0.2.0] - 2026-07-08

Operational maturity milestone. The API gains production-ready observability
(Sentry), container-first deployment (multi-stage Dockerfile + docker-compose),
load-test scaffolding (k6), and a hardened CI pipeline that runs end-to-end
on every push.

### Added

- **Sentry SDK** wired from env in both the API (`@sentry/node` ^8) and web
  (`@sentry/nextjs` ^8). `SENTRY_DSN` empty ⇒ SDK is a no-op, so dev / test
  / local environments work without a Sentry project. Capture points:
  unhandled errors (with `requestId` / `method` / `path` context), email-send
  failures, S3 presign failures. Graceful shutdown calls `flushSentry(2000)`
  before exit. The web app uses `withSentryConfig` + `dryRun` / `silent` /
  `disable` when `SENTRY_AUTH_TOKEN` is empty so dev / CI builds stay quiet.
- **Prisma seed script** (`apps/api/prisma/seed.ts`) for local dev and the
  k6 load test. Creates three demo users with a shared known password
  (`Password123!`): `creator@…` (verified creator), `fan@…` (verified fan
  with `genrePrefs`), `unverified@…` (no role, unverified email).
  Idempotent. Wired as the Prisma seed entrypoint via `prisma.seed` in
  `apps/api/package.json`, plus `db:seed` and `db:reset` scripts.
- **k6 load test harness** (`tools/k6/smoke.js` + README). 50 RPS sustained
  across two scenarios for 30 s each — `POST /api/auth/login` (25 RPS,
  bcrypt verify) and `GET /api/fans/me` (25 RPS, JWT + Prisma). Thresholds:
  `p(95) < 500ms` per scenario, `http_req_failed < 1%`. One VU logs in at
  `setup()`, all VUs share the JWT (production-realistic steady state).
- **Multi-stage Dockerfile** for the API (`apps/api/Dockerfile`).
  `deps` → `builder` → `runner` with BuildKit `pnpm` cache mount, non-root
  user, `tini`, `/readyz` healthcheck, and an entrypoint that runs
  `prisma db push` then exec's the server. Self-contained prod deployment
  via `pnpm deploy --prod`.
- **`docker-compose.yml`** with two profiles — `--profile postgres` (default,
  prod-parity: Postgres 16 + MinIO + Mailpit) and `--profile sqlite`
  (zero-dependency dev: SQLite file in a volume + MinIO + Mailpit). `JWT_SECRET`
  is the only required env var. `minio-bucket-init` creates the `avatars`
  bucket on first run.
- **`.dockerignore`** at `apps/api/` to keep the build context lean
  (excludes `node_modules`, `.git`, `dist`, `.next`, `.env`, IDE files, etc.).
- **`docker-entrypoint.sh`** — runs `npx prisma db push --skip-generate
--accept-data-loss` then exec's the CMD, so SIGTERM propagates correctly
  to the Node process.
- **`.env.example`** at the repo root for docker-compose. Documents every
  var with sensible defaults.
- **Deploy API workflow** (`.github/workflows/deploy-api.yml`). Builds
  multi-arch (`linux/amd64`, `linux/arm64`) with BuildKit `type=gha` cache,
  pushes to `ghcr.io/${{ github.repository_owner }}/api` (tags: short SHA
  and the `latest` tag on `main`), then `curl POST` to `RENDER_DEPLOY_HOOK_URL`.
  `permissions: packages: write` (minimum for GHCR push). Sentry release
  tagged with the commit SHA.
- **`tools/ci-local.sh`** — one-command local CI suite. Mirrors every
  command each of the 7 CI workflows actually executes (`pnpm install
--frozen-lockfile` + 5 turbo commands + docs lints + `docker build`).
  Uses `set -o pipefail` so pnpm / docker exit codes aren't swallowed by
  `tail`. Colorized output, per-step timings, `--no-docker` / `--quick` /
  `--no-color` flags, graceful skip if docker is missing, exit code = number
  of failed steps.
- **`.npmrc`** at the repo root with `engine-strict=true` and
  `auto-install-peers=true`. Catches Node / pnpm / peer-dep mismatches at
  install time instead of at the next typecheck.
- **This CHANGELOG**.

### Changed

- **README.md** — added the "Sentry", "Docker / docker-compose", "k6 load
  tests", and "Deploy (Render + GHCR)" notes inline with the existing
  Features and Tech Stack sections, and a "Verify CI locally before
  pushing" subsection pointing at `tools/ci-local.sh`.
- **`apps/api/.env.example`** — added Sentry vars (`SENTRY_DSN`,
  `SENTRY_TRACES_SAMPLE_RATE`, `SENTRY_ENVIRONMENT`, `SENTRY_RELEASE`) and
  an optional `AWS_S3_ENDPOINT` for S3-compatible stores (MinIO,
  LocalStack, R2).
- **`apps/web/.env.example`** — added Sentry vars (`NEXT_PUBLIC_SENTRY_DSN`,
  `NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE`, `NEXT_PUBLIC_SENTRY_ENVIRONMENT`,
  `NEXT_PUBLIC_SENTRY_RELEASE`) plus server-only
  `SENTRY_AUTH_TOKEN` / `SENTRY_ORG` / `SENTRY_PROJECT` for build-time
  source map upload.
- **`apps/web/next.config.mjs`** — wrapped with `withSentryConfig`.
  `dryRun` / `silent` / `disable` when `SENTRY_AUTH_TOKEN` is empty so dev
  and CI builds stay quiet.
- **`apps/api/package.json`** — added `db:seed` and `db:reset` scripts
  alongside the existing `dev` / `build` / `start` / `lint` / `typecheck`
  / `test` scripts, plus a top-level `"prisma": { "seed": "tsx
prisma/seed.ts" }` block so `prisma db seed` Just Works.
- **Root `package.json`** — `pnpm.onlyBuiltDependencies` whitelist now
  includes `@sentry/cli` and `sharp` (in addition to the existing
  `@prisma/client` / `@prisma/engines` / `esbuild` / `prisma` entries).
  Without this, the Sentry CLI's native binary wouldn't download and the
  deploy-api image build would fail.
- **All 7 `.github/workflows/*.yml`** — pinned `pnpm@10.6.5` explicitly via
  `pnpm/action-setup@v4.with.version` (was previously implicit through
  `packageManager` + corepack, which can resolve a different pnpm major
  on some runners and fail the lockfileVersion 9.0 hash check).
- **`apps/api/Dockerfile`** — `pnpm deploy` now uses `--legacy` (pnpm v10's
  default `deploy` requires `inject-workspace-packages=true` workspace-wide,
  which we don't want because it changes resolution semantics for every
  pnpm command). A `TODO(when pnpm vN: remove --legacy)` block documents
  the migration path; `pnpm-workspace.yaml` has a reciprocal pointer.

### Fixed

- All 7 GitHub Actions workflows (`api`, `web`, `shared`, `stellar`,
  `mobile`, `docs`, `deploy-api`) were failing on push to `main` in 11–16 s
  with a `pnpm install --frozen-lockfile` failure. Three interacting
  causes, three fixes: (1) `pnpm` version drift on CI (now pinned), (2)
  `@sentry/cli` and `sharp` postinstall scripts were silently skipped in
  CI's strict mode (now whitelisted), (3) lockfile integrity (regenerated
  from scratch).
- `apps/api/Dockerfile` build itself: removed a broken `COPY ... 2>/dev/null
|| true` line (Docker parsed the shell syntax as part of the source
  path and errored with `failed to compute cache key... "/||": not found`).
  The line was redundant — `pnpm deploy --prod` already bundles the
  generated Prisma client.
- The `@sentry/nextjs: ^8` dep that was added locally during the Sentry
  commit but never included in that commit's `git add` list. The lockfile
  (committed) had the entry, so a fresh `git clone` + `pnpm install
--frozen-lockfile` would have failed.
- Docs CI: the linter was scanning `node_modules` (1,573 vendor markdown
  files, 133k+ false positives) because the glob had no exclusion. Added
  `!**/node_modules/**` and `!**/.git/**` to the markdownlint-cli2
  invocation.
- Docs CI: the link-check's `Accept: application/vnd.github+json` header
  override was applied to all of `github.com`, which made HTML pages like
  `/releases` return 406 (Not Acceptable). Narrowed the override to just
  `api.github.com` so the HTML pages are checked with default headers.
- Docs CI: discontinued the `MD060` table-column-style rule (cosmetic
  preference, not a bug — 128 findings across all markdown tables, no
  real markdown issue).

### Security

- Sentry capture is opt-in via `SENTRY_DSN` and uses `sendDefaultPii: false`
  by default in both the API and the web app. PII (email, IP, user agent)
  is not sent unless explicitly enabled.
- Container runs as a non-root user (`uid=1001`), with the application
  directory writable only by that user.

## [0.1.0] - 2026-07-08

Initial feature-complete foundation. A TypeScript monorepo with a
modular Express API, Next.js portal, Expo mobile client, and two shared
packages (`@universal-healthcare/shared` for Zod schemas + DTOs,
`@universal-healthcare/stellar` as a compile-only scaffold for a future
Stellar integration).

### Added

- **Initial monorepo foundation**: pnpm + Turborepo workspace with five
  packages (`@universal-healthcare/api`, `web`, `mobile`, `shared`,
  `stellar`); the first `/api/*` surface (auth, users, creators, fans
  modules); the first `/health`, `/livez`, `/readyz`, `/metrics` health
  endpoints; helmet + CORS + per-IP rate limiting + JSON-structured
  logger; the first six CI workflows (api, web, shared, stellar, mobile,
  docs); the original `README.md` and `docs/` (architecture, contributing,
  testing, environment, security).
- **Phase 2 — Auth**: refresh-token rotation (opaque 32-byte hex tokens,
  SHA-256-hashed in DB, one-time-use with `jti`-keyed access JWTs,
  **replay detection** revokes all refresh tokens for the user when a
  revoked token is presented), email verification
  (`POST /api/auth/verify-email`, `POST /api/auth/resend-verification`),
  password reset (`POST /api/auth/forgot-password`,
  `POST /api/auth/reset-password` with a `PASSWORD_REUSED` guard), and an
  activation flow where `POST /api/auth/register` requires `role: "creator"
| "fan"` + `displayName` + optional `profile` and atomically creates the
  User + CreatorProfile (with an auto-generated unique slug) or FanProfile
  in one Prisma transaction.
- **Phase 2 — Creators list**: shared `paginationSchema` + `PaginationMeta` +
  `PaginatedResponse<T>` in `packages/shared`; `GET /api/creators?page=
&pageSize=&search=` — public, ordered by `createdAt desc`.
- **Phase 2 — Web client**: `auth-client` methods for refresh, logout,
  verify-email, resend-verification, forgot-password, reset-password;
  `auth-context` stores both access + refresh tokens; the register form
  has a role selector + role-specific profile fields.

### Security

- Helmet security headers on every response, CORS allowlist driven by
  `CORS_ORIGINS` (empty list = allow all in dev only), per-IP rate
  limiting on all `/api/*` routes, JWT bearer auth with a `requireAuth`
  middleware, and a centralized typed error model (`AppError` with
  `statusCode` + machine-readable `code`).
- Passwords hashed server-side with bcrypt. Plaintext never leaves the
  API.
- Request ID (`X-Request-Id`): trust upstream if it matches
  `[A-Za-z0-9._-]{1,128}`, otherwise generate a UUID v4. Echoed in the
  response header and in every structured log line.
