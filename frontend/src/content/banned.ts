/*
 * Text that must never appear in the content files. Used by the tests only.
 * The content folder is public (website, repository, AI assistant), so the
 * rules are general on purpose: no real phone number is written down here.
 */

/** A company the site must not mention. */
const bannedWords = [/ExampleCo/i]

/**
 * Anything that looks like a phone number: nine or more digits in a row,
 * allowing one space, dot, dash or bracket between digits, with an optional
 * leading "+". Years, ranges of years and ordinary figures are shorter.
 */
const phoneNumber = /\+?\d(?:[\s().-]{0,2}\d){8,}/

/** Returns every banned piece of text found, or an empty list. */
export function findBannedText(text: string): string[] {
  const found: string[] = []
  for (const pattern of [...bannedWords, phoneNumber]) {
    const match = text.match(pattern)
    if (match) found.push(match[0])
  }
  return found
}
