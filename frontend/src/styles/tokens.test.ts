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
  // Blue text (links) must be readable on both surfaces.
  ['link', 'bg', 4.5],
  ['link', 'card', 4.5],
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

test('jumps and keyboard focus stay clear of the sticky navbar', () => {
  expect(css).toMatch(/html\s*\{[^}]*scroll-padding-top: 5rem/)
})

/** The CSS with the "motion allowed" block cut out. */
function cssWithoutMotionBlock(): string {
  const start = css.indexOf('@media (prefers-reduced-motion: no-preference)')
  // The block ends at the first closing brace that sits at its own indent level.
  const end = css.indexOf('\n  }\n', start)
  expect(start).toBeGreaterThan(-1)
  expect(end).toBeGreaterThan(start)
  return css.slice(0, start) + css.slice(end)
}

test.each(["[data-reveal='hidden']", 'pulse-dot', 'transition: grid-template-rows'])(
  'the motion rule "%s" exists only where motion is allowed',
  (rule) => {
    expect(css).toContain(rule)
    expect(cssWithoutMotionBlock()).not.toContain(rule)
  },
)

test('a printed page shows every section, even ones never scrolled to', () => {
  expect(css).toMatch(/@media print\s*\{[^}]*\[data-reveal\]\s*\{[^}]*opacity: 1 !important/)
})

test.each(['bg', 'card'])('the border of form fields is visible on %s', (surface) => {
  expect(contrastRatio(token('control-border'), token(surface))).toBeGreaterThanOrEqual(3)
})

test.each([
  ['error', 'bg', 4.5],
  ['error', 'card', 4.5],
  ['success', 'card', 3],
])('%s on %s has a contrast of at least %d', (fg, bg, min) => {
  expect(contrastRatio(token(fg), token(bg))).toBeGreaterThanOrEqual(min)
})
