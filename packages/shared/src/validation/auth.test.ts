import { describe, expect, it } from "vitest"
import { loginSchema, registerSchema } from "./auth.js"

describe("registerSchema", () => {
  it("accepts a valid email and password", () => {
    const result = registerSchema.safeParse({
      email: "Fan@Example.com",
      password: "password1",
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.email).toBe("fan@example.com")
    }
  })

  it("rejects an invalid email", () => {
    const result = registerSchema.safeParse({
      email: "not-an-email",
      password: "password1",
    })

    expect(result.success).toBe(false)
  })

  it("rejects a password without a number", () => {
    const result = registerSchema.safeParse({
      email: "fan@example.com",
      password: "passwordonly",
    })

    expect(result.success).toBe(false)
  })

  it("rejects a password shorter than 8 characters", () => {
    const result = registerSchema.safeParse({
      email: "fan@example.com",
      password: "pass1",
    })

    expect(result.success).toBe(false)
  })
})

describe("loginSchema", () => {
  it("accepts an email and non-empty password", () => {
    const result = loginSchema.safeParse({
      email: "fan@example.com",
      password: "anything",
    })

    expect(result.success).toBe(true)
  })

  it("rejects an empty password", () => {
    const result = loginSchema.safeParse({
      email: "fan@example.com",
      password: "",
    })

    expect(result.success).toBe(false)
  })
})
