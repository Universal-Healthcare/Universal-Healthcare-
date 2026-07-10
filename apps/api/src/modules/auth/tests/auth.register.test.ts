import request from 'supertest'
import { beforeEach, describe, expect, it } from 'vitest'
import { createApp } from '../../../app.js'
import { buildEmailService } from '../../../shared/email/index.js'

const app = createApp()

beforeEach(() => {
  buildEmailService()
})

describe('POST /api/auth/register', () => {
  it('registers a new creator and returns tokens + profile', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'creator@example.com',
        password: 'password1',
        role: 'creator',
        displayName: 'New Creator',
        profile: { bio: 'I create things' },
      })

    expect(response.status).toBe(201)
    expect(response.body.user.email).toBe('creator@example.com')
    expect(response.body.user.role).toBe('creator')
    expect(response.body.user.emailVerified).toBe(false)
    expect(typeof response.body.tokens.accessToken).toBe('string')
    expect(typeof response.body.tokens.refreshToken).toBe('string')
    expect(response.body.profile).toBeTruthy()
    expect(response.body.profile.displayName).toBe('New Creator')
    expect(response.body.profile.slug).toBeTruthy()
    expect(response.body.user.passwordHash).toBeUndefined()
  })

  it('registers a new fan and returns tokens + profile', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'fan@example.com',
        password: 'password1',
        role: 'fan',
        displayName: 'New Fan',
        profile: { genrePrefs: ['rock', 'jazz'] },
      })

    expect(response.status).toBe(201)
    expect(response.body.user.role).toBe('fan')
    expect(response.body.profile.displayName).toBe('New Fan')
    expect(response.body.profile.genrePrefs).toEqual(['rock', 'jazz'])
  })

  it('rejects duplicate emails', async () => {
    await request(app).post('/api/auth/register').send({
      email: 'dup@example.com',
      password: 'password1',
      role: 'fan',
      displayName: 'Dup',
    })

    const response = await request(app).post('/api/auth/register').send({
      email: 'dup@example.com',
      password: 'password1',
      role: 'fan',
      displayName: 'Dup',
    })

    expect(response.status).toBe(409)
    expect(response.body.error.code).toBe('EMAIL_ALREADY_REGISTERED')
  })

  it('rejects missing role', async () => {
    const response = await request(app).post('/api/auth/register').send({
      email: 'norole@example.com',
      password: 'password1',
      displayName: 'No Role',
    })

    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('VALIDATION_ERROR')
  })

  it('rejects invalid input', async () => {
    const response = await request(app).post('/api/auth/register').send({
      email: 'not-an-email',
      password: 'short',
      role: 'fan',
      displayName: 'X',
    })

    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('VALIDATION_ERROR')
  })
})
