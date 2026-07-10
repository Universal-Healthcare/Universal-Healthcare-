import { z } from 'zod'

export const createFanProfileSchema = z.object({
  displayName: z.string().min(1).max(80),
  avatarUrl: z.string().url().nullable().optional(),
  genrePrefs: z.array(z.string().min(1).max(40)).max(50).default([]),
})

export const updateFanProfileSchema = z.object({
  displayName: z.string().min(1).max(80).optional(),
  avatarUrl: z.string().url().nullable().optional(),
})

export const setGenrePrefsSchema = z.object({
  genrePrefs: z.array(z.string().min(1).max(40)).max(50),
})

export type CreateFanProfileBody = z.infer<typeof createFanProfileSchema>
export type UpdateFanProfileBody = z.infer<typeof updateFanProfileSchema>
export type SetGenrePrefsBody = z.infer<typeof setGenrePrefsSchema>
