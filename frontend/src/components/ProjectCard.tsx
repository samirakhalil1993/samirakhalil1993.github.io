import type { Project } from '../content/schema'
import { Tag } from './Tag'

/** One project in the grid. The Read More expansion is added in Phase 3. */
export function ProjectCard({ project }: { project: Project }) {
  return (
    <article
      id={`project-${project.id}`}
      className="flex min-w-0 scroll-mt-20 flex-col overflow-hidden rounded-card border border-border bg-card break-words transition-colors hover:border-accent/60"
    >
      {project.image ? (
        <img
          src={project.image}
          alt={project.imageAlt}
          loading="lazy"
          className="aspect-video w-full object-cover"
        />
      ) : (
        // Neutral placeholder until the project has an image.
        <div
          aria-hidden="true"
          className="aspect-video w-full border-b border-border bg-bg/60"
        />
      )}

      <div className="flex flex-1 flex-col p-6">
        {project.organisation && <p className="mb-1 text-sm text-muted">{project.organisation}</p>}
        <h3 className="text-xl font-semibold tracking-tight">{project.title}</h3>
        <p className="mt-3 leading-relaxed text-muted">{project.summary}</p>

        <ul className="mt-5 flex flex-wrap gap-2">
          {project.tags.map((tag) => (
            <Tag key={tag}>{tag}</Tag>
          ))}
        </ul>

        {project.github && (
          <a
            href={project.github}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${project.title} on GitHub`}
            className="mt-5 flex min-h-11 items-center self-start text-sm font-semibold text-link hover:underline"
          >
            View on GitHub
          </a>
        )}
      </div>
    </article>
  )
}
