import { prisma } from '../../../shared/database/prisma.js'

export interface EmailVerificationTokenRow {
  id: string
  userId: string
  tokenHash: string
  expiresAt: Date
  usedAt: Date | null
  createdAt: Date
}

export const emailVerificationRepository = {
  findByHash(tokenHash: string): Promise<EmailVerificationTokenRow | null> {
    return prisma.emailVerificationToken.findUnique({ where: { tokenHash } })
  },

  findLatestUnusedByUser(
    userId: string,
    now: Date = new Date()
  ): Promise<EmailVerificationTokenRow | null> {
    return prisma.emailVerificationToken.findFirst({
      where: { userId, usedAt: null, expiresAt: { gt: now } },
      orderBy: { createdAt: 'desc' },
    })
  },

  async create(input: {
    userId: string
    tokenHash: string
    expiresAt: Date
  }): Promise<EmailVerificationTokenRow> {
    return prisma.emailVerificationToken.create({ data: input })
  },

  async markUsed(id: string, now: Date = new Date()): Promise<void> {
    await prisma.emailVerificationToken.update({
      where: { id },
      data: { usedAt: now },
    })
  },

  async revokeUnusedForUser(userId: string): Promise<number> {
    const result = await prisma.emailVerificationToken.updateMany({
      where: { userId, usedAt: null },
      data: { usedAt: new Date() },
    })
    return result.count
  },
}
