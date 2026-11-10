import { useEffect, useState } from 'react'

/**
 * Tells which section the visitor is currently reading.
 *
 * A section counts as "in view" while it crosses the upper part of the
 * window, just below the sticky navbar. When several are in view at once
 * (short sections on a tall screen), the one that comes first on the page
 * wins. Returns null until a section has been in view.
 */
export function useActiveSection<Id extends string>(ids: readonly Id[]): Id | null {
  const [activeId, setActiveId] = useState<Id | null>(null)

  // Joined into one string so the effect only restarts when the ids change,
  // not every time the caller builds a new array with the same ids.
  const idList = ids.join(',')

  useEffect(() => {
    const orderedIds = idList.split(',') as Id[]
    const inView = new Set<string>()

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) inView.add(entry.target.id)
          else inView.delete(entry.target.id)
        }
        const first = orderedIds.find((id) => inView.has(id))
        // With nothing in view (between two sections), keep the last one.
        if (first) setActiveId(first)
      },
      { rootMargin: '-80px 0px -60% 0px' },
    )

    for (const id of orderedIds) {
      const element = document.getElementById(id)
      if (element) observer.observe(element)
    }
    return () => observer.disconnect()
  }, [idList])

  return activeId
}
