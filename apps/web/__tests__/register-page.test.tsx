import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import RegisterPage from "../app/register/page"
import { AuthProvider } from "../lib/auth-context"

vi.mock("../lib/auth-client", () => ({
  loginUser: vi.fn(),
  registerUser: vi.fn(),
  AuthApiError: class AuthApiError extends Error {},
}))

function renderRegisterPage() {
  return render(
    <AuthProvider>
      <RegisterPage />
    </AuthProvider>
  )
}

describe("RegisterPage", () => {
  it("renders the registration form", () => {
    renderRegisterPage()

    expect(
      screen.getByRole("heading", { name: /create your account/i })
    ).toBeInTheDocument()
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: /create account/i })
    ).toBeInTheDocument()
  })

  it("shows validation errors for a weak password", async () => {
    const user = userEvent.setup()
    renderRegisterPage()

    await user.type(screen.getByLabelText(/email/i), "fan@example.com")
    await user.type(screen.getByLabelText(/password/i), "short")
    await user.click(screen.getByRole("button", { name: /create account/i }))

    expect(
      await screen.findByText(/password must be at least 8 characters/i)
    ).toBeInTheDocument()
  })
})
