import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { expect, test, vi } from 'vitest'
import type { ChatConfig } from '../content/schema'
import { ChatWidget } from './ChatWidget'
import type { ChatClient, ChatResult } from './types'

const chat: ChatConfig = {
  title: 'Ask about Test',
  demo: true,
  demoNotice: 'Demo: prepared answers.',
  errorMessage: 'The assistant is not available right now.',
  welcome: 'Hi! Ask me something.',
  placeholder: 'Ask a question',
  limitMessage: 'The assistant has reached its limit for now.',
  suggestedQuestions: ['What projects?', 'What skills?'],
}

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
  fireEvent.keyDown(document, { key: 'Escape' })
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
  vi.unstubAllGlobals()
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
  vi.unstubAllGlobals()
})
