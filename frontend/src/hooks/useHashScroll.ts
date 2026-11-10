import { useEffect } from 'react'

/**
 * Makes links such as `/#contact` work when the page is opened directly.
 * The browser looks for the section before the page has been drawn, finds
 * nothing and stays at the top, so the jump is repeated once after drawing.
 */
export function useHashScroll(): void {
  useEffect(() => {
    const id = decodeURIComponent(window.location.hash.slice(1))
    if (id) document.getElementById(id)?.scrollIntoView()
  }, [])
}
