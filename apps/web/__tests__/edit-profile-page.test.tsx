import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import type { MeResponse } from '@universal-healthcare/shared'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import EditProfilePage from '../app/profile/edit/page'
import {
  defaultAuth,
  defaultFanProfile,
  mockMeResponse,
} from './helpers/test-utils'

// Hoisted so vi.mock factories can reference them.
const { mockGetMe, mockUpdateMe, mockUseAuth } = vi.hoisted(() => ({
  mockGetMe: vi.fn(),
  mockUpdateMe: vi.fn(),
  mockUseAuth: vi.fn(),
}))

// ─────────────────────────────────────────────────────────────────────────────
//  Module mocks
// ─────────────────────────────────────────────────────────────────────────────

vi.mock('../lib/auth-context', () => ({
  useAuth: () => mockUseAuth(),
  AuthProvider: ({ children }: { children: ReactNode }) => children,
}))

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

vi.mock('../lib/auth-client', () => ({
  loginUser: vi.fn(),
  registerUser: vi.fn(),
  AuthApiError: class AuthApiError extends Error {},
}))

vi.mock('../lib/user-client', () => ({
  getMe: (...args: unknown[]) => mockGetMe(...args),
  updateMe: (...args: unknown[]) => mockUpdateMe(...args),
  uploadAvatar: vi.fn(),
}))

// ─────────────────────────────────────────────────────────────────────────────
//  Defaults + per-test reset
// ─────────────────────────────────────────────────────────────────────────────

beforeEach(() => {
  mockGetMe.mockReset()
  mockUpdateMe.mockReset()
  mockUseAuth.mockReset()

  mockUseAuth.mockReturnValue(defaultAuth())
  mockGetMe.mockResolvedValue(mockMeResponse())
  mockUpdateMe.mockResolvedValue({ ok: true })
})

// ─────────────────────────────────────────────────────────────────────────────
//  Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('EditProfilePage', () => {
  // ── Original coverage (preserved verbatim) ──────────────────────────────

  it('renders the edit form with pre-filled values', async () => {
    render(<EditProfilePage />)

    expect(
      await screen.findByLabelText(/display name/i, { selector: 'input' })
    ).toHaveValue('Solar Vibes')
    expect(screen.getByLabelText(/bio/i)).toHaveValue(
      'Indie producer from Lagos'
    )
  })

  it('submits successfully and shows a success message', async () => {
    const user = userEvent.setup()
    render(<EditProfilePage />)

    await screen.findByLabelText(/display name/i, { selector: 'input' })

    await user.click(
      screen.getByRole('button', { name: /save changes/i })
    )

    expect(
      await screen.findByText(/profile updated successfully/i)
    ).toBeInTheDocument()
    expect(mockUpdateMe).toHaveBeenCalledTimes(1)
  })

  it('shows a validation error when the display name is shorter than the minimum length', async () => {
    const user = userEvent.setup()
    render(<EditProfilePage />)

    const displayName = await screen.findByLabelText(/display name/i, {
      selector: 'input',
    })
    await user.clear(displayName)
    await user.type(displayName, 'X')

    await user.click(
      screen.getByRole('button', { name: /save changes/i })
    )

    expect(
      await screen.findByText(/at least 2 characters/i)
    ).toBeInTheDocument()
    expect(mockUpdateMe).not.toHaveBeenCalled()
  })

  // ── Auth gate ───────────────────────────────────────────────────────────

  it('prompts the user to log in when no token is present and does not call getMe', async () => {
    mockUseAuth.mockReturnValue(defaultAuth({ token: null }))

    render(<EditProfilePage />)
    expect(
      await screen.findByText(/please log in to edit your profile/i)
    ).toBeInTheDocument()
    expect(mockGetMe).not.toHaveBeenCalled()
  })

  // ── Loading state ───────────────────────────────────────────────────────

  it('shows Loading… before getMe resolves', async () => {
    let resolveGetMe!: (response: MeResponse) => void
    mockGetMe.mockImplementation(
      () =>
        new Promise<MeResponse>((resolve) => {
          resolveGetMe = resolve
        })
    )

    render(<EditProfilePage />)
    expect(screen.getByText('Loading…')).toBeInTheDocument()

    resolveGetMe(mockMeResponse())
    await screen.findByLabelText(/display name/i, { selector: 'input' })
  })

  // ── Error state ─────────────────────────────────────────────────────────

  it('shows the load-error alert when getMe rejects', async () => {
    mockGetMe.mockRejectedValueOnce(new Error('boom'))

    render(<EditProfilePage />)

    expect(
      await screen.findByRole('alert')
    ).toHaveTextContent(/failed to load profile/i)
  })

  // ── Partial-profile fallback ────────────────────────────────────────────

  it('pre-fills from creatorProfile when fanProfile is null', async () => {
    mockGetMe.mockResolvedValueOnce(
      mockMeResponse({ fanProfile: null })
    )

    render(<EditProfilePage />)

    expect(
      await screen.findByLabelText(/display name/i, { selector: 'input' })
    ).toHaveValue('Solar Vibes')
    expect(screen.getByLabelText(/bio/i)).toHaveValue(
      'Indie producer from Lagos'
    )
  })

  it('pre-fills from fanProfile when creatorProfile is null', async () => {
    mockGetMe.mockResolvedValueOnce(
      mockMeResponse({
        creatorProfile: null,
        fanProfile: { ...defaultFanProfile, displayName: 'Fan McFan' },
      })
    )

    render(<EditProfilePage />)

    expect(
      await screen.findByLabelText(/display name/i, { selector: 'input' })
    ).toHaveValue('Fan McFan')
    // creator-only fields should be empty.
    expect(screen.getByLabelText(/bio/i)).toHaveValue('')
  })

  it('renders empty form fields when both profiles are null', async () => {
    mockGetMe.mockResolvedValueOnce(
      mockMeResponse({ creatorProfile: null, fanProfile: null })
    )

    render(<EditProfilePage />)

    expect(
      await screen.findByLabelText(/display name/i, { selector: 'input' })
    ).toHaveValue('')
    expect(screen.getByLabelText(/bio/i)).toHaveValue('')
    expect(screen.getByLabelText('Genre', { selector: 'input' })).toHaveValue('')
  })

  // ── Param passthrough ───────────────────────────────────────────────────

  it('calls getMe with the current auth token', async () => {
    mockUseAuth.mockReturnValue(defaultAuth({ token: 'a-different-token' }))
    mockGetMe.mockResolvedValueOnce(mockMeResponse())

    render(<EditProfilePage />)
    await screen.findByLabelText(/display name/i, { selector: 'input' })

    expect(mockGetMe).toHaveBeenCalledWith('a-different-token')
  })
})
