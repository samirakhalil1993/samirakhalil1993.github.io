import type { Page } from '@playwright/test'

/** The address the built test site sends chat questions to (frontend/.env.e2e). */
export const CHAT_URL = 'http://127.0.0.1:8123/api/chat'

/** The fixed answer of the stand-in model (backend/app/providers/fake.py). */
export const FAKE_ANSWER = 'This is a test answer from the stand-in model. No real AI was asked.'

export const isPhone = (page: Page) => (page.viewportSize()?.width ?? 1280) < 768

export async function openChat(page: Page) {
  await page.getByRole('button', { name: 'Open chat' }).click()
  return page.getByRole('dialog', { name: 'Ask about Samir' })
}
