import { expect, test } from '@playwright/test'
import { CHAT_URL, FAKE_ANSWER, isPhone, openChat } from './helpers'

test('a suggested question gets an answer with sources from the backend', async ({ page }) => {
  await page.goto('/')
  const chat = await openChat(page)
  await expect(chat.getByText(/written by an AI model/)).toBeVisible()
  await expect(chat.getByText('Demo', { exact: true })).toHaveCount(0)

  await chat.getByRole('button', { name: 'What projects has Samir worked on?' }).click()
  const log = chat.getByRole('log')
  await expect(log.getByText(FAKE_ANSWER)).toBeVisible()

  const sources = chat.getByRole('list', { name: 'Sources' })
  await expect(sources.getByRole('link').first()).toHaveAttribute('href', /^#project-/)
})

test('the answer arrives in pieces, not all at once', async ({ page }) => {
  await page.goto('/')
  const chat = await openChat(page)

  // Record every state of the answer text while it grows.
  await page.evaluate(() => {
    const seen: string[] = []
    ;(window as unknown as { seen: string[] }).seen = seen
    new MutationObserver(() => {
      const answers = document.querySelectorAll('[role="log"] li')
      const text = answers[answers.length - 1]?.textContent ?? ''
      if (seen[seen.length - 1] !== text) seen.push(text)
    }).observe(document.querySelector('[role="log"]')!, {
      childList: true,
      subtree: true,
      characterData: true,
    })
  })

  await chat.getByLabel('Your question').fill('Tell me about the SRE Agent project.')
  await chat.getByRole('button', { name: 'Send' }).click()
  await expect(chat.getByRole('log').getByText(FAKE_ANSWER)).toBeVisible()

  const seen = await page.evaluate(() => (window as unknown as { seen: string[] }).seen)
  const partial = seen.filter((text) => text !== '' && FAKE_ANSWER.startsWith(text) && text !== FAKE_ANSWER)
  expect(partial.length).toBeGreaterThan(0)
})

test('a source link goes to its section of the page', async ({ page }) => {
  await page.goto('/')
  const chat = await openChat(page)
  await chat.getByLabel('Your question').fill('Tell me about the SRE Agent project.')
  await chat.getByLabel('Your question').press('Enter')

  const link = chat.getByRole('list', { name: 'Sources' }).getByRole('link').first()
  const target = (await link.getAttribute('href'))!
  await link.click()
  await expect(page).toHaveURL(new RegExp(`${target}$`))
  await expect(page.locator(target)).toBeInViewport()
  // On a phone the chat covers the page, so it closes to show the section.
  if (isPhone(page)) await expect(chat).toBeHidden()
  else await expect(chat).toBeVisible()
})

test('a question longer than 500 characters cannot be sent', async ({ page }) => {
  let sent = 0
  page.on('request', (request) => {
    if (request.url() === CHAT_URL) sent += 1
  })
  await page.goto('/')
  const chat = await openChat(page)
  const input = chat.getByLabel('Your question')
  const send = chat.getByRole('button', { name: 'Send' })

  await input.fill('a'.repeat(501))
  await expect(send).toHaveAttribute('aria-disabled', 'true')
  await expect(input).toHaveAttribute('aria-invalid', 'true')
  await send.click({ force: true })
  await input.press('Enter')
  // A request would leave a moment after the key press, so give it time to show up.
  await page.waitForTimeout(500)
  expect(sent).toBe(0)

  await input.fill('a'.repeat(500))
  await expect(send).toHaveAttribute('aria-disabled', 'false')
})

test('when the backend says the limit is reached, the limit message replaces the question field', async ({ page }) => {
  await page.route(CHAT_URL, (route) =>
    route.fulfill({
      status: 429,
      contentType: 'application/json',
      headers: { 'access-control-allow-origin': '*' },
      body: '{"reason":"limit"}',
    }),
  )
  await page.goto('/')
  const chat = await openChat(page)
  await chat.getByLabel('Your question').fill('Hello')
  await chat.getByLabel('Your question').press('Enter')

  await expect(chat.getByText(/reached its limit/).first()).toBeVisible()
  await expect(chat.getByLabel('Your question')).toHaveCount(0)
  await expect(chat.getByRole('button', { name: 'Try again' })).toHaveCount(0)
  await expect(chat.getByRole('link', { name: 'Go to contact' })).toBeVisible()
})

test('when the backend cannot be reached, the error message offers Try again, and trying again works', async ({ page }) => {
  await page.goto('/')
  const chat = await openChat(page)

  await page.route(CHAT_URL, (route) => route.abort('connectionrefused'))
  await chat.getByLabel('Your question').fill('Hello')
  await chat.getByLabel('Your question').press('Enter')
  await expect(chat.getByText(/not available right now/)).toBeVisible()

  await page.unroute(CHAT_URL)
  await chat.getByRole('button', { name: 'Try again' }).click()
  await expect(chat.getByRole('log').getByText(FAKE_ANSWER)).toBeVisible()
  await expect(chat.getByText(/not available right now/)).toHaveCount(0)
})

test('a slow backend shows the waking notice until the answer starts', async ({ page }) => {
  await page.route(CHAT_URL, async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 9000))
    await route.continue()
  })
  await page.goto('/')
  const chat = await openChat(page)
  await chat.getByLabel('Your question').fill('Hello')
  await chat.getByLabel('Your question').press('Enter')

  await expect(chat.getByRole('status')).toHaveText(/waking up/, { timeout: 8500 })
  await expect(chat.getByRole('log').getByText(FAKE_ANSWER)).toBeVisible()
  await expect(chat.getByRole('status')).toHaveText('')
})

