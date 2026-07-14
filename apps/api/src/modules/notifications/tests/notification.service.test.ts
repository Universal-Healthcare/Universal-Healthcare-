import { describe, it, expect } from 'vitest'
import { prisma } from '../../../shared/database/prisma.js'
import { notificationService } from '../services/notification.service.js'

// ─── helpers ────────────────────────────────────────────────────────────────

let userCounter = 0
async function makeUser(): Promise<{ id: string }> {
  userCounter += 1
  const u = await prisma.user.create({
    data: {
      email: `n-u${userCounter}-${Date.now()}-${Math.random().toString(36).slice(2)}@e.com`,
      passwordHash: 'x',
    },
  })
  return { id: u.id }
}

async function makeNotification(
  recipientId: string,
  actorId: string | null = null,
  read = false
) {
  return prisma.notification.create({
    data: {
      recipientId,
      actorId,
      type: 'follow',
      entityType: 'follow',
      entityId: 'fixture-entity',
      read,
    },
  })
}

// ─── tests ──────────────────────────────────────────────────────────────────

describe('notificationService', () => {
  // ─── listMine ─────────────────────────────────────────────────────────────
  describe('listMine', () => {
    it('returns paginated newest-first', async () => {
      const u = await makeUser()
      for (let i = 0; i < 5; i++) {
        await makeNotification(u.id)
      }
      const r = await notificationService.listMine(u.id, 1, 3)
      expect(r.items).toHaveLength(3)
      expect(r.total).toBe(5)
    })

    it('returns empty list when there are no notifications', async () => {
      const u = await makeUser()
      const r = await notificationService.listMine(u.id, 1, 10)
      expect(r.items).toEqual([])
      expect(r.total).toBe(0)
    })

    it('only lists notifications addressed to the caller', async () => {
      const mine = await makeUser()
      const other = await makeUser()
      await makeNotification(mine.id)
      await makeNotification(other.id)
      const r = await notificationService.listMine(mine.id, 1, 10)
      expect(r.items).toHaveLength(1)
      expect(r.items[0].recipientId).toBe(mine.id)
    })
  })

  // ─── markRead ─────────────────────────────────────────────────────────────
  describe('markRead', () => {
    it('owner flips read=true', async () => {
      const u = await makeUser()
      const n = await makeNotification(u.id)
      const updated = await notificationService.markRead(n.id, u.id)
      expect(updated.read).toBe(true)
    })

    it('non-owner gets 403', async () => {
      const owner = await makeUser()
      const intruder = await makeUser()
      const n = await makeNotification(owner.id)
      await expect(
        notificationService.markRead(n.id, intruder.id)
      ).rejects.toMatchObject({ statusCode: 403, code: 'FORBIDDEN' })
    })

    it('404 when missing', async () => {
      const u = await makeUser()
      await expect(
        notificationService.markRead('does-not-exist', u.id)
      ).rejects.toMatchObject({
        statusCode: 404,
        code: 'NOTIFICATION_NOT_FOUND',
      })
    })
  })

  // ─── markAllRead ──────────────────────────────────────────────────────────
  describe('markAllRead', () => {
    it('marks all of recipientId unread → read', async () => {
      const u = await makeUser()
      for (let i = 0; i < 4; i++) {
        await makeNotification(u.id)
      }
      const { count } = await notificationService.markAllRead(u.id)
      expect(count).toBe(4)
      const unread = await prisma.notification.count({
        where: { recipientId: u.id, read: false },
      })
      expect(unread).toBe(0)
    })

    it('does not affect other users (recipient-scoped)', async () => {
      const mine = await makeUser()
      const theirs = await makeUser()
      await makeNotification(mine.id)
      await makeNotification(theirs.id)
      await notificationService.markAllRead(mine.id)
      const stillUnread = await prisma.notification.count({
        where: { recipientId: theirs.id, read: false },
      })
      expect(stillUnread).toBe(1)
    })
  })

  // ─── delete ───────────────────────────────────────────────────────────────
  describe('delete', () => {
    it('owner deletes', async () => {
      const u = await makeUser()
      const n = await makeNotification(u.id)
      await notificationService.delete(n.id, u.id)
      const remaining = await prisma.notification.count({ where: { id: n.id } })
      expect(remaining).toBe(0)
    })

    it('non-owner gets 403', async () => {
      const owner = await makeUser()
      const intruder = await makeUser()
      const n = await makeNotification(owner.id)
      await expect(
        notificationService.delete(n.id, intruder.id)
      ).rejects.toMatchObject({ statusCode: 403, code: 'FORBIDDEN' })
    })
  })

  // ─── emit (side-effect entry-point used by followService / commentService) ─
  describe('emit', () => {
    it('creates a follow notification', async () => {
      const actor = await makeUser()
      const recipient = await makeUser()
      const n = await notificationService.emit({
        recipientId: recipient.id,
        actorId: actor.id,
        type: 'follow',
        entityType: 'follow',
        entityId: 'fixture-follow-id',
      })
      expect(n.recipientId).toBe(recipient.id)
      expect(n.actorId).toBe(actor.id)
      expect(n.type).toBe('follow')
      expect(n.entityType).toBe('follow')
      expect(n.read).toBe(false)
    })

    it('creates a comment_reply notification with null actor (system)', async () => {
      const recipient = await makeUser()
      const n = await notificationService.emit({
        recipientId: recipient.id,
        actorId: null,
        type: 'comment_reply',
        entityType: 'comment',
        entityId: 'fixture-comment-id',
      })
      expect(n.actorId).toBeNull()
      expect(n.type).toBe('comment_reply')
      expect(n.entityType).toBe('comment')
    })
  })

  // ─── actor SetNull vs recipient Cascade (asymmetric delete semantics) ────
  describe('delete semantics', () => {
    it('row stays alive with actorId=null when the actor is hard-deleted', async () => {
      const actor = await makeUser()
      const recipient = await makeUser()
      const n = await notificationService.emit({
        recipientId: recipient.id,
        actorId: actor.id,
        type: 'follow',
        entityType: 'follow',
        entityId: 'fixture-follow-id',
      })
      await prisma.user.delete({ where: { id: actor.id } })
      const after = await prisma.notification.findUnique({
        where: { id: n.id },
      })
      expect(after).not.toBeNull()
      expect(after!.actorId).toBeNull()
      expect(after!.recipientId).toBe(recipient.id)
    })

    it('recipient delete cascades and removes the notification', async () => {
      const actor = await makeUser()
      const recipient = await makeUser()
      const n = await notificationService.emit({
        recipientId: recipient.id,
        actorId: actor.id,
        type: 'follow',
        entityType: 'follow',
        entityId: 'fixture-follow-id',
      })
      await prisma.user.delete({ where: { id: recipient.id } })
      const after = await prisma.notification.findUnique({
        where: { id: n.id },
      })
      expect(after).toBeNull()
    })
  })
})
