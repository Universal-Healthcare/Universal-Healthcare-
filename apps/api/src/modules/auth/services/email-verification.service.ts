import bcrypt from "bcryptjs"
import { prisma } from "../../../shared/database/prisma.js"
import { env } from "../../../shared/config/env.js"
import { AppError } from "../../../shared/errors/app-error.js"
import { getEmailService } from "../../../shared/email/email-service.js"
import { logger } from "../../../shared/logger/logger.js"
import { userService } from "../../users/services/user.service.js"
import { emailVerificationRepository } from "../repositories/email-verification.repository.js"
import { tokenService } from "./token.service.js"

const HASH_SALT_ROUNDS = 8 // for hashed tokens; doesn't need bcrypt's full cost
const VERIFICATION_PATH = "/verify-email"

function buildVerificationUrl(rawToken: string): string {
  const url = new URL(VERIFICATION_PATH, env.APP_URL)
  url.searchParams.set("token", rawToken)
  return url.toString()
}

async function loadUnusedTokens() {
  return prisma.emailVerificationToken.findMany({
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

export const emailVerificationService = {
  async issueAndSend(userId: string, email: string): Promise<void> {
    const rawToken = tokenService.generateOpaqueToken(32)
    const tokenHash = await bcrypt.hash(rawToken, HASH_SALT_ROUNDS)
    const expiresAt = new Date(
      Date.now() + env.EMAIL_VERIFICATION_TTL_HOURS * 60 * 60 * 1000
    )

    await emailVerificationRepository.create({ userId, tokenHash, expiresAt })

    const url = buildVerificationUrl(rawToken)
    try {
      await getEmailService().send({
        to: email,
        subject: "Verify your Universal Healthcare email",
        text: `Welcome to Universal Healthcare. Confirm your email by opening: ${url}`,
        html: `<p>Welcome to Universal Healthcare.</p><p>Confirm your email by opening <a href="${url}">${url}</a>. This link expires in ${env.EMAIL_VERIFICATION_TTL_HOURS} hours.</p>`,
      })
      logger.info("email_verification_sent", { userId, to: email })
    } catch (err) {
      logger.error("email_verification_send_failed", {
        userId,
        to: email,
        err: (err as Error).message,
      })
      throw err
    }
  },

  async consume(rawToken: string): Promise<{ userId: string }> {
    // Scan unused tokens to find a bcrypt match. For the volume we expect,
    // the scan is fine; if this becomes hot, add a (userId, token) lookup
    // where the client sends userId + token.
    const candidates = await loadUnusedTokens()
    for (const row of candidates) {
      const matches = await bcrypt.compare(rawToken, row.tokenHash)
      if (!matches) continue
      if (row.expiresAt.getTime() < Date.now()) {
        throw new AppError(
          410,
          "VERIFICATION_TOKEN_EXPIRED",
          "Verification link has expired; request a new one"
        )
      }
      await emailVerificationRepository.markUsed(row.id)
      await userService.markEmailVerified(row.userId)
      logger.info("email_verified", { userId: row.userId })
      return { userId: row.userId }
    }
    throw new AppError(
      400,
      "INVALID_VERIFICATION_TOKEN",
      "Verification link is invalid"
    )
  },

  async resend(email: string): Promise<void> {
    const user = await userService.findByEmail(email)
    if (!user) return // never reveal whether the email exists
    if (user.emailVerified) return // nothing to do
    await emailVerificationRepository.revokeUnusedForUser(user.id)
    await this.issueAndSend(user.id, user.email)
  },
}
