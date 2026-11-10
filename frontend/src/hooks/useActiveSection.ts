import { useEffect, useState } from 'react'

/**
 * Tells which section the visitor is currently reading.
 *
 * A section counts as "current" while it crosses a thin band a little above
 * the middle of the window. Returns null until a section has done so.
 */
export function useActiveSection<Id extends string>(ids: readonly Id[]): Id | null {
  const [activeId, setActiveId] = useState<Id | null>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const entered = entries.find((entry) => entry.isIntersecting)
        if (entered) setActiveId(entered.target.id as Id)
      },
      { rootMargin: '-40% 0px -55% 0px' },
    )

    for (const id of ids) {
      const element = document.getElementById(id)
      if (element) observer.observe(element)
    }
    return () => observer.disconnect()
  }, [ids])

  return activeId
}
