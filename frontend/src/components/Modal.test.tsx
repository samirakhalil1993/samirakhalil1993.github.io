import { fireEvent, render, screen } from '@testing-library/react'
import { expect, test, vi } from 'vitest'
import { Modal } from './Modal'

function renderModal(open: boolean, onClose = vi.fn()) {
  const view = render(
    <Modal open={open} onClose={onClose} title="Test window">
      <p>Inside</p>
    </Modal>,
  )
  return { ...view, onClose, dialog: view.container.querySelector('dialog')! }
}

test('is closed and empty until opened', () => {
  const { dialog } = renderModal(false)
  expect(dialog.hasAttribute('open')).toBe(false)
  expect(screen.queryByText('Inside')).toBeNull()
})

test('shows its title and content when open', () => {
  const { dialog } = renderModal(true)
  expect(dialog.hasAttribute('open')).toBe(true)
  expect(screen.getByRole('heading', { level: 2, name: 'Test window' })).toBeTruthy()
  expect(screen.getByText('Inside')).toBeTruthy()
  expect(dialog.getAttribute('aria-labelledby')).toBe(
    screen.getByRole('heading', { level: 2 }).id,
  )
})

test('closes when the open prop turns false', () => {
  const { dialog, rerender } = renderModal(true)
  rerender(
    <Modal open={false} onClose={() => {}} title="Test window">
      <p>Inside</p>
    </Modal>,
  )
  expect(dialog.hasAttribute('open')).toBe(false)
})

test('asks to close when the Close button is clicked', () => {
  const { onClose } = renderModal(true)
  fireEvent.click(screen.getByRole('button', { name: 'Close' }))
  expect(onClose).toHaveBeenCalledTimes(1)
})

test('asks to close when the browser closes the dialog (Escape key)', () => {
  const { dialog, onClose } = renderModal(true)
  fireEvent(dialog, new Event('close'))
  expect(onClose).toHaveBeenCalledTimes(1)
})

test('asks to close on a click outside the content, but not inside it', () => {
  const { dialog, onClose } = renderModal(true)
  fireEvent.click(screen.getByText('Inside'))
  expect(onClose).not.toHaveBeenCalled()
  fireEvent.click(dialog)
  expect(onClose).toHaveBeenCalledTimes(1)
})
