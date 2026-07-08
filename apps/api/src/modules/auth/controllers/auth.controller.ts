import type { NextFunction, Request, Response } from "express"
import { authService } from "../services/auth.service.js"
import { loginSchema, registerSchema } from "../validators/auth.validators.js"

export const authController = {
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = registerSchema.parse(req.body)
      const result = await authService.register(input)
      res.status(201).json(result)
    } catch (error) {
      next(error)
    }
  },

  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = loginSchema.parse(req.body)
      const result = await authService.login(input)
      res.status(200).json(result)
    } catch (error) {
      next(error)
    }
  },
}
