export * from "./email-service.js"
export * from "./console-email-service.js"

import { env } from "../config/env.js"
import { ConsoleEmailService } from "./console-email-service.js"
import { setEmailService, type EmailService } from "./email-service.js"

export function buildEmailService(): EmailService {
  if (env.NODE_ENV === "test") {
    const svc = new ConsoleEmailService(env.EMAIL_FROM)
    setEmailService(svc)
    return svc
  }

  const svc = new ConsoleEmailService(env.EMAIL_FROM)
  setEmailService(svc)
  return svc
}
