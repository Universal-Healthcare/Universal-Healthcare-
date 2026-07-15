import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import PlaylistsPage from '../app/playlists/page'
import {
  defaultAuth,
  mockMyPlaylistsList,
  mockPlaylist,
  mockPlaylistEnvelope,
  openCreateForm,
} from './helpers/test-utils'

// Hoisted so vi.mock factories can reference them. Names mirror the
// functions imported in `app/playlists/page.tsx` — keep them in sync!
const { mockListMyPlaylists, mockCreatePlaylist, mockDeletePlaylist, mockUseAuth } =
  vi.hoisted(() => ({
    mockListMyPlaylists: vi.fn(),
    mockCreatePlaylist: vi.fn(),
    mockDeletePlaylist: vi.fn(),
    mockUseAuth: vi.fn(),
  }))

// ─────────────────────────────────────────────────────────────────────────────
//  Module mocks
// ─────────────────────────────────────────────────────────────────────────────

vi.mock('../lib/auth-context', () => ({
  useAuth: () => mockUseAuth(),
  AuthProvider: ({ children }: { children: ReactNode }) => children,
}))

vi.mock('../lib/playlist-client', () => ({
  // The page imports `listMyPlaylists` (not `getMyPlaylists`). The export
  // names here MUST match the page's imports or the page will get
  // `undefined` and throw on call.
  listMyPlaylists: (...args: unknown[]) => mockListMyPlaylists(...args),
  createPlaylist: (...args: unknown[]) => mockCreatePlaylist(...args),
  deletePlaylist: (...args: unknown[]) => mockDeletePlaylist(...args),
}))

// ─────────────────────────────────────────────────────────────────────────────
//  Defaults + per-test reset
// ─────────────────────────────────────────────────────────────────────────────

beforeEach(() => {
  mockListMyPlaylists.mockReset()
  mockCreatePlaylist.mockReset()
  mockDeletePlaylist.mockReset()
  mockUseAuth.mockReset()

  mockUseAuth.mockReturnValue(defaultAuth())
  mockListMyPlaylists.mockResolvedValue(
    mockMyPlaylistsList([
      mockPlaylist({ id: 'pl-1', title: 'My Mix Tape', trackCount: 0 }),
      mockPlaylist({ id: 'pl-2', title: 'Indie Vibes', trackCount: 3 }),
    ])
  )
  mockCreatePlaylist.mockResolvedValue(
    mockPlaylistEnvelope(
      mockPlaylist({ id: 'pl-3', title: 'New Playlist', trackCount: 0 })
    )
  )
  mockDeletePlaylist.mockResolvedValue(undefined)
})

