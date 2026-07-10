import { prisma } from '../../../shared/database/prisma.js'

export interface RefreshTokenRow {
  id: string
  userId: string
  tokenHash: string
  expiresAt: Date
  revokedAt: Date | null
  replacedById: string | null
  createdAt: Date
}

export const refreshTokenRepository = {
  findByHash(tokenHash: string): Promise<RefreshTokenRow | null> {
    return prisma.refreshToken.findUnique({ where: { tokenHash } })
  },

  async create(input: {
    userId: string
    tokenHash: string
    expiresAt: Date
  }): Promise<RefreshTokenRow> {
    return prisma.refreshToken.create({ data: input })
  },

  async revoke(id: string, replacedById?: string): Promise<void> {
    await prisma.refreshToken.update({
      where: { id },
      data: {
        revokedAt: new Date(),
        ...(replacedById ? { replacedById } : {}),
      },
    })
  },

  async revokeAllForUser(userId: string): Promise<number> {
    const result = await prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    })
    return result.count
  },

  async deleteExpired(now: Date = new Date()): Promise<number> {
    const result = await prisma.refreshToken.deleteMany({
      where: { expiresAt: { lt: now } },
    })
    return result.count
  },
}
