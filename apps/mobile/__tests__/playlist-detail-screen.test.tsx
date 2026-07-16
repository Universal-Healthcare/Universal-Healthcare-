import {
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native'
import { ApiError } from '../src/services/api-client'
import type { ReactNode } from 'react'
import PlaylistDetailScreen from '../src/screens/PlaylistDetailScreen'

// ─────────────────────────────────────────────────────────────────────────────
//  Mocks
// ─────────────────────────────────────────────────────────────────────────────

// jest.fn() instances declared at module scope so jest.mock factories below
// can reference them. Per-test reset happens in beforeEach (mockReset wipes
// call history + mockReturnValue/mockImplementation; mockClear only wipes
// call history — we want both).
const mockApiFetch = jest.fn()
const mockUpdate = jest.fn()
const mockRemove = jest.fn()
const mockUseAuth = jest.fn()

jest.mock('../src/hooks/useAuth', () => ({
  AuthProvider: ({ children }: { children: ReactNode }) => children,
  useAuth: () => mockUseAuth(),
}))

jest.mock('../src/hooks/usePlaylists', () => ({
  usePlaylistActions: () => ({
    create: jest.fn(),
    update: (...args: unknown[]) => mockUpdate(...args),
    remove: (...args: unknown[]) => mockRemove(...args),
    loading: false,
    error: null,
  }),
}))

// Partial mock of api-client. We forward the *real* ApiError class through
// the mock return so the screen's `err instanceof ApiError` discriminator
// (used for the 404 -> fall-through-to-public path) recognizes errors we
// throw inside our mockApiFetch.mockImplementation. Earlier iterations
// re-created the ApiError class inline, but that produced a different
// class identity than the screen's import, so `instanceof` returned false
// and the 404 path was mistreated as a hard error.
//
// Documented "partial mock" shape per Jest's docs:
// https://jestjs.io/docs/mock-functions#mocking-partials-of-a-module
jest.mock('../src/services/api-client', () => {
  const actual = jest.requireActual<
    typeof import('../src/services/api-client')
  >('../src/services/api-client')
  return {
    __esModule: true,
    ApiError: actual.ApiError,
    apiFetch: (...args: unknown[]) => mockApiFetch(...args),
  }
})

// ─────────────────────────────────────────────────────────────────────────────
//  Fixtures + helpers
// ─────────────────────────────────────────────────────────────────────────────

function makeTrack(overrides: Partial<{
  id: string
  title: string
  artist: string
  duration: number
}> = {}) {
  return {
    id: 't-1',
    title: 'Sunrise',
    artist: 'Solar Vibes',
    duration: 215,
    ...overrides,
  }
}

function makePlaylist(overrides: Partial<{
  id: string
  title: string
  isPublic: boolean
  tracks: ReturnType<typeof makeTrack>[]
}> = {}) {
  return {
    id: 'pl-1',
    title: 'My Mix Tape',
    isPublic: false,
    tracks: [
      makeTrack({ id: 't-1', title: 'Sunrise', artist: 'Solar Vibes', duration: 215 }),
      makeTrack({ id: 't-2', title: 'Lagos Lights', artist: 'Solar Vibes', duration: 320 }),
    ],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

function defaultAuth(overrides: Partial<{ token: string | null }> = {}) {
  return {
    token: 'test-token',
    user: null,
    isAuthenticated: true,
    isLoading: false,
    login: jest.fn(),
    register: jest.fn(),
    logout: jest.fn(),
    refresh: jest.fn(),
    ...overrides,
  }
}

const onBack = jest.fn()

function renderScreen(playlistId = 'pl-1') {
  return render(
    <PlaylistDetailScreen playlistId={playlistId} onBack={onBack} />
  )
}

// Track 215s = 3:35, 320s = 5:20.
const SUNRISE_DURATION = '3:35'
const LAGOS_DURATION = '5:20'

// ─────────────────────────────────────────────────────────────────────────────
//  Per-test reset
// ─────────────────────────────────────────────────────────────────────────────

beforeEach(() => {
  mockApiFetch.mockReset()
  mockUpdate.mockReset()
  mockRemove.mockReset()
  mockUseAuth.mockReset()
  onBack.mockReset()
  mockUseAuth.mockImplementation(() => defaultAuth())
  mockRemove.mockResolvedValue(undefined)
})

// ─────────────────────────────────────────────────────────────────────────────
//  Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('PlaylistDetailScreen', () => {
  // ── Load state machine ─────────────────────────────────────────────────

  it('shows the loading indicator while the playlist is being fetched', () => {
    mockApiFetch.mockReturnValue(new Promise(() => {}))
    renderScreen()
    expect(screen.getByTestId('loading-indicator')).toBeTruthy()
  })

  it('renders title, track list, and formatted durations once the playlist loads', async () => {
    mockApiFetch.mockResolvedValue({ data: makePlaylist() })
    renderScreen()

    await waitFor(() => {
      expect(screen.getByText('My Mix Tape')).toBeTruthy()
    })
    expect(screen.getByText('Sunrise')).toBeTruthy()
    expect(screen.getByText('Lagos Lights')).toBeTruthy()
    expect(screen.getByText(SUNRISE_DURATION)).toBeTruthy()
    expect(screen.getByText(LAGOS_DURATION)).toBeTruthy()
  })

  it('renders the Public badge when isPublic is true', async () => {
    mockApiFetch.mockResolvedValue({ data: makePlaylist({ isPublic: true }) })
    renderScreen()

    await waitFor(() => {
      expect(screen.getByText('Public')).toBeTruthy()
    })
  })

  it('renders the Private badge when isPublic is false', async () => {
    mockApiFetch.mockResolvedValue({ data: makePlaylist({ isPublic: false }) })
    renderScreen()

    await waitFor(() => {
      expect(screen.getByText('Private')).toBeTruthy()
    })
  })

  it('shows the empty state when the playlist has zero tracks', async () => {
    mockApiFetch.mockResolvedValue({ data: makePlaylist({ tracks: [] }) })
    renderScreen()

    await waitFor(() => {
      expect(screen.getByText('This playlist is empty')).toBeTruthy()
    })
    expect(screen.getByText('Add tracks to get started')).toBeTruthy()
  })

  it('falls through to the public endpoint when the authed call returns 404', async () => {
    // 1st apiFetch call: authed GET → reject with 404 ApiError
    // 2nd apiFetch call: public GET → resolve with the playlist
    const publicPlaylist = makePlaylist({ id: 'pl-1', isPublic: true })

    mockApiFetch.mockImplementation(async (path: string) => {
      if (path.includes('/api/playlists/') && !path.includes('/public/')) {
        throw new ApiError(404, 'Not found')
      }
      return { data: publicPlaylist }
    })

    renderScreen()

    await waitFor(() => {
      expect(screen.getByText('My Mix Tape')).toBeTruthy()
    })
    expect(mockApiFetch).toHaveBeenCalledTimes(2)
    expect((mockApiFetch.mock.calls[0]![0] as string)).toContain(
      '/api/playlists/pl-1'
    )
    expect((mockApiFetch.mock.calls[1]![0] as string)).toContain(
      '/public/pl-1'
    )
  })

  it('shows the Not Found screen when both fetches reject with non-404', async () => {
    mockApiFetch.mockRejectedValue(new Error('boom'))
    renderScreen()

    await waitFor(() => {
      expect(screen.getByText('Not Found')).toBeTruthy()
    })
    expect(screen.getByText('Playlist not found')).toBeTruthy()
  })

  // ── Auth gating ────────────────────────────────────────────────────────

  it('hides Edit, Edit Tracks, and Delete when there is no token', async () => {
    mockUseAuth.mockImplementation(() => defaultAuth({ token: null }))
    mockApiFetch.mockResolvedValue({ data: makePlaylist() })
    renderScreen()

    await waitFor(() => {
      expect(screen.getByText('My Mix Tape')).toBeTruthy()
    })
    expect(screen.queryByLabelText('Edit playlist')).toBeNull()
    expect(screen.queryByLabelText('Edit tracks')).toBeNull()
    expect(screen.queryByLabelText('Delete playlist')).toBeNull()
  })

  // ── Edit metadata ──────────────────────────────────────────────────────

  it('opens the inline edit form when Edit is pressed', async () => {
    mockApiFetch.mockResolvedValue({ data: makePlaylist() })
    renderScreen()
    await waitFor(() => {
      expect(screen.getByText('My Mix Tape')).toBeTruthy()
    })

    fireEvent.press(screen.getByLabelText('Edit playlist'))

    // Edit form inputs are present.
    expect(screen.getByPlaceholderText('Playlist title')).toBeTruthy()
    expect(screen.getByLabelText('Make this playlist public')).toBeTruthy()
    expect(screen.getByLabelText('Save changes')).toBeTruthy()
    expect(screen.getByLabelText('Cancel editing')).toBeTruthy()
  })

  it('calls actions.update and updates the title on Save', async () => {
    mockApiFetch.mockResolvedValue({ data: makePlaylist() })
    mockUpdate.mockResolvedValue(makePlaylist({ title: 'My Mix Tape v2' }))
    renderScreen()
    await waitFor(() => {
      expect(screen.getByText('My Mix Tape')).toBeTruthy()
    })

    fireEvent.press(screen.getByLabelText('Edit playlist'))
    fireEvent.changeText(
      screen.getByPlaceholderText('Playlist title'),
      'My Mix Tape v2'
    )
    fireEvent.press(screen.getByLabelText('Save changes'))

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith(
        'pl-1',
        expect.objectContaining({ title: 'My Mix Tape v2' })
      )
    })
    await waitFor(() => {
      expect(screen.getByText('My Mix Tape v2')).toBeTruthy()
    })
  })

  it('closes the edit form on Cancel without calling actions.update', async () => {
    mockApiFetch.mockResolvedValue({ data: makePlaylist() })
    renderScreen()
    await waitFor(() => {
      expect(screen.getByText('My Mix Tape')).toBeTruthy()
    })

    fireEvent.press(screen.getByLabelText('Edit playlist'))
    fireEvent.press(screen.getByLabelText('Cancel editing'))

    expect(screen.queryByLabelText('Save changes')).toBeNull()
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  // ── Delete ─────────────────────────────────────────────────────────────

  it('requires confirmation before deleting', async () => {
    mockApiFetch.mockResolvedValue({ data: makePlaylist() })
    renderScreen()
    await waitFor(() => {
      expect(screen.getByText('My Mix Tape')).toBeTruthy()
    })

    fireEvent.press(screen.getByLabelText('Delete playlist'))

    // Confirm + Cancel buttons appear; original Delete button is gone.
    expect(screen.getByLabelText('Confirm delete playlist')).toBeTruthy()
    expect(screen.getByLabelText('Cancel delete')).toBeTruthy()
    expect(screen.queryByLabelText('Delete playlist')).toBeNull()
  })

  it('calls actions.remove and triggers onBack on Confirm', async () => {
    mockApiFetch.mockResolvedValue({ data: makePlaylist() })
    renderScreen()
    await waitFor(() => {
      expect(screen.getByText('My Mix Tape')).toBeTruthy()
    })

    fireEvent.press(screen.getByLabelText('Delete playlist'))
    fireEvent.press(screen.getByLabelText('Confirm delete playlist'))

    await waitFor(() => {
      expect(mockRemove).toHaveBeenCalledWith('pl-1')
    })
    await waitFor(() => {
      expect(onBack).toHaveBeenCalled()
    })
  })

  it('returns to the regular Delete button on Cancel', async () => {
    mockApiFetch.mockResolvedValue({ data: makePlaylist() })
    renderScreen()
    await waitFor(() => {
      expect(screen.getByText('My Mix Tape')).toBeTruthy()
    })

    fireEvent.press(screen.getByLabelText('Delete playlist'))
    fireEvent.press(screen.getByLabelText('Cancel delete'))

    expect(screen.getByLabelText('Delete playlist')).toBeTruthy()
    expect(screen.queryByLabelText('Confirm delete playlist')).toBeNull()
    expect(mockRemove).not.toHaveBeenCalled()
  })

  // ── Edit tracks ────────────────────────────────────────────────────────

  it('opens the track editing toolbar on Edit Tracks', async () => {
    mockApiFetch.mockResolvedValue({ data: makePlaylist() })
    renderScreen()
    await waitFor(() => {
      expect(screen.getByText('My Mix Tape')).toBeTruthy()
    })

    fireEvent.press(screen.getByLabelText('Edit tracks'))

    expect(screen.getByLabelText('Add track')).toBeTruthy()
    expect(screen.getByLabelText('Done editing tracks')).toBeTruthy()
  })

  it('hides Edit/delete while the track editor is open (mutual exclusion)', async () => {
    mockApiFetch.mockResolvedValue({ data: makePlaylist() })
    renderScreen()
    await waitFor(() => {
      expect(screen.getByText('My Mix Tape')).toBeTruthy()
    })

    fireEvent.press(screen.getByLabelText('Edit tracks'))

    expect(screen.queryByLabelText('Edit playlist')).toBeNull()
    expect(screen.queryByLabelText('Delete playlist')).toBeNull()
  })

  // ── Add track ──────────────────────────────────────────────────────────

  it('adds a new track when the + Add Track form is submitted', async () => {
    const newTrack = makeTrack({
      id: 't-3',
      title: 'New Song',
      artist: 'New Artist',
      duration: 180,
    })
    mockApiFetch.mockResolvedValue({ data: makePlaylist() })
    mockUpdate.mockResolvedValue(
      makePlaylist({ tracks: [...makePlaylist().tracks, newTrack] })
    )
    renderScreen()
    await waitFor(() => {
      expect(screen.getByText('My Mix Tape')).toBeTruthy()
    })

    fireEvent.press(screen.getByLabelText('Edit tracks'))
    fireEvent.press(screen.getByLabelText('Add track'))

    fireEvent.changeText(screen.getByPlaceholderText('Track title'), 'New Song')
    fireEvent.changeText(screen.getByPlaceholderText('Artist name'), 'New Artist')
    fireEvent.changeText(
      screen.getByPlaceholderText('Duration (seconds)'),
      '180'
    )
    fireEvent.press(screen.getByLabelText('Save track'))

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith(
        'pl-1',
        expect.objectContaining({
          tracks: expect.arrayContaining([
            expect.objectContaining({
              title: 'New Song',
              artist: 'New Artist',
              duration: 180,
            }),
          ]),
        })
      )
    })
    await waitFor(() => {
      expect(screen.getByText('New Song')).toBeTruthy()
    })
  })

  // ── Remove track ───────────────────────────────────────────────────────

  it('removes a track when its ✕ button is pressed in edit-tracks mode', async () => {
    const tracks = makePlaylist().tracks
    mockApiFetch.mockResolvedValue({ data: makePlaylist() })
    mockUpdate.mockResolvedValue(makePlaylist({ tracks: [tracks[1]!] }))
    renderScreen()
    await waitFor(() => {
      expect(screen.getByText('My Mix Tape')).toBeTruthy()
    })

    fireEvent.press(screen.getByLabelText('Edit tracks'))
    fireEvent.press(screen.getByLabelText('Remove track Sunrise'))

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith(
        'pl-1',
        expect.objectContaining({
          tracks: expect.not.arrayContaining([
            expect.objectContaining({ title: 'Sunrise' }),
          ]),
        })
      )
    })
  })

  // ── Error paths on action rejections ────────────────────────────────────

  // NOTE: The screen has a fourth error surface -- the pull-to-refresh
  // banner (refreshError) -- distinct from the initial-load "Not Found"
  // screen. It is exercised by FlatList.onRefresh, which RNTL doesn't
  // expose a stable API to trigger (no `triggerRefresh()` helper). We
  // intentionally leave it uncovered here; if it becomes a regression
  // hotspot, refactor to expose the refresh callback via a testable
  // button or testID-driven interaction.

  it('shows the inline track-error banner when actions.update rejects during add', async () => {
    mockApiFetch.mockResolvedValue({ data: makePlaylist() })
    mockUpdate.mockRejectedValueOnce(new Error('save failed'))
    renderScreen()
    await waitFor(() => {
      expect(screen.getByText('My Mix Tape')).toBeTruthy()
    })

    fireEvent.press(screen.getByLabelText('Edit tracks'))
    fireEvent.press(screen.getByLabelText('Add track'))
    fireEvent.changeText(
      screen.getByPlaceholderText('Track title'),
      'New Song'
    )
    fireEvent.changeText(
      screen.getByPlaceholderText('Artist name'),
      'New Artist'
    )
    fireEvent.changeText(
      screen.getByPlaceholderText('Duration (seconds)'),
      '180'
    )
    fireEvent.press(screen.getByLabelText('Save track'))

    // Inline banner appears; form stays open so the user can retry.
    await waitFor(() => {
      expect(screen.getAllByText('save failed').length).toBeGreaterThan(0)
    })
    expect(screen.queryByLabelText('Save track')).toBeTruthy()
    // No refetch happened on rejection.
    expect(mockApiFetch).toHaveBeenCalledTimes(1)
  })

  it('shows the inline meta-error banner when actions.update rejects during save', async () => {
    mockApiFetch.mockResolvedValue({ data: makePlaylist() })
    mockUpdate.mockRejectedValueOnce(new Error('save failed'))
    renderScreen()
    await waitFor(() => {
      expect(screen.getByText('My Mix Tape')).toBeTruthy()
    })

    fireEvent.press(screen.getByLabelText('Edit playlist'))
    fireEvent.changeText(
      screen.getByPlaceholderText('Playlist title'),
      'My Mix Tape v2'
    )
    fireEvent.press(screen.getByLabelText('Save changes'))

    await waitFor(() => {
      expect(screen.getAllByText('save failed').length).toBeGreaterThan(0)
    })
    // Edit form remains open so the user can retry.
    expect(screen.queryByLabelText('Save changes')).toBeTruthy()
  })

  it('does not navigate onBack when actions.remove rejects; restores Delete UI', async () => {
    mockApiFetch.mockResolvedValue({ data: makePlaylist() })
    mockRemove.mockRejectedValueOnce(new Error('delete failed'))
    renderScreen()
    await waitFor(() => {
      expect(screen.getByText('My Mix Tape')).toBeTruthy()
    })

    fireEvent.press(screen.getByLabelText('Delete playlist'))
    fireEvent.press(screen.getByLabelText('Confirm delete playlist'))

    await waitFor(() => {
      expect(mockRemove).toHaveBeenCalledWith('pl-1')
    })
    // Screen catches + restores UI to the regular Delete button; does
    // NOT navigate. setDeleting(false) + setDeleteConfirm(false) ran in
    // the catch block.
    expect(onBack).not.toHaveBeenCalled()
    await waitFor(() => {
      expect(screen.getByLabelText('Delete playlist')).toBeTruthy()
    })
    expect(screen.queryByLabelText('Confirm delete playlist')).toBeNull()
  })
})
