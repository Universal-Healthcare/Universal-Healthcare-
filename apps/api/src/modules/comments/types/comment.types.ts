import type { CommentResponse } from '@universal-healthcare/shared'

// ─────────────────────────────────────────────────────────────────────────────
//  Internal types — DB-layer representation.
//  `createdAt` / `updatedAt` are Date objects; the DTO conversion emits ISO.
// ─────────────────────────────────────────────────────────────────────────────

export interface Comment {
  id: string
  userId: string
  playlistId: string
  parentId: string | null
  body: string
  createdAt: Date
  updatedAt: Date
}

// ─────────────────────────────────────────────────────────────────────────────
//  Service-layer inputs (NOT Zod-inferred — Zod lives in `validation/comment.ts`).
//  The playlistId arrives via URL params, the userId arrives via requireAuth.
// ─────────────────────────────────────────────────────────────────────────────

export interface CreateCommentPayload {
  playlistId: string
  parentId: string | null
  body: string
}

export interface UpdateCommentPayload {
  body: string
}

// ─────────────────────────────────────────────────────────────────────────────
//  DTO conversion — internal (Date) → public DTO (ISO string).
// ─────────────────────────────────────────────────────────────────────────────

export function toCommentResponse(c: Comment): CommentResponse {
  return {
    id: c.id,
    userId: c.userId,
    playlistId: c.playlistId,
    parentId: c.parentId,
    body: c.body,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  }
}
