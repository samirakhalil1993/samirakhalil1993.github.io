import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { useActiveSection } from './useActiveSection'

type Callback = (entries: Partial<IntersectionObserverEntry>[]) => void

let fire: Callback
let observed: Element[]
let created: number

beforeEach(() => {
  observed = []
  created = 0
  // A stand-in for the browser's IntersectionObserver that lets the test
  // decide when a section "scrolls into view".
  class FakeObserver {
    constructor(callback: Callback) {
      created += 1
      fire = callback
    }
    observe(element: Element) {
      observed.push(element)
    }
    disconnect() {}
  }
  vi.stubGlobal('IntersectionObserver', FakeObserver)
})

afterEach(() => vi.unstubAllGlobals())

function Page() {
  const active = useActiveSection(['one', 'two'])
  return (
    <>
      <output>{active ?? 'none'}</output>
      <section id="one" />
      <section id="two" />
    </>
  )
}

test('returns null before any section is in view', () => {
  render(<Page />)
  expect(screen.getByRole('status').textContent).toBe('none')
})

test('watches every section it was given', () => {
  render(<Page />)
  expect(observed.map((el) => el.id)).toEqual(['one', 'two'])
})

test('returns the id of the section that scrolls into view', () => {
  render(<Page />)
  act(() => fire([{ target: document.getElementById('two')!, isIntersecting: true }]))
  expect(screen.getByRole('status').textContent).toBe('two')
})

test('keeps the last section when another one leaves the view', () => {
  render(<Page />)
  act(() => fire([{ target: document.getElementById('two')!, isIntersecting: true }]))
  act(() => fire([{ target: document.getElementById('one')!, isIntersecting: false }]))
  expect(screen.getByRole('status').textContent).toBe('two')
})

test('does not start over when re-rendered with the same ids', () => {
  const { rerender } = render(<Page />)
  rerender(<Page />)
  expect(created).toBe(1)
})

test('picks the earlier section when two are in view at once', () => {
  render(<Page />)
  act(() => fire([{ target: document.getElementById('two')!, isIntersecting: true }]))
  act(() => fire([{ target: document.getElementById('one')!, isIntersecting: true }]))
  expect(screen.getByRole('status').textContent).toBe('one')
})

test('moves on to the later section when the earlier one leaves', () => {
  render(<Page />)
  act(() =>
    fire([
      { target: document.getElementById('one')!, isIntersecting: true },
      { target: document.getElementById('two')!, isIntersecting: true },
    ]),
  )
  expect(screen.getByRole('status').textContent).toBe('one')
  act(() => fire([{ target: document.getElementById('one')!, isIntersecting: false }]))
  expect(screen.getByRole('status').textContent).toBe('two')
})
