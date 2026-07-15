import type {
  PlaylistResponse,
  TrackResponse,
} from '@universal-healthcare/shared'

// ─────────────────────────────────────────────────────────────────────────────
//  Internal types — DB-layer representation.
//  `createdAt` / `updatedAt` are Date objects; the DTO conversion emits ISO.
// ─────────────────────────────────────────────────────────────────────────────

export interface Track {
  id: string
  playlistId: string
  title: string
  artist: string
  duration: number
  position: number
  createdAt: Date
  updatedAt: Date
}

export interface Playlist {
  id: string
  userId: string
  title: string
  isPublic: boolean
  tracks: Track[]
  createdAt: Date
  updatedAt: Date
}

export interface CreatePlaylistInput {
  userId: string
  title: string
  isPublic: boolean
  tracks: Array<Pick<Track, 'title' | 'artist' | 'duration'>>
}

export interface UpdatePlaylistInput {
  title?: string
  isPublic?: boolean
  tracks?: Array<Pick<Track, 'title' | 'artist' | 'duration'>>
}

// ─────────────────────────────────────────────────────────────────────────────
//  DTO conversion — internal (Date) → public DTO (ISO string).
// ─────────────────────────────────────────────────────────────────────────────

export function toTrackResponse(t: Track): TrackResponse {
  return {
    id: t.id,
    playlistId: t.playlistId,
    title: t.title,
    artist: t.artist,
    duration: t.duration,
    position: t.position,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  }
}

export function toPlaylistResponse(p: Playlist): PlaylistResponse {
  return {
    id: p.id,
    userId: p.userId,
    title: p.title,
    isPublic: p.isPublic,
    tracks: p.tracks.map(toTrackResponse),
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  }
}
