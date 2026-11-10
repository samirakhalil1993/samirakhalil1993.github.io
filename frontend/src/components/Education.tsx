import type { EducationEntry } from '../content/schema'
import { Section } from './Section'
import { Tag } from './Tag'

/** Degrees and study programmes, newest first (the order of the content file). */
export function Education({ entries }: { entries: EducationEntry[] }) {
  return (
    <Section id="education" title="Education">
      <div className="space-y-6">
        {entries.map((entry) => (
          <article
            key={`${entry.institution}-${entry.degree}`}
            className="min-w-0 rounded-card border border-border bg-card p-6 break-words"
          >
            <div className="flex flex-col gap-1 md:flex-row md:items-baseline md:justify-between md:gap-6">
              <h3 className="text-xl font-semibold tracking-tight">{entry.degree}</h3>
              <p className="shrink-0 text-sm text-muted">{`${entry.start} – ${entry.end}`}</p>
            </div>
            <p className="mt-1">{entry.institution}</p>
            <p className="text-sm text-muted">{entry.location}</p>

            {entry.description && (
              <p className="mt-4 leading-relaxed text-muted">{entry.description}</p>
            )}

            {entry.coursework.length > 0 && (
              <>
                <p className="mt-5 mb-3 text-sm font-semibold">Relevant coursework</p>
                <ul className="flex flex-wrap gap-2">
                  {entry.coursework.map((course) => (
                    <Tag key={course}>{course}</Tag>
                  ))}
                </ul>
              </>
            )}
          </article>
        ))}
      </div>
    </Section>
  )
}
