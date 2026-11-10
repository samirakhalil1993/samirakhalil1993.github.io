import { expect, test, vi } from 'vitest'
import { createApiClient } from './apiClient'
import type { ChatHistoryItem } from './types'

const history: ChatHistoryItem[] = [
  { role: 'user', text: 'Hi' },
  { role: 'assistant', text: 'Hello' },
  { role: 'user', text: 'What projects?' },
]

const event = (data: unknown) => `data: ${JSON.stringify(data)}\n\n`

/** A response whose body arrives in the given network chunks. */
function streamed(chunks: string[], status = 200): Response {
  const encoder = new TextEncoder()
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk))
      controller.close()
    },
  })
  return new Response(body, { status, headers: { 'content-type': 'text/event-stream' } })
}

async function run(response: Response | (() => Promise<Response>), signal = new AbortController().signal) {
  const pieces: string[] = []
  const fetchFn = vi.fn(typeof response === 'function' ? response : async () => response)
  const client = createApiClient('https://api.example.com', fetchFn as unknown as typeof fetch)
  const result = await client(history, (piece) => pieces.push(piece), signal)
  return { pieces, result, fetchFn }
}

test('posts the conversation as JSON to /api/chat', async () => {
  const { fetchFn } = await run(streamed([event({ type: 'done', sources: [] })]))
  const [url, init] = fetchFn.mock.calls[0] as unknown as [string, RequestInit]
  expect(url).toBe('https://api.example.com/api/chat')
  expect(init.method).toBe('POST')
  expect(init.headers).toEqual({ 'Content-Type': 'application/json' })
  expect(JSON.parse(init.body as string)).toEqual({ messages: history })
  expect(init.signal).toBeInstanceOf(AbortSignal)
})

test('a slash at the end of the address is tolerated', async () => {
  const fetchFn = vi.fn(async () => streamed([event({ type: 'done', sources: [] })]))
  await createApiClient('https://api.example.com/', fetchFn as unknown as typeof fetch)(
    history,
    () => {},
    new AbortController().signal,
  )
  expect((fetchFn.mock.calls[0] as unknown as [string])[0]).toBe('https://api.example.com/api/chat')
})

test('passes on the pieces of the answer in order, then the sources', async () => {
  const sources = [{ label: 'Projects', sectionId: 'projects' }, { label: 'Repo', url: 'https://github.com/t/a' }]
  const { pieces, result } = await run(
    streamed([
      event({ type: 'text', text: 'Hello ' }),
      event({ type: 'text', text: 'there' }) + event({ type: 'text', text: '!' }),
      event({ type: 'done', sources }),
    ]),
  )
  expect(pieces).toEqual(['Hello ', 'there', '!'])
  expect(result).toEqual({ ok: true, sources })
})

test('reads an event that is split across network chunks, even inside a letter', async () => {
  const whole = event({ type: 'text', text: 'Maskininlärning är kul' }) + event({ type: 'done', sources: [] })
  const bytes = new TextEncoder().encode(whole)
  // Cut in the middle of the two-byte letter "ä".
  const cut = bytes.indexOf(0xc3) + 1
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(bytes.slice(0, cut))
      controller.enqueue(bytes.slice(cut))
      controller.close()
    },
  })
  const { pieces, result } = await run(new Response(body, { status: 200 }))
  expect(pieces).toEqual(['Maskininlärning är kul'])
  expect(result).toEqual({ ok: true, sources: [] })
})

test.each(['limit', 'unavailable'] as const)('an error event "%s" is passed on, keeping the text so far', async (reason) => {
  const { pieces, result } = await run(
    streamed([event({ type: 'text', text: 'Half' }), event({ type: 'error', reason })]),
  )
  expect(pieces).toEqual(['Half'])
  expect(result).toEqual({ ok: false, reason })
})

test.each([
  [429, 'limit'],
  [503, 'unavailable'],
  [500, 'unavailable'],
  [422, 'unavailable'],
  [413, 'unavailable'],
] as const)('a refusal with status %d becomes "%s"', async (status, reason) => {
  const { result } = await run(new Response(JSON.stringify({ reason: 'x' }), { status }))
  expect(result).toEqual({ ok: false, reason })
})

test('a request that cannot be made is a network failure', async () => {
  const { result } = await run(async () => {
    throw new TypeError('Failed to fetch')
  })
  expect(result).toEqual({ ok: false, reason: 'network' })
})

test('a stream that stops without a final event is a network failure', async () => {
  const { pieces, result } = await run(streamed([event({ type: 'text', text: 'Half' })]))
  expect(pieces).toEqual(['Half'])
  expect(result).toEqual({ ok: false, reason: 'network' })
})

test('unknown or broken events are skipped', async () => {
  const { pieces, result } = await run(
    streamed([
      ': keep-alive\n\n',
      'data: {broken\n\n',
      event({ type: 'mystery' }),
      event({ type: 'text', text: 5 }),
      event({ type: 'text', text: 'ok' }),
      event({ type: 'done', sources: 'nonsense' }),
    ]),
  )
  expect(pieces).toEqual(['ok'])
  expect(result).toEqual({ ok: true, sources: [] })
})

test('sources without a label are dropped, and unknown fields are not passed on', async () => {
  const { result } = await run(
    streamed([
      event({
        type: 'done',
        sources: [{ label: 'A', sectionId: 'about', evil: '<script>' }, { sectionId: 'x' }, { label: 'B', url: 'https://b.example' }],
      }),
    ]),
  )
  expect(result).toEqual({
    ok: true,
    sources: [{ label: 'A', sectionId: 'about' }, { label: 'B', url: 'https://b.example' }],
  })
})

test('a link that is not https is not passed on as a link', async () => {
  const { result } = await run(
    streamed([event({ type: 'done', sources: [{ label: 'Bad', url: 'javascript:alert(1)' }] })]),
  )
  expect(result).toEqual({ ok: true, sources: [{ label: 'Bad' }] })
})

test('cancelling stops the reading and counts as a network failure', async () => {
  const controller = new AbortController()
  const pieces: string[] = []
  const encoder = new TextEncoder()
  const body = new ReadableStream<Uint8Array>({
    start(streamController) {
      streamController.enqueue(encoder.encode(event({ type: 'text', text: 'One' })))
      controller.signal.addEventListener('abort', () => streamController.error(new DOMException('Aborted', 'AbortError')))
    },
  })
  const client = createApiClient('https://api.example.com', (async () => new Response(body)) as unknown as typeof fetch)
  const pending = client(history, (piece) => pieces.push(piece), controller.signal)
  await new Promise((resolve) => setTimeout(resolve, 10))
  controller.abort()
  expect(await pending).toEqual({ ok: false, reason: 'network' })
  expect(pieces).toEqual(['One'])
})

test('reads events whose lines end the Windows way (as some proxies rewrite them)', async () => {
  const { pieces, result } = await run(
    streamed([
      'data: {"type":"text","text":"Hi"}\r\n\r\n',
      'data: {"type":"done","sources":[]}\r\n\r\n',
    ]),
  )
  expect(pieces).toEqual(['Hi'])
  expect(result).toEqual({ ok: true, sources: [] })
})
