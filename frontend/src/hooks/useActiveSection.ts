import { useEffect, useState } from 'react'

/**
 * How far below the top of the window a section's top edge must be to count
 * as "reached", in pixels. A link jump puts a section 80 px from the top
 * (see scroll-padding-top in tokens.css), so the line sits a little lower.
 */
const LINE = 100

function findActive<Id extends string>(ids: readonly Id[]): Id | null {
  let active: Id | null = null
  let last: Id | null = null

  // The active section is the last one whose top edge has passed the line.
  for (const id of ids) {
    const element = document.getElementById(id)
    if (!element) continue
    last = id
    if (element.getBoundingClientRect().top <= LINE) active = id
  }

  // The last section is often too short to reach the line. At the very
  // bottom of the page it is the one being read.
  const pageHeight = document.documentElement.scrollHeight
  const atBottom = pageHeight > window.innerHeight && window.innerHeight + window.scrollY >= pageHeight - 2
  return atBottom ? last : active
}

/**
 * Tells which section the visitor is currently reading: the last section
 * whose top edge has reached the line just under the sticky navbar.
 * Returns null while no section has reached it.
 */
export function useActiveSection<Id extends string>(ids: readonly Id[]): Id | null {
  const [activeId, setActiveId] = useState<Id | null>(null)

  // Joined into one string so the effect only restarts when the ids change,
  // not every time the caller builds a new array with the same ids.
  const idList = ids.join(',')

  useEffect(() => {
    const orderedIds = idList.split(',') as Id[]
    const update = () => setActiveId(findActive(orderedIds))

    update()
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [idList])

  return activeId
}
