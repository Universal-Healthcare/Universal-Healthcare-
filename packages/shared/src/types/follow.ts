import type { PaginationMeta } from './pagination.js'

// ─────────────────────────────────────────────────────────────────────────────
//  Response shape returned by the api to web/mobile clients.
//  Dates are ISO-8601 strings, not Date — clients deserialize manually.
// ─────────────────────────────────────────────────────────────────────────────

export interface FollowResponse {
  id: string
  followerId: string
  followeeId: string
  createdAt: string
  updatedAt: string
}

// ─────────────────────────────────────────────────────────────────────────────
//  Paginated envelope used by:
//    GET /api/follows/me/following
//    GET /api/follows/me/followers
//    GET /api/follows/users/:userId/following
//    GET /api/follows/users/:userId/followers
// ─────────────────────────────────────────────────────────────────────────────

export interface ListFollowsResponse {
  data: FollowResponse[]
  pagination: PaginationMeta
}
