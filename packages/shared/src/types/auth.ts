export type ActivationRole = "creator" | "fan"

export interface AuthUser {
  id: string
  email: string
  emailVerified: boolean
  role: ActivationRole
  createdAt: string
  updatedAt: string
}

export interface TokenPair {
  accessToken: string
  refreshToken: string
  refreshTokenExpiresAt: string
}

export interface AuthResponse {
  user: AuthUser
  tokens: TokenPair
  profile: unknown | null
}

export interface ApiErrorResponse {
  error: {
    code: string
    message: string
  }
}
