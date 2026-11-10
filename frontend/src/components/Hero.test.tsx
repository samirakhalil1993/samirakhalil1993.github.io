import { fireEvent, render, screen } from '@testing-library/react'
import { expect, test, vi } from 'vitest'
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
const props = { profile, availability, cvPath: 'cv.pdf', onPreviewCv: () => {} }

test('shows name, title, introduction and status', () => {
  render(<Hero {...props} />)
  expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Test Person')
  expect(screen.getByText('Student | AI')).toBeTruthy()
  expect(screen.getByText('Intro text.')).toBeTruthy()
  expect(screen.getByText('Looking')).toBeTruthy()
})

test('is the section with the id "home"', () => {
  const { container } = render(<Hero {...props} />)
  expect(container.querySelector('section')?.id).toBe('home')
})

test('links the main button to the projects section', () => {
  render(<Hero {...props} />)
  expect(screen.getByRole('link', { name: 'View Projects' }).getAttribute('href')).toBe('#projects')
})

test('shows the initials when there is no photo', () => {
  render(<Hero {...props} />)
  expect(screen.getByText('TP')).toBeTruthy()
  expect(screen.queryByRole('img')).toBeNull()
})

test('shows the photo with a description when there is one', () => {
  render(<Hero {...props} profile={{ ...profile, photo: 'me.jpg' }} />)
  expect(screen.getByRole('img', { name: 'Portrait of Test Person' }).getAttribute('src')).toBe(
    'me.jpg',
  )
  expect(screen.queryByText('TP')).toBeNull()
})

test('Preview CV is a button that asks to open the preview', () => {
  const onPreviewCv = vi.fn()
  render(<Hero {...props} onPreviewCv={onPreviewCv} />)
  fireEvent.click(screen.getByRole('button', { name: 'Preview CV' }))
  expect(onPreviewCv).toHaveBeenCalledTimes(1)
})

test('Download CV links to the CV file as a download', () => {
  render(<Hero {...props} />)
  const link = screen.getByRole('link', { name: 'Download CV' })
  expect(link.getAttribute('href')).toBe('cv.pdf')
  expect(link.hasAttribute('download')).toBe(true)
})
