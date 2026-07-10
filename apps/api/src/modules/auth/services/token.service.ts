import { createHash, randomBytes, randomUUID } from 'node:crypto'
import jwt, { type SignOptions } from 'jsonwebtoken'
import { env } from '../../../shared/config/env.js'
import { AppError } from '../../../shared/errors/app-error.js'
import { logger } from '../../../shared/logger/logger.js'
import { refreshTokenRepository } from '../repositories/refresh-token.repository.js'

export interface AccessTokenPayload {
  sub: string
  jti: string
}

export interface IssuedTokenPair {
  accessToken: string
  refreshToken: string
  refreshTokenId: string
  refreshTokenExpiresAt: Date
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export function generateOpaqueToken(byteLength = 32): string {
  return randomBytes(byteLength).toString('hex')
}

function issueAccessToken(userId: string): string {
  const options: SignOptions = {
    expiresIn: env.JWT_EXPIRES_IN as SignOptions['expiresIn'],
  }
  // jti makes the JWT unique per issue, so two tokens issued in the same
  // second still have different signatures.
  return jwt.sign({ sub: userId, jti: randomUUID() }, env.JWT_SECRET, options)
}

function refreshTtlMs(): number {
  return env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000
}

export const tokenService = {
  generateOpaqueToken(byteLength = 32): string {
    return randomBytes(byteLength).toString('hex')
  },

  hashToken,

  async issueTokenPair(userId: string): Promise<IssuedTokenPair> {
    const refreshToken = generateOpaqueToken(32)
    const refreshTokenHash = hashToken(refreshToken)
    const refreshTokenExpiresAt = new Date(Date.now() + refreshTtlMs())

    const row = await refreshTokenRepository.create({
      userId,
      tokenHash: refreshTokenHash,
      expiresAt: refreshTokenExpiresAt,
    })

    return {
      accessToken: issueAccessToken(userId),
      refreshToken,
      refreshTokenId: row.id,
      refreshTokenExpiresAt,
    }
  },

  async rotate(refreshToken: string): Promise<IssuedTokenPair> {
    const tokenHash = hashToken(refreshToken)
    const existing = await refreshTokenRepository.findByHash(tokenHash)

    if (!existing) {
      throw new AppError(
        401,
        'INVALID_REFRESH_TOKEN',
        'Refresh token not recognised'
      )
    }

    if (existing.expiresAt.getTime() < Date.now()) {
      throw new AppError(
        401,
        'REFRESH_TOKEN_EXPIRED',
        'Refresh token has expired'
      )
    }

    // Theft detection: a previously-revoked token being presented is a signal
    // that the token was leaked. Revoke every refresh token for this user.
    if (existing.revokedAt) {
      const revoked = await refreshTokenRepository.revokeAllForUser(
        existing.userId
      )
      logger.warn('refresh_token_replay_detected', {
        userId: existing.userId,
        revokedCount: revoked,
      })
      throw new AppError(
        401,
        'REFRESH_TOKEN_REVOKED',
        'Refresh token reuse detected; all sessions revoked'
      )
    }

    const next = await this.issueTokenPair(existing.userId)
    await refreshTokenRepository.revoke(existing.id, next.refreshTokenId)
    return next
  },

  async revokeRefreshToken(refreshToken: string): Promise<void> {
    const tokenHash = hashToken(refreshToken)
    const existing = await refreshTokenRepository.findByHash(tokenHash)
    if (!existing || existing.revokedAt) return
    await refreshTokenRepository.revoke(existing.id)
  },

  async revokeAllForUser(userId: string): Promise<number> {
    return refreshTokenRepository.revokeAllForUser(userId)
  },

  verifyAccessToken(token: string): AccessTokenPayload {
    return jwt.verify(token, env.JWT_SECRET) as AccessTokenPayload
  },
}
