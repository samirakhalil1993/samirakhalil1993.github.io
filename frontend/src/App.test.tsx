import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fireEvent, render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'
import App from './App'
import { content } from './content'
import { sections } from './sections'

test('has exactly one top-level heading: the name', () => {
  render(<App />)
  const h1 = screen.getAllByRole('heading', { level: 1 })
  expect(h1).toHaveLength(1)
  expect(h1[0].textContent).toBe(content.profile.name)
})

test('renders every section in page order', () => {
  const { container } = render(<App />)
  const ids = [...container.querySelectorAll('main > section')].map((s) => s.id)
  expect(ids).toEqual(sections.map((s) => s.id))
})

test('has header, main and footer landmarks', () => {
  render(<App />)
  expect(screen.getByRole('banner')).toBeTruthy()
  expect(screen.getByRole('main')).toBeTruthy()
  expect(screen.getByRole('contentinfo')).toBeTruthy()
})

test('shows all four projects and all three experience entries', () => {
  render(<App />)
  content.projects.forEach((p) =>
    expect(screen.getByRole('heading', { level: 3, name: p.title })).toBeTruthy(),
  )
  content.experience.forEach((e) =>
    expect(screen.getByRole('heading', { level: 3, name: e.title })).toBeTruthy(),
  )
})

test('every link inside the page points to something that exists', () => {
  const { container } = render(<App />)
  const targets = [...container.querySelectorAll('a[href^="#"]')].map((a) =>
    a.getAttribute('href')!.slice(1),
  )
  expect(targets.length).toBeGreaterThan(0)
  targets.forEach((id) => expect(container.querySelector(`[id="${id}"]`), `#${id}`).not.toBeNull())
})

test('Preview CV opens the CV window', () => {
  render(<App />)
  expect(screen.queryByRole('heading', { level: 2, name: 'CV' })).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Preview CV' }))
  expect(screen.getByRole('heading', { level: 2, name: 'CV' })).toBeTruthy()
})

test('the CV file named in the content exists and is a PDF', () => {
  const file = path.resolve(import.meta.dirname, '../public', content.contact.cvPath)
  expect(existsSync(file), file).toBe(true)
  expect(readFileSync(file).subarray(0, 4).toString()).toBe('%PDF')
})

test('offers the chat while the content is in demo mode', () => {
  render(<App />)
  expect(content.chat.demo).toBe(true)
  expect(screen.getByRole('button', { name: 'Open chat' })).toBeTruthy()
})
