/*
 * Text that must never appear in the content files. Used by the tests only.
 * The content folder is public (website, repository, AI assistant), so the
 * rules give nothing away themselves: no real phone number is written down
 * here, and a name that must not be mentioned is stored only as a
 * fingerprint (a SHA-256 hash), never as readable text.
 */
import { createHash } from 'node:crypto'

/** A name that must not appear: how many letters it has, and its fingerprint in lower case. */
export type BannedName = { length: number; sha256: string }

/** Makes the entry for a name. Run it once by hand; do not commit the name itself. */
export function bannedName(name: string): BannedName {
  const lower = name.toLowerCase()
  return { length: lower.length, sha256: createHash('sha256').update(lower).digest('hex') }
}

/** The names this site must not mention. */
export const BANNED_NAMES: BannedName[] = [
  { length: 6, sha256: '0000000000000000000000000000000000000000000000000000000000000000' },
]

/** What is reported when a banned name is found. The name itself is never printed. */
export const BANNED_NAME_FOUND = 'a name that must not be mentioned'

/**
 * Anything that looks like a phone number: nine or more digits in a row,
 * allowing one space, dot, dash or bracket between digits, with an optional
 * leading "+". Years, ranges of years and ordinary figures are shorter.
 */
const phoneNumber = /\+?\d(?:[\s().-]{0,2}\d){8,}/

/** The shape of a form access key. Its digit groups can look like a phone number. */
const uuid = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi

/** True when a banned name occurs anywhere in the text, also inside a longer word. */
function hasBannedName(text: string, names: BannedName[]): boolean {
  const wanted = new Map<number, Set<string>>()
  for (const name of names) {
    wanted.set(name.length, (wanted.get(name.length) ?? new Set()).add(name.sha256))
  }
  // Runs of letters and digits; every stretch of the right length is compared.
  for (const word of text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []) {
    for (const [length, hashes] of wanted) {
      for (let start = 0; start + length <= word.length; start += 1) {
        const piece = word.slice(start, start + length)
        if (hashes.has(createHash('sha256').update(piece).digest('hex'))) return true
      }
    }
  }
  return false
}

/** Returns every banned piece of text found, or an empty list. */
export function findBannedText(rawText: string, names: BannedName[] = BANNED_NAMES): string[] {
  const text = rawText.replace(uuid, '')
  const found: string[] = []
  if (hasBannedName(text, names)) found.push(BANNED_NAME_FOUND)
  const phone = text.match(phoneNumber)
  if (phone) found.push(phone[0])
  return found
}
