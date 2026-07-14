import { z } from 'zod'

// ─────────────────────────────────────────────────────────────────────────────
//  URL param schemas.
// ─────────────────────────────────────────────────────────────────────────────

// `POST/DELETE /api/follows/me/following/:followeeId` — the user being
// followed is in the URL, so the request body is empty.
export const followeeIdParamSchema = z.object({
  followeeId: z.string().min(1),
})

// `GET /api/follows/users/:userId/{following,followers}` — the target
// user's id is in the URL.
export const userIdParamSchema = z.object({
  userId: z.string().min(1),
})