test('closing the chat keeps the conversation', async ({ page }) => {
  await page.goto('/')
  const chat = await openChat(page)
  await chat.getByLabel('Your question').fill('Hello')
  await chat.getByLabel('Your question').press('Enter')
  await expect(chat.getByRole('log').getByText(FAKE_ANSWER)).toBeVisible()

  await chat.getByRole('button', { name: 'Close chat' }).click()
  await expect(chat).toBeHidden()
  const reopened = await openChat(page)
  await expect(reopened.getByRole('log').getByText(FAKE_ANSWER)).toBeVisible()
})

test('on a phone the chat covers the screen and stays inside it', async ({ page }) => {
  test.skip(!isPhone(page), 'phones only')
  await page.goto('/')
  const chat = await openChat(page)
  const box = (await chat.boundingBox())!
  const view = page.viewportSize()!
  // A small margin all round is by design.
  expect(box.width).toBeGreaterThanOrEqual(view.width * 0.9)
  expect(box.height).toBeGreaterThanOrEqual(view.height * 0.75)
  expect(box.x).toBeGreaterThanOrEqual(0)
  expect(box.y).toBeGreaterThanOrEqual(0)
  expect(box.x + box.width).toBeLessThanOrEqual(view.width)
  expect(box.y + box.height).toBeLessThanOrEqual(view.height)
  await expect(chat.getByLabel('Your question')).toBeInViewport()
  await expect(chat.getByRole('button', { name: 'Close chat' })).toBeInViewport()
})

test('the whole chat can be used with the keyboard alone', async ({ page }) => {
  test.skip(isPhone(page), 'a phone has no Tab key')
  await page.goto('/')
  const button = page.getByRole('button', { name: 'Open chat' })
  await button.focus()
  await page.keyboard.press('Enter')

  const chat = page.getByRole('dialog', { name: 'Ask about Samir' })
  await expect(chat.getByLabel('Your question')).toBeFocused()
  await page.keyboard.type('What technologies does Samir use?')
  await page.keyboard.press('Enter')
  await expect(chat.getByRole('log').getByText(FAKE_ANSWER)).toBeVisible()

  await page.keyboard.press('Escape')
  await expect(chat).toBeHidden()
  await expect(page.getByRole('button', { name: 'Open chat' })).toBeFocused()
})
