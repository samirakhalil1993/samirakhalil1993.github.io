import { render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'
import { About } from './About'

test('shows the heading and every paragraph', () => {
  render(<About paragraphs={['First paragraph.', 'Second paragraph.']} />)
  expect(screen.getByRole('heading', { level: 2, name: 'About Me' })).toBeTruthy()
  expect(screen.getByText('First paragraph.')).toBeTruthy()
  expect(screen.getByText('Second paragraph.')).toBeTruthy()
})
