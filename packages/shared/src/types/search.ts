import type { PaginationMeta } from './pagination.js'

// ─────────────────────────────────────────────────────────────────────────────
//  Search hit type discriminator — validated at the api boundary by
//  `searchTypeSchema` in `validation/search.ts`. A future search target
//  (e.g. `track`) would extend this union.
// ─────────────────────────────────────────────────────────────────────────────

export type SearchHitType = 'creator' | 'playlist' | 'comment'

interface SearchHitBase {
  /** Discriminator. Use `switch (hit.type)` to narrow. */
  type: SearchHitType
  /**
   * Higher = more relevant. Computed in `searchService.search` from a
   * deterministic JS-side formula (exact match > prefix > substring;
   * title/displayName matches weigh more than body/bio). Clients should
   * sort by this if they re-render, but the server response is already
   * sorted.
   */
  score: number
  /**
   * Which fields contributed to the score, in the order they were matched.
   * Useful for highlighting in the UI (e.g. show why this row was returned).
   * Currently informational only — not consumed by clients yet.
   */
  matchedFields: string[]
}

// ─────────────────────────────────────────────────────────────────────────────
//  Per-type hit variants. The internal `*SearchHit` shapes in
//  `apps/api/src/modules/search/types/search.types.ts` are converted to these
//  DTOs by `toSearchHitResponse` in the same file.
// ─────────────────────────────────────────────────────────────────────────────

export interface CreatorSearchHitResponse extends SearchHitBase {
  type: 'creator'
  id: string
  userId: string
  displayName: string
  slug: string
  bio: string | null
  genre: string | null
  location: string | null
  isVerified: boolean
  avatarUrl: string | null
  createdAt: string
}

export interface PlaylistSearchHitResponse extends SearchHitBase {
  type: 'playlist'
  id: string
  userId: string
  title: string
  isPublic: boolean
  trackCount: number
  createdAt: string
}

export interface CommentSearchHitResponse extends SearchHitBase {
  type: 'comment'
  id: string
  userId: string
  playlistId: string
  parentId: string | null
  body: string
  createdAt: string
}

export type SearchHitResponse =
  | CreatorSearchHitResponse
  | PlaylistSearchHitResponse
  | CommentSearchHitResponse

// ─────────────────────────────────────────────────────────────────────────────
//  Paginated envelope — same shape as the rest of the api (creators list,
//  comments list, follows list, notifications list).
// ─────────────────────────────────────────────────────────────────────────────

export interface SearchResponse {
  data: SearchHitResponse[]
  pagination: PaginationMeta
}