// ─────────────────────────────────────────────────────────────────────────────
//  Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('PlaylistsPage', () => {
  // ── Auth states ─────────────────────────────────────────────────────────

  it('shows Loading… before the auth context resolves', () => {
    mockUseAuth.mockReturnValue(defaultAuth({ isLoading: true }))

    render(<PlaylistsPage />)
    expect(screen.getByText('Loading…')).toBeInTheDocument()
  })

  it('prompts the user to log in when there is no token', async () => {
    mockUseAuth.mockReturnValue(defaultAuth({ token: null }))

    render(<PlaylistsPage />)
    expect(
      await screen.findByText(/please log in to view your playlists/i)
    ).toBeInTheDocument()
  })

  // ── Loading / error / empty ─────────────────────────────────────────────

  it('shows the load-error alert and Retry button when the fetch fails', async () => {
    mockListMyPlaylists.mockRejectedValueOnce(new Error('boom'))

    const user = userEvent.setup()
    render(<PlaylistsPage />)

    // Match by text directly — terser, and also avoids any
    // role-vs-accessible-name flakiness on `<p role="alert">`.
    expect(
      await screen.findByText(/failed to load playlists/i)
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /^retry$/i }))
    expect(mockListMyPlaylists).toHaveBeenCalledTimes(2)
  })

  it('shows the empty-state line when the list is empty', async () => {
    mockListMyPlaylists.mockResolvedValueOnce(mockMyPlaylistsList([]))

    render(<PlaylistsPage />)
    expect(
      await screen.findByText(/no playlists yet/i)
    ).toBeInTheDocument()
  })

  // ── Populated state ─────────────────────────────────────────────────────

  it('renders playlist cards with title and track count', async () => {
    render(<PlaylistsPage />)

    expect(await screen.findByText('My Mix Tape')).toBeInTheDocument()
    expect(screen.getByText('Indie Vibes')).toBeInTheDocument()
    // One of the seeded playlists has trackCount: 3.
    expect(screen.getByText(/3 tracks/i)).toBeInTheDocument()
  })

  // ── Create form ─────────────────────────────────────────────────────────

  it('opens the create form when "+ New Playlist" is clicked', async () => {
    const user = userEvent.setup()
    render(<PlaylistsPage />)

    await openCreateForm(user)

    // Toggle button text flipped to "Cancel".
    expect(
      screen.queryByRole('button', { name: /\+ new playlist/i })
    ).not.toBeInTheDocument()
    // Submit button + title input are present in the form.
    expect(
      screen.getByRole('button', { name: /create playlist/i })
    ).toBeInTheDocument()
    expect(screen.getByLabelText(/title/i)).toBeInTheDocument()
  })

  it('keeps Create Playlist disabled until the title is filled', async () => {
    const user = userEvent.setup()
    render(<PlaylistsPage />)

    await openCreateForm(user)

    const submit = screen.getByRole('button', { name: /create playlist/i })
    expect(submit).toBeDisabled()

    await user.type(screen.getByLabelText(/title/i), 'Roadtrip')
    expect(submit).toBeEnabled()
  })

  it('closes the form when Cancel is clicked', async () => {
    const user = userEvent.setup()
    render(<PlaylistsPage />)

    await openCreateForm(user)
    await user.click(screen.getByRole('button', { name: /^cancel$/i }))

    // Form has been torn down — submit button and title input are gone.
    expect(
      screen.queryByRole('button', { name: /create playlist/i })
    ).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/title/i)).not.toBeInTheDocument()
    // Toggle button is back to showing "+ New Playlist".
    expect(
      screen.getByRole('button', { name: /\+ new playlist/i })
    ).toBeInTheDocument()
  })

  it('submits valid input and calls createPlaylist, then re-fetches the list', async () => {
    const user = userEvent.setup()
    render(<PlaylistsPage />)

    await openCreateForm(user)
    await user.type(screen.getByLabelText(/title/i), 'Roadtrip')
    await user.click(screen.getByRole('button', { name: /create playlist/i }))

    // After successful create, the form closes — toggle button reverts
    // back to "+ New Playlist".
    expect(
      await screen.findByRole('button', { name: /\+ new playlist/i })
    ).toBeInTheDocument()

    expect(mockCreatePlaylist).toHaveBeenCalledWith(
      'test-token',
      expect.objectContaining({ title: 'Roadtrip' })
    )
    // initial load + auto-reload after create.
    expect(mockListMyPlaylists).toHaveBeenCalledTimes(2)
  })

  it('shows an error alert when create fails', async () => {
    mockCreatePlaylist.mockRejectedValueOnce(new Error('create failed'))

    const user = userEvent.setup()
    render(<PlaylistsPage />)

    await openCreateForm(user)
    await user.type(screen.getByLabelText(/title/i), 'Roadtrip')
    await user.click(screen.getByRole('button', { name: /create playlist/i }))

    expect(
      await screen.findByRole('alert')
    ).toHaveTextContent(/create failed/i)
  })

  // ── Delete flow ─────────────────────────────────────────────────────────

  it('deletes a playlist when Delete is clicked', async () => {
    const user = userEvent.setup()
    render(<PlaylistsPage />)

    await screen.findByText('My Mix Tape')

    const deleteButtons = screen.getAllByRole('button', { name: /delete/i })
    await user.click(deleteButtons[0]!)

    expect(mockDeletePlaylist).toHaveBeenCalledWith('test-token', 'pl-1')
    expect(mockListMyPlaylists).toHaveBeenCalledTimes(2) // initial + after delete
  })

  it('shows a per-row error and isolates it from the rest of the list', async () => {
    mockDeletePlaylist.mockImplementation(async (_t: string, id: string) => {
      if (id === 'pl-1') throw new Error('delete failed')
    })

    const user = userEvent.setup()
    render(<PlaylistsPage />)

    await screen.findByText('My Mix Tape')

    const deleteButtons = screen.getAllByRole('button', { name: /delete/i })
    await user.click(deleteButtons[0]!)

    expect(
      await screen.findByText(/delete failed/i)
    ).toBeInTheDocument()

    // The good playlist is still in the list.
    expect(screen.getByText('Indie Vibes')).toBeInTheDocument()
    // We didn't auto-reload after a failed delete.
    expect(mockListMyPlaylists).toHaveBeenCalledTimes(1)
  })
})
