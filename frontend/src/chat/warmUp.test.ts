import { expect, test, vi } from 'vitest'
import { warmUp } from './warmUp'

test('asks the backend for its health address once', () => {
  const fetchFn = vi.fn(async () => new Response('{}'))
  warmUp('https://api.example.com', fetchFn as unknown as typeof fetch)
  expect(fetchFn).toHaveBeenCalledTimes(1)
  expect((fetchFn.mock.calls[0] as unknown as [string])[0]).toBe('https://api.example.com/api/health')
})

test('does nothing without a backend address', () => {
  const fetchFn = vi.fn()
  warmUp(undefined, fetchFn as unknown as typeof fetch)
  expect(fetchFn).not.toHaveBeenCalled()
})

test('a failed request is ignored', async () => {
  const fetchFn = vi.fn(async () => {
    throw new TypeError('Failed to fetch')
  })
  expect(() => warmUp('https://api.example.com', fetchFn as unknown as typeof fetch)).not.toThrow()
  // Let the rejected request settle: an unhandled rejection would fail the run.
  await new Promise((resolve) => setTimeout(resolve, 0))
})

test('a fetch that throws at once is ignored', () => {
  const fetchFn = vi.fn(() => {
    throw new TypeError('Invalid URL')
  })
  expect(() => warmUp('https://api.example.com', fetchFn as unknown as typeof fetch)).not.toThrow()
})
