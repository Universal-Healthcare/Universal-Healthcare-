import { screen } from '@testing-library/react'
import type { UserEvent } from '@testing-library/user-event'
import type {
  CreatorProfileResponse,
  FanProfileResponse,
  ListPlaylistsResponse,
  MeResponse,
  PlaylistResponse,
  TrackResponse,
} from '@universal-healthcare/shared'

/**
 * Shared test helpers for `apps/web/__tests__/*-page.test.tsx`.
 *
 * Each test file still owns its own `vi.hoisted` mocks (because they need to
 * be referenced by `vi.mock` factories within the same module — vitest
 * hoists both `vi.mock` and `vi.hoisted` above static imports, so any
 * factory that dereferences an imported binding hits a TDZ).
 *
 * These helpers expose pure value factories (used in test bodies/assertions)
 * and a small UI helper that can be safely imported across files.
 */

// ─────────────────────────────────────────────────────────────────────────────
//  Constants
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_TIMESTAMP = '2026-01-01T00:00:00.000Z'
const DEFAULT_GENRE_PREFS: string[] = ['jazz', 'lo-fi']

// ─────────────────────────────────────────────────────────────────────────────
//  Creator profile
// ─────────────────────────────────────────────────────────────────────────────

export const defaultCreatorProfile: CreatorProfileResponse = {
  id: 'cp-1',
  userId: 'u-1',
  displayName: 'Solar Vibes',
  slug: 'solar-vibes',
  bio: 'Indie producer from Lagos',
  avatarUrl: null,
  genre: 'Indie',
  location: 'Lagos',
  isVerified: true,
  followerCount: 0,
  trackCount: 0,
  createdAt: DEFAULT_TIMESTAMP,
  updatedAt: DEFAULT_TIMESTAMP,
}

/**
 * Spread defaults first, then overrides so callers can pass `null`
 * explicitly without it being silently coerced back to the default.
 */
export function mockCreatorProfile(
  overrides?: Partial<CreatorProfileResponse>
): CreatorProfileResponse {
  return { ...defaultCreatorProfile, ...overrides }
}

// ─────────────────────────────────────────────────────────────────────────────
//  Playlist
// ─────────────────────────────────────────────────────────────────────────────

function fakeTrack(playlistId: string, index: number): TrackResponse {
  return {
    id: `t-${index}`,
    playlistId,
    title: `Track ${index + 1}`,
    artist: 'Test',
    duration: 120,
    position: index + 1,
    createdAt: DEFAULT_TIMESTAMP,
    updatedAt: DEFAULT_TIMESTAMP,
  }
}

export const defaultPlaylist: PlaylistResponse = {
  id: 'pl-1',
  userId: 'u-1',
  title: 'My Mix Tape',
  isPublic: false,
  tracks: [],
  createdAt: DEFAULT_TIMESTAMP,
  updatedAt: DEFAULT_TIMESTAMP,
}

/**
 * Build a PlaylistResponse. Pass optional `trackCount` to seed N tracks.
 * Spread defaults first so unmentioned fields fall back to the default
 * shape; explicit `null` overrides propagate.
 */
export function mockPlaylist(
  overrides?: Partial<{
    id: string
    userId: string
    title: string
    isPublic: boolean
    trackCount: number
  }>
): PlaylistResponse {
  const playlistId = overrides?.id ?? defaultPlaylist.id
  const trackCount = overrides?.trackCount ?? 0
  return {
    ...defaultPlaylist,
    ...overrides,
    tracks: Array.from({ length: trackCount }, (_, i) =>
      fakeTrack(playlistId, i)
    ),
  }
}

/**
 * Wrap N playlists in the `ListPlaylistsResponse` envelope used by
 * `listMyPlaylists` / `GET /api/playlists`.
 */
export function mockMyPlaylistsList(
  playlists: PlaylistResponse[] = [defaultPlaylist]
): ListPlaylistsResponse {
  return {
    data: playlists,
    pagination: {
      page: 1,
      pageSize: playlists.length,
      total: playlists.length,
      totalPages: 1,
    },
  }
}

/** Wrap a PlaylistResponse in the `{ data: PlaylistResponse }` envelope used by
 * `createPlaylist`, `updatePlaylist`, `getMyPlaylist`, `getPublicPlaylist`.
 */
export function mockPlaylistEnvelope(
  playlist: PlaylistResponse = defaultPlaylist
): { data: PlaylistResponse } {
  return { data: playlist }
}

// ─────────────────────────────────────────────────────────────────────────────
//  /users/me
// ─────────────────────────────────────────────────────────────────────────────

export const defaultFanProfile: FanProfileResponse = {
  id: 'fp-1',
  userId: 'u-1',
  displayName: 'Solar Vibes',
  avatarUrl: null,
  genrePrefs: DEFAULT_GENRE_PREFS,
  createdAt: DEFAULT_TIMESTAMP,
  updatedAt: DEFAULT_TIMESTAMP,
}

export const defaultMeUser: MeResponse['user'] = {
  id: 'u-1',
  email: 'solar@test.com',
  creatorProfile: defaultCreatorProfile,
  fanProfile: defaultFanProfile,
}

/** Spread defaults first, then overrides — preserves explicit `null` profiles. */
export function mockMeResponse(
  overrides?: Partial<MeResponse['user']>
): MeResponse {
  return {
    user: { ...defaultMeUser, ...overrides },
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  Auth state
// ─────────────────────────────────────────────────────────────────────────────

export interface AuthState {
  token: string | null
  user: null
  isLoading: boolean
}

/**
 * Build the default auth shape for `useAuth()` mocks. Uses explicit `in`
 * checks so callers can pass `token: null` or `isLoading: false` without
 * the values being silently coerced to the defaults.
 *
 * Usage:
 *   mockUseAuth.mockReturnValue(defaultAuth())             // fully defaulted
 *   mockUseAuth.mockReturnValue(defaultAuth({ token: null }))  // explicit null
 */
export function defaultAuth(overrides?: Partial<AuthState>): AuthState {
  return {
    token:
      overrides && 'token' in overrides ? overrides.token : 'test-token',
    user: null,
    isLoading:
      overrides && 'isLoading' in overrides
        ? overrides.isLoading
        : false,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  UI helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Click the "+ New Playlist" toggle to reveal the create form. Awaits the
 * button so callers don't have to know that it only renders after the list
 * has loaded.
 */
export async function openCreateForm(user: UserEvent): Promise<void> {
  await user.click(
    await screen.findByRole('button', { name: /\+ new playlist/i })
  )
}
