import { logger } from "../logger/logger.js"
import type { EmailMessage, EmailService } from "./email-service.js"

export class ConsoleEmailService implements EmailService {
  private readonly from: string

  constructor(from: string) {
    this.from = from
  }

  async send(message: EmailMessage): Promise<void> {
    logger.info("email_message", {
      from: this.from,
      to: message.to,
      subject: message.subject,
      text: message.text,
      htmlBytes: message.html.length,
    })
  }
}
