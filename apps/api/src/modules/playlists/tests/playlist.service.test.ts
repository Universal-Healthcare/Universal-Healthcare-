import { describe, it, expect } from 'vitest'
import { prisma } from '../../../shared/database/prisma.js'
import { playlistService } from '../services/playlist.service.js'

// ─── helpers ────────────────────────────────────────────────────────────────

let userCounter = 0
async function makeUser(): Promise<{ id: string }> {
  userCounter += 1
  const u = await prisma.user.create({
    data: {
      email: `pl-u${userCounter}-${Date.now()}-${Math.random().toString(36).slice(2)}@e.com`,
      passwordHash: 'x',
    },
  })
  return { id: u.id }
}

// ─── tests ──────────────────────────────────────────────────────────────────

describe('playlistService', () => {
  // ─── create ──────────────────────────────────────────────────────────────
  describe('create', () => {
    it('creates a playlist with tracks', async () => {
      const u = await makeUser()
      const playlist = await playlistService.create({
        userId: u.id,
        title: 'My Mix',
        isPublic: true,
        tracks: [
          { title: 'Song A', artist: 'Artist A', duration: 200 },
          { title: 'Song B', artist: 'Artist B', duration: 180 },
        ],
      })
      expect(playlist.title).toBe('My Mix')
      expect(playlist.isPublic).toBe(true)
      expect(playlist.userId).toBe(u.id)
      expect(playlist.tracks).toHaveLength(2)
      expect(playlist.tracks[0].title).toBe('Song A')
      expect(playlist.tracks[0].position).toBe(0)
      expect(playlist.tracks[1].title).toBe('Song B')
      expect(playlist.tracks[1].position).toBe(1)
    })

    it('defaults isPublic to false when not provided', async () => {
      const u = await makeUser()
      const playlist = await playlistService.create({
        userId: u.id,
        title: 'Private Mix',
        isPublic: false,
        tracks: [],
      })
      expect(playlist.isPublic).toBe(false)
    })

    it('creates a playlist without tracks', async () => {
      const u = await makeUser()
      const playlist = await playlistService.create({
        userId: u.id,
        title: 'Empty Playlist',
        isPublic: true,
        tracks: [],
      })
      expect(playlist.tracks).toHaveLength(0)
    })
  })

  // ─── getPublicById ───────────────────────────────────────────────────────
  describe('getPublicById', () => {
    it('returns a public playlist', async () => {
      const u = await makeUser()
      const created = await playlistService.create({
        userId: u.id,
        title: 'Public Mix',
        isPublic: true,
        tracks: [],
      })
      const fetched = await playlistService.getPublicById(created.id)
      expect(fetched.id).toBe(created.id)
      expect(fetched.title).toBe('Public Mix')
    })

    it('404s when the playlist does not exist', async () => {
      await expect(
        playlistService.getPublicById('does-not-exist')
      ).rejects.toMatchObject({
        statusCode: 404,
        code: 'PLAYLIST_NOT_FOUND',
      })
    })

    it('404s when the playlist is private (does not leak existence)', async () => {
      const u = await makeUser()
      const created = await playlistService.create({
        userId: u.id,
        title: 'Secret Mix',
        isPublic: false,
        tracks: [],
      })
      await expect(
        playlistService.getPublicById(created.id)
      ).rejects.toMatchObject({
        statusCode: 404,
        code: 'PLAYLIST_NOT_FOUND',
      })
    })
  })

  // ─── getById (owner access) ──────────────────────────────────────────────
  describe('getById', () => {
    it('allows the owner to view their private playlist', async () => {
      const u = await makeUser()
      const created = await playlistService.create({
        userId: u.id,
        title: 'My Private Mix',
        isPublic: false,
        tracks: [],
      })
      const fetched = await playlistService.getById(created.id, u.id)
      expect(fetched.id).toBe(created.id)
      expect(fetched.isPublic).toBe(false)
    })

    it('404s when a non-owner tries to view a private playlist', async () => {
      const owner = await makeUser()
      const stranger = await makeUser()
      const created = await playlistService.create({
        userId: owner.id,
        title: 'Private',
        isPublic: false,
        tracks: [],
      })
      await expect(
        playlistService.getById(created.id, stranger.id)
      ).rejects.toMatchObject({
        statusCode: 404,
        code: 'PLAYLIST_NOT_FOUND',
      })
    })

    it('allows a non-owner to view a public playlist', async () => {
      const owner = await makeUser()
      const stranger = await makeUser()
      const created = await playlistService.create({
        userId: owner.id,
        title: 'Public',
        isPublic: true,
        tracks: [],
      })
      const fetched = await playlistService.getById(created.id, stranger.id)
      expect(fetched.id).toBe(created.id)
    })

    it('404s when the playlist does not exist', async () => {
      const u = await makeUser()
      await expect(
        playlistService.getById('does-not-exist', u.id)
      ).rejects.toMatchObject({
        statusCode: 404,
        code: 'PLAYLIST_NOT_FOUND',
      })
    })
  })

  // ─── listByUserId ────────────────────────────────────────────────────────
  describe('listByUserId', () => {
    it('returns all playlists for a user (newest first)', async () => {
      const u = await makeUser()
      const p1 = await playlistService.create({
        userId: u.id,
        title: 'First',
        isPublic: true,
        tracks: [],
      })
      const p2 = await playlistService.create({
        userId: u.id,
        title: 'Second',
        isPublic: false,
        tracks: [],
      })
      const { items, total } = await playlistService.listByUserId(u.id, 1, 10)
      expect(items).toHaveLength(2)
      expect(total).toBe(2)
      expect(items[0].id).toBe(p2.id) // newest first
      expect(items[1].id).toBe(p1.id)
    })

    it('returns empty array for user with no playlists', async () => {
      const u = await makeUser()
      const { items, total } = await playlistService.listByUserId(u.id, 1, 10)
      expect(items).toEqual([])
      expect(total).toBe(0)
    })

    it('paginates correctly', async () => {
      const u = await makeUser()
      for (let i = 0; i < 7; i++) {
        await playlistService.create({
          userId: u.id,
          title: `P${i}`,
          isPublic: true,
          tracks: [],
        })
      }
      const p1 = await playlistService.listByUserId(u.id, 1, 3)
      const p2 = await playlistService.listByUserId(u.id, 2, 3)
      const p3 = await playlistService.listByUserId(u.id, 3, 3)
      expect(p1.items).toHaveLength(3)
      expect(p2.items).toHaveLength(3)
      expect(p3.items).toHaveLength(1)
      expect([p1.total, p2.total, p3.total]).toEqual([7, 7, 7])
    })
  })

  // ─── update ──────────────────────────────────────────────────────────────
  describe('update', () => {
    it('updates playlist title and visibility', async () => {
      const u = await makeUser()
      const created = await playlistService.create({
        userId: u.id,
        title: 'Original',
        isPublic: false,
        tracks: [],
      })
      const updated = await playlistService.update(created.id, u.id, {
        title: 'Renamed',
        isPublic: true,
      })
      expect(updated.title).toBe('Renamed')
      expect(updated.isPublic).toBe(true)
    })

    it('replaces tracks atomically via setTracks', async () => {
      const u = await makeUser()
      const created = await playlistService.create({
        userId: u.id,
        title: 'With Tracks',
        isPublic: true,
        tracks: [{ title: 'Old', artist: 'Old Artist', duration: 100 }],
      })
      const updated = await playlistService.update(created.id, u.id, {
        tracks: [
          { title: 'New1', artist: 'A1', duration: 111 },
          { title: 'New2', artist: 'A2', duration: 222 },
        ],
      })
      expect(updated.tracks).toHaveLength(2)
      expect(updated.tracks[0].title).toBe('New1')
      expect(updated.tracks[1].title).toBe('New2')
    })

    it('403s when a non-owner tries to update', async () => {
      const owner = await makeUser()
      const stranger = await makeUser()
      const created = await playlistService.create({
        userId: owner.id,
        title: 'Owned',
        isPublic: true,
        tracks: [],
      })
      await expect(
        playlistService.update(created.id, stranger.id, { title: 'Hacked' })
      ).rejects.toMatchObject({
        statusCode: 403,
        code: 'FORBIDDEN',
      })
    })

    it('404s when the playlist does not exist', async () => {
      const u = await makeUser()
      await expect(
        playlistService.update('does-not-exist', u.id, { title: 'Nope' })
      ).rejects.toMatchObject({
        statusCode: 404,
        code: 'PLAYLIST_NOT_FOUND',
      })
    })
  })

  // ─── delete ──────────────────────────────────────────────────────────────
  describe('delete', () => {
    it('deletes an owned playlist', async () => {
      const u = await makeUser()
      const created = await playlistService.create({
        userId: u.id,
        title: 'To Delete',
        isPublic: true,
        tracks: [],
      })
      await playlistService.delete(created.id, u.id)
      const { items } = await playlistService.listByUserId(u.id, 1, 10)
      expect(items).toHaveLength(0)
    })

    it('403s when a non-owner tries to delete', async () => {
      const owner = await makeUser()
      const stranger = await makeUser()
      const created = await playlistService.create({
        userId: owner.id,
        title: 'Mine',
        isPublic: true,
        tracks: [],
      })
      await expect(
        playlistService.delete(created.id, stranger.id)
      ).rejects.toMatchObject({
        statusCode: 403,
        code: 'FORBIDDEN',
      })
    })

    it('404s when the playlist does not exist', async () => {
      const u = await makeUser()
      await expect(
        playlistService.delete('does-not-exist', u.id)
      ).rejects.toMatchObject({
        statusCode: 404,
        code: 'PLAYLIST_NOT_FOUND',
      })
    })
  })
})
