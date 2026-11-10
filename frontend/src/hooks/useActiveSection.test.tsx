import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { useActiveSection } from './useActiveSection'

// Where each section's top edge is, in pixels from the top of the window.
let tops: Record<string, number>

beforeEach(() => {
  tops = { one: 64, two: 900, three: 2600 }
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
    return { top: tops[this.id] ?? 0 } as DOMRect
  })
  // A window 800 px tall showing a page 3000 px long, scrolled to the top.
  vi.stubGlobal('innerHeight', 800)
  vi.stubGlobal('scrollY', 0)
  vi.spyOn(document.documentElement, 'scrollHeight', 'get').mockReturnValue(3000)
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

/** Pretends the visitor scrolled down by `distance` pixels. */
function scrollBy(distance: number) {
  act(() => {
    for (const id of Object.keys(tops)) tops[id] -= distance
    vi.stubGlobal('scrollY', window.scrollY + distance)
    window.dispatchEvent(new Event('scroll'))
  })
}

function Page({ ids = ['one', 'two', 'three'] }: { ids?: string[] }) {
  const active = useActiveSection(ids)
  return (
    <>
      <output>{active ?? 'none'}</output>
      <section id="one" />
      <section id="two" />
      <section id="three" />
    </>
  )
}

const active = () => screen.getByRole('status').textContent

test('starts on the first section at the top of the page', () => {
  render(<Page />)
  expect(active()).toBe('one')
})

test('returns null while no section has reached the top of the window', () => {
  tops = { one: 400, two: 900, three: 1800 }
  render(<Page />)
  expect(active()).toBe('none')
})

test('switches when the next section reaches the line under the navbar', () => {
  render(<Page />)
  scrollBy(700) // "two" is now 200 px from the top: not there yet
  expect(active()).toBe('one')
  scrollBy(120) // "two" is now 80 px from the top, where a link jump puts it
  expect(active()).toBe('two')
})

test('after a jump, picks the section that was jumped to, not the one above it', () => {
  render(<Page />)
  scrollBy(820)
  // "one" ends exactly where "two" begins; only "two" may be active.
  expect(active()).toBe('two')
})

test('picks the last section at the very bottom, even if it never reaches the top', () => {
  render(<Page />)
  scrollBy(2200) // 800 + 2200 = 3000: the bottom of the page
  expect(tops.three).toBeGreaterThan(100)
  expect(active()).toBe('three')
})

test('goes back when the visitor scrolls up again', () => {
  render(<Page />)
  scrollBy(820)
  scrollBy(-820)
  expect(active()).toBe('one')
})

test('ignores ids that are not on the page', () => {
  render(<Page ids={['one', 'missing', 'two']} />)
  scrollBy(820)
  expect(active()).toBe('two')
})

test('stops listening when it is removed from the page', () => {
  const remove = vi.spyOn(window, 'removeEventListener')
  const { unmount } = render(<Page />)
  unmount()
  expect(remove.mock.calls.map((call) => call[0])).toEqual(
    expect.arrayContaining(['scroll', 'resize']),
  )
})
