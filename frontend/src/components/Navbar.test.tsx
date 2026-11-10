import { render, screen, within } from '@testing-library/react'
import { expect, test } from 'vitest'
import { Navbar } from './Navbar'

test('links to every section in page order', () => {
  render(<Navbar name="Test Person" activeId={null} />)
  const nav = screen.getByRole('navigation', { name: 'Main' })
  expect(
    within(nav)
      .getAllByRole('link')
      .map((a) => a.getAttribute('href')),
  ).toEqual(['#home', '#about', '#skills', '#projects', '#education', '#experience', '#contact'])
})

test('marks only the active section', () => {
  render(<Navbar name="Test Person" activeId="projects" />)
  const current = screen
    .getAllByRole('link')
    .filter((a) => a.getAttribute('aria-current') === 'true')
  expect(current.map((a) => a.textContent)).toEqual(['Projects'])
})

test('shows the name as a link to the top', () => {
  render(<Navbar name="Test Person" activeId={null} />)
  expect(screen.getByRole('link', { name: 'Test Person' }).getAttribute('href')).toBe('#home')
})

test('hides the section links on small screens', () => {
  render(<Navbar name="Test Person" activeId={null} />)
  expect(screen.getByRole('navigation', { name: 'Main' }).className).toMatch(
    /\bhidden\b.*\bmd:flex\b/,
  )
})

test('marks the active link with an underline, not only with colour', () => {
  render(<Navbar name="Test Person" activeId="projects" />)
  expect(screen.getByRole('link', { name: 'Projects' }).className).toMatch(/\bborder-accent\b/)
  expect(screen.getByRole('link', { name: 'About' }).className).toMatch(/\bborder-transparent\b/)
})
