import type { ReactNode } from 'react'
import { useReveal } from '../hooks/useReveal'
import type { SectionId } from '../sections'

type SectionProps = {
  id: SectionId
  title: string
  children: ReactNode
}

/** A page section with its heading and the spacing every section shares. */
export function Section({ id, title, children }: SectionProps) {
  const headingId = `${id}-heading`
  const { ref, revealed } = useReveal<HTMLElement>()

  return (
    <section
      ref={ref}
      id={id}
      aria-labelledby={headingId}
      // The fade-in itself is CSS, and only runs when motion is allowed.
      data-reveal={revealed ? 'shown' : 'hidden'}
      className="py-12 md:py-16"
    >
      <h2 id={headingId} className="mb-8 text-2xl font-semibold tracking-tight md:text-3xl">
        {title}
      </h2>
      {children}
    </section>
  )
}
