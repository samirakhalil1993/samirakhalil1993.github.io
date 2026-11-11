import { expect, test, vi } from 'vitest'
import { content } from '../content'
import { createChatClient, resolveApiUrl } from './createChatClient'

const signal = () => new AbortController().signal

test('with a backend address, questions go to the backend', async () => {
  const fetchFn = vi.fn(async () => new Response('', { status: 500 }))
  const client = createChatClient(
    { ...content, chat: { ...content.chat, apiUrl: 'https://api.example.com' } },
    fetchFn as unknown as typeof fetch,
  )
  await client!([{ role: 'user', text: 'Hi' }], () => {}, signal())
  expect((fetchFn.mock.calls[0] as unknown as [string])[0]).toBe('https://api.example.com/api/chat')
})

test('the backend address wins over demo mode', async () => {
  const fetchFn = vi.fn(async () => new Response('', { status: 500 }))
  const client = createChatClient(
    { ...content, chat: { ...content.chat, demo: true, apiUrl: 'https://api.example.com' } },
    fetchFn as unknown as typeof fetch,
  )
  await client!([{ role: 'user', text: 'Hi' }], () => {}, signal())
  expect(fetchFn).toHaveBeenCalledTimes(1)
})

test('in demo mode without a backend address, nothing is sent anywhere', async () => {
  vi.useFakeTimers()
  const fetchFn = vi.fn()
  const client = createChatClient(
    { ...content, chat: { ...content.chat, demo: true, apiUrl: undefined } },
    fetchFn as unknown as typeof fetch,
  )
  const pending = client!([{ role: 'user', text: 'What projects?' }], () => {}, signal())
  await vi.runAllTimersAsync()
  expect(await pending).toMatchObject({ ok: true })
  expect(fetchFn).not.toHaveBeenCalled()
  vi.useRealTimers()
})

test('with neither, there is no chat', () => {
  expect(
    createChatClient({ ...content, chat: { ...content.chat, demo: false, apiUrl: undefined } }),
  ).toBeNull()
})

test('a published build always uses the address from chat.json', () => {
  expect(resolveApiUrl('https://api.example.com', 'production', 'http://localhost:8000')).toBe(
    'https://api.example.com',
  )
  expect(resolveApiUrl(undefined, 'production', 'http://localhost:8000')).toBeUndefined()
})

test.each(['development', 'e2e'])('in %s mode a local address replaces it', (mode) => {
  expect(resolveApiUrl('https://api.example.com', mode, 'http://localhost:8000')).toBe(
    'http://localhost:8000',
  )
})

test('without a local address the one from chat.json is used', () => {
  expect(resolveApiUrl('https://api.example.com', 'development', undefined)).toBe(
    'https://api.example.com',
  )
  expect(resolveApiUrl('https://api.example.com', 'development', '')).toBe('https://api.example.com')
})
