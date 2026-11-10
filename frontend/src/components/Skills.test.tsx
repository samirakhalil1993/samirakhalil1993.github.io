import { render, screen, within } from '@testing-library/react'
import { expect, test } from 'vitest'
import { Skills } from './Skills'

const categories = [
  { name: 'Languages', tags: ['Python', 'SQL'] },
  { name: 'Tools', tags: ['Git'] },
]

test('shows each category as a heading, in order', () => {
  render(<Skills categories={categories} />)
  expect(screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)).toEqual([
    'Languages',
    'Tools',
  ])
})

test("lists each category's tags under its own heading", () => {
  render(<Skills categories={categories} />)
  const lists = screen.getAllByRole('list')
  expect(lists).toHaveLength(2)
  expect(
    within(lists[0])
      .getAllByRole('listitem')
      .map((li) => li.textContent),
  ).toEqual(['Python', 'SQL'])
  expect(
    within(lists[1])
      .getAllByRole('listitem')
      .map((li) => li.textContent),
  ).toEqual(['Git'])
})
