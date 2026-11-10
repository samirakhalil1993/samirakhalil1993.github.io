import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import type { ChatConfig } from '../content/schema'
import { ChatWidget } from './ChatWidget'
import type { ChatClient, ChatResult } from './types'

const chat: ChatConfig = {
  title: 'Ask about Test',
  demo: true,
  demoNotice: 'Demo: prepared answers.',
  liveNotice: 'Answers are written by an AI model.',
  errorMessage: 'The assistant is not available right now.',
  welcome: 'Hi! Ask me something.',
  placeholder: 'Ask a question',
  limitMessage: 'The assistant has reached its limit for now.',
  suggestedQuestions: ['What projects?', 'What skills?'],
}

afterEach(() => vi.unstubAllGlobals())

function controlledClient() {
  let emit: (piece: string) => void = () => {}
  let finish: (result: ChatResult) => void = () => {}
  const client: ChatClient = vi.fn((_history, onText) => {
    emit = onText
    return new Promise<ChatResult>((resolve) => (finish = resolve))
  })
  return {
    client,
    emit: (piece: string) => act(() => emit(piece)),
    finish: (result: ChatResult) => act(async () => finish(result)),
  }
}

function setup(config: ChatConfig = chat) {
  const service = controlledClient()
  render(<ChatWidget chat={config} client={service.client} />)
  return service
}

const openButton = () => screen.getByRole('button', { name: 'Open chat' })
const open = () => fireEvent.click(openButton())
const dialog = () => screen.getByRole('dialog', { name: 'Ask about Test' })
const input = () => screen.getByLabelText('Your question') as HTMLTextAreaElement
const sendButton = () => screen.getByRole('button', { name: 'Send' })
const log = () => screen.getByRole('log')
const type = (text: string) => fireEvent.change(input(), { target: { value: text } })
const pressEnter = (shiftKey = false) => fireEvent.keyDown(input(), { key: 'Enter', shiftKey })

test('is closed at first', () => {
  setup()
  expect(openButton().getAttribute('aria-expanded')).toBe('false')
  expect(screen.queryByRole('dialog')).toBeNull()
})

test('opens with the welcome text, the suggestions, and focus in the question field', () => {
  setup()
  open()
  expect(within(dialog()).getByText('Hi! Ask me something.')).toBeTruthy()
  expect(within(dialog()).getByRole('button', { name: 'What projects?' })).toBeTruthy()
  expect(within(dialog()).getByRole('button', { name: 'What skills?' })).toBeTruthy()
  expect(document.activeElement).toBe(input())
  const toggle = screen.getAllByRole('button', { name: 'Close chat' }).find((b) => b.hasAttribute('aria-expanded'))!
  expect(toggle.getAttribute('aria-expanded')).toBe('true')
  expect(toggle.getAttribute('aria-controls')).toBe(dialog().id)
})

test('Escape closes it and returns focus to the button', () => {
  setup()
  open()
  fireEvent.keyDown(input(), { key: 'Escape' })
  expect(screen.queryByRole('dialog')).toBeNull()
  expect(document.activeElement).toBe(openButton())
})

test('the conversation is still there after closing and reopening', async () => {
  const { emit, finish } = setup()
  open()
  type('Hello')
  pressEnter()
  emit('An answer')
  await finish({ ok: true, sources: [] })
  fireEvent.click(within(dialog()).getByRole('button', { name: 'Close chat' }))
  open()
  expect(within(log()).getByText('Hello')).toBeTruthy()
  expect(within(log()).getByText('An answer')).toBeTruthy()
})

test('a suggested question is sent when clicked, and the suggestions go away', () => {
  const { client } = setup()
  open()
  fireEvent.click(screen.getByRole('button', { name: 'What projects?' }))
  expect(within(log()).getByText('What projects?')).toBeTruthy()
  expect(screen.queryByRole('button', { name: 'What skills?' })).toBeNull()
  expect(client).toHaveBeenCalledTimes(1)
})

