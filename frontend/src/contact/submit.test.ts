import { expect, test, vi } from 'vitest'
import { submitContact, WEB3FORMS_URL } from './submit'
import type { ContactValues } from './validate'

const values: ContactValues = {
  name: ' Ada Lovelace ',
  email: 'ada@example.com',
  subject: 'Thesis project',
  message: 'Hello, I would like to talk about a thesis.',
}
const key = '0a1b2c3d-1234-4567-8901-234567890abc'

/** A stand-in for the browser's fetch that answers with the given status and body. */
function answering(status: number, body: unknown) {
  return vi.fn(async () => new Response(typeof body === 'string' ? body : JSON.stringify(body), { status }))
}

test('sends one JSON request to Web3Forms with the trimmed values and the key', async () => {
  const fetchFn = answering(200, { success: true })
  await submitContact(values, key, fetchFn)

  expect(fetchFn).toHaveBeenCalledTimes(1)
  const [url, init] = fetchFn.mock.calls[0] as unknown as [string, RequestInit]
  expect(url).toBe(WEB3FORMS_URL)
  expect(url).toBe('https://api.web3forms.com/submit')
  expect(init.method).toBe('POST')
  expect(init.headers).toEqual({ 'Content-Type': 'application/json', Accept: 'application/json' })
  expect(JSON.parse(init.body as string)).toEqual({
    access_key: key,
    name: 'Ada Lovelace',
    email: 'ada@example.com',
    subject: 'Thesis project',
    message: 'Hello, I would like to talk about a thesis.',
  })
})

test('succeeds only when the service says success', async () => {
  expect(await submitContact(values, key, answering(200, { success: true }))).toEqual({ ok: true })
})

test.each([
  ['the service answers 200 but success is false', 200, { success: false }, 'rejected'],
  ['the service answers 400', 400, { success: false, message: 'Bad' }, 'rejected'],
  ['the service answers 500', 500, 'Server error', 'rejected'],
  ['the answer is not JSON', 200, '<html>ok</html>', 'rejected'],
  ['the service answers 429', 429, { success: false }, 'busy'],
] as const)('fails when %s', async (_name, status, body, reason) => {
  expect(await submitContact(values, key, answering(status, body))).toEqual({ ok: false, reason })
})

test('reports a network problem when the request cannot be made', async () => {
  const fetchFn = vi.fn(async () => {
    throw new TypeError('Failed to fetch')
  })
  expect(await submitContact(values, key, fetchFn)).toEqual({ ok: false, reason: 'network' })
})

test('gives up and cancels the request when the service does not answer in time', async () => {
  let signal: AbortSignal | undefined
  const fetchFn = vi.fn(
    (_url: RequestInfo | URL, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        signal = init?.signal ?? undefined
        signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))
      }),
  )
  expect(await submitContact(values, key, fetchFn, 20)).toEqual({ ok: false, reason: 'network' })
  expect(signal?.aborted).toBe(true)
})
