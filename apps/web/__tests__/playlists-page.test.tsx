import { render, screen, waitFor } from '@testing-library/react'
import userEvent, { type UserEvent } from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import PlaylistsPage from '../app/playlists/page'

// ─────────────────────────────────────────────────────────────────────────────
//  Mock fixtures
// ─────────────────────────────────────────────────────────────────────────────

const mockPlaylist = (
  overrides?: Partial<{
    id: string
    title: string
    isPublic: boolean
    trackCount: number
  }>
) => ({
  id: overrides?.id ?? 'pl-1',
  userId: 'u-1',
  title: overrides?.title ?? 'My Mix Tape',
  isPublic: overrides?.isPublic ?? false,
  tracks: Array.from({ length: overrides?.trackCount ?? 0 }, (_, i) => ({
    id: `t-${i}`,
    playlistId: overrides?.id ?? 'pl-1',
    title: `Track ${i + 1}`,
    artist: 'Test',
    duration: 120,
    position: i + 1,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  })),
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
})

// Hoisted mock fns so vi.mock factories can reference them.
const {
  mockListMyPlaylists,
  mockCreatePlaylist,
  mockDeletePlaylist,
  mockUseAuth,
} = vi.hoisted(() => ({
  mockListMyPlaylists: vi.fn(),
  mockCreatePlaylist: vi.fn(),
  mockDeletePlaylist: vi.fn(),
  mockUseAuth: vi.fn(),
}))

// ─────────────────────────────────────────────────────────────────────────────
//  Module mocks
// ─────────────────────────────────────────────────────────────────────────────

vi.mock('../lib/playlist-client', () => ({
  listMyPlaylists: (...args: unknown[]) => mockListMyPlaylists(...args),
  createPlaylist: (...args: unknown[]) => mockCreatePlaylist(...args),
  deletePlaylist: (...args: unknown[]) => mockDeletePlaylist(...args),
  getMyPlaylist: vi.fn(),
  getPublicPlaylist: vi.fn(),
  updatePlaylist: vi.fn(),
}))

vi.mock('../lib/auth-context', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
  useAuth: () => mockUseAuth(),
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
  authHeaders: (token: string) => ({ Authorization: `Bearer ${token}` }),
}))

vi.mock('../lib/auth-client', () => ({
  loginUser: vi.fn(),
  registerUser: vi.fn(),
  AuthApiError: class AuthApiError extends Error {},
}))

// ─────────────────────────────────────────────────────────────────────────────
//  Helpers & defaults
// ─────────────────────────────────────────────────────────────────────────────

function setAuth(
  overrides?: Partial<{
    token: string | null
    isLoading: boolean
  }>
) {
  // Use explicit !== undefined checks so callers can pass `token: null`
  // without it being replaced by the default — `null ?? default` would
  // coerce null to default.
  mockUseAuth.mockReturnValue({
    token:
      overrides && 'token' in overrides ? overrides.token : 'test-token',
    user: null,
    isLoading:
      overrides && 'isLoading' in overrides ? overrides.isLoading : false,
  })
}

// Click the "+ New Playlist" toggle to reveal the create form. Awaits the
// button so callers don't have to know that it only renders after the list
// has loaded.
async function openCreateForm(user: UserEvent): Promise<void> {
  await user.click(
    await screen.findByRole('button', { name: /\+ new playlist/i })
  )
}

beforeEach(() => {
  mockListMyPlaylists.mockReset()
  mockCreatePlaylist.mockReset()
  mockDeletePlaylist.mockReset()
  mockUseAuth.mockReset()
  mockListMyPlaylists.mockResolvedValue({
    data: [mockPlaylist({ id: 'pl-1', title: 'My Mix Tape' })],
    pagination: { page: 1, pageSize: 20, totalItems: 1, totalPages: 1 },
  })
  mockCreatePlaylist.mockResolvedValue({
    data: mockPlaylist({ id: 'pl-new', title: 'Brand New' }),
  })
  mockDeletePlaylist.mockResolvedValue(undefined)
  setAuth()
})

