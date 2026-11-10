import type { ExperienceEntry } from '../content/schema'
import { Section } from './Section'
import { Tag } from './Tag'

/** Project and work experience, newest first (the order of the content file). */
export function Experience({ entries }: { entries: ExperienceEntry[] }) {
  return (
    <Section id="experience" title="Experience">
      <div className="space-y-6">
        {entries.map((entry) => (
          <article
            key={entry.id}
            className="min-w-0 rounded-card border border-border bg-card p-6 break-words"
          >
            <div className="flex flex-col gap-1 md:flex-row md:items-baseline md:justify-between md:gap-6">
              <h3 className="text-xl font-semibold tracking-tight">{entry.title}</h3>
              <p className="shrink-0 text-sm text-muted">{entry.period}</p>
            </div>
            <p className="mt-1">{entry.organisation}</p>
            {/* The context line says what kind of engagement this was. */}
            {entry.context && <p className="text-sm text-muted">{entry.context}</p>}
            {entry.location && <p className="text-sm text-muted">{entry.location}</p>}

            <p className="mt-4 leading-relaxed">{entry.summary}</p>
            <ul className="mt-3 list-disc space-y-2 pl-5 leading-relaxed text-muted marker:text-accent">
              {entry.responsibilities.map((responsibility) => (
                <li key={responsibility}>{responsibility}</li>
              ))}
            </ul>

            {entry.technologies.length > 0 && (
              <ul className="mt-5 flex flex-wrap gap-2">
                {entry.technologies.map((technology) => (
                  <Tag key={technology}>{technology}</Tag>
                ))}
              </ul>
            )}

            {entry.projectId && (
              <a
                href={`#project-${entry.projectId}`}
                className="mt-4 flex min-h-11 w-fit items-center text-sm font-semibold text-link hover:underline"
              >
                View project
              </a>
            )}
          </article>
        ))}
      </div>
    </Section>
  )
}
