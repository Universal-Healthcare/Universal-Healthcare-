import { Router } from "express"
import { authController } from "../controllers/auth.controller.js"

export const authRouter: Router = Router()

authRouter.post("/register", authController.register)
authRouter.post("/login", authController.login)
authRouter.post("/refresh", authController.refresh)
authRouter.post("/logout", authController.logout)
authRouter.post("/verify-email", authController.verifyEmail)
authRouter.post("/resend-verification", authController.resendVerification)
authRouter.post("/forgot-password", authController.forgotPassword)
authRouter.post("/reset-password", authController.resetPassword)
