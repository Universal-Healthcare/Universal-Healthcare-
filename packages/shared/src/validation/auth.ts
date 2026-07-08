import { z } from "zod"

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters long")
  .regex(/[A-Za-z]/, "Password must contain at least one letter")
  .regex(/[0-9]/, "Password must contain at least one number")

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("Enter a valid email address")

const displayNameSchema = z
  .string()
  .min(2, "Display name must be at least 2 characters")
  .max(80, "Display name must be at most 80 characters")

// Single profile shape (not a union) so unknown fields are NOT silently
// stripped. superRefine enforces the role-specific rules below.
const profileSchema = z
  .object({
    bio: z.string().max(300, "Bio must be at most 300 characters").optional(),
    genre: z
      .string()
      .max(50, "Genre must be at most 50 characters")
      .optional(),
    location: z
      .string()
      .max(100, "Location must be at most 100 characters")
      .optional(),
    genrePrefs: z
      .array(z.string().max(30, "Each genre preference must be at most 30 characters"))
      .max(20, "You can have at most 20 genre preferences")
      .optional(),
  })
  .optional()

export const registerSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    role: z.enum(["creator", "fan"]),
    displayName: displayNameSchema,
    profile: profileSchema,
  })
  .superRefine((val, ctx) => {
    if (val.role === "creator") {
      if (val.profile?.genrePrefs && val.profile.genrePrefs.length > 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["profile", "genrePrefs"],
          message: "Creator profile does not accept genrePrefs",
        })
      }
    } else {
      // fan
      const forbidden = ["bio", "genre", "location"] as const
      for (const key of forbidden) {
        if (val.profile && val.profile[key] !== undefined) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["profile", key],
            message: `Fan profile does not accept ${key}`,
          })
        }
      }
    }
  })

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
})

export const refreshSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token is required"),
})

export const verifyEmailSchema = z.object({
  token: z.string().min(1, "Verification token is required"),
})

export const resendVerificationSchema = z.object({
  email: emailSchema,
})

export const forgotPasswordSchema = z.object({
  email: emailSchema,
})

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Reset token is required"),
  newPassword: passwordSchema,
})

export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type RefreshInput = z.infer<typeof refreshSchema>
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>
export type ResendVerificationInput = z.infer<typeof resendVerificationSchema>
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>
