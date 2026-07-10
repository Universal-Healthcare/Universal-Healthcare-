# Security

> The threat model, vulnerability-reporting process, and security posture of Universal Healthcare Data Network — auth, storage, and data layers.

[Back to README](../README.md) · [Architecture](./architecture.md) · [Environment](./environment.md) · [Contributing](./contributing.md)

---

## Scope

This document covers the UHDN codebase: the Express **API**, the Next.js **web** app, the Expo **mobile** client, the **`@universal-healthcare/shared`** contract package, the **`@universal-healthcare/stellar`** scaffold, the S3-backed **avatar** pipeline, the Prisma-managed **database**, and the JWT-based **identity** layer.

Out of scope:

- Vulnerabilities in third-party deps — please disclose upstream (npm/GitHub advisory), and _also_ drop us a note so we can patch.
- Enterprise SSO / Okta / AzureAD providers — we don't ship them yet.
- Users' local device security — that's the mobile OS's problem, not ours.
- Physical or personnel security at deployment hosts.

---

## Threat model

### Adversary classes

| Class                              | Capability                                                                                           | In scope? |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------- | --------- |
| Opportunistic internet scanner     | Tries common endpoints, default creds, known CVEs                                                    | ✅ yes    |
| Unauthenticated attacker           | Can hit public endpoints (`/health`, `/api/creators/:slug`, `/api/auth/register`, `/api/auth/login`) | ✅ yes    |
| Authenticated malicious user       | Has a real JWT; can hit `/api/users/me*, /api/creators/*`, fan endpoints                             | ✅ yes    |
| Credential-stuffing attacker       | Tries leaked email/password pairs against `/api/auth/login`                                          | ✅ yes    |
| Network observer (TLS-terminated)  | Can see headers / payload sizes; cannot read bodies if TLS is configured                             | ✅ yes    |
| Insider with read access to deploy | Can read env vars, DB rows, S3 objects                                                               | ✅ yes    |
| Supply-chain attacker              | Compromises a dep or CI step                                                                         | ✅ yes    |

### Trust boundaries

- **Untrusted**: any input to `/api/*`, any client-side form field, any file uploaded to S3 via presigned URL, any mobile/web request body.
- **Trusted**: server-side code (`apps/api`), env-backed config, the database, the signed S3 presigner.

### Data sensitivity tiers

| Tier                    | Fields                                             | Storage                                          |
| ----------------------- | -------------------------------------------------- | ------------------------------------------------ |
| Secret                  | `passwordHash` (bcrypt), `JWT_SECRET`, AWS keys    | env vars + bcrypt-hashed DB column               |
| Auth material           | JWT bearer token, refresh tokens (future)          | client memory / localStorage (see posture below) |
| Personally identifiable | `email`, `displayName`, `bio`, `genre`, `location` | SQLite / Postgres DB row                         |
| User-generated media    | avatar                                             | S3 bucket                                        |

### What we're _not_ promising yet

These are concrete follow-ups, not designed-out features:

- Revocation before JWT expiry (would require a token blocklist)
- MFA / WebAuthn
- Server-side image moderation pipeline
- Audit log of every privileged write
- GDPR data-subject-access / erasure endpoints
- HIPAA BAA readiness (architecture is compatible; paperwork is not)
- SOC 2 attestation
- Org/role separation beyond "user owns `creatorProfile` and `fanProfile`"

---

## Reporting a vulnerability privately

**Please do not open a public GitHub issue for security bugs.**

Use one of:

1. **GitHub Security Advisories** (preferred) — visit the repository's _Security_ tab → _Report a vulnerability_ → submit privately. Only the maintainers see it.
2. **Email** the maintainers at the address in `CODEOWNERS` (or the GitHub org contact email if no `CODEOWNERS` exists yet).

What to include in a good report:

- **Reproduction** — minimal sequence (curl, request, screenshot).
- **Impact** — what data / privilege is exposed. Be specific.
- **Affected versions** — commit SHA, tag, or "main HEAD".
- **Suggested fix** (optional, always appreciated).
- **Disclosure timeline** — any constraints you've agreed to with anyone else.

We commit to:

- **Triage within 72 hours** of a complete report.
- **Status update every 7 days** until resolution.
- **Coordinated disclosure** — we'll work with you on a timeline. Default is _fix-first-then-disclose_, capped at 90 days.
- **Credit** in the public advisory (unless you ask to remain anonymous).
- **No legal action** against good-faith research that follows this policy.

