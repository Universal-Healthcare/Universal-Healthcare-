import { describe, it, expect } from 'vitest'
import { prisma } from '../../../shared/database/prisma.js'
import { followService } from '../services/follow.service.js'

// ─── helpers ────────────────────────────────────────────────────────────────

let userCounter = 0
async function makeUser(): Promise<{ id: string }> {
  userCounter += 1
  const u = await prisma.user.create({
    data: {
      email: `f-u${userCounter}-${Date.now()}-${Math.random().toString(36).slice(2)}@e.com`,
      passwordHash: 'x',
    },
  })
  return { id: u.id }
}

// ─── tests ──────────────────────────────────────────────────────────────────

describe('followService', () => {
  // ─── create ──────────────────────────────────────────────────────────────
  describe('create', () => {
    it('creates a follow row', async () => {
      const a = await makeUser()
      const b = await makeUser()
      const follow = await followService.create(b.id, a.id)
      expect(follow.followerId).toBe(a.id)
      expect(follow.followeeId).toBe(b.id)
    })

    it('rejects self-follow with 400 CANNOT_FOLLOW_SELF', async () => {
      const a = await makeUser()
      await expect(followService.create(a.id, a.id)).rejects.toMatchObject({
        statusCode: 400,
        code: 'CANNOT_FOLLOW_SELF',
      })
    })

    it('rejects 404 USER_NOT_FOUND for a missing followee', async () => {
      const a = await makeUser()
      await expect(
        followService.create('does-not-exist', a.id)
      ).rejects.toMatchObject({
        statusCode: 404,
        code: 'USER_NOT_FOUND',
      })
    })

    it('maps @@unique([followerId, followeeId]) race to 409 ALREADY_FOLLOWING', async () => {
      const a = await makeUser()
      const b = await makeUser()
      await followService.create(b.id, a.id)
      // Second insert hits the unique constraint.
      await expect(followService.create(b.id, a.id)).rejects.toMatchObject({
        statusCode: 409,
        code: 'ALREADY_FOLLOWING',
      })
    })
  })

  // ─── delete ──────────────────────────────────────────────────────────────
  describe('delete', () => {
    it('unfollows an existing pair (row gone)', async () => {
      const a = await makeUser()
      const b = await makeUser()
      await followService.create(b.id, a.id)
      await followService.delete(b.id, a.id)
      const remaining = await prisma.follow.count({
        where: { followerId: a.id, followeeId: b.id },
      })
      expect(remaining).toBe(0)
    })

    it('rejects self-unfollow with 400 CANNOT_UNFOLLOW_SELF', async () => {
      const a = await makeUser()
      await expect(followService.delete(a.id, a.id)).rejects.toMatchObject({
        statusCode: 400,
        code: 'CANNOT_UNFOLLOW_SELF',
      })
    })

    it('404s with FOLLOW_NOT_FOUND when no follow row exists', async () => {
      const a = await makeUser()
      const b = await makeUser()
      await expect(followService.delete(b.id, a.id)).rejects.toMatchObject({
        statusCode: 404,
        code: 'FOLLOW_NOT_FOUND',
      })
    })
  })

  // ─── listMyFollowing / listMyFollowers ───────────────────────────────────
  describe('listMyFollowing / listMyFollowers', () => {
    it('returns paginated following (newest first)', async () => {
      const a = await makeUser()
      const b = await makeUser()
      const c = await makeUser()
      await followService.create(b.id, a.id)
      await followService.create(c.id, a.id)
      const r = await followService.listMyFollowing(a.id, 1, 10)
      expect(r.items).toHaveLength(2)
      expect(r.items.map((f) => f.followeeId)).toEqual([c.id, b.id])
      expect(r.total).toBe(2)
    })

    it('returns paginated followers (newest first)', async () => {
      const a = await makeUser()
      const b = await makeUser()
      await followService.create(a.id, b.id) // b follows a
      const r = await followService.listMyFollowers(a.id, 1, 10)
      expect(r.items).toHaveLength(1)
      expect(r.items[0].followerId).toBe(b.id)
      expect(r.items[0].followeeId).toBe(a.id)
    })

    it('paginates correctly', async () => {
      const a = await makeUser()
      for (let i = 0; i < 7; i++) {
        const x = await makeUser()
        await followService.create(x.id, a.id)
      }
      const p1 = await followService.listMyFollowing(a.id, 1, 3)
      const p2 = await followService.listMyFollowing(a.id, 2, 3)
      const p3 = await followService.listMyFollowing(a.id, 3, 3)
      expect(p1.items).toHaveLength(3)
      expect(p2.items).toHaveLength(3)
      expect(p3.items).toHaveLength(1)
      expect([p1.total, p2.total, p3.total]).toEqual([7, 7, 7])
    })
  })

  // ─── listUserFollowing / listUserFollowers (public) ─────────────────────
  describe('listUserFollowing / listUserFollowers (public)', () => {
    it('returns empty list for a missing userId (no existence leak)', async () => {
      const r = await followService.listUserFollowing('does-not-exist', 1, 10)
      expect(r.items).toEqual([])
      expect(r.total).toBe(0)
    })

    it('returns empty list for a userId who follows nobody', async () => {
      const a = await makeUser()
      const r = await followService.listUserFollowing(a.id, 1, 10)
      expect(r.items).toEqual([])
    })

    it("lists a target user's followers publicly", async () => {
      const a = await makeUser()
      const b = await makeUser()
      await followService.create(a.id, b.id) // b follows a
      const r = await followService.listUserFollowers(a.id, 1, 10)
      expect(r.items).toHaveLength(1)
      expect(r.items[0].followerId).toBe(b.id)
    })
  })
})
