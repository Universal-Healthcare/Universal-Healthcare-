import type { NextFunction, Request, Response } from 'express'
import { authService } from '../services/auth.service.js'
import { emailVerificationService } from '../services/email-verification.service.js'
import { passwordResetService } from '../services/password-reset.service.js'
import {
  forgotPasswordSchema,
  loginSchema,
  refreshSchema,
  registerSchema,
  resendVerificationSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from '../validators/auth.validators.js'

export const authController = {
  async register(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const input = registerSchema.parse(req.body)
      const result = await authService.register(input)
      res.status(201).json(result)
    } catch (err) {
      next(err)
    }
  },

  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = loginSchema.parse(req.body)
      const result = await authService.login(input)
      res.status(200).json(result)
    } catch (err) {
      next(err)
    }
  },

  async refresh(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const input = refreshSchema.parse(req.body)
      const result = await authService.refresh(input.refreshToken)
      res.status(200).json(result)
    } catch (err) {
      next(err)
    }
  },

  async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const refreshToken =
        typeof req.body?.refreshToken === 'string'
          ? (req.body.refreshToken as string)
          : undefined
      await authService.logout(refreshToken)
      res.status(204).end()
    } catch (err) {
      next(err)
    }
  },

  async verifyEmail(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const input = verifyEmailSchema.parse(req.body)
      await emailVerificationService.consume(input.token)
      res.status(200).json({ verified: true })
    } catch (err) {
      next(err)
    }
  },

  async resendVerification(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const input = resendVerificationSchema.parse(req.body)
      await emailVerificationService.resend(input.email)
      // Always 202: never reveal whether the email exists.
      res.status(202).json({ accepted: true })
    } catch (err) {
      next(err)
    }
  },

  async forgotPassword(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const input = forgotPasswordSchema.parse(req.body)
      await passwordResetService.request(input.email)
      // Always 202: never reveal whether the email exists.
      res.status(202).json({ accepted: true })
    } catch (err) {
      next(err)
    }
  },

  async resetPassword(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const input = resetPasswordSchema.parse(req.body)
      await passwordResetService.consume(input.token, input.newPassword)
      res.status(200).json({ reset: true })
    } catch (err) {
      next(err)
    }
  },
}
