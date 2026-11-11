import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { FAKE_ANSWER, openChat } from './helpers'

const RULES = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

/** A short, readable list of what the scan found. */
const summary = (violations: { id: string; nodes: { target: unknown }[] }[]) =>
  violations.map((violation) => `${violation.id}: ${violation.nodes.map((node) => node.target).join(' | ')}`)

test('the page has no accessibility problems an automatic scan can find', async ({ page }) => {
  await page.goto('/')
  // Sections fade in as they scroll into view; scan them in their final state.
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.reload()
  const results = await new AxeBuilder({ page }).withTags(RULES).analyze()
  expect(summary(results.violations)).toEqual([])
})

test('the open chat with an answer has none either', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  const chat = await openChat(page)
  await chat.getByLabel('Your question').fill('What projects has Samir worked on?')
  await chat.getByLabel('Your question').press('Enter')
  await expect(chat.getByRole('log').getByText(FAKE_ANSWER)).toBeVisible()
  const results = await new AxeBuilder({ page }).withTags(RULES).analyze()
  expect(summary(results.violations)).toEqual([])
})

test('the open CV window has none either', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  await page.getByRole('button', { name: 'Preview CV' }).click()
  await expect(page.getByRole('dialog', { name: 'CV' })).toBeVisible()
  // The PDF viewer inside the frame belongs to the browser, not to the site.
  const results = await new AxeBuilder({ page }).withTags(RULES).exclude('iframe').analyze()
  expect(summary(results.violations)).toEqual([])
})
