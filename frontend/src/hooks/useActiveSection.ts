import { useEffect, useState } from 'react'

/**
 * Tells which section the visitor is currently reading.
 *
 * A section counts as "current" while it crosses the upper part of the
 * window, just below the sticky navbar. Returns null until a section has done so.
 */
export function useActiveSection<Id extends string>(ids: readonly Id[]): Id | null {
  const [activeId, setActiveId] = useState<Id | null>(null)

  // Joined into one string so the effect only restarts when the ids change,
  // not every time the caller builds a new array with the same ids.
  const idList = ids.join(',')

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const entered = entries.find((entry) => entry.isIntersecting)
        if (entered) setActiveId(entered.target.id as Id)
      },
      { rootMargin: '-80px 0px -60% 0px' },
    )

    for (const id of idList.split(',')) {
      const element = document.getElementById(id)
      if (element) observer.observe(element)
    }
    return () => observer.disconnect()
  }, [idList])

  return activeId
}
