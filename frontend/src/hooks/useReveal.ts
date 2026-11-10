import { useEffect, useRef, useState, type RefObject } from 'react'

/**
 * Tells when an element has scrolled into view for the first time, so it can
 * fade in once. If the browser cannot watch scrolling, the element counts as
 * revealed from the start, so content is never left hidden.
 */
export function useReveal<T extends HTMLElement>(): {
  ref: RefObject<T | null>
  revealed: boolean
} {
  const ref = useRef<T>(null)
  const [revealed, setRevealed] = useState(() => typeof IntersectionObserver === 'undefined')

  useEffect(() => {
    const element = ref.current
    if (revealed || !element) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setRevealed(true)
          observer.disconnect()
        }
      },
      // Start a little before the element is fully on screen.
      { rootMargin: '0px 0px -10% 0px' },
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [revealed])

  return { ref, revealed }
}
