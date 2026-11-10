import type { ReactNode } from 'react'
import type { SectionId } from '../sections'

type SectionProps = {
  id: SectionId
  title: string
  children: ReactNode
}

/** A page section with its heading and the spacing every section shares. */
export function Section({ id, title, children }: SectionProps) {
  const headingId = `${id}-heading`

  return (
    // scroll-mt keeps the heading clear of the sticky navbar after a jump.
    <section id={id} aria-labelledby={headingId} className="scroll-mt-20 py-12 md:py-16">
      <h2 id={headingId} className="mb-8 text-2xl font-semibold tracking-tight md:text-3xl">
        {title}
      </h2>
      {children}
    </section>
  )
}
