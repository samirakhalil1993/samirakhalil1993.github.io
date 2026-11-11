/*
 * Text that must never appear in the content files. Used by the tests only.
 *
 * The repository is public, so the rules give nothing away themselves: no
 * real phone number is written here, and names that must not be mentioned
 * are not stored in the repository at all. They are read from
 *   - the environment variable BANNED_NAMES (comma-separated), or
 *   - the file .banned-names in the repository root (one name per line),
 * which git ignores. Without either, only the phone-number rule runs.
 */
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

const namesFile = path.resolve(import.meta.dirname, '../../../.banned-names')

/** Splits a list of names written with commas or line breaks. */
export function parseBannedNames(raw: string): string[] {
  return raw
    .split(/[,\n]/)
    .map((name) => name.trim().toLowerCase())
    .filter((name) => name !== '' && !name.startsWith('#'))
}

/** The names this site must not mention, from the environment and the local file. */
export function loadBannedNames(env: string | undefined = process.env.BANNED_NAMES): string[] {
  const fromFile = existsSync(namesFile) ? readFileSync(namesFile, 'utf8') : ''
  return [...new Set([...parseBannedNames(env ?? ''), ...parseBannedNames(fromFile)])]
}

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

/** Returns every banned piece of text found, or an empty list. */
export function findBannedText(rawText: string, names: string[] = loadBannedNames()): string[] {
  const text = rawText.replace(uuid, '')
  const lower = text.toLowerCase()
  const found: string[] = []
  // Found anywhere, also inside a longer word.
  if (names.some((name) => lower.includes(name.toLowerCase()))) found.push(BANNED_NAME_FOUND)
  const phone = text.match(phoneNumber)
  if (phone) found.push(phone[0])
  return found
}
