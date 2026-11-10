import { sections, type SectionId } from '../sections'

type NavbarProps = {
  name: string
  /** The section currently in view, or null at the very top of the page. */
  activeId: SectionId | null
}

/** The sticky bar at the top: the name on the left, section links on the right. */
export function Navbar({ name, activeId }: NavbarProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 md:px-6">
        <a href="#home" className="flex min-h-11 items-center font-semibold tracking-tight">
          {name}
        </a>

        {/* Hidden on small screens until the hamburger menu arrives in Phase 3. */}
        <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
          {sections.map((section) => {
            const isActive = section.id === activeId
            return (
              <a
                key={section.id}
                href={`#${section.id}`}
                aria-current={isActive ? 'true' : undefined}
                className={`flex min-h-11 items-center border-b-2 px-3 text-sm transition-colors ${
                  isActive
                    ? 'border-accent text-link'
                    : 'border-transparent text-muted hover:text-text'
                }`}
              >
                {section.label}
              </a>
            )
          })}
        </nav>
      </div>
    </header>
  )
}