test('Enter sends and clears the field; Shift+Enter does not send', () => {
  const { client } = setup()
  open()
  type('Hello')
  pressEnter(true)
  expect(client).not.toHaveBeenCalled()
  pressEnter()
  expect(client).toHaveBeenCalledTimes(1)
  expect(input().value).toBe('')
})

test('while an answer is on its way, nothing more can be sent', () => {
  const { client } = setup()
  open()
  type('First')
  pressEnter()
  expect(log().getAttribute('aria-busy')).toBe('true')
  expect(sendButton().getAttribute('aria-disabled')).toBe('true')
  type('Second')
  pressEnter()
  fireEvent.click(sendButton())
  expect(client).toHaveBeenCalledTimes(1)
  expect(input().value).toBe('Second')
})

test('the answer appears as it arrives and ends with its sources', async () => {
  const { emit, finish } = setup()
  open()
  type('Hello')
  pressEnter()
  expect(within(log()).getByText('The assistant is writing')).toBeTruthy()
  emit('Part one, ')
  emit('part two.')
  expect(within(log()).getByText('Part one, part two.')).toBeTruthy()
  await finish({
    ok: true,
    sources: [
      { label: 'Project: Alpha', sectionId: 'project-a' },
      { label: 'Repository', url: 'https://github.com/t/a' },
    ],
  })
  expect(log().getAttribute('aria-busy')).toBe('false')
  expect(within(log()).queryByText('The assistant is writing')).toBeNull()
  expect(screen.getByRole('link', { name: 'Project: Alpha' }).getAttribute('href')).toBe('#project-a')
  const external = screen.getByRole('link', { name: 'Repository' })
  expect(external.getAttribute('href')).toBe('https://github.com/t/a')
  expect(external.getAttribute('target')).toBe('_blank')
  expect(external.getAttribute('rel')).toBe('noopener noreferrer')
})

test('a failed answer says so and can be tried again', async () => {
  const { client, finish } = setup()
  open()
  type('Hello')
  pressEnter()
  await finish({ ok: false, reason: 'network' })
  expect(within(log()).getByText('The assistant is not available right now.')).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
  expect(client).toHaveBeenCalledTimes(2)
  expect(within(log()).getAllByText('Hello')).toHaveLength(1)
})

test('at the usage limit, the limit message replaces the question field', async () => {
  const { finish } = setup()
  open()
  type('Hello')
  pressEnter()
  await finish({ ok: false, reason: 'limit' })
  expect(screen.getAllByText('The assistant has reached its limit for now.').length).toBeGreaterThan(0)
  expect(screen.queryByRole('button', { name: 'Try again' })).toBeNull()
  expect(screen.queryByLabelText('Your question')).toBeNull()
  expect(within(dialog()).getByRole('link', { name: 'Go to contact' }).getAttribute('href')).toBe('#contact')
})

test('a question over 500 characters cannot be sent, and the counter shows why', () => {
  const { client } = setup()
  open()
  type('x'.repeat(399))
  expect(screen.queryByText(/\/ 500/)).toBeNull()
  type('x'.repeat(501))
  expect(screen.getByText('501 / 500')).toBeTruthy()
  expect(sendButton().getAttribute('aria-disabled')).toBe('true')
  pressEnter()
  expect(client).not.toHaveBeenCalled()
  expect(input().getAttribute('aria-invalid')).toBe('true')
})

test('demo mode is clearly marked', () => {
  setup()
  open()
  expect(within(dialog()).getByText('Demo')).toBeTruthy()
  expect(within(dialog()).getByText('Demo: prepared answers.')).toBeTruthy()
})

test('outside demo mode there is no demo marking', () => {
  setup({ ...chat, demo: false })
  open()
  expect(within(dialog()).queryByText('Demo')).toBeNull()
  expect(within(dialog()).queryByText('Demo: prepared answers.')).toBeNull()
})

