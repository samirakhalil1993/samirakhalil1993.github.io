import { render, screen, within } from '@testing-library/react'
import { expect, test } from 'vitest'
import type { Profile } from '../content/schema'
import { Footer } from './Footer'

const profile: Profile = {
  name: 'Test Person',
  title: 'Student | AI',
  intro: 'Intro.',
  location: 'Somewhere',
  initials: 'TP',
  about: ['About.'],
  footerDescription: 'A short footer description.',
}
const contact = {
  email: 'test@example.com',
  linkedin: 'https://www.linkedin.com/in/test',
  github: 'https://github.com/test',
  cvPath: 'cv.pdf',
}

test('shows the name, title and description', () => {
  render(<Footer profile={profile} contact={contact} year={2031} />)
  const footer = screen.getByRole('contentinfo')
  expect(within(footer).getByText('Test Person')).toBeTruthy()
  expect(within(footer).getByText('Student | AI')).toBeTruthy()
  expect(within(footer).getByText('A short footer description.')).toBeTruthy()
})

test('has quick links to every section', () => {
  render(<Footer profile={profile} contact={contact} year={2031} />)
  const nav = screen.getByRole('navigation', { name: 'Footer' })
  expect(
    within(nav)
      .getAllByRole('link')
      .map((a) => a.getAttribute('href')),
  ).toEqual(['#home', '#about', '#skills', '#projects', '#education', '#experience', '#contact'])
})

test('links to GitHub, LinkedIn and email', () => {
  render(<Footer profile={profile} contact={contact} year={2031} />)
  expect(screen.getByRole('link', { name: 'GitHub' }).getAttribute('href')).toBe(contact.github)
  expect(screen.getByRole('link', { name: 'LinkedIn' }).getAttribute('href')).toBe(contact.linkedin)
  expect(screen.getByRole('link', { name: 'Email' }).getAttribute('href')).toBe(
    'mailto:test@example.com',
  )
})

test('shows the copyright line with the given year', () => {
  render(<Footer profile={profile} contact={contact} year={2031} />)
  expect(screen.getByText('© 2031 Test Person')).toBeTruthy()
})
