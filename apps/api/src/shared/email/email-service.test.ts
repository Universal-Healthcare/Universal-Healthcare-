import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { logger } from '../logger/logger.js'
import { ConsoleEmailService } from './console-email-service.js'
import {
  getEmailService,
  resetEmailServiceForTest,
  setEmailService,
} from './email-service.js'

describe('EmailService', () => {
  beforeEach(() => {
    resetEmailServiceForTest()
  })

  afterEach(() => {
    resetEmailServiceForTest()
  })

  it('throws if no service is configured', () => {
    expect(() => getEmailService()).toThrow(/not configured/i)
  })

  it('returns the configured instance after setEmailService', () => {
    const svc = new ConsoleEmailService('noreply@test.example')
    setEmailService(svc)
    expect(getEmailService()).toBe(svc)
  })

  it('ConsoleEmailService logs a structured email_message entry', async () => {
    const spy = vi.spyOn(logger, 'info').mockImplementation(() => undefined)
    const svc = new ConsoleEmailService('noreply@test.example')
    await svc.send({
      to: 'user@test.example',
      subject: 'Welcome',
      text: 'Hi there',
      html: '<p>Hi there</p>',
    })
    expect(spy).toHaveBeenCalledWith(
      'email_message',
      expect.objectContaining({
        from: 'noreply@test.example',
        to: 'user@test.example',
        subject: 'Welcome',
        text: 'Hi there',
      })
    )
    spy.mockRestore()
  })
})
