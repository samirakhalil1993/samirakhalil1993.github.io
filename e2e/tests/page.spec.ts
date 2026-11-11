import { expect, test } from '@playwright/test'
import { isPhone } from './helpers'

const SECTIONS = ['home', 'about', 'skills', 'projects', 'education', 'experience', 'contact']
const LABELS = ['Home', 'About', 'Skills', 'Projects', 'Education', 'Experience', 'Contact']

test('the page loads without errors and shows every section', async ({ page }) => {
  const problems: string[] = []
  page.on('pageerror', (error) => problems.push(String(error)))
  page.on('console', (message) => {
    if (message.type() === 'error') problems.push(message.text())
  })
  page.on('requestfailed', (request) => problems.push(`failed: ${request.url()}`))

  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Samir Akhalil')
  for (const id of SECTIONS) await expect(page.locator(`main > section#${id}`)).toBeVisible()
  await page.waitForLoadState('networkidle')
  expect(problems).toEqual([])
})

test('the page wakes the backend when it loads', async ({ page }) => {
  const health = page.waitForResponse((response) => response.url().endsWith('/api/health'))
  await page.goto('/')
  expect((await health).status()).toBe(200)
})

test('each navigation link goes to its section and is marked as the current one', async ({ page }) => {
  test.skip(isPhone(page), 'the phone menu has its own test')
  await page.goto('/')
  const nav = page.getByRole('navigation', { name: 'Main' })

  for (const [index, label] of LABELS.entries()) {
    await nav.getByRole('link', { name: label, exact: true }).click()
    await expect(page).toHaveURL(new RegExp(`#${SECTIONS[index]}$`))
    await expect(nav.getByRole('link', { name: label, exact: true })).toHaveAttribute('aria-current', 'true')
    await expect(nav.locator('[aria-current="true"]')).toHaveCount(1)
    await expect(page.locator(`#${SECTIONS[index]}`)).toBeInViewport()
  }
})

test('a link straight to a section opens at that section', async ({ page }) => {
  await page.goto('/#contact')
  await expect(page.locator('#contact')).toBeInViewport()
})

test('the phone menu opens, goes to a section and closes', async ({ page }) => {
  test.skip(!isPhone(page), 'phones only')
  await page.goto('/')
  await page.getByRole('button', { name: 'Open menu' }).click()
  const menu = page.getByRole('navigation', { name: 'Mobile' })
  await expect(menu).toBeVisible()

  await menu.getByRole('link', { name: 'Projects', exact: true }).click()
  await expect(page.getByRole('navigation', { name: 'Mobile' })).toBeHidden()
  await expect(page.locator('#projects')).toBeInViewport()
})

test('the page is never wider than the screen', async ({ page }) => {
  await page.goto('/')
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
  expect(overflow).toBeLessThanOrEqual(0)
})

test('a project card opens and closes', async ({ page }) => {
  await page.goto('/')
  const button = page.getByRole('button', { name: /Read more about/ }).first()
  await button.scrollIntoViewIfNeeded()
  await expect(button).toHaveAttribute('aria-expanded', 'false')
  await button.click()

  const opened = page.getByRole('button', { name: /Show less about/ })
  await expect(opened).toHaveCount(1)
  await expect(opened).toHaveAttribute('aria-expanded', 'true')
  await opened.click()
  await expect(page.getByRole('button', { name: /Show less about/ })).toHaveCount(0)
})

test('the CV opens in a window, Escape closes it and focus returns to the button', async ({ page }) => {
  await page.goto('/')
  const preview = page.getByRole('button', { name: 'Preview CV' })
  await preview.click()
  const dialog = page.getByRole('dialog', { name: 'CV' })
  await expect(dialog).toBeVisible()

  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(preview).toBeFocused()
})

test('the CV file is there to download', async ({ page, request }) => {
  await page.goto('/')
  const href = await page.getByRole('link', { name: 'Download CV' }).first().getAttribute('href')
  const response = await request.get(new URL(href!, page.url()).toString())
  expect(response.status()).toBe(200)
  expect(response.headers()['content-type']).toContain('pdf')
})
