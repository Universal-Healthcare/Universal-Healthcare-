import { render, screen } from '@testing-library/react'
import type { CreatorProfileResponse } from '@universal-healthcare/shared'
import { describe, expect, it, vi } from 'vitest'
import CreatorProfilePage from '../app/creators/[slug]/page'
import { mockCreatorProfile } from './helpers/test-utils'

// Hoisted so vi.mock factories can reference them.
const { mockGetCreatorBySlug, mockUseParams } = vi.hoisted(() => ({
  mockGetCreatorBySlug: vi.fn(),
  mockUseParams: vi.fn(),
}))

// ─────────────────────────────────────────────────────────────────────────────
//  Module mocks
// ─────────────────────────────────────────────────────────────────────────────

vi.mock('next/navigation', () => ({
  useParams: () => mockUseParams(),
  useRouter: () => ({ push: vi.fn() }),
}))

vi.mock('../lib/creator-client', () => ({
  getCreatorBySlug: (...args: unknown[]) => mockGetCreatorBySlug(...args),
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

// ─────────────────────────────────────────────────────────────────────────────
//  Defaults
// ─────────────────────────────────────────────────────────────────────────────

function setParams(slug: string) {
  mockUseParams.mockReturnValue({ slug })
}

beforeEach(() => {
  mockGetCreatorBySlug.mockReset()
  mockUseParams.mockReset()
  setParams('solar-vibes')
  mockGetCreatorBySlug.mockResolvedValue(mockCreatorProfile())
})

// ─────────────────────────────────────────────────────────────────────────────
//  Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('CreatorProfilePage', () => {
  // ── Happy path ─────────────────────────────────────────────────────────

  it("renders the creator's display name", async () => {
    render(<CreatorProfilePage />)
    expect(await screen.findByText('Solar Vibes')).toBeInTheDocument()
  })

  it('renders bio, genre, and location', async () => {
    render(<CreatorProfilePage />)
    expect(
      await screen.findByText('Indie producer from Lagos')
    ).toBeInTheDocument()
    expect(screen.getByText('Indie')).toBeInTheDocument()
    expect(screen.getByText('Lagos')).toBeInTheDocument()
  })

  it('renders the verified badge when creator is verified', async () => {
    render(<CreatorProfilePage />)
    expect(await screen.findByLabelText('Verified')).toBeInTheDocument()
  })

  it('shows default avatar when avatarUrl is null', async () => {
    render(<CreatorProfilePage />)
    expect(await screen.findByLabelText('Default avatar')).toBeInTheDocument()
  })

  // ── Loading state ──────────────────────────────────────────────────────

  it('shows Loading… until the creator fetch resolves', async () => {
    let resolveFetch!: (value: CreatorProfileResponse) => void
    mockGetCreatorBySlug.mockImplementation(
      () =>
        new Promise<CreatorProfileResponse>((resolve) => {
          resolveFetch = resolve
        })
    )

    render(<CreatorProfilePage />)

    // Initial render renders the Loading… state synchronously.
    expect(screen.getByText('Loading…')).toBeInTheDocument()

    // Once the fetch resolves, the profile renders.
    resolveFetch(mockCreatorProfile())
    expect(await screen.findByText('Solar Vibes')).toBeInTheDocument()
  })

  // ── Error state ────────────────────────────────────────────────────────

  it('shows the Not Found state when the fetch rejects', async () => {
    mockGetCreatorBySlug.mockRejectedValueOnce(new Error('boom'))

    render(<CreatorProfilePage />)

    expect(
      await screen.findByRole('heading', { name: /not found/i })
    ).toBeInTheDocument()
    expect(screen.getByText('Creator not found')).toBeInTheDocument()
  })

  // ── Avatar variants ────────────────────────────────────────────────────

  it('renders an avatar <img> with the avatarUrl when provided', async () => {
    mockGetCreatorBySlug.mockResolvedValueOnce(
      mockCreatorProfile({ avatarUrl: 'https://example.com/avatar.jpg' })
    )

    render(<CreatorProfilePage />)

    const img = await screen.findByRole('img', {
      name: /solar vibes's avatar/i,
    })
    expect(img).toHaveAttribute('src', 'https://example.com/avatar.jpg')
    expect(screen.queryByLabelText('Default avatar')).not.toBeInTheDocument()
  })

  // ── Conditional fields ────────────────────────────────────────────────

  it('hides the bio paragraph when bio is null', async () => {
    mockGetCreatorBySlug.mockResolvedValueOnce(
      mockCreatorProfile({ bio: null })
    )

    render(<CreatorProfilePage />)
    await screen.findByText('Solar Vibes')

    expect(screen.queryByText('Indie producer from Lagos')).not.toBeInTheDocument()
  })

  it('hides the genre row when genre is null', async () => {
    mockGetCreatorBySlug.mockResolvedValueOnce(
      mockCreatorProfile({ genre: null })
    )

    render(<CreatorProfilePage />)
    await screen.findByText('Solar Vibes')

    expect(screen.queryByText('Indie')).not.toBeInTheDocument()
  })

  it('hides the location row when location is null', async () => {
    mockGetCreatorBySlug.mockResolvedValueOnce(
      mockCreatorProfile({ location: null })
    )

    render(<CreatorProfilePage />)
    await screen.findByText('Solar Vibes')

    expect(screen.queryByText('Lagos')).not.toBeInTheDocument()
  })

  it('hides the verified badge when isVerified is false', async () => {
    mockGetCreatorBySlug.mockResolvedValueOnce(
      mockCreatorProfile({ isVerified: false })
    )

    render(<CreatorProfilePage />)
    await screen.findByText('Solar Vibes')

    expect(screen.queryByLabelText('Verified')).not.toBeInTheDocument()
  })

  // ── Param passthrough ──────────────────────────────────────────────────

  it('calls getCreatorBySlug with the slug from useParams', async () => {
    setParams('some-other-slug')
    mockGetCreatorBySlug.mockResolvedValueOnce(
      mockCreatorProfile({ slug: 'some-other-slug' })
    )

    render(<CreatorProfilePage />)
    await screen.findByText('Solar Vibes')

    expect(mockGetCreatorBySlug).toHaveBeenCalledWith('some-other-slug')
  })
})
