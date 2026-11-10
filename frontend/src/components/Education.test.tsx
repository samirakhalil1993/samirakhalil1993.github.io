import { render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'
import type { EducationEntry } from '../content/schema'
import { Education } from './Education'

const entry: EducationEntry = {
  institution: 'Test University',
  degree: 'M.Sc. in Testing',
  location: 'Testville',
  start: '2022',
  end: '2027',
  coursework: ['Course A', 'Course B'],
}

test('shows institution, degree, period, location and coursework', () => {
  render(<Education entries={[entry]} />)
  expect(screen.getByRole('heading', { level: 2, name: 'Education' })).toBeTruthy()
  expect(screen.getByRole('heading', { level: 3, name: 'M.Sc. in Testing' })).toBeTruthy()
  expect(screen.getByText('Test University')).toBeTruthy()
  expect(screen.getByText('2022 – 2027')).toBeTruthy()
  expect(screen.getByText('Testville')).toBeTruthy()
  expect(screen.getAllByRole('listitem').map((li) => li.textContent)).toEqual([
    'Course A',
    'Course B',
  ])
})

test('renders no coursework list when there is no coursework', () => {
  render(<Education entries={[{ ...entry, coursework: [] }]} />)
  expect(screen.queryByRole('list')).toBeNull()
  expect(screen.queryByText('Relevant coursework')).toBeNull()
})

test('shows the description only when present', () => {
  render(<Education entries={[{ ...entry, description: 'A short description.' }]} />)
  expect(screen.getByText('A short description.')).toBeTruthy()
})
