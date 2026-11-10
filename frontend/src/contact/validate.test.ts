import { expect, test } from 'vitest'
import { validateContact, type ContactValues } from './validate'

const valid: ContactValues = {
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  subject: 'Thesis project',
  message: 'Hello, I would like to talk about a thesis.',
}

test('accepts a complete, well-formed message', () => {
  expect(validateContact(valid)).toEqual({})
})

test('ignores spaces around the values', () => {
  expect(validateContact({ ...valid, name: '  Ada  ', email: ' ada@example.com ' })).toEqual({})
})

test.each([
  ['name', '', 'Please enter your name.'],
  ['name', '   ', 'Please enter your name.'],
  ['name', 'A', 'Please enter your name.'],
  ['name', 'a'.repeat(101), 'Name must be at most 100 characters.'],
  ['email', '', 'Please enter your email address.'],
  ['email', 'a@b', 'Please enter a valid email address.'],
  ['email', 'a b@c.se', 'Please enter a valid email address.'],
  ['email', '@c.se', 'Please enter a valid email address.'],
  ['email', 'a@.se', 'Please enter a valid email address.'],
  ['email', `${'a'.repeat(250)}@b.se`, 'Please enter a valid email address.'],
  ['subject', '', 'Please enter a subject.'],
  ['subject', 'Hi', 'Please enter a subject.'],
  ['subject', 's'.repeat(151), 'Subject must be at most 150 characters.'],
  ['message', '', 'Please write a message of at least 10 characters.'],
  ['message', 'Too short', 'Please write a message of at least 10 characters.'],
  ['message', 'm'.repeat(5001), 'Message must be at most 5000 characters.'],
] as const)('%s "%s" gives: %s', (field, value, message) => {
  expect(validateContact({ ...valid, [field]: value })).toEqual({ [field]: message })
})

test('accepts values exactly at the limits', () => {
  expect(
    validateContact({
      name: 'Al',
      email: 'a@b.se',
      subject: 'Hey',
      message: 'm'.repeat(5000),
    }),
  ).toEqual({})
})

test('reports every wrong field at once', () => {
  expect(Object.keys(validateContact({ name: '', email: '', subject: '', message: '' }))).toEqual([
    'name',
    'email',
    'subject',
    'message',
  ])
})
