import { render, screen, within } from '@testing-library/react'
import { expect, test } from 'vitest'
import type { ExperienceEntry } from '../content/schema'
import { Experience } from './Experience'

const fullEntry: ExperienceEntry = {
  id: 'full',
  title: 'Student Developer',
  organisation: 'Org One',
  context: 'Student team, via BTH',
  location: 'Testville',
  period: '2025 – 2026',
  summary: 'Summary one.',
  responsibilities: ['Did A.', 'Did B.'],
  technologies: ['Python', 'SQL'],
  projectId: 'alpha',
}
const bareEntry: ExperienceEntry = {
  id: 'bare',
  title: 'Helper',
  organisation: 'Org Two',
  period: '2024',
  summary: 'Summary two.',
  responsibilities: ['Did C.'],
  technologies: [],
}

test('shows title, organisation, period, summary, responsibilities and technologies', () => {
  render(<Experience entries={[fullEntry]} />)
  const card = screen.getByRole('article')
  expect(within(card).getByRole('heading', { level: 3 }).textContent).toBe('Student Developer')
  expect(within(card).getByText('Org One')).toBeTruthy()
  expect(within(card).getByText('2025 – 2026')).toBeTruthy()
  expect(within(card).getByText('Summary one.')).toBeTruthy()
  const [responsibilities, technologies] = within(card).getAllByRole('list')
  expect(
    within(responsibilities)
      .getAllByRole('listitem')
      .map((li) => li.textContent),
  ).toEqual(['Did A.', 'Did B.'])
  expect(
    within(technologies)
      .getAllByRole('listitem')
      .map((li) => li.textContent),
  ).toEqual(['Python', 'SQL'])
})

test('shows the context line and project link only when present', () => {
  render(<Experience entries={[fullEntry, bareEntry]} />)
  const [a, b] = screen.getAllByRole('article')
  expect(within(a).getByText('Student team, via BTH')).toBeTruthy()
  expect(within(a).getByRole('link', { name: 'View project' }).getAttribute('href')).toBe(
    '#project-alpha',
  )
  expect(within(b).queryByRole('link')).toBeNull()
  expect(b.textContent).not.toMatch(/undefined|·\s*$/)
})

test('renders no technology list when there are no technologies', () => {
  render(<Experience entries={[bareEntry]} />)
  expect(within(screen.getByRole('article')).getAllByRole('list')).toHaveLength(1)
})
