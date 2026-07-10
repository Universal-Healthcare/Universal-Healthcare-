import { apiFetch } from './api-client'

export interface CreatorProfile {
  id: string
  userId: string
  displayName: string
  slug: string
  bio: string | null
  avatarUrl: string | null
  genre: string | null
  location: string | null
  isVerified: boolean
  createdAt: string
  updatedAt: string
}

export function getCreatorBySlug(slug: string): Promise<CreatorProfile> {
  return apiFetch<CreatorProfile>(`/api/creators/${encodeURIComponent(slug)}`)
}
