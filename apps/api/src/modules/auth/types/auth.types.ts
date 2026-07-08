import {
  toCreatorResponse,
  type CreatorProfile,
} from "../../creators/types/creator.types.js"
import {
  toFanResponse,
  type FanProfile,
} from "../../fans/types/fan.types.js"
import type { User } from "../../users/types/user.types.js"

export interface AuthUserResponse {
  id: string
  email: string
  emailVerified: boolean
  role: "creator" | "fan"
  createdAt: string
  updatedAt: string
}

export interface IssuedTokenPair {
  accessToken: string
  refreshToken: string
  refreshTokenId: string
  refreshTokenExpiresAt: Date
}

export interface TokenPair {
  accessToken: string
  refreshToken: string
  refreshTokenExpiresAt: string
}

export type AuthResult = {
  user: AuthUserResponse
  tokens: TokenPair
  profile: ReturnType<typeof toCreatorResponse> | ReturnType<typeof toFanResponse> | null
}

export function toAuthUserResponse(
  user: Pick<User, "id" | "email" | "emailVerified" | "createdAt" | "updatedAt">,
  role: "creator" | "fan"
): AuthUserResponse {
  return {
    id: user.id,
    email: user.email,
    emailVerified: user.emailVerified,
    role,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  }
}

export function toTokenPair(t: IssuedTokenPair): TokenPair {
  return {
    accessToken: t.accessToken,
    refreshToken: t.refreshToken,
    refreshTokenExpiresAt: t.refreshTokenExpiresAt.toISOString(),
  }
}

// Re-export profile types so consumers can import them from one place.
export type { CreatorProfile, FanProfile }
