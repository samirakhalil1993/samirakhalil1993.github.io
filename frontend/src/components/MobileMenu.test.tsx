import { fireEvent, render, screen, within } from '@testing-library/react'
import { expect, test } from 'vitest'
import { MobileMenu } from './MobileMenu'

const hrefs = ['#home', '#about', '#skills', '#projects', '#education', '#experience', '#contact']

test('starts closed', () => {
  render(<MobileMenu activeId={null} />)
  const button = screen.getByRole('button', { name: 'Open menu' })
  expect(button.getAttribute('aria-expanded')).toBe('false')
  expect(screen.queryByRole('navigation', { name: 'Mobile' })).toBeNull()
})

test('opens with a link to every section', () => {
  render(<MobileMenu activeId="skills" />)
  fireEvent.click(screen.getByRole('button', { name: 'Open menu' }))
  const button = screen.getByRole('button', { name: 'Close menu' })
  expect(button.getAttribute('aria-expanded')).toBe('true')
  const nav = screen.getByRole('navigation', { name: 'Mobile' })
  expect(button.getAttribute('aria-controls')).toBe(nav.id)
  const links = within(nav).getAllByRole('link')
  expect(links.map((a) => a.getAttribute('href'))).toEqual(hrefs)
  expect(links.filter((a) => a.getAttribute('aria-current') === 'true').map((a) => a.textContent)).toEqual(['Skills'])
})

test('closes when a section is chosen', () => {
  render(<MobileMenu activeId={null} />)
  fireEvent.click(screen.getByRole('button', { name: 'Open menu' }))
  fireEvent.click(screen.getByRole('link', { name: 'Projects' }))
  expect(screen.queryByRole('navigation', { name: 'Mobile' })).toBeNull()
})

test('closes on Escape and returns focus to the button', () => {
  render(<MobileMenu activeId={null} />)
  fireEvent.click(screen.getByRole('button', { name: 'Open menu' }))
  fireEvent.keyDown(document, { key: 'Escape' })
  expect(screen.queryByRole('navigation', { name: 'Mobile' })).toBeNull()
  expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Open menu' }))
})

test('exists only on small screens', () => {
  const { container } = render(<MobileMenu activeId={null} />)
  expect((container.firstElementChild as HTMLElement).className).toMatch(/\bmd:hidden\b/)
})
