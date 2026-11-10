import { render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'
import { Contact } from './Contact'

const contact = {
  email: 'test@example.com',
  linkedin: 'https://www.linkedin.com/in/test',
  github: 'https://github.com/test',
  cvPath: 'cv.pdf',
}

test('has the Contact heading and a mail link that shows the address', () => {
  render(<Contact contact={contact} />)
  expect(screen.getByRole('heading', { level: 2, name: 'Contact' })).toBeTruthy()
  const email = screen.getByRole('link', { name: /test@example\.com/ })
  expect(email.getAttribute('href')).toBe('mailto:test@example.com')
})

test.each([
  ['LinkedIn', 'https://www.linkedin.com/in/test'],
  ['GitHub', 'https://github.com/test'],
])('links to %s in a new tab, safely', (name, url) => {
  render(<Contact contact={contact} />)
  const link = screen.getByRole('link', { name: new RegExp(name) })
  expect(link.getAttribute('href')).toBe(url)
  expect(link.getAttribute('target')).toBe('_blank')
  expect(link.getAttribute('rel')).toBe('noopener noreferrer')
})
