import { z } from 'zod'

const COMMENT_BODY_MAX = 2000

// ─────────────────────────────────────────────────────────────────────────────
//  Body schemas (POST /api/comments/playlists/:playlistId)
// ─────────────────────────────────────────────────────────────────────────────

export const createCommentSchema = z.object({
  // parentId is optional. If present, the parent MUST belong to the same
  // playlist — that cross-field check lives in the service layer (we don't
  // know the playlistId yet at the Zod stage).
  parentId: z.string().min(1).optional(),
  body: z
    .string()
    .min(1, 'Comment body is required')
    .max(
      COMMENT_BODY_MAX,
      `Comment body must be at most ${COMMENT_BODY_MAX} characters`
    ),
})

export type CreateCommentBody = z.infer<typeof createCommentSchema>

// ─────────────────────────────────────────────────────────────────────────────
//  Body schemas (PATCH /api/comments/:id)
// ─────────────────────────────────────────────────────────────────────────────

export const updateCommentSchema = z.object({
  body: z
    .string()
    .min(1, 'Comment body is required')
    .max(
      COMMENT_BODY_MAX,
      `Comment body must be at most ${COMMENT_BODY_MAX} characters`
    ),
})

export type UpdateCommentBody = z.infer<typeof updateCommentSchema>

// ─────────────────────────────────────────────────────────────────────────────
//  URL param schemas.
// ─────────────────────────────────────────────────────────────────────────────

export const commentIdParamSchema = z.object({
  id: z.string().min(1),
})
