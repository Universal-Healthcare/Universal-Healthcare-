import { beforeEach, vi } from 'vitest'

// ─────────────────────────────────────────────────────────────────────────────
//  Shared vi.mock bodies
// ─────────────────────────────────────────────────────────────────────────────

// Shared default mock for ../lib/api-client. Test files that need a custom
// implementation (e.g. playlist-detail with a real `authHeaders` function
// instead of `vi.fn()`) declare their own per-file vi.mock — per vitest
// precedence rules the per-file mock wins.
vi.mock('../lib/api-client', () => ({
  ApiError: class ApiError extends Error {
    status: number
    constructor(status: number, message: string) {
      super(message)
      this.status = status
    }
  },
  apiFetch: vi.fn(),
  authHeaders: vi.fn(),
}))

// Shared default mock for ../lib/auth-client. Same per-file override rules.
vi.mock('../lib/auth-client', () => ({
  loginUser: vi.fn(),
  registerUser: vi.fn(),
  AuthApiError: class AuthApiError extends Error {},
}))

// ─────────────────────────────────────────────────────────────────────────────
//  Hygiene
// ─────────────────────────────────────────────────────────────────────────────

// The `vi.fn()` instances provided by this setup file are SHARED across
// every test (Vitest evaluates setupFiles once at startup and never
// re-evaluates them). Without a reset between tests, the call-history of
// e.g. `apiFetch` would accumulate across runs and cause flaky assertions
// or false-positive cross-test pollution.
//
// We use `vi.clearAllMocks()` (not `resetAllMocks` or `restoreAllMocks`):
//   - Wipes `mock.calls`, `mock.results`, and `mock.contexts` so calls
//     from prior tests don't bleed into current-test expectations.
//   - PRESERVES the identity of every `vi.fn()` (vi.resetAllMocks would
//     also stamp `mockReturnValue`/`mockImplementation` back to `undefined`,
//     and vi.restoreAllMocks would unmock the modules entirely). Identity
//     preservation matters because test files that override the setupFile
//     mock with a per-file mock still receive the per-file vi.fn()
//     *instance*, and some files assert on it via the same import path.
//   - The setupFile mocks set no `mockReturnValue`/`mockImplementation` of
//     their own, so there is no behavior for clearAllMocks to leave behind.

beforeEach(() => {
  vi.clearAllMocks()
})
