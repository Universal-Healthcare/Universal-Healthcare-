import type { PaginationMeta } from './pagination.js'

// ─────────────────────────────────────────────────────────────────────────────
//  Response shapes (sent by the api → web/mobile clients).
//  `*At` fields are ISO-8601 strings, never Date — clients deserialize manually.
// ─────────────────────────────────────────────────────────────────────────────

export interface CommentResponse {
  id: string
  userId: string
  playlistId: string
  parentId: string | null
  body: string
  createdAt: string
  updatedAt: string
}

// ─────────────────────────────────────────────────────────────────────────────
//  Request payloads (sent by web/mobile clients, parsed by the api).
// ─────────────────────────────────────────────────────────────────────────────

export interface CreateCommentRequest {
  parentId?: string
  body: string
}

export interface UpdateCommentRequest {
  body?: string
}

// ─────────────────────────────────────────────────────────────────────────────
//  Envelope used by GET /api/comments?playlistId=…
// ─────────────────────────────────────────────────────────────────────────────

export interface ListCommentsResponse {
  data: CommentResponse[]
  pagination: PaginationMeta
}
