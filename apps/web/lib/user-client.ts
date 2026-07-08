import type { MeResponse, UpdateMeInput } from "@universal-healthcare/shared"
import { apiFetch, authHeaders } from "./api-client"

export function getMe(token: string): Promise<MeResponse> {
  return apiFetch<MeResponse>("/api/users/me", {
    headers: authHeaders(token),
  })
}

export function updateMe(
  token: string,
  input: UpdateMeInput
): Promise<{ ok: boolean }> {
  return apiFetch<{ ok: boolean }>("/api/users/me", {
    method: "PATCH",
    headers: authHeaders(token),
    body: JSON.stringify(input),
  })
}


