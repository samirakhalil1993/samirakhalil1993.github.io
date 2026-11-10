import { act, render, screen } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import { useReveal } from './useReveal'

type Callback = (entries: Partial<IntersectionObserverEntry>[]) => void

let fire: Callback
let disconnected = false

function installFakeObserver() {
  disconnected = false
  class FakeObserver {
    constructor(callback: Callback) {
      fire = callback
    }
    observe() {}
    disconnect() {
      disconnected = true
    }
  }
  vi.stubGlobal('IntersectionObserver', FakeObserver)
}

afterEach(() => vi.unstubAllGlobals())

function Box() {
  const { ref, revealed } = useReveal<HTMLDivElement>()
  return (
    <div ref={ref} role="status">
      {revealed ? 'shown' : 'hidden'}
    </div>
  )
}

test('is hidden until it scrolls into view', () => {
  installFakeObserver()
  render(<Box />)
  expect(screen.getByRole('status').textContent).toBe('hidden')
  act(() => fire([{ isIntersecting: true }]))
  expect(screen.getByRole('status').textContent).toBe('shown')
})

test('stays shown and stops watching after the first time', () => {
  installFakeObserver()
  render(<Box />)
  act(() => fire([{ isIntersecting: true }]))
  expect(disconnected).toBe(true)
  act(() => fire([{ isIntersecting: false }]))
  expect(screen.getByRole('status').textContent).toBe('shown')
})

test('is shown at once when the browser cannot watch scrolling', () => {
  vi.stubGlobal('IntersectionObserver', undefined)
  render(<Box />)
  expect(screen.getByRole('status').textContent).toBe('shown')
})
