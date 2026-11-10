import { render } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import { Section } from './Section'

afterEach(() => vi.unstubAllGlobals())

test('is marked as shown when the browser cannot watch scrolling', () => {
  vi.stubGlobal('IntersectionObserver', undefined)
  const { container } = render(
    <Section id="about" title="About">
      <p>Text</p>
    </Section>,
  )
  expect(container.querySelector('section')!.getAttribute('data-reveal')).toBe('shown')
})

test('starts hidden when the browser can watch scrolling', () => {
  const { container } = render(
    <Section id="about" title="About">
      <p>Text</p>
    </Section>,
  )
  expect(container.querySelector('section')!.getAttribute('data-reveal')).toBe('hidden')
})
