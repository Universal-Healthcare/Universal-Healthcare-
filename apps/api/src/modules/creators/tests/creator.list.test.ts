import request from 'supertest'
import { beforeEach, describe, expect, it } from 'vitest'
import { createApp } from '../../../app.js'
import { buildEmailService } from '../../../shared/email/index.js'

const app = createApp()

beforeEach(() => {
  buildEmailService()
})

async function registerCreator(email: string, displayName: string) {
  await request(app).post('/api/auth/register').send({
    email,
    password: 'password1',
    role: 'creator',
    displayName,
  })
}

describe('GET /api/creators (paginated list)', () => {
  beforeEach(async () => {
    await registerCreator('c1@example.com', 'Alpha')
    await registerCreator('c2@example.com', 'Bravo')
    await registerCreator('c3@example.com', 'Charlie')
  })

  it('returns the first page with default page size', async () => {
    const res = await request(app).get('/api/creators')
    expect(res.status).toBe(200)
    expect(res.body.data).toHaveLength(3)
    expect(res.body.pagination).toMatchObject({
      page: 1,
      pageSize: 20,
      total: 3,
      totalPages: 1,
    })
  })

  it('respects page + pageSize', async () => {
    const res = await request(app)
      .get('/api/creators')
      .query({ page: 1, pageSize: 2 })
    expect(res.status).toBe(200)
    expect(res.body.data).toHaveLength(2)
    expect(res.body.pagination).toMatchObject({
      page: 1,
      pageSize: 2,
      total: 3,
      totalPages: 2,
    })

    const page2 = await request(app)
      .get('/api/creators')
      .query({ page: 2, pageSize: 2 })
    expect(page2.status).toBe(200)
    expect(page2.body.data).toHaveLength(1)
    expect(page2.body.pagination.page).toBe(2)
  })

  it('filters by search', async () => {
    const res = await request(app)
      .get('/api/creators')
      .query({ search: 'Alpha' })
    expect(res.status).toBe(200)
    expect(res.body.data).toHaveLength(1)
    expect(res.body.data[0].displayName).toBe('Alpha')
  })
})
