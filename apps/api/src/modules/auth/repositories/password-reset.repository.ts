import { prisma } from '../../../shared/database/prisma.js'

export interface PasswordResetTokenRow {
  id: string
  userId: string
  tokenHash: string
  expiresAt: Date
  usedAt: Date | null
  createdAt: Date
}

export const passwordResetRepository = {
  findByHash(tokenHash: string): Promise<PasswordResetTokenRow | null> {
    return prisma.passwordResetToken.findUnique({ where: { tokenHash } })
  },

  async create(input: {
    userId: string
    tokenHash: string
    expiresAt: Date
  }): Promise<PasswordResetTokenRow> {
    return prisma.passwordResetToken.create({ data: input })
  },

  async markUsed(id: string, now: Date = new Date()): Promise<void> {
    await prisma.passwordResetToken.update({
      where: { id },
      data: { usedAt: now },
    })
  },
}