test('choosing a section source closes the window on a small screen', async () => {
  vi.stubGlobal('matchMedia', (query: string) => ({ matches: query.includes('max-width') }))
  const { emit, finish } = setup()
  open()
  type('Hello')
  pressEnter()
  emit('Answer')
  await finish({ ok: true, sources: [{ label: 'Projects', sectionId: 'projects' }] })
  fireEvent.click(screen.getByRole('link', { name: 'Projects' }))
  expect(screen.queryByRole('dialog')).toBeNull()
})

test('choosing a section source keeps the window open on a wide screen', async () => {
  vi.stubGlobal('matchMedia', () => ({ matches: false }))
  const { emit, finish } = setup()
  open()
  type('Hello')
  pressEnter()
  emit('Answer')
  await finish({ ok: true, sources: [{ label: 'Projects', sectionId: 'projects' }] })
  fireEvent.click(screen.getByRole('link', { name: 'Projects' }))
  expect(screen.getByRole('dialog')).toBeTruthy()
})

test('Escape pressed elsewhere on the page leaves the chat open', () => {
  setup()
  open()
  fireEvent.keyDown(document.body, { key: 'Escape' })
  expect(screen.getByRole('dialog')).toBeTruthy()
})

test('Escape on the chat button closes the chat', () => {
  setup()
  open()
  const toggle = screen.getAllByRole('button', { name: 'Close chat' }).find((b) => b.hasAttribute('aria-expanded'))!
  fireEvent.keyDown(toggle, { key: 'Escape' })
  expect(screen.queryByRole('dialog')).toBeNull()
})

test('after a suggested question is chosen, focus is in the question field', () => {
  setup()
  open()
  const suggestion = screen.getByRole('button', { name: 'What projects?' })
  suggestion.focus()
  fireEvent.click(suggestion)
  expect(document.activeElement).toBe(input())
})

test('after Try again, focus is in the question field', async () => {
  const { finish } = setup()
  open()
  type('Hello')
  pressEnter()
  await finish({ ok: false, reason: 'network' })
  const retry = screen.getByRole('button', { name: 'Try again' })
  retry.focus()
  fireEvent.click(retry)
  expect(document.activeElement).toBe(input())
})

test('when the limit replaces the question field, focus moves to the contact link', async () => {
  const { finish } = setup()
  open()
  type('Hello')
  pressEnter()
  await finish({ ok: false, reason: 'limit' })
  expect(document.activeElement).toBe(within(dialog()).getByRole('link', { name: 'Go to contact' }))
})

test('only the latest failed answer offers Try again', async () => {
  const { finish } = setup()
  open()
  type('First')
  pressEnter()
  await finish({ ok: false, reason: 'network' })
  type('Second')
  pressEnter()
  await finish({ ok: false, reason: 'network' })
  expect(screen.getAllByRole('button', { name: 'Try again' })).toHaveLength(1)
})

test('on a touch screen, opening does not put the cursor in the field (no keyboard pops up)', () => {
  vi.stubGlobal('matchMedia', (query: string) => ({ matches: query.includes('pointer: coarse') }))
  setup()
  open()
  expect(document.activeElement).toBe(within(dialog()).getByRole('button', { name: 'Close chat' }))
})

test('the conversation keeps its list structure inside the log', async () => {
  const { emit, finish } = setup()
  open()
  type('Hello')
  pressEnter()
  emit('Answer')
  await finish({ ok: true, sources: [] })
  expect(log().tagName).toBe('DIV')
  expect(within(log()).getAllByRole('listitem').length).toBeGreaterThanOrEqual(2)
})

test('connected to the backend, the window shows the AI notice and no demo marking', () => {
  setup({ ...chat, apiUrl: 'https://api.example.com' })
  open()
  expect(within(dialog()).queryByText('Demo')).toBeNull()
  expect(within(dialog()).queryByText('Demo: prepared answers.')).toBeNull()
  expect(within(dialog()).getByText('Answers are written by an AI model.')).toBeTruthy()
})

test('in demo mode the AI notice is not shown', () => {
  setup()
  open()
  expect(within(dialog()).queryByText('Answers are written by an AI model.')).toBeNull()
})