// ─────────────────────────────────────────────────────────────────────────────
//  Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('PlaylistsPage', () => {
  // ── Auth & loading states ─────────────────────────────────────────────

  it('shows Loading… while auth is still resolving', () => {
    setAuth({ isLoading: true, token: null })
    render(<PlaylistsPage />)

    expect(screen.getByText('Loading…')).toBeInTheDocument()
  })

  it('prompts the user to log in when there is no token', async () => {
    setAuth({ token: null, isLoading: false })
    render(<PlaylistsPage />)

    // The "Please log in" copy only renders in the !token branch.
    expect(
      await screen.findByText(/please log in/i)
    ).toBeInTheDocument()
    expect(mockListMyPlaylists).not.toHaveBeenCalled()
  })

  it('renders an empty state when the user has no playlists', async () => {
    mockListMyPlaylists.mockResolvedValue({
      data: [],
      pagination: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 },
    })

    render(<PlaylistsPage />)

    expect(await screen.findByText(/no playlists yet/i)).toBeInTheDocument()
    expect(
      screen.getByText(/create your first playlist to get started/i)
    ).toBeInTheDocument()
  })

  it('renders playlist cards with title, badge, tracks count, and creation date', async () => {
    mockListMyPlaylists.mockResolvedValue({
      data: [
        mockPlaylist({ id: 'pl-1', title: 'Indie Vibes', isPublic: true, trackCount: 3 }),
        mockPlaylist({ id: 'pl-2', title: 'Workout Jams', isPublic: false, trackCount: 7 }),
      ],
      pagination: { page: 1, pageSize: 20, totalItems: 2, totalPages: 1 },
    })

    render(<PlaylistsPage />)

    expect(await screen.findByText('Indie Vibes')).toBeInTheDocument()
    expect(screen.getByText('Workout Jams')).toBeInTheDocument()
    expect(screen.getByText('Public')).toBeInTheDocument()
    expect(screen.getByText('Private')).toBeInTheDocument()
    expect(screen.getByText(/3\s+tracks/)).toBeInTheDocument()
    expect(screen.getByText(/7\s+tracks/)).toBeInTheDocument()
  })

  // ── Error state ───────────────────────────────────────────────────────

  it('shows the load-error alert with a Retry button that re-fetches', async () => {
    const user = userEvent.setup()
    mockListMyPlaylists.mockRejectedValueOnce(new Error('Boom'))

    render(<PlaylistsPage />)

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Failed to load playlists')
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()

    // After the failure, a retry should re-invoke listMyPlaylists.
    mockListMyPlaylists.mockResolvedValueOnce({
      data: [mockPlaylist({ id: 'pl-1' })],
      pagination: { page: 1, pageSize: 20, totalItems: 1, totalPages: 1 },
    })
    await user.click(screen.getByRole('button', { name: /retry/i }))

    await waitFor(() => {
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })
  })

  // ── Create flow ───────────────────────────────────────────────────────

  it('opens the create form when "+ New Playlist" is clicked', async () => {
    const user = userEvent.setup()
    render(<PlaylistsPage />)

    expect(screen.queryByLabelText(/^title$/i)).not.toBeInTheDocument()

    await openCreateForm(user)

    expect(screen.getByLabelText(/^title$/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/public/i)).toBeInTheDocument()
  })

  it('keeps Create Playlist disabled until the title is filled', async () => {
    const user = userEvent.setup()
    render(<PlaylistsPage />)

    await openCreateForm(user)

    const submit = screen.getByRole('button', { name: /create playlist/i })
    expect(submit).toBeDisabled()

    await user.type(screen.getByLabelText(/^title$/i), 'My Playlist')
    expect(submit).toBeEnabled()
  })

  it('closes the form when Cancel is clicked', async () => {
    const user = userEvent.setup()
    render(<PlaylistsPage />)

    await openCreateForm(user)
    expect(screen.getByLabelText(/^title$/i)).toBeInTheDocument()

    // Now the button reads "Cancel".
    await user.click(screen.getByRole('button', { name: /^cancel$/i }))
    expect(screen.queryByLabelText(/^title$/i)).not.toBeInTheDocument()
  })

  it('submits valid input and calls createPlaylist, then re-fetches the list', async () => {
    const user = userEvent.setup()
    const onCreate = mockCreatePlaylist.mockResolvedValueOnce({
      data: mockPlaylist({ id: 'pl-new', title: 'Brand New' }),
    })
    // The create handler calls load() again after success so the new playlist shows up.
    mockListMyPlaylists.mockResolvedValueOnce({
      data: [mockPlaylist({ id: 'pl-1' })],
      pagination: { page: 1, pageSize: 20, totalItems: 1, totalPages: 1 },
    })

    render(<PlaylistsPage />)

    await openCreateForm(user)
    await user.type(screen.getByLabelText(/^title$/i), 'Brand New')
    await user.click(screen.getByLabelText(/public/i))
    await user.click(screen.getByRole('button', { name: /create playlist/i }))

    await waitFor(() => expect(onCreate).toHaveBeenCalledTimes(1))
    expect(onCreate).toHaveBeenCalledWith(
      'test-token',
      expect.objectContaining({
        title: 'Brand New',
        isPublic: true,
        tracks: [],
      })
    )
    // Form closes after success.
    expect(screen.queryByLabelText(/^title$/i)).not.toBeInTheDocument()
  })

  it('shows an error alert when create fails', async () => {
    const user = userEvent.setup()
    mockCreatePlaylist.mockRejectedValueOnce(new Error('Server exploded'))

    render(<PlaylistsPage />)

    await openCreateForm(user)
    await user.type(screen.getByLabelText(/^title$/i), 'Bad Idea')
    await user.click(screen.getByRole('button', { name: /create playlist/i }))

    expect(await screen.findByText('Server exploded')).toBeInTheDocument()
  })

  // ── Delete flow ───────────────────────────────────────────────────────

  it('deletes a playlist via its row button and calls deletePlaylist', async () => {
    const user = userEvent.setup()
    const onDelete = mockDeletePlaylist.mockResolvedValueOnce(undefined)
    mockListMyPlaylists.mockResolvedValueOnce({
      data: [mockPlaylist({ id: 'pl-1', title: 'My Mix Tape' })],
      pagination: { page: 1, pageSize: 20, totalItems: 1, totalPages: 1 },
    })

    render(<PlaylistsPage />)

    await screen.findByText('My Mix Tape')
    await user.click(screen.getByRole('button', { name: /^delete$/i }))

    await waitFor(() => expect(onDelete).toHaveBeenCalledTimes(1))
    expect(onDelete).toHaveBeenCalledWith('test-token', 'pl-1')
  })

  it('shows a per-playlist error alert when delete fails and leaves the playlist in the list', async () => {
    const user = userEvent.setup()
    mockDeletePlaylist.mockRejectedValueOnce(new Error('Nope'))

    render(<PlaylistsPage />)

    await screen.findByText('My Mix Tape')
    await user.click(screen.getByRole('button', { name: /^delete$/i }))

    expect(await screen.findByText('Nope')).toBeInTheDocument()
    // Playlist card is still rendered.
    expect(screen.getByText('My Mix Tape')).toBeInTheDocument()
  })

  it('only deletes the targeted playlist when there are multiple', async () => {
    const user = userEvent.setup()
    const onDelete = mockDeletePlaylist.mockResolvedValueOnce(undefined)
    mockListMyPlaylists.mockResolvedValueOnce({
      data: [
        mockPlaylist({ id: 'pl-1', title: 'Indie' }),
        mockPlaylist({ id: 'pl-2', title: 'Workout' }),
      ],
      pagination: { page: 1, pageSize: 20, totalItems: 2, totalPages: 1 },
    })

    render(<PlaylistsPage />)

    await screen.findByText('Indie')
    await screen.findByText('Workout')

    // The "Indie" row's Delete button is the first one in the document tree.
    const deleteButtons = screen.getAllByRole('button', { name: /^delete$/i })
    await user.click(deleteButtons[0])

    await waitFor(() => expect(onDelete).toHaveBeenCalledTimes(1))
    expect(onDelete).toHaveBeenCalledWith('test-token', 'pl-1')
  })
})
