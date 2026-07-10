import request from 'supertest'
import { beforeEach, describe, expect, it } from 'vitest'
import { createApp } from '../../../app.js'
import { buildEmailService } from '../../../shared/email/index.js'

const app = createApp()

beforeEach(() => {
  buildEmailService()
})

async function registerFan(email: string, displayName: string) {
  return request(app).post('/api/auth/register').send({
    email,
    password: 'password1',
    role: 'fan',
    displayName,
  })
}

describe('POST /api/auth/refresh', () => {
  it('rotates the refresh token and returns a new pair', async () => {
    const reg = await registerFan('refresh@example.com', 'Refresh Tester')
    const originalRefresh = reg.body.tokens.refreshToken
    const originalAccess = reg.body.tokens.accessToken

    const res = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: originalRefresh })

    expect(res.status).toBe(200)
    expect(res.body.tokens.accessToken).toBeTruthy()
    expect(res.body.tokens.refreshToken).toBeTruthy()
    expect(res.body.tokens.refreshToken).not.toBe(originalRefresh)
    expect(res.body.tokens.accessToken).not.toBe(originalAccess)
  })

  it('rejects reuse of an already-revoked refresh token (theft signal)', async () => {
    const reg = await registerFan('theft@example.com', 'Theft Tester')
    const originalRefresh = reg.body.tokens.refreshToken

    await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: originalRefresh })
      .expect(200)

    const res = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: originalRefresh })

    expect(res.status).toBe(401)
    expect(res.body.error.code).toBe('REFRESH_TOKEN_REVOKED')
  })

  it('rejects an unrecognised refresh token', async () => {
    const res = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: 'not-a-real-token' })

    expect(res.status).toBe(401)
    expect(res.body.error.code).toBe('INVALID_REFRESH_TOKEN')
  })
})
