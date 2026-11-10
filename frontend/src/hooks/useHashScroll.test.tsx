import { render } from '@testing-library/react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { useHashScroll } from './useHashScroll'

const scrollIntoView = vi.fn()

beforeEach(() => {
  scrollIntoView.mockClear()
  // jsdom has no scrollIntoView; record which element is asked to scroll.
  Element.prototype.scrollIntoView = function () {
    scrollIntoView(this.id)
  }
})

afterEach(() => {
  window.location.hash = ''
})

function Page() {
  useHashScroll()
  return <section id="contact" />
}

test('scrolls to the section named in the address when the page opens', () => {
  window.location.hash = '#contact'
  render(<Page />)
  expect(scrollIntoView).toHaveBeenCalledExactlyOnceWith('contact')
})

test('does nothing when the address names no section', () => {
  render(<Page />)
  expect(scrollIntoView).not.toHaveBeenCalled()
})

test('does nothing when the address names a section that does not exist', () => {
  window.location.hash = '#nothing-here'
  render(<Page />)
  expect(scrollIntoView).not.toHaveBeenCalled()
})
