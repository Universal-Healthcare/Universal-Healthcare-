import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import { createApp } from '../../../app.js'
import { AppError } from '../../../shared/errors/app-error.js'

// Mock the entire service so this Layer A test exercises the router +
// controller + auth gate without touching the DB.
vi.mock('../services/playlist.service.js', () => ({
  playlistService: {
    getPublicById: vi.fn(),
    listByUserId: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}))

const { playlistService } = await import('../services/playlist.service.js')
const mockedService = playlistService as unknown as {
  getPublicById: ReturnType<typeof vi.fn>
  listByUserId: ReturnType<typeof vi.fn>
  getById: ReturnType<typeof vi.fn>
  create: ReturnType<typeof vi.fn>
  update: ReturnType<typeof vi.fn>
  delete: ReturnType<typeof vi.fn>
}

function makePlaylistStub(overrides: Record<string, unknown> = {}) {
  return {
    id: 'pl-1',
    userId: 'u-1',
    title: 'Test Playlist',
    isPublic: true,
    tracks: [],
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    ...overrides,
  }
}

describe('playlistRouter', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ─── Public endpoint ─────────────────────────────────────────────────────
  describe('GET /api/playlists/public/:id (public)', () => {
    it('returns 200 with the playlist data', async () => {
      mockedService.getPublicById.mockResolvedValue(makePlaylistStub())

      const res = await request(createApp()).get('/api/playlists/public/pl-1')

      expect(res.status).toBe(200)
      expect(res.body.data.id).toBe('pl-1')
      expect(res.body.data.title).toBe('Test Playlist')
      expect(mockedService.getPublicById).toHaveBeenCalledWith('pl-1')
    })

    it('returns 404 propagated from the service', async () => {
      mockedService.getPublicById.mockRejectedValue(
        new AppError(404, 'PLAYLIST_NOT_FOUND', 'Playlist not found')
      )

      const res = await request(createApp()).get(
        '/api/playlists/public/missing'
      )

      expect(res.status).toBe(404)
    })
  })

  // ─── Protected: list my playlists ────────────────────────────────────────
  describe('GET /api/playlists (auth required)', () => {
    it('returns 401 without a Bearer token', async () => {
      const res = await request(createApp()).get('/api/playlists')
      expect(res.status).toBe(401)
      expect(mockedService.listByUserId).not.toHaveBeenCalled()
    })
  })

  describe('GET /api/playlists/:id (auth required)', () => {
    it('returns 401 without a Bearer token', async () => {
      const res = await request(createApp()).get('/api/playlists/pl-1')
      expect(res.status).toBe(401)
      expect(mockedService.getById).not.toHaveBeenCalled()
    })
  })

  describe('POST /api/playlists (auth required)', () => {
    it('returns 401 without a Bearer token', async () => {
      const res = await request(createApp()).post('/api/playlists').send({
        title: 'Test',
      })
      expect(res.status).toBe(401)
      expect(mockedService.create).not.toHaveBeenCalled()
    })
  })

  describe('PUT /api/playlists/:id (auth required)', () => {
    it('returns 401 without a Bearer token', async () => {
      const res = await request(createApp()).put('/api/playlists/pl-1').send({
        title: 'Updated',
      })
      expect(res.status).toBe(401)
      expect(mockedService.update).not.toHaveBeenCalled()
    })
  })

  describe('DELETE /api/playlists/:id (auth required)', () => {
    it('returns 401 without a Bearer token', async () => {
      const res = await request(createApp()).delete('/api/playlists/pl-1')
      expect(res.status).toBe(401)
      expect(mockedService.delete).not.toHaveBeenCalled()
    })
  })
})
