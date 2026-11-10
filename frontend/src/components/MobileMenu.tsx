import { useEffect, useRef, useState } from 'react'
import { sections, type SectionId } from '../sections'

/** The hamburger button and its menu, shown only on small screens. */
export function MobileMenu({ activeId }: { activeId: SectionId | null }) {
  const [open, setOpen] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)

  // Escape closes the menu and puts focus back on the button.
  useEffect(() => {
    if (!open) return
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false)
        buttonRef.current?.focus()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open])

  return (
    <div className="md:hidden">
      <button
        ref={buttonRef}
        type="button"
        aria-label={open ? 'Close menu' : 'Open menu'}
        aria-expanded={open}
        aria-controls="mobile-menu"
        onClick={() => setOpen(!open)}
        className="flex size-11 cursor-pointer items-center justify-center rounded-control border border-border transition-colors hover:border-accent"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="size-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
        </svg>
      </button>

      {open && (
        <nav
          id="mobile-menu"
          aria-label="Mobile"
          className="absolute inset-x-0 top-16 border-b border-border bg-card px-4 py-2 shadow-lg"
        >
          <ul>
            {sections.map((section) => {
              const isActive = section.id === activeId
              return (
                <li key={section.id}>
                  <a
                    href={`#${section.id}`}
                    aria-current={isActive ? 'true' : undefined}
                    onClick={() => setOpen(false)}
                    className={`flex min-h-11 items-center border-l-2 px-3 ${
                      isActive ? 'border-accent text-link' : 'border-transparent text-muted'
                    }`}
                  >
                    {section.label}
                  </a>
                </li>
              )
            })}
          </ul>
        </nav>
      )}
    </div>
  )
}
