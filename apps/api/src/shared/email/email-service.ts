export interface EmailMessage {
  to: string
  subject: string
  text: string
  html: string
}

export interface EmailService {
  send(message: EmailMessage): Promise<void>
}

export interface EmailServiceOptions {
  from: string
}

let instance: EmailService | null = null

export function setEmailService(service: EmailService): void {
  instance = service
}

export function getEmailService(): EmailService {
  if (!instance) {
    throw new Error(
      'EmailService is not configured. Call setEmailService() during app bootstrap (see server.ts).'
    )
  }
  return instance
}

export function resetEmailServiceForTest(): void {
  instance = null
}
