import { fireEvent, render, screen, within } from '@testing-library/react'
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
  details: {
    problemGoal: 'The problem.',
    solutionArchitecture: 'The solution.',
    contributions: 'My part.',
    resultsChallenges: 'The results.',
    documentation: [{ label: 'Report', url: 'https://example.com/report' }],
  },
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
  expect(within(b).queryByRole('link', { name: /GitHub/ })).toBeNull()
})

test('shows the image with its description, or a placeholder without one', () => {
  render(<Projects projects={[full, bare]} />)
  const [a, b] = screen.getAllByRole('article')
  expect(within(a).getByRole('img', { name: 'Alpha diagram' }).getAttribute('src')).toBe('a.png')
  expect(within(b).queryByRole('img')).toBeNull()
  // The placeholder is a plain block: no "coming soon" text on the live site.
  expect(b.querySelector('[aria-hidden="true"]')?.textContent).toBe('')
})

test('renders nothing when there are no projects', () => {
  const { container } = render(<Projects projects={[]} />)
  expect(container.innerHTML).toBe('')
})

const partHeadings = (card: HTMLElement) =>
  within(card)
    .getAllByRole('heading', { level: 4 })
    .map((h) => h.textContent)

test('every card has a Read more button that controls its details', () => {
  render(<Projects projects={[full, bare]} />)
  screen.getAllByRole('article').forEach((card) => {
    const button = within(card).getByRole('button', { name: /Read more/ })
    expect(button.getAttribute('aria-expanded')).toBe('false')
    expect(document.getElementById(button.getAttribute('aria-controls')!)).not.toBeNull()
  })
})

test('Read more opens the details with every part, in order', () => {
  render(<Projects projects={[full, bare]} />)
  const [a] = screen.getAllByRole('article')
  fireEvent.click(within(a).getByRole('button', { name: /Read more/ }))
  expect(within(a).getByRole('button', { name: /Show less/ }).getAttribute('aria-expanded')).toBe(
    'true',
  )
  expect(partHeadings(a)).toEqual([
    'Problem & Goal',
    'Solution & Architecture',
    'My Contributions',
    'Technologies Used',
    'Results & Challenges',
    'Screenshots & Diagrams',
    'GitHub & Documentation',
  ])
  expect(within(a).getByText('My part.')).toBeTruthy()
  expect(within(a).getByRole('link', { name: 'Report' }).getAttribute('href')).toBe(
    'https://example.com/report',
  )
})

test('a project without detail text shows its technologies and one notice', () => {
  render(<Projects projects={[full, bare]} />)
  const [, b] = screen.getAllByRole('article')
  fireEvent.click(within(b).getByRole('button', { name: /Read more/ }))
  expect(partHeadings(b)).toEqual(['Technologies Used'])
  expect(within(b).getByText('More details will be added soon.')).toBeTruthy()
})

test('a project with detail text shows no notice', () => {
  render(<Projects projects={[full]} />)
  expect(screen.queryByText('More details will be added soon.')).toBeNull()
})

test('opening a second card closes the first', () => {
  render(<Projects projects={[full, bare]} />)
  const [a, b] = screen.getAllByRole('article')
  fireEvent.click(within(a).getByRole('button', { name: /Read more/ }))
  fireEvent.click(within(b).getByRole('button', { name: /Read more/ }))
  const expanded = screen
    .getAllByRole('button', { name: /Read more|Show less/ })
    .map((button) => button.getAttribute('aria-expanded'))
  expect(expanded).toEqual(['false', 'true'])
})

test('Show less closes the card again', () => {
  render(<Projects projects={[full]} />)
  fireEvent.click(screen.getByRole('button', { name: /Read more/ }))
  fireEvent.click(screen.getByRole('button', { name: /Show less/ }))
  expect(screen.getByRole('button', { name: /Read more/ }).getAttribute('aria-expanded')).toBe(
    'false',
  )
})

test('collapsed details cannot be reached by keyboard or screen reader', () => {
  render(<Projects projects={[full]} />)
  const button = screen.getByRole('button', { name: /Read more/ })
  const details = document.getElementById(button.getAttribute('aria-controls')!)!
  expect(details.hasAttribute('inert')).toBe(true)
  fireEvent.click(button)
  expect(details.hasAttribute('inert')).toBe(false)
})

test('the image in the details can be enlarged', () => {
  render(<Projects projects={[full]} />)
  fireEvent.click(screen.getByRole('button', { name: /Read more/ }))
  fireEvent.click(screen.getByRole('button', { name: 'Enlarge image: Alpha diagram' }))
  expect(screen.getByRole('heading', { level: 2, name: 'Alpha diagram' })).toBeTruthy()
})
