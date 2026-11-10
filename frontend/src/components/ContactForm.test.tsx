import { act, fireEvent, render, screen } from '@testing-library/react'
import { expect, test, vi } from 'vitest'
import type { SubmitResult } from '../contact/submit'
import { ContactForm } from './ContactForm'

const key = '0a1b2c3d-1234-4567-8901-234567890abc'
const labels = ['Full Name', 'Email Address', 'Subject', 'Message'] as const
const typed = {
  'Full Name': 'Ada Lovelace',
  'Email Address': 'ada@example.com',
  Subject: 'Thesis project',
  Message: 'Hello, I would like to talk about a thesis.',
}

const field = (label: string) => screen.getByLabelText(label) as HTMLInputElement
const form = () => screen.getByRole('form', { name: 'Contact form' })
const sendButton = () => screen.getByRole('button', { name: /Send message|Sending/ })

function fillIn() {
  for (const label of labels) fireEvent.change(field(label), { target: { value: typed[label] } })
}

/** A fake sender whose answer the test decides, and decides when. */
function controlledSubmit() {
  let finish: (result: SubmitResult) => void = () => {}
  const submit = vi.fn(() => new Promise<SubmitResult>((resolve) => (finish = resolve)))
  return { submit, finish: (result: SubmitResult) => act(async () => finish(result)) }
}

function renderForm(submit = vi.fn(async (): Promise<SubmitResult> => ({ ok: true }))) {
  render(<ContactForm accessKey={key} email="samir@example.com" submit={submit} />)
  return submit
}

test('has four labelled, required fields', () => {
  renderForm()
  for (const label of labels) expect(field(label).required).toBe(true)
})

test('an empty submit shows a message for every field and sends nothing', () => {
  const submit = renderForm()
  fireEvent.submit(form())

  expect(submit).not.toHaveBeenCalled()
  const expected = {
    'Full Name': 'Please enter your name.',
    'Email Address': 'Please enter your email address.',
    Subject: 'Please enter a subject.',
    Message: 'Please write a message of at least 10 characters.',
  }
  for (const label of labels) {
    const input = field(label)
    expect(input.getAttribute('aria-invalid')).toBe('true')
    const message = document.getElementById(input.getAttribute('aria-describedby')!)
    expect(message?.textContent).toContain(expected[label])
  }
  expect(document.activeElement).toBe(field('Full Name'))
})

test('focus goes to the first field that is wrong', () => {
  renderForm()
  fireEvent.change(field('Full Name'), { target: { value: 'Ada Lovelace' } })
  fireEvent.submit(form())
  expect(document.activeElement).toBe(field('Email Address'))
})

test('fields are not marked wrong before the first submit', () => {
  renderForm()
  fireEvent.change(field('Full Name'), { target: { value: 'A' } })
  expect(field('Full Name').hasAttribute('aria-invalid')).toBe(false)
})

test("after a failed submit, a field's message goes away as it is fixed", () => {
  renderForm()
  fireEvent.submit(form())
  fireEvent.change(field('Full Name'), { target: { value: 'Ada Lovelace' } })
  expect(screen.queryByText(/Please enter your name\./)).toBeNull()
  expect(field('Full Name').hasAttribute('aria-invalid')).toBe(false)
  expect(screen.getByText(/Please enter a subject\./)).toBeTruthy()
})

test('a valid submit sends the values once, even when submitted twice', async () => {
  const { submit, finish } = controlledSubmit()
  renderForm(submit)
  fillIn()
  fireEvent.submit(form())
  fireEvent.submit(form())

  expect(submit).toHaveBeenCalledTimes(1)
  expect(submit).toHaveBeenCalledWith(
    {
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      subject: 'Thesis project',
      message: 'Hello, I would like to talk about a thesis.',
    },
    key,
  )
  expect(sendButton().textContent).toBe('Sending…')
  expect((sendButton() as HTMLButtonElement).disabled).toBe(true)
  await finish({ ok: true })
})

test('after a successful send, says so and clears the form', async () => {
  const { submit, finish } = controlledSubmit()
  renderForm(submit)
  fillIn()
  fireEvent.submit(form())
  await finish({ ok: true })

  expect(screen.getByRole('status').textContent).toBe('Thank you. Your message has been sent.')
  for (const label of labels) expect(field(label).value).toBe('')
  expect((sendButton() as HTMLButtonElement).disabled).toBe(false)
  expect(sendButton().textContent).toBe('Send message')
})

test.each([
  ['network', 'The message could not be sent. Please check your connection and try again, or email me directly'],
  ['busy', 'Too many messages were sent just now. Please wait a minute and try again, or email me directly'],
  ['rejected', 'The message could not be sent. Please try again later, or email me directly'],
] as const)('after a "%s" failure, explains it and keeps what was typed', async (reason, text) => {
  const { submit, finish } = controlledSubmit()
  renderForm(submit)
  fillIn()
  fireEvent.submit(form())
  await finish({ ok: false, reason })

  const alert = screen.getByRole('alert')
  expect(alert.textContent).toContain(text)
  expect(alert.querySelector('a')?.getAttribute('href')).toBe('mailto:samir@example.com')
  for (const label of labels) expect(field(label).value).toBe(typed[label])
  expect((sendButton() as HTMLButtonElement).disabled).toBe(false)
})

test('a new attempt removes the old failure message', async () => {
  const { submit, finish } = controlledSubmit()
  renderForm(submit)
  fillIn()
  fireEvent.submit(form())
  await finish({ ok: false, reason: 'network' })
  fireEvent.submit(form())
  expect(screen.queryByRole('alert')).toBeNull()
  expect(submit).toHaveBeenCalledTimes(2)
  await finish({ ok: true })
})

test('a bot that ticks the hidden box gets a success message, and nothing is sent', async () => {
  const submit = renderForm()
  fillIn()
  const trap = document.querySelector<HTMLInputElement>('input[name="botcheck"]')!
  expect(trap.tabIndex).toBe(-1)
  expect(trap.closest('[aria-hidden="true"]')).not.toBeNull()
  fireEvent.click(trap)
  fireEvent.submit(form())
  await act(async () => {})

  expect(submit).not.toHaveBeenCalled()
  expect(screen.getByRole('status').textContent).toBe('Thank you. Your message has been sent.')
})
