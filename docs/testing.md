# Testing

> How Universal Healthcare Data Network is tested — runners, fixtures, scope of coverage, and what CI runs.

[Back to README](../README.md) · [Architecture](./architecture.md) · [Contributing](./contributing.md) · [Environment](./environment.md)

---

## Quickstart

```bash
# everything (Turbo runs only what your changes touched + downstream)
pnpm test

# a single package
pnpm --filter @universal-healthcare/api test
pnpm --filter @universal-healthcare/web test
pnpm --filter @universal-healthcare/mobile test
pnpm --filter @universal-healthcare/shared test
```

`pnpm test` runs through Turbo, so a change to `packages/shared` cascades into the test runs for `apps/api` and `apps/web` automatically.

---

## Runners at a glance

| Package          | Runner                                  | Database / Env                              | Scope                                                                 |
| ---------------- | --------------------------------------- | -------------------------------------------- | -------------------------------------------------------------------- |
| `api`            | Vitest + Supertest                      | SQLite via `apps/api/.env.test`             | Module integration through the Express app — no real network port |
| `web`            | Vitest + Testing Library + jsdom        | None (mocked `lib/auth-client`)             | Render pages inside `AuthProvider`, assert fields + client errors  |
| `mobile`         | Jest (`jest-expo`) + Testing Library RN | None                                       | Smoke + screen / hook / image-picker tests                         |
| `shared`         | Vitest                                  | None                                        | Schema validation rules (Zod)                                      |

---

## `apps/api`

- **Runner:** Vitest + Supertest. Tests use `createApp()` from `src/app.ts` — no real HTTP listener is started.
- **Database:** A throwaway SQLite database backed by `apps/api/.env.test`. The `test` script runs `prisma db push --skip-generate --accept-data-loss` against it before Vitest, and a global `beforeEach` in `tests/setup.ts` clears tables between tests so tests are order-independent.
- **File parallelism:** `fileParallelism: false` to dodge SQLite lock contention. Tests run sequentially within the package, but parallel *across* packages (Turbo handles it).
- **Coverage focus:**
  - `auth/register` — success, duplicate email, invalid input
  - `auth/login` — success, invalid credentials, unknown account
  - `requireAuth` middleware — valid token, missing token, invalid/expired token
  - `users/me` PATCH — zod validation paths and persistence

### Adding an API test

1. Create `src/modules/<domain>/tests/<thing>.test.ts`
2. Import `createApp` and use Supertest against `request(app)`
3. For DB-touching tests, `beforeEach` should reset affected tables (or rely on the global hook in `tests/setup.ts`)
4. Assert on response **status** and on response **shape** — never the entire JSON object

---

## `apps/web`

- **Runner:** Vitest + `@testing-library/react` + jsdom
- **Pattern:** Each page test renders the route inside `<AuthProvider>` and mocks `lib/auth-client` (and friends) so no real network call is made.
- **Coverage focus:**
  - `/login` and `/register` — fields render and client-side schema errors surface
  - `/profile/edit` — initial values populate from `useAuth()` + `getMe`
  - `/creators/[slug]` — loading / not-found / ok states

### Why this works

The web app uses `@universal-healthcare/shared` for client-side validation. If the API schema rejects something, the form rejects the same thing earlier — which means any upgrade in validation lives in one place. Tests assert that the matching behaviour holds.

---

## `apps/mobile`

- **Runner:** Jest with `jest-expo` preset and `@testing-library/react-native`
- **Existing tests:** A smoke test renders `App` and asserts it mounts; component tests for `ProfileImagePicker` and `CreatorProfileScreen`; hook tests for `useImagePicker`.
- **Coverage focus:**
  - Permission grants / denials flow through `useImagePicker`
  - `CreatorProfileScreen` switches between loading / error / ok states
  - EXPO_PUBLIC_API_URL is read from `process.env` at runtime

---

## `packages/shared`

- **Runner:** Vitest
- **Coverage focus:** Validation rules for `loginSchema`, `registerSchema`, `updateMeSchema` — valid emails / invalid emails / password rules / required fields / missing fields / extra fields.

Because `packages/shared` is consumed directly from source, a test failure here will surface in `api`, `web`, *and* `mobile` test runs.

---

## Continuous Integration

CI mirrors local. Each package has its own workflow under `.github/workflows/` that installs dependencies and runs the relevant `turbo run` tasks scoped to that package with `--filter`:

| Workflow file        | Tasks                          |
| -------------------- | ------------------------------ |
| `api.yml`            | `lint · test · build`           |
| `web.yml`            | `lint · test · build`           |
| `mobile.yml`         | `lint · test`                   |
| `shared.yml`         | `lint · build`                  |
| `stellar.yml`        | `lint · build`                  |

A pull request only needs to pass the workflows for the packages it touches. Turbo's dependency graph cascades downstream — a change to `packages/shared` will trigger `api`, `web`, and `mobile` tests in addition to `shared`.

---

## Coverage philosophy

We don't chase `100%`. We chase **the right lines**:

- Every module has tests for its **happy path**, its **validation failure**, and its **forbidden-cross-module-access** case.
- Shared Zod schemas are exhaustively tested because they're a contract — one bad branch silently corrupts web + mobile + api at the same time.
- UI tests focus on **state transitions** (loading / error / empty / ok), not on asserting pixel layouts.
- Don't test the framework — test the *behaviour you wrote*. If you find yourself asserting that `useState` triggers a re-render, stop.

When in doubt: cover the path a real user can hit, and the path a real attacker can break.
