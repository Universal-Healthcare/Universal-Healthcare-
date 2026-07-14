import { prisma } from '../../../shared/database/prisma.js'
import type { Follow } from '../types/follow.types.js'

// Prisma's unique-violation code. The service translates Prisma errors with
// this code into a 409 ALREADY_FOLLOWING (matches auth.service's pattern of
// mapping @@unique conflicts to user-facing semantics). Kept as a named
// constant here so the contract appears once.
export const FOLLOW_UNIQUE_VIOLATION = 'P2002'

type RawFollow = {
  id: string
  followerId: string
  followeeId: string
  createdAt: Date
  updatedAt: Date
}

function followFromPrisma(raw: RawFollow): Follow {
  return { ...raw }
}

export const followRepository = {
  async findByPair(
    followerId: string,
    followeeId: string
  ): Promise<Follow | null> {
    const row = await prisma.follow.findUnique({
      where: { followerId_followeeId: { followerId, followeeId } },
    })
    return row ? followFromPrisma(row) : null
  },

  // Light existence check. We deliberately `select: { id: true }` so we
  // don't pull the User's password hash / refresh tokens into the caller's
  // memory — this is invoked from `followService.create` for every POST.
  async findUserById(userId: string): Promise<{ id: string } | null> {
    const row = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    })
    return row
  },

  async listFollowing(
    userId: string,
    page: number,
    pageSize: number
  ): Promise<{ items: Follow[]; total: number }> {
    const [rows, total] = await Promise.all([
      prisma.follow.findMany({
        where: { followerId: userId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.follow.count({ where: { followerId: userId } }),
    ])
    return { items: rows.map(followFromPrisma), total }
  },

  async listFollowers(
    userId: string,
    page: number,
    pageSize: number
  ): Promise<{ items: Follow[]; total: number }> {
    const [rows, total] = await Promise.all([
      prisma.follow.findMany({
        where: { followeeId: userId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.follow.count({ where: { followeeId: userId } }),
    ])
    return { items: rows.map(followFromPrisma), total }
  },

  async create(input: {
    followerId: string
    followeeId: string
  }): Promise<Follow> {
    const row = await prisma.follow.create({ data: input })
    return followFromPrisma(row)
  },

  async deleteByPair(followerId: string, followeeId: string): Promise<void> {
    await prisma.follow.delete({
      where: { followerId_followeeId: { followerId, followeeId } },
    })
  },
}
