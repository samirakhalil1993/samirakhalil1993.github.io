import { readFileSync } from 'node:fs'
import path from 'node:path'
import { expect, test } from 'vitest'
import { contrastRatio } from './contrast'

const css = readFileSync(path.join(import.meta.dirname, 'tokens.css'), 'utf8')

/** Reads one colour token, for example token('bg') for `--color-bg`. */
function token(name: string): string {
  const match = css.match(new RegExp(`--color-${name}:\\s*(#[0-9A-Fa-f]{6});`))
  if (!match) throw new Error(`Colour token --color-${name} not found in tokens.css`)
  return match[1]
}

test('contrastRatio matches the known black and white value', () => {
  expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 1)
})

test('tokens hold the colours from the spec', () => {
  expect(token('bg')).toBe('#111318')
  expect(token('card')).toBe('#1E222B')
  expect(token('text')).toBe('#F8FAFC')
  expect(token('muted')).toBe('#A1A1AA')
  expect(token('accent')).toBe('#3B82F6')
})

test.each([
  ['text', 'bg', 7],
  ['text', 'card', 7],
  ['muted', 'bg', 4.5],
  ['muted', 'card', 4.5],
  ['accent', 'bg', 4.5],
])('%s on %s has a contrast of at least %d', (fg, bg, min) => {
  expect(contrastRatio(token(fg), token(bg))).toBeGreaterThanOrEqual(min)
})

test('white on the button colour has a contrast of at least 4.5', () => {
  expect(contrastRatio('#FFFFFF', token('button'))).toBeGreaterThanOrEqual(4.5)
})

test('smooth scrolling is only on when motion is allowed', () => {
  expect(css).toMatch(
    /@media \(prefers-reduced-motion: no-preference\)[^}]*\{[^}]*scroll-behavior: smooth/s,
  )
  // Outside that media query there must be no other smooth-scroll rule.
  expect(css.match(/scroll-behavior: smooth/g)).toHaveLength(1)
})
