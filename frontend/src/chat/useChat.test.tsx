import { act, renderHook } from '@testing-library/react'
import { expect, test, vi } from 'vitest'
import type { ChatClient, ChatHistoryItem, ChatResult, ChatTurn } from './types'
import { useChat } from './useChat'

/** A fake answering service: the test decides what arrives and when. */
function controlledClient() {
  const calls: { history: ChatHistoryItem[]; signal: AbortSignal }[] = []
  let emit: (piece: string) => void = () => {}
  let finish: (result: ChatResult) => void = () => {}
  const client: ChatClient = vi.fn((history, onText, signal) => {
    calls.push({ history, signal })
    emit = onText
    return new Promise<ChatResult>((resolve) => (finish = resolve))
  })
  return {
    client,
    calls,
    emit: (piece: string) => act(() => emit(piece)),
    finish: (result: ChatResult) => act(async () => finish(result)),
  }
}

const assistant = (turns: ChatTurn[]) => {
  const last = turns.at(-1)
  if (last?.role !== 'assistant') throw new Error('The last turn is not an assistant turn')
  return last
}

function setup() {
  const service = controlledClient()
  const hook = renderHook(() => useChat(service.client))
  const send = (text: string) => act(() => hook.result.current.send(text))
  /** Sends a question and lets the service answer it completely. */
  const exchange = async (question: string, answer: string) => {
    send(question)
    service.emit(answer)
    await service.finish({ ok: true, sources: [] })
  }
  return { ...service, hook, send, exchange, chat: () => hook.result.current }
}

test('sending adds the trimmed question and a waiting answer, and asks the service once', () => {
  const { chat, send, calls } = setup()
  send('  Hi  ')
  expect(chat().turns.map((t) => [t.role, t.text])).toEqual([
    ['user', 'Hi'],
    ['assistant', ''],
  ])
  expect(assistant(chat().turns).status).toBe('waiting')
  expect(chat().busy).toBe(true)
  expect(calls).toHaveLength(1)
  expect(calls[0].history).toEqual([{ role: 'user', text: 'Hi' }])
})

test('the answer grows piece by piece and ends with its sources', async () => {
  const { chat, send, emit, finish } = setup()
  send('Hi')
  emit('Hello ')
  emit('there')
  expect(assistant(chat().turns)).toMatchObject({ status: 'streaming', text: 'Hello there' })
  await finish({ ok: true, sources: [{ label: 'Projects', sectionId: 'projects' }] })
  expect(assistant(chat().turns)).toMatchObject({
    status: 'done',
    text: 'Hello there',
    sources: [{ label: 'Projects', sectionId: 'projects' }],
  })
  expect(chat().busy).toBe(false)
})

test.each([
  ['an empty message', '   '],
  ['a message over 500 characters', 'x'.repeat(501)],
])('ignores %s', (_name, text) => {
  const { chat, send, calls } = setup()
  send(text)
  expect(chat().turns).toEqual([])
  expect(calls).toHaveLength(0)
})

test('accepts a message of exactly 500 characters', () => {
  const { send, calls } = setup()
  send('x'.repeat(500))
  expect(calls).toHaveLength(1)
})

test('ignores a second message while an answer is arriving', () => {
  const { chat, send, calls } = setup()
  send('First')
  send('Second')
  expect(chat().turns).toHaveLength(2)
  expect(calls).toHaveLength(1)
})

test('a later question is sent together with the earlier conversation', async () => {
  const { exchange, send, calls } = setup()
  await exchange('First', 'Answer one')
  send('Second')
  expect(calls[1].history).toEqual([
    { role: 'user', text: 'First' },
    { role: 'assistant', text: 'Answer one' },
    { role: 'user', text: 'Second' },
  ])
})

test('a failure keeps the partial answer and says why', async () => {
  const { chat, send, emit, finish } = setup()
  send('Hi')
  emit('Half an ans')
  await finish({ ok: false, reason: 'network' })
  expect(assistant(chat().turns)).toMatchObject({
    status: 'failed',
    text: 'Half an ans',
    failure: 'network',
  })
  expect(chat().busy).toBe(false)
})

test('retry asks the same question again without repeating it in the conversation', async () => {
  const { chat, send, emit, finish, calls } = setup()
  send('Hi')
  emit('Half')
  await finish({ ok: false, reason: 'network' })
  act(() => chat().retry())

  expect(chat().turns.map((t) => t.role)).toEqual(['user', 'assistant'])
  expect(assistant(chat().turns)).toMatchObject({ status: 'waiting', text: '' })
  expect(calls).toHaveLength(2)
  expect(calls[1].history).toEqual([{ role: 'user', text: 'Hi' }])
})

test('retry does nothing unless the last answer failed', async () => {
  const { chat, exchange, calls } = setup()
  act(() => chat().retry())
  await exchange('Hi', 'Hello')
  act(() => chat().retry())
  expect(calls).toHaveLength(1)
})

test('a failed answer is not sent along with later questions', async () => {
  const { send, emit, finish, calls } = setup()
  send('First')
  emit('Half')
  await finish({ ok: false, reason: 'unavailable' })
  send('Second')
  expect(calls[1].history).toEqual([
    { role: 'user', text: 'First' },
    { role: 'user', text: 'Second' },
  ])
})

test('a service that throws counts as a network failure', async () => {
  const client: ChatClient = vi.fn(async () => {
    throw new Error('boom')
  })
  const hook = renderHook(() => useChat(client))
  await act(async () => hook.result.current.send('Hi'))
  expect(assistant(hook.result.current.turns)).toMatchObject({ status: 'failed', failure: 'network' })
  expect(hook.result.current.busy).toBe(false)
})

test('after 15 questions the limit is reached and nothing more is sent', async () => {
  const { chat, exchange, send, calls } = setup()
  for (let i = 1; i <= 15; i++) {
    expect(chat().limitReached).toBe(false)
    await exchange(`Question ${i}`, `Answer ${i}`)
  }
  expect(chat().limitReached).toBe(true)
  send('One more')
  expect(calls).toHaveLength(15)
})

test('a limit failure from the service ends the conversation at once, with no retry', async () => {
  const { chat, send, finish, calls } = setup()
  send('Hi')
  await finish({ ok: false, reason: 'limit' })
  expect(chat().limitReached).toBe(true)
  act(() => chat().retry())
  send('Again')
  expect(calls).toHaveLength(1)
})

test('leaving the page cancels an answer that is still arriving', () => {
  const { hook, send, calls } = setup()
  send('Hi')
  expect(calls[0].signal.aborted).toBe(false)
  hook.unmount()
  expect(calls[0].signal.aborted).toBe(true)
})

test('text that arrives after the answer has ended is ignored', async () => {
  const { chat, send, emit, finish } = setup()
  send('Hi')
  emit('Done.')
  await finish({ ok: true, sources: [] })
  emit(' Late text')
  expect(assistant(chat().turns)).toMatchObject({ status: 'done', text: 'Done.' })
  expect(chat().busy).toBe(false)
})
