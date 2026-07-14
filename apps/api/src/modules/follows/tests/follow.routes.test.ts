import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import { createApp } from '../../../app.js'
import { AppError } from '../../../shared/errors/app-error.js'

// Mock the entire service so this Layer A test exercises the router +
// controller + auth gate without touching the DB.
vi.mock('../services/follow.service.js', () => ({
  followService: {
    create: vi.fn(),
    delete: vi.fn(),
    listMyFollowing: vi.fn(),
    listMyFollowers: vi.fn(),
    listUserFollowing: vi.fn(),
    listUserFollowers: vi.fn(),
  },
}))

// Import AFTER the mock so the call sites are bound to vi.fn().
const { followService } = await import('../services/follow.service.js')
const mockedService = followService as unknown as {
  create: ReturnType<typeof vi.fn>
  delete: ReturnType<typeof vi.fn>
  listMyFollowing: ReturnType<typeof vi.fn>
  listMyFollowers: ReturnType<typeof vi.fn>
  listUserFollowing: ReturnType<typeof vi.fn>
  listUserFollowers: ReturnType<typeof vi.fn>
}

describe('followRouter', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ─────────────────────────────────────────────────────────────────────────
  //  Public endpoints (no auth)
  // ─────────────────────────────────────────────────────────────────────────

  describe('GET /api/follows/users/:userId/following (public)', () => {
    it('returns 200 with paginated envelope', async () => {
      mockedService.listUserFollowing.mockResolvedValue({
        items: [],
        total: 0,
        page: 1,
        pageSize: 20,
      })

      const res = await request(createApp()).get(
        '/api/follows/users/u-1/following'
      )

      expect(res.status).toBe(200)
      expect(res.body).toMatchObject({
        data: [],
        pagination: { page: 1, pageSize: 20, total: 0, totalPages: 1 },
      })
      expect(mockedService.listUserFollowing).toHaveBeenCalledWith('u-1', 1, 20)
    })
  })

  describe('GET /api/follows/users/:userId/followers (public)', () => {
    it('returns 404 propagated from the service', async () => {
      mockedService.listUserFollowers.mockRejectedValue(
        new AppError(404, 'USER_NOT_FOUND', 'User not found')
      )

      const res = await request(createApp()).get(
        '/api/follows/users/missing/followers'
      )

      expect(res.status).toBe(404)
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  //  Protected endpoints — requireAuth gate
  // ─────────────────────────────────────────────────────────────────────────

  describe('POST /api/follows/me/following/:followeeId (auth required)', () => {
    it('returns 401 without a Bearer token', async () => {
      const res = await request(createApp()).post(
        '/api/follows/me/following/u-2'
      )
      expect(res.status).toBe(401)
      expect(mockedService.create).not.toHaveBeenCalled()
    })
  })

  describe('DELETE /api/follows/me/following/:followeeId (auth required)', () => {
    it('returns 401 without a Bearer token', async () => {
      const res = await request(createApp()).delete(
        '/api/follows/me/following/u-2'
      )
      expect(res.status).toBe(401)
      expect(mockedService.delete).not.toHaveBeenCalled()
    })
  })

  describe('GET /api/follows/me/following (auth required)', () => {
    it('returns 401 without a Bearer token', async () => {
      const res = await request(createApp()).get('/api/follows/me/following')
      expect(res.status).toBe(401)
      expect(mockedService.listMyFollowing).not.toHaveBeenCalled()
    })
  })

  describe('GET /api/follows/me/followers (auth required)', () => {
    it('returns 401 without a Bearer token', async () => {
      const res = await request(createApp()).get('/api/follows/me/followers')
      expect(res.status).toBe(401)
      expect(mockedService.listMyFollowers).not.toHaveBeenCalled()
    })
  })
})
