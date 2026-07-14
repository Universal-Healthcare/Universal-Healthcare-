import { AppError } from '../../../shared/errors/app-error.js'
import { notificationRepository } from '../repositories/notification.repository.js'
import type { Notification } from '../types/notification.types.js'

export interface NotificationListResult {
  items: Notification[]
  total: number
  page: number
  pageSize: number
}

export const notificationService = {
  async listMine(
    requestingUserId: string,
    page: number,
    pageSize: number
  ): Promise<NotificationListResult> {
    const { items, total } = await notificationRepository.listForRecipient(
      requestingUserId,
      page,
      pageSize
    )
    return { items, total, page, pageSize }
  },

  async markRead(id: string, requestingUserId: string): Promise<Notification> {
    const notification = await notificationRepository.findById(id)
    if (!notification) {
      throw new AppError(
        404,
        'NOTIFICATION_NOT_FOUND',
        'Notification not found'
      )
    }
    if (notification.recipientId !== requestingUserId) {
      throw new AppError(
        403,
        'FORBIDDEN',
        'You do not have permission to modify this notification'
      )
    }
    return notificationRepository.markRead(id)
  },

  async markAllRead(requestingUserId: string): Promise<{ count: number }> {
    return notificationRepository.markAllRead(requestingUserId)
  },

  async delete(id: string, requestingUserId: string): Promise<void> {
    const notification = await notificationRepository.findById(id)
    if (!notification) {
      throw new AppError(
        404,
        'NOTIFICATION_NOT_FOUND',
        'Notification not found'
      )
    }
    if (notification.recipientId !== requestingUserId) {
      throw new AppError(
        403,
        'FORBIDDEN',
        'You do not have permission to delete this notification'
      )
    }
    await notificationRepository.delete(id)
  },

  // ─────────────────────────────────────────────────────────────────────────
  //  Side-effect entry-point.
  //  Called from `followService.create` (type='follow') and the reply branch
  //  of `commentService.create` (type='comment_reply'). Callers wrap this in
  //  try/catch so a failure here does NOT roll back the core create.
  //
  //  This is a sequential side-effect, NOT cross-service $transaction
  //  (\u00a72 — see docs/decisions/0001-modular-monolith.md: all DB writes go
  //  through the repository).
  // ─────────────────────────────────────────────────────────────────────────
  async emit(input: {
    recipientId: string
    actorId: string | null
    type: 'follow' | 'comment_reply'
    entityType: 'follow' | 'comment'
    entityId: string
  }): Promise<Notification> {
    return notificationRepository.emit(input)
  },
}
