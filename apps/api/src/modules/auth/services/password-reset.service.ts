import bcrypt from "bcryptjs"
import { prisma } from "../../../shared/database/prisma.js"
import { env } from "../../../shared/config/env.js"
import { AppError } from "../../../shared/errors/app-error.js"
import { getEmailService } from "../../../shared/email/email-service.js"
import { logger } from "../../../shared/logger/logger.js"
import { userService } from "../../users/services/user.service.js"
import { passwordResetRepository } from "../repositories/password-reset.repository.js"
import { tokenService } from "./token.service.js"

const PASSWORD_SALT_ROUNDS = 10
const HASH_SALT_ROUNDS = 8
const RESET_PATH = "/reset-password"

function buildResetUrl(rawToken: string): string {
  const url = new URL(RESET_PATH, env.APP_URL)
  url.searchParams.set("token", rawToken)
  return url.toString()
}

async function loadUnusedResetTokens() {
  return prisma.passwordResetToken.findMany({
    where: { usedAt: null, expiresAt: { gt: new Date() } },
    select: {
      id: true,
      userId: true,
      tokenHash: true,
      expiresAt: true,
      usedAt: true,
      createdAt: true,
    },
  })
}

export const passwordResetService = {
  async request(email: string): Promise<void> {
    // Never reveal whether the email exists.
    const user = await userService.findByEmail(email)
    if (!user) {
      logger.info("password_reset_request_no_user", { email })
      return
    }

    const rawToken = tokenService.generateOpaqueToken(32)
    const tokenHash = await bcrypt.hash(rawToken, HASH_SALT_ROUNDS)
    const expiresAt = new Date(
      Date.now() + env.PASSWORD_RESET_TTL_MINUTES * 60 * 1000
    )

    await passwordResetRepository.create({ userId: user.id, tokenHash, expiresAt })

    const url = buildResetUrl(rawToken)
    try {
      await getEmailService().send({
        to: user.email,
        subject: "Reset your Universal Healthcare password",
        text: `Reset your password by opening: ${url}`,
        html: `<p>Reset your Universal Healthcare password by opening <a href="${url}">${url}</a>. This link expires in ${env.PASSWORD_RESET_TTL_MINUTES} minutes. If you did not request this, ignore this email.</p>`,
      })
      logger.info("password_reset_email_sent", { userId: user.id })
    } catch (err) {
      logger.error("password_reset_email_failed", {
        userId: user.id,
        err: (err as Error).message,
      })
      throw err
    }
  },

  async consume(rawToken: string, newPassword: string): Promise<void> {
    const candidates = await loadUnusedResetTokens()
    for (const row of candidates) {
      const matches = await bcrypt.compare(rawToken, row.tokenHash)
      if (!matches) continue
      if (row.expiresAt.getTime() < Date.now()) {
        throw new AppError(
          410,
          "RESET_TOKEN_EXPIRED",
          "Reset link has expired; request a new one"
        )
      }
      const user = await userService.findById(row.userId)
      if (!user) {
        throw new AppError(400, "INVALID_RESET_TOKEN", "Reset link is invalid")
      }
      const isSameAsCurrent = await bcrypt.compare(newPassword, user.passwordHash)
      if (isSameAsCurrent) {
        throw new AppError(
          400,
          "PASSWORD_REUSED",
          "New password must be different from the current password"
        )
      }
      const passwordHash = await bcrypt.hash(newPassword, PASSWORD_SALT_ROUNDS)

      await prisma.$transaction([
        prisma.user.update({ where: { id: user.id }, data: { passwordHash } }),
        prisma.passwordResetToken.update({
          where: { id: row.id },
          data: { usedAt: new Date() },
        }),
        // Defensive: rotate out all refresh tokens when the password changes.
        prisma.refreshToken.updateMany({
          where: { userId: user.id, revokedAt: null },
          data: { revokedAt: new Date() },
        }),
      ])

      logger.info("password_reset_complete", { userId: user.id })
      return
    }
    throw new AppError(400, "INVALID_RESET_TOKEN", "Reset link is invalid")
  },
}
