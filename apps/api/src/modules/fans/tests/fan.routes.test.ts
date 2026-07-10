import express from 'express'
import request from 'supertest'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../../shared/middleware/auth.middleware.js', () => ({
  requireAuth: (req: { userId?: string }, _res: unknown, next: () => void) => {
    const auth = (req as { headers?: Record<string, string> }).headers?.[
      'authorization'
    ]
    if (auth === 'Bearer good') {
      req.userId = 'user-1'
    }
    next()
  },
}))

vi.mock('../../../shared/database/prisma.js', () => ({
  prisma: {
    fanProfile: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}))

import { prisma } from '../../../shared/database/prisma.js'
import { fansRouter } from '../routes/fan.routes.js'
import { errorHandler } from '../../../shared/middleware/error-handler.js'

const mockPrisma = prisma as unknown as {
  fanProfile: {
    findUnique: ReturnType<typeof vi.fn>
    create: ReturnType<typeof vi.fn>
    update: ReturnType<typeof vi.fn>
  }
}

const existingProfile = {
  id: 'fan-3',
  userId: 'user-1',
  displayName: 'Old',
  avatarUrl: null,
  genrePrefs: '[]',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
}

function buildApp() {
  const app = express()
  app.use(express.json())
  app.use('/api/fans', fansRouter)
  app.use(errorHandler)
  return app
}

describe('fans routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('GET /api/fans/me returns the profile when it exists', async () => {
    mockPrisma.fanProfile.findUnique.mockResolvedValueOnce({
      id: 'fan-1',
      userId: 'user-1',
      displayName: 'Sam',
      avatarUrl: null,
      genrePrefs: '["rock","pop"]',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    })

    const res = await request(buildApp())
      .get('/api/fans/me')
      .set('authorization', 'Bearer good')

    expect(res.status).toBe(200)
    expect(res.body.data.displayName).toBe('Sam')
    expect(res.body.data.genrePrefs).toEqual(['rock', 'pop'])
  })

  it('GET /api/fans/me returns 404 when no profile', async () => {
    mockPrisma.fanProfile.findUnique.mockResolvedValueOnce(null)

    const res = await request(buildApp())
      .get('/api/fans/me')
      .set('authorization', 'Bearer good')

    expect(res.status).toBe(404)
    expect(res.body.error.code).toBe('FAN_PROFILE_NOT_FOUND')
  })

  it('PUT /api/fans/me creates a profile when missing', async () => {
    mockPrisma.fanProfile.findUnique.mockResolvedValueOnce(null)
    mockPrisma.fanProfile.create.mockResolvedValueOnce({
      id: 'fan-2',
      userId: 'user-1',
      displayName: 'Alex',
      avatarUrl: null,
      genrePrefs: '[]',
      createdAt: new Date('2026-02-01T00:00:00.000Z'),
      updatedAt: new Date('2026-02-01T00:00:00.000Z'),
    })

    const res = await request(buildApp())
      .put('/api/fans/me')
      .set('authorization', 'Bearer good')
      .send({ displayName: 'Alex' })

    expect(res.status).toBe(201)
    expect(res.body.data.displayName).toBe('Alex')
  })

  it('PUT /api/fans/me updates the existing profile when one exists', async () => {
    // 1) controller's findByUserId lookup returns the existing profile
    // 2) service.updateFanProfile -> repository.findById lookup also returns it
    mockPrisma.fanProfile.findUnique
      .mockResolvedValueOnce(existingProfile)
      .mockResolvedValueOnce(existingProfile)
    mockPrisma.fanProfile.update.mockResolvedValueOnce({
      ...existingProfile,
      displayName: 'New',
      updatedAt: new Date('2026-03-01T00:00:00.000Z'),
    })

    const res = await request(buildApp())
      .put('/api/fans/me')
      .set('authorization', 'Bearer good')
      .send({ displayName: 'New' })

    expect(res.status).toBe(200)
    expect(res.body.data.displayName).toBe('New')
  })

  it('PUT /api/fans/me/genre-prefs validates the body', async () => {
    const res = await request(buildApp())
      .put('/api/fans/me/genre-prefs')
      .set('authorization', 'Bearer good')
      .send({ genrePrefs: 'not-an-array' })

    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('VALIDATION_ERROR')
  })
})
