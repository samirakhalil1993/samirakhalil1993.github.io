import { render, screen, within } from '@testing-library/react'
import { expect, test } from 'vitest'
import type { Project } from '../content/schema'
import { Projects } from './Projects'

const full: Project = {
  id: 'a',
  title: 'Alpha',
  summary: 'Alpha summary.',
  tags: ['X', 'Y'],
  organisation: 'Org',
  image: 'a.png',
  imageAlt: 'Alpha diagram',
  github: 'https://github.com/t/a',
  details: {},
}
const bare: Project = { id: 'b', title: 'Beta', summary: 'Beta summary.', tags: ['Z'], details: {} }

test('renders one card per project with its id, title, summary and tags', () => {
  render(<Projects projects={[full, bare]} />)
  const cards = screen.getAllByRole('article')
  expect(cards.map((c) => c.id)).toEqual(['project-a', 'project-b'])
  expect(within(cards[0]).getByRole('heading', { level: 3 }).textContent).toBe('Alpha')
  expect(within(cards[0]).getByText('Alpha summary.')).toBeTruthy()
  expect(
    within(cards[0])
      .getAllByRole('listitem')
      .map((li) => li.textContent),
  ).toEqual(['X', 'Y'])
})

test('shows the organisation only when the project has one', () => {
  render(<Projects projects={[full, bare]} />)
  const [a, b] = screen.getAllByRole('article')
  expect(within(a).getByText('Org')).toBeTruthy()
  expect(within(b).queryByText('Org')).toBeNull()
})

test('shows the GitHub link only when the project has one', () => {
  render(<Projects projects={[full, bare]} />)
  const [a, b] = screen.getAllByRole('article')
  const link = within(a).getByRole('link', { name: 'Alpha on GitHub' })
  expect(link.getAttribute('href')).toBe('https://github.com/t/a')
  expect(link.getAttribute('target')).toBe('_blank')
  expect(link.getAttribute('rel')).toBe('noopener noreferrer')
  expect(within(b).queryByRole('link')).toBeNull()
})

test('shows the image with its description, or a placeholder without one', () => {
  render(<Projects projects={[full, bare]} />)
  const [a, b] = screen.getAllByRole('article')
  expect(within(a).getByRole('img', { name: 'Alpha diagram' }).getAttribute('src')).toBe('a.png')
  expect(within(b).queryByRole('img')).toBeNull()
})

test('renders nothing when there are no projects', () => {
  const { container } = render(<Projects projects={[]} />)
  expect(container.innerHTML).toBe('')
})
