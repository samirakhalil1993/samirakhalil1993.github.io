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

test('offers the CV as a download', () => {
  render(<Contact contact={contact} />)
  const link = screen.getByRole('link', { name: /Download CV/ })
  expect(link.getAttribute('href')).toBe('cv.pdf')
  expect(link.hasAttribute('download')).toBe(true)
})

test('shows no form until an access key is set', () => {
  render(<Contact contact={contact} />)
  expect(screen.queryByRole('form')).toBeNull()
})

test('shows the form when an access key is set', () => {
  render(
    <Contact contact={{ ...contact, formAccessKey: '0a1b2c3d-1234-4567-8901-234567890abc' }} />,
  )
  expect(screen.getByRole('form', { name: 'Contact form' })).toBeTruthy()
  expect(screen.getByRole('link', { name: /test@example\.com/ })).toBeTruthy()
})
