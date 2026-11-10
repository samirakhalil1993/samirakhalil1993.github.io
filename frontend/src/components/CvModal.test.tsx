import { render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'
import { CvModal } from './CvModal'

test('shows the CV, with a way to open and to download it', () => {
  const { container } = render(
    <CvModal open onClose={() => {}} cvPath="cv.pdf" name="Test Person" />,
  )
  expect(screen.getByRole('heading', { level: 2, name: 'CV' })).toBeTruthy()
  const frame = container.querySelector('iframe')!
  expect(frame.getAttribute('src')).toBe('cv.pdf')
  expect(frame.getAttribute('title')).toBe('CV of Test Person')

  const openLink = screen.getByRole('link', { name: 'Open in new tab' })
  expect(openLink.getAttribute('href')).toBe('cv.pdf')
  expect(openLink.getAttribute('target')).toBe('_blank')

  const download = screen.getByRole('link', { name: 'Download' })
  expect(download.getAttribute('href')).toBe('cv.pdf')
  expect(download.hasAttribute('download')).toBe(true)
})

test('does not load the PDF until it is opened', () => {
  const { container } = render(
    <CvModal open={false} onClose={() => {}} cvPath="cv.pdf" name="Test Person" />,
  )
  expect(container.querySelector('iframe')).toBeNull()
})
