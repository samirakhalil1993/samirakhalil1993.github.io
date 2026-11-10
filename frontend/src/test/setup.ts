import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// Remove rendered components after each test so tests cannot affect each other.
afterEach(cleanup)

// jsdom has no IntersectionObserver. This stand-in does nothing, which is
// enough for components that only need it to exist. Tests that care about
// scrolling install their own version.
globalThis.IntersectionObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return []
  }
  root = null
  rootMargin = ''
  thresholds = []
} as unknown as typeof IntersectionObserver
