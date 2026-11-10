import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import type { Content } from '../content/schema'
import { createDemoClient } from './demoClient'
import type { ChatResult } from './types'

const content = {
  profile: { name: 'Test Person' },
  skills: [
    { name: 'Languages', tags: ['Python', 'SQL'] },
    { name: 'Tools', tags: ['Git'] },
  ],
  projects: [
    { id: 'sre-agent', title: 'AI-Powered SRE Agent', summary: 'Triages alerts.' },
    { id: 'sensor-classification', title: 'Sensor Classification', summary: 'Classifies sensors.' },
  ],
  education: [{ degree: 'M.Sc. in Testing', institution: 'Test University', start: '2022', end: '2027' }],
  experience: [
    { title: 'Student Developer', organisation: 'Org One', period: '2025 – 2026' },
    { title: 'Intern', organisation: 'Org Two', period: '2026 – Present' },
  ],
  contact: { email: 'test@example.com' },
} as unknown as Content

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

/** Asks one question and returns the pieces and the result once the answer has ended. */
async function ask(question: string, signal = new AbortController().signal) {
  const pieces: string[] = []
  const client = createDemoClient(content, { delayMs: 10 })
  const pending = client([{ role: 'user', text: question }], (piece) => pieces.push(piece), signal)
  await vi.runAllTimersAsync()
  const result: ChatResult = await pending
  return { pieces, text: pieces.join(''), result }
}

test.each([
  [
    'Tell me about the SRE Agent project.',
    'AI-Powered SRE Agent: Triages alerts.',
    { label: 'Project: AI-Powered SRE Agent', sectionId: 'project-sre-agent' },
  ],
  [
    'what is the sensor thing?',
    'Sensor Classification: Classifies sensors.',
    { label: 'Project: Sensor Classification', sectionId: 'project-sensor-classification' },
  ],
  [
    'What projects has Test worked on?',
    'Test has worked on: AI-Powered SRE Agent, Sensor Classification.',
    { label: 'Projects', sectionId: 'projects' },
  ],
  [
    'What technologies does Test use?',
    'Languages: Python, SQL. Tools: Git.',
    { label: 'Technical Skills', sectionId: 'skills' },
  ],
  [
    'What machine learning experience does Test have?',
    'Student Developer at Org One (2025 – 2026). Intern at Org Two (2026 – Present).',
    { label: 'Experience', sectionId: 'experience' },
  ],
  [
    'Where did Test study?',
    'M.Sc. in Testing, Test University, 2022 – 2027.',
    { label: 'Education', sectionId: 'education' },
  ],
  [
    'How can I reach Test?',
    'You can reach Test by email at test@example.com.',
    { label: 'Contact', sectionId: 'contact' },
  ],
])('"%s" is answered from the content', async (question, answer, source) => {
  const { text, result } = await ask(question)
  expect(text).toBe(answer)
  expect(result).toEqual({ ok: true, sources: [source] })
})

test('any other question gets the fixed explanation, with no source', async () => {
  const { text, result } = await ask('What is the weather?')
  expect(text).toBe(
    'This demo has prepared answers about projects, skills, experience, education and contact. Try one of those topics.',
  )
  expect(result).toEqual({ ok: true, sources: [] })
})

test('answers the latest question, not an earlier one', async () => {
  const pieces: string[] = []
  const client = createDemoClient(content, { delayMs: 10 })
  const pending = client(
    [
      { role: 'user', text: 'Tell me about the SRE project' },
      { role: 'assistant', text: 'AI-Powered SRE Agent: Triages alerts.' },
      { role: 'user', text: 'And the education?' },
    ],
    (piece) => pieces.push(piece),
    new AbortController().signal,
  )
  await vi.runAllTimersAsync()
  await pending
  expect(pieces.join('')).toBe('M.Sc. in Testing, Test University, 2022 – 2027.')
})

test('the answer arrives word by word', async () => {
  const { pieces, text } = await ask('Where did Test study?')
  expect(pieces.length).toBe(text.split(' ').length)
})

test('nothing arrives before the first pause is over', async () => {
  const pieces: string[] = []
  const client = createDemoClient(content, { delayMs: 10 })
  void client([{ role: 'user', text: 'education' }], (piece) => pieces.push(piece), new AbortController().signal)
  await vi.advanceTimersByTimeAsync(99)
  expect(pieces).toEqual([])
  await vi.advanceTimersByTimeAsync(1)
  expect(pieces).toHaveLength(1)
})

test('stops sending words when the answer is cancelled', async () => {
  const controller = new AbortController()
  const pieces: string[] = []
  const client = createDemoClient(content, { delayMs: 10 })
  const pending = client([{ role: 'user', text: 'education' }], (piece) => pieces.push(piece), controller.signal)
  await vi.advanceTimersByTimeAsync(110)
  const soFar = pieces.length
  controller.abort()
  await vi.runAllTimersAsync()
  await pending
  expect(soFar).toBeGreaterThan(0)
  expect(pieces.length).toBe(soFar)
})
