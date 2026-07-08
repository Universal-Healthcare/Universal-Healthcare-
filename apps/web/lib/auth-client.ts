import type {
  AuthResponse,
  ForgotPasswordInput,
  LoginInput,
  RegisterInput,
  ResendVerificationInput,
  ResetPasswordInput,
  VerifyEmailInput,
} from "@universal-healthcare/shared"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"

export class AuthApiError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "AuthApiError"
  }
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })

  const data: unknown = await response.json().catch(() => null)

  if (!response.ok) {
    const message =
      data &&
      typeof data === "object" &&
      "error" in data &&
      data.error &&
      typeof data.error === "object" &&
      "message" in data.error &&
      typeof data.error.message === "string"
        ? data.error.message
        : "Something went wrong. Please try again."

    throw new AuthApiError(message)
  }

  return data as T
}

export function registerUser(input: RegisterInput): Promise<AuthResponse> {
  return postJson<AuthResponse>("/api/auth/register", input)
}

export function loginUser(input: LoginInput): Promise<AuthResponse> {
  return postJson<AuthResponse>("/api/auth/login", input)
}

export function refreshTokens(refreshToken: string): Promise<AuthResponse> {
  return postJson<AuthResponse>("/api/auth/refresh", { refreshToken })
}

export async function logoutUser(refreshToken: string | undefined): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/auth/logout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(refreshToken ? { refreshToken } : {}),
  })
  if (!response.ok && response.status !== 204) {
    // best-effort logout: ignore errors so the local session is always cleared
  }
}

export function verifyEmail(input: VerifyEmailInput): Promise<{ verified: boolean }> {
  return postJson<{ verified: boolean }>("/api/auth/verify-email", input)
}

export function resendVerification(
  input: ResendVerificationInput
): Promise<{ accepted: boolean }> {
  return postJson<{ accepted: boolean }>("/api/auth/resend-verification", input)
}

export function forgotPassword(
  input: ForgotPasswordInput
): Promise<{ accepted: boolean }> {
  return postJson<{ accepted: boolean }>("/api/auth/forgot-password", input)
}

export function resetPassword(
  input: ResetPasswordInput
): Promise<{ reset: boolean }> {
  return postJson<{ reset: boolean }>("/api/auth/reset-password", input)
}
