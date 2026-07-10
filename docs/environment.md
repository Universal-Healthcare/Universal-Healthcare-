# Environment Variables

> Every env var the apps read, where they're read, and the rules around secrets — so you can spin up a clean dev environment in under five minutes.

[Back to README](../README.md) · [Architecture](./architecture.md) · [Testing](./testing.md) · [Contributing](./contributing.md)

---

## The rules

- **Commit only `.env.example`** — never `.env`, `.env.local`, or any file containing real secrets.
- **Copy before you run.** Every app reads from a path declared in its package config (Ex: dotenv); if the file doesn't exist, the zod-validated loader will tell you exactly which var is missing and refuse to start.
- **Use long, random secrets** for `JWT_SECRET` outside local development. Anything predictable is exploitable.
- **`apps/api/.env.test` is checked in** with safe, test-only values — don't touch it.

---

## Setup flow

```bash
# 1. Copy the templates
cp apps/api/.env.example      apps/api/.env
cp apps/web/.env.example      apps/web/.env.local
cp apps/mobile/.env.example   apps/mobile/.env

# 2. Fill in real values for what you're exercising
#    (the defaults in `.env.example` are dev-safe)

# 3. Validate
pnpm --filter @universal-healthcare/api exec prisma generate
pnpm --filter @universal-healthcare/api exec prisma db push
```

If a variable is missing, the API process refuses to boot — `app.ts` calls `envSchema.parse(process.env)` at import time and throws zod errors with the exact missing field names.

---

## `apps/api`

Copy `apps/api/.env.example` → `apps/api/.env`.

| Variable                | Required             | Default           | Notes                                                                                                                                         |
| ----------------------- | -------------------- | ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `NODE_ENV`              | no                   | `development`     | `development` · `test` · `production`                                                                                                         |
| `PORT`                  | no                   | `4000`            | What the Express app listens on                                                                                                               |
| `DATABASE_URL`          | **yes**              | (none)            | Prisma connection string. SQLite for dev: `file:./dev.db`. Postgres for prod                                                                  |
| `JWT_SECRET`            | **yes**              | (none)            | Signing key for auth JWTs. **Never** use a default value in production                                                                        |
| `JWT_EXPIRES_IN`        | no                   | `1h`              | Any `ms` / `s` / `m` / `h` / `d` value that `jsonwebtoken` accepts                                                                            |
| `AWS_REGION`            | no                   | `us-east-1`       | Where the avatar S3 bucket lives                                                                                                              |
| `AWS_ACCESS_KEY_ID`     | when avatars enabled | empty             | Use an IAM access key scoped to a single bucket                                                                                               |
| `AWS_SECRET_ACCESS_KEY` | when avatars enabled | empty             | Pair to the access key. Rotate via IAM, not in source                                                                                         |
| `AWS_S3_BUCKET`         | when avatars enabled | empty             | Bucket the API writes avatar uploads into                                                                                                     |
| `CORS_ORIGINS`          | no                   | empty (allow all) | Comma-separated list of allowed web origins. **Always set this in production** (e.g. `https://app.universal-healthcare.example`)              |
| `RATE_LIMIT_WINDOW_MS`  | no                   | `60000`           | Per-IP fixed window for the `/api/*` rate limiter (ms). Lower = stricter                                                                      |
| `RATE_LIMIT_MAX`        | no                   | `120`             | Max requests per `RATE_LIMIT_WINDOW_MS` per IP. No-op when `NODE_ENV=test`                                                                    |
| `TRUST_PROXY`           | no                   | `false`           | Set `true` when the API runs behind a reverse proxy so `req.ip` reflects `X-Forwarded-For`. Required for accurate rate limiting in production |
| `LOG_LEVEL`             | no                   | `info`            | `debug` · `info` · `warn` · `error`                                                                                                           |

`apps/api/.env.test` is checked in with safe, test-only values and is read automatically by the `test` script.

---

## `apps/web`

Copy `apps/web/.env.example` → `apps/web/.env.local`.

| Variable              | Required | Default                 | Notes                                      |
| --------------------- | -------- | ----------------------- | ------------------------------------------ |
| `NEXT_PUBLIC_API_URL` | no       | `http://localhost:4000` | Base URL the browser fetches `/api/*` from |

Any variable prefixed with `NEXT_PUBLIC_` is inlined into the browser bundle. **Don't** put secrets in `NEXT_PUBLIC_*` — they're public.

---

## `apps/mobile`

Copy `apps/mobile/.env.example` → `apps/mobile/.env`.

| Variable              | Required | Default                 | Notes                                  |
| --------------------- | -------- | ----------------------- | -------------------------------------- |
| `EXPO_PUBLIC_API_URL` | no       | `http://localhost:4000` | Base URL the app fetches `/api/*` from |

Same rule as Next.js — `EXPO_PUBLIC_*` is bundled into the client binary. Treat it as public.

---

## AWS S3 (avatar uploads)

`POST /api/users/me/avatar-upload-url` returns a presigned `PUT` URL the client uploads to directly. The server never proxies the bytes — your S3 bucket must:

1. Be readable by the client doing the PUT (presigned URL, 5-minute TTL).
2. Be readable by the client downloading the avatar (public-read or via signed-URL fetch).

Local dev tip: point the same env vars at a `minio` container (`docker run -p 9000:9000 minio/minio`) to keep costs and noise out of AWS.

---

## Secrets handling (golden rules)

1. **No secrets in `.env.example`.** Placeholder strings only.
2. **No secrets in source.** Including comments and test fixtures.
3. **No secrets in CI logs.** Mask `JWT_SECRET` and AWS credentials in GitHub Actions output (`::add-mask::`).
4. **No secrets in commit history.** Rotate any credential that has even briefly landed in a commit.
5. **No secrets in browser bundles.** Don't write `process.env.SOMETHING_SECRET` and expect it to be private.

If you're not sure whether a value counts as a secret: if leaking it would let an attacker do something you don't want, it's a secret.

---

## Troubleshooting

| Symptom                                          | Almost-always-the-cause                                                                                                                         |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| API crashes on startup with a zod error          | Missing or malformed env var. The message tells you which one.                                                                                  |
| Web app can't reach the API                      | `NEXT_PUBLIC_API_URL` wrong, or API not actually running on that port.                                                                          |
| `aws-sdk` errors when issuing avatar upload URLs | AWS credentials missing / wrong region / bucket doesn't exist.                                                                                  |
| `prisma generate` fails                          | `DATABASE_URL` not pointing at a reachable database.                                                                                            |
| Mobile emulator can't connect to local API       | `EXPO_PUBLIC_API_URL` set to `http://localhost:4000` — use `http://10.0.2.2:4000` (Android) or `http://127.0.0.1:4000` (iOS simulator) instead. |

When in doubt: start the API in a terminal and read the first line of stdout — zod will print what's wrong.