---

## Auth (JWT) posture

### What we do

- **Passwords** are hashed server-side with **bcrypt** (10 salt rounds). Plaintext never leaves the API.
- **JWTs** are signed HS256 with `{ sub: userId }` payload only. Expiry comes from `JWT_EXPIRES_IN` (default `1h`). The signing key is `JWT_SECRET`, read from env and _never_ logged.
- **Transport** is `Authorization: Bearer <token>` on every protected route. Tokens are never accepted in URLs, query strings, or cookies (today).
- **Middleware** is centralised in `src/shared/middleware/auth.middleware.ts`. Missing header → `401 UNAUTHORIZED`. Invalid/expired → same.
- **Password rules** (from `@universal-healthcare/shared`'s `registerSchema`): ≥ 8 chars, at least one upper, one lower, one digit. Enforced _identically_ client and server.

### What we _don't_ do yet (and the risk)

| Gap                                                                   | Risk                                                | Mitigation today                                                       |
| --------------------------------------------------------------------- | --------------------------------------------------- | ---------------------------------------------------------------------- |
| No JWT revocation list                                                | A leaked token is valid until `exp` (~1h)           | Short expiry; rotate `JWT_SECRET` if you suspect a leak                |
| Token stored in `localStorage` on the web                             | XSS-readable                                        | CSP / no innerHTML / no `dangerouslySetInnerHTML` planned in follow-up |
| No MFA / WebAuthn                                                     | Credential stuffing → full account takeover         | bcrypt cost is the only rate-limit; IP-based throttle is a follow-up   |
| Stateless JWT — server can't tell a token was "yesterday's" until exp | Logout is client-side only                          | Reduce `JWT_EXPIRES_IN` in high-risk deployments                       |
| No password reset flow (yet)                                          | Forgotten passwords require manual ops intervention | n/a — track in roadmap                                                 |

### Hardening checklist for production deploys

- [ ] Rotate `JWT_SECRET` between deploys (or use a KMS-backed secret).
- [ ] Set `JWT_EXPIRES_IN` to a value appropriate for your risk model (default `1h` is a safe start).
- [ ] Drop bcrypt salt rounds to ≥ 12 if you have CPU budget.
- [ ] Front the API with a reverse proxy that rate-limits `/api/auth/login` (e.g. 5 req/min/IP).
- [ ] Front the API with a WAF / bot defence for `/api/auth/*` and `/api/users/me`.
- [ ] Log every `401` / `403` and alert on burst patterns.

---

## Storage (S3) posture

### What we do

- **Avatar uploads** are server-presigned `PUT` URLs returned by `POST /api/users/me/avatar-upload-url`. The client uploads bytes directly to S3 — the API never proxies them.
- **Presigned URLs** expire in **5 minutes** (`expiresIn: 300` in `src/shared/storage/s3.ts`).
- **Server-side encryption at rest** is whatever your bucket default is (AES-256 by default on new AWS buckets, opt-in elsewhere).
- **Key prefix strategy** is up to you; we recommend `avatars/<userId>/<uuid>.jpg` so you can lifecycle-rule the prefix.
- **Local dev** works against `minio` (S3-compatible) — see [Environment](./environment.md#aws-s3-avatar-uploads).

### What we _don't_ do yet

| Gap                                                                 | Risk                                                   | Mitigation today                                                          |
| ------------------------------------------------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------- |
| No MIME sniffing on the server side (only the upload URL is signed) | User can `PUT` any content-type; serving layer filters | Browser-side `Content-Type` enforcement; bucket CORS whitelist            |
| No antivirus / malware scan on upload                               | A user could publish a hostile file                    | Out of scope — add a Lambda@Edge or Hook if you serve user-uploaded media |
| No bucket versioning                                                | Lost objects on accidental delete                      | Enable versioning on the bucket out-of-band                               |
| No public-read policy guard-rail                                    | Bucket misconfiguration could leak other prefixes      | Use a dedicated bucket with a least-privilege IAM key                     |

### Production checklist

- [ ] Bucket has a custom IAM policy granting only `s3:PutObject` for `avatars/<userId>/*` from the API's role.
- [ ] Bucket has a public-read GetObject policy **only** for the `avatars/` prefix (or issue signed-URL fetches via CDN).
- [ ] Lifecycle rule moves any object older than N days to Glacier / deletes orphans.
- [ ] CORS allows `GET` from your web origin only.

---

## Database (Prisma) posture

### What we do

- **All queries go through the Prisma client** (`src/shared/database/prisma.ts`). No raw SQL, no string-concatenated `WHERE` clauses — no SQL-injection attack surface.
- **`DATABASE_URL` is read from env** and validated by zod at startup. The app refuses to boot if it's missing.
- **Migrations in prod** are applied with `prisma migrate deploy` (declarative, replayable). Dev uses `prisma db push` for speed.
- **Tests** use a separate SQLite file configured by `apps/api/.env.test`. The global `beforeEach` clears tables so tests can't leak rows between runs.
- **Cascading deletes** are configured at the schema level (e.g. `CreatorProfile` and `FanProfile` delete with their `User`).
- **PII columns** are exactly: email (with `@@unique`), displayName, bio, genre, location, avatar URL.

### What we _don't_ do yet

| Gap                                                | Risk                                                          | Mitigation today                                                                        |
| -------------------------------------------------- | ------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| No backups / point-in-time recovery configured     | Operator error or host failure loses data                     | Out of scope — schedule via your DB host                                                |
| No row-level multi-tenancy                         | All users share one logical DB; a single SQL bug = broad leak | Apply least-privilege DB user; audit SQL by hand                                        |
| No PII encryption-at-rest beyond provider defaults | A leaked DB dump exposes emails, names, bios verbatim         | Consider column-level encryption for `bio`, `location` if your threat model warrants it |
| No data-subject-access (DSAR) endpoint             | GDPR / CCPA deletion requests can't be self-served            | Build an admin-only ERASE endpoint (follow-up)                                          |

### Hardening checklist

- [ ] Production DB user has only the privileges required (`SELECT, INSERT, UPDATE, DELETE` — _not_ `DROP`, `CREATE`, `ALTER`).
- [ ] Connection pooling enabled (set `?connection_limit=` in `DATABASE_URL` for Postgres, or a PgBouncer layer).
- [ ] Backups: daily snapshot + 7-day retention minimum.
- [ ] Audit every schema migration in PR review — Prisma files are diff-readable.
- [ ] Never log a full `User` row; redact `email` in any error path.

---

## Headers, CORS, rate-limiting

| Concern            | Today                                                                                                                                                                                                                                                         | To do                                                                                                      |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| CORS               | **Allowlist** via `CORS_ORIGINS` (env-driven, origin callback rejects unknown origins with 403). Empty list = allow all (dev-only convenience; warn at startup in production)                                                                                 | Audit allowlist for any non-public origins before each release                                             |
| Security headers   | **Helmet** mounts in `apps/api` with `crossOriginResourcePolicy: cross-origin` so cross-origin XHR/fetch reads aren't blocked. Default headers include HSTS (off in dev), `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, no `X-Powered-By` | Add CSP / Referrer-Policy to the web app's `next.config` (follow-up)                                       |
| Rate limiting      | **Per-IP fixed-window** via `express-rate-limit` on all `/api/*` (configurable via `RATE_LIMIT_WINDOW_MS` / `RATE_LIMIT_MAX`; no-op when `NODE_ENV=test`). Standard `RateLimit-*` response headers (draft-7)                                                  | Add a stricter per-endpoint policy for `/api/auth/*` (5 req/min/IP) once auth-attack traffic is observable |
| Request size limit | **1 MB JSON body cap** on `/api/*` (`express.json({ limit: '1mb' })`)                                                                                                                                                                                         | Same cap for any future multipart endpoints                                                                |
| Request ID         | **`X-Request-Id`** trusted if it matches `[A-Za-z0-9._-]{1,128}` (upstream), otherwise generated as a UUID v4. Echoed in the response header and in every structured log line                                                                                 | Propagate the same id to outbound S3 / Stellar calls (correlation)                                         |
| Process lifecycle  | **Graceful shutdown** on `SIGTERM` / `SIGINT` — drains in-flight requests (10s), disconnects Prisma, hard-exits after 25s. `uncaughtException` + `unhandledRejection` are logged but do not kill the process silently                                         | n/a                                                                                                        |

---

## Dependencies

- `pnpm-lock.yaml` is committed — install is reproducible.
- CI runs `pnpm install --frozen-lockfile` on every PR.
- Per-package workflows run `lint · test · build` (see [Testing](./testing.md)).
- **Renovate / Dependabot** — not configured yet. Track as a follow-up.
- **npm audit / Snyk** — not wired into CI yet. Track as a follow-up.

If you discover a CVE in a dep we ship, disclose upstream _and_ drop us a note so we can patch in the same advisory window.

---

## Secrets

- Only `.env.example` is committed. Never `.env`, never `.env.local`.
- Production secrets via the host's env manager (Render, Railway, Vercel, Fly secrets, AWS Parameter Store, …).
- No secrets in client-side bundles — `NEXT_PUBLIC_*` and `EXPO_PUBLIC_*` are public by definition and **must not** hold secrets.
- Mask secrets in CI logs (`::add-mask::$VALUE` on GitHub Actions, equivalent on others).

---

## Logging

- `src/shared/logger/logger.ts` is JSON-structured (one line per entry, machine parseable).
- **Request access log** is emitted from `request-logger.middleware.ts` on `res.finish` with `method`, `path`, `status`, `durationMs`, `requestId`, `userId`, `ip`, `userAgent`. Aborted connections emit a separate `http_request_aborted` warn line.
- **Never** log: raw passwords, JWT secrets, `JWT_SECRET`, AWS keys, full request bodies containing PII. The `authorization`, `cookie`, and `x-api-key` headers are redacted in any debug-level log that includes request headers.
- **Audited writes** (login, profile update, password change) — not currently logged at higher granularity. Track as a follow-up.

---

## Incident response (summary)

| Step                                                                                           | Owner       |
| ---------------------------------------------------------------------------------------------- | ----------- |
| 1. Receive report via private channel (above)                                                  | Maintainers |
| 2. Triage within 72h — confirm impact, scope, severity                                         | Maintainers |
| 3. Coordinate timeline with reporter                                                           | Maintainers |
| 4. Implement fix on a private branch                                                           | Maintainers |
| 5. Backport to supported versions                                                              | Maintainers |
| 6. Publish GitHub Security Advisory + CVE if appropriate                                       | Maintainers |
| 7. Public disclosure _after_ fix is in `main` and shipped, **or** 90 days, whichever is sooner | Maintainers |
| 8. Post-mortem (internal, no PII) — what we missed, what we'll change                          | Maintainers |

---

## Hardening checklist for first production deploy

Concrete ops checklist you can run through before flipping DNS:

- [ ] Rotate `JWT_SECRET`. Don't reuse development secrets.
- [ ] Set `JWT_EXPIRES_IN` to a value appropriate for your risk model.
- [ ] Set `CORS_ORIGINS` to the exact production web origin (no empty list).
- [ ] Set `TRUST_PROXY=true` behind the reverse proxy so `req.ip` is the real client IP.
- [ ] Set `RATE_LIMIT_*` to values appropriate for your expected RPS — start strict, loosen from observed 429 rates.
- [ ] Provision a dedicated S3 bucket with least-privilege IAM for the API's role only.
- [ ] Bucket CORS restricted to your web origin.
- [ ] Bucket policy denies `s3:ListBucket` and `s3:GetObject` outside the `avatars/` prefix.
- [ ] Postgres / SQLite DB user has only `SELECT, INSERT, UPDATE, DELETE` on the application's schema.
- [ ] DB backups scheduled, retention documented.
- [ ] Reverse proxy in front of the API does TLS termination.
- [ ] Secrets masked in CI logs.
- [ ] Scrape `GET /metrics` with Prometheus; alert on spikes of `401`, `403`, and 5xx; alert on `uhc_http_requests_in_flight` saturation.
- [ ] Wire your orchestrator's readiness probe to `/readyz` and liveness to `/livez` (they're different on purpose).
- [ ] Verify graceful shutdown by sending `SIGTERM` to a running instance — it should drain and exit `0` within the timeout.
- [ ] Vulnerability-reporting channel is reachable (test it).

---

## License & data handling

The codebase is [MIT](../LICENSE). The data model carries PII; if you publish a deployment, you are the data controller. We provide the foundation — your compliance posture (GDPR / HIPAA / SOC 2 / region-specific) is up to you and your legal counsel.

If a feature here isn't safe enough for your threat model — open an issue or a PR. We want this list to shrink over time, not grow.
