import type {
  AuthResponse,
  LoginInput,
  RegisterInput,
} from '@universal-healthcare/shared'
import { ApiError, apiFetch } from './api-client'

export class AuthApiError extends ApiError {
  constructor(status: number, message: string) {
    super(status, message)
    this.name = 'AuthApiError'
  }
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  try {
    return await apiFetch<T>(path, {
      method: 'POST',
      body: JSON.stringify(body),
    })
  } catch (error) {
    if (error instanceof ApiError) {
      throw new AuthApiError(error.status, error.message)
    }
    throw new AuthApiError(0, 'Unable to connect. Check your network.')
  }
}

export function registerUser(input: RegisterInput): Promise<AuthResponse> {
  return postJson<AuthResponse>('/api/auth/register', input)
}

export function loginUser(input: LoginInput): Promise<AuthResponse> {
  return postJson<AuthResponse>('/api/auth/login', input)
}

export function refreshTokens(refreshToken: string): Promise<AuthResponse> {
  return postJson<AuthResponse>('/api/auth/refresh', { refreshToken })
}

export async function logoutUser(
  refreshToken: string | undefined
): Promise<void> {
  try {
    await apiFetch('/api/auth/logout', {
      method: 'POST',
      body: JSON.stringify(refreshToken ? { refreshToken } : {}),
    })
  } catch {
    // best-effort logout: ignore errors so the local session is always cleared
  }
}
