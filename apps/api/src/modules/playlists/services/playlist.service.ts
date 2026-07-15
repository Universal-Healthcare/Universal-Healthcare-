import { AppError } from '../../../shared/errors/app-error.js'
import { playlistRepository } from '../repositories/playlist.repository.js'
import type { Playlist } from '../types/playlist.types.js'

export interface PlaylistListResult {
  items: Playlist[]
  total: number
  page: number
  pageSize: number
}

export const playlistService = {
  async listByUserId(
    userId: string,
    page: number,
    pageSize: number
  ): Promise<{ items: Playlist[]; total: number }> {
    const skip = (page - 1) * pageSize
    return playlistRepository.listByUserId(userId, skip, pageSize)
  },

  async getPublicById(id: string): Promise<Playlist> {
    const playlist = await playlistRepository.findById(id)
    // 404 when the playlist is private or missing — don't leak which
    // playlist IDs exist. Same rationale as `commentService.listForPlaylist`.
    if (!playlist || !playlist.isPublic) {
      throw new AppError(
        404,
        'PLAYLIST_NOT_FOUND',
        'Playlist not found'
      )
    }
    return playlist
  },

  async getById(id: string, requestingUserId: string): Promise<Playlist> {
    const playlist = await playlistRepository.findById(id)
    if (!playlist) {
      throw new AppError(404, 'PLAYLIST_NOT_FOUND', 'Playlist not found')
    }
    // Owner can view their own private playlists.
    if (!playlist.isPublic && playlist.userId !== requestingUserId) {
      throw new AppError(
        404,
        'PLAYLIST_NOT_FOUND',
        'Playlist not found'
      )
    }
    return playlist
  },

  async create(
    input: {
      userId: string
      title: string
      isPublic: boolean
      tracks: Array<{ title: string; artist: string; duration: number }>
    }
  ): Promise<Playlist> {
    return playlistRepository.create(input)
  },

  async update(
    id: string,
    requestingUserId: string,
    input: {
      title?: string
      isPublic?: boolean
      tracks?: Array<{ title: string; artist: string; duration: number }>
    }
  ): Promise<Playlist> {
    const existing = await playlistRepository.findById(id)
    if (!existing) {
      throw new AppError(404, 'PLAYLIST_NOT_FOUND', 'Playlist not found')
    }
    if (existing.userId !== requestingUserId) {
      throw new AppError(
        403,
        'FORBIDDEN',
        'You can only update your own playlists'
      )
    }

    return playlistRepository.update(id, input)
  },

  async delete(id: string, requestingUserId: string): Promise<void> {
    const existing = await playlistRepository.findById(id)
    if (!existing) {
      throw new AppError(404, 'PLAYLIST_NOT_FOUND', 'Playlist not found')
    }
    if (existing.userId !== requestingUserId) {
      throw new AppError(
        403,
        'FORBIDDEN',
        'You can only delete your own playlists'
      )
    }
    await playlistRepository.delete(id)
  },
}
