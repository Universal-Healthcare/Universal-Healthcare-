import type { FollowResponse } from '@universal-healthcare/shared'

// ─────────────────────────────────────────────────────────────────────────────
//  Internal types — DB-layer representation.
//  `createdAt` / `updatedAt` are Date objects; the DTO conversion emits ISO.
// ─────────────────────────────────────────────────────────────────────────────

export interface Follow {
  id: string
  followerId: string
  followeeId: string
  createdAt: Date
  updatedAt: Date
}

// ─────────────────────────────────────────────────────────────────────────────
//  DTO conversion — internal (Date) → public DTO (ISO string).
// ─────────────────────────────────────────────────────────────────────────────

export function toFollowResponse(f: Follow): FollowResponse {
  return {
    id: f.id,
    followerId: f.followerId,
    followeeId: f.followeeId,
    createdAt: f.createdAt.toISOString(),
    updatedAt: f.updatedAt.toISOString(),
  }
}
