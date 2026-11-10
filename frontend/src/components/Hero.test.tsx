import { render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'
import type { Availability, Profile } from '../content/schema'
import { Hero } from './Hero'

const profile: Profile = {
  name: 'Test Person',
  title: 'Student | AI',
  intro: 'Intro text.',
  location: 'Somewhere',
  initials: 'TP',
  about: ['About.'],
  footerDescription: 'Footer.',
}
const availability: Availability = { status: 'Looking', active: true }

test('shows name, title, introduction and status', () => {
  render(<Hero profile={profile} availability={availability} />)
  expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Test Person')
  expect(screen.getByText('Student | AI')).toBeTruthy()
  expect(screen.getByText('Intro text.')).toBeTruthy()
  expect(screen.getByText('Looking')).toBeTruthy()
})

test('is the section with the id "home"', () => {
  const { container } = render(<Hero profile={profile} availability={availability} />)
  expect(container.querySelector('section')?.id).toBe('home')
})

test('links the main button to the projects section', () => {
  render(<Hero profile={profile} availability={availability} />)
  expect(screen.getByRole('link', { name: 'View Projects' }).getAttribute('href')).toBe('#projects')
})

test('shows the initials when there is no photo', () => {
  render(<Hero profile={profile} availability={availability} />)
  expect(screen.getByText('TP')).toBeTruthy()
  expect(screen.queryByRole('img')).toBeNull()
})

test('shows the photo with a description when there is one', () => {
  render(<Hero profile={{ ...profile, photo: 'me.jpg' }} availability={availability} />)
  expect(screen.getByRole('img', { name: 'Portrait of Test Person' }).getAttribute('src')).toBe(
    'me.jpg',
  )
  expect(screen.queryByText('TP')).toBeNull()
})
