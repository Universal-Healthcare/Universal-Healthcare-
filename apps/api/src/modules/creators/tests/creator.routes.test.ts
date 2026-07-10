import request from 'supertest'
import { beforeEach, describe, expect, it } from 'vitest'
import { createApp } from '../../../app.js'
import { prisma } from '../../../shared/database/prisma.js'

const app = createApp()

beforeEach(async () => {
  await prisma.fanProfile.deleteMany()
  await prisma.creatorProfile.deleteMany()
  await prisma.user.deleteMany()
})

describe('GET /api/creators/:slug', () => {
  it('returns 404 for an unknown slug', async () => {
    const res = await request(app).get('/api/creators/does-not-exist')
    expect(res.status).toBe(404)
    expect(res.body.error.code).toBe('CREATOR_NOT_FOUND')
  })

  it('returns the creator profile for a valid slug', async () => {
    const user = await prisma.user.create({
      data: { email: 'creator@test.com', passwordHash: 'hash' },
    })

    await prisma.creatorProfile.create({
      data: {
        userId: user.id,
        displayName: 'Solar Vibes',
        slug: 'solar-vibes',
        bio: 'Indie producer',
        genre: 'Indie',
        location: 'Lagos',
      },
    })

    const res = await request(app).get('/api/creators/solar-vibes')
    expect(res.status).toBe(200)
    expect(res.body.displayName).toBe('Solar Vibes')
    expect(res.body.slug).toBe('solar-vibes')
    expect(res.body.bio).toBe('Indie producer')
    expect(res.body.genre).toBe('Indie')
  })
})
