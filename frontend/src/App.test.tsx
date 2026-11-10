import { render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'
import App from './App'
import { content } from './content'

test('shows one top-level heading', () => {
  render(<App />)
  expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
})

test('shows the name, title and availability from the content files', () => {
  render(<App />)
  expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(content.profile.name)
  expect(screen.getByText(content.profile.title)).toBeTruthy()
  expect(screen.getByText(content.availability.status)).toBeTruthy()
})
