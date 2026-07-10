import { describe, expect, it } from 'vitest'
import { loginSchema, registerSchema } from './auth.js'

describe('registerSchema', () => {
  it('accepts a valid fan registration', () => {
    const result = registerSchema.safeParse({
      email: 'Fan@Example.com',
      password: 'password1',
      role: 'fan',
      displayName: 'New Fan',
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.email).toBe('fan@example.com')
    }
  })

  it('accepts a valid creator registration with profile', () => {
    const result = registerSchema.safeParse({
      email: 'creator@example.com',
      password: 'password1',
      role: 'creator',
      displayName: 'New Creator',
      profile: { bio: 'I create things', genre: 'jazz' },
    })

    expect(result.success).toBe(true)
  })

  it('rejects when role is missing', () => {
    const result = registerSchema.safeParse({
      email: 'fan@example.com',
      password: 'password1',
      displayName: 'X',
    })

    expect(result.success).toBe(false)
  })

  it('rejects an invalid role', () => {
    const result = registerSchema.safeParse({
      email: 'admin@example.com',
      password: 'password1',
      role: 'admin',
      displayName: 'X',
    })

    expect(result.success).toBe(false)
  })

  it('rejects an invalid email', () => {
    const result = registerSchema.safeParse({
      email: 'not-an-email',
      password: 'password1',
      role: 'fan',
      displayName: 'X',
    })

    expect(result.success).toBe(false)
  })

  it('rejects a password without a number', () => {
    const result = registerSchema.safeParse({
      email: 'fan@example.com',
      password: 'passwordonly',
      role: 'fan',
      displayName: 'X',
    })

    expect(result.success).toBe(false)
  })

  it('rejects a password shorter than 8 characters', () => {
    const result = registerSchema.safeParse({
      email: 'fan@example.com',
      password: 'pass1',
      role: 'fan',
      displayName: 'X',
    })

    expect(result.success).toBe(false)
  })

  it('rejects a display name shorter than 2 characters', () => {
    const result = registerSchema.safeParse({
      email: 'fan@example.com',
      password: 'password1',
      role: 'fan',
      displayName: 'X',
    })

    expect(result.success).toBe(false)
  })
})

describe('loginSchema', () => {
  it('accepts an email and non-empty password', () => {
    const result = loginSchema.safeParse({
      email: 'fan@example.com',
      password: 'anything',
    })

    expect(result.success).toBe(true)
  })

  it('rejects an empty password', () => {
    const result = loginSchema.safeParse({
      email: 'fan@example.com',
      password: '',
    })

    expect(result.success).toBe(false)
  })
})
