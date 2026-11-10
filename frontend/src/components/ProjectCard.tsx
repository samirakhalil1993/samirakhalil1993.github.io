import type { Project } from '../content/schema'
import { ProjectDetails } from './ProjectDetails'
import { Tag } from './Tag'

type ProjectCardProps = {
  project: Project
  expanded: boolean
  onToggle: () => void
}

/** One project in the grid. "Read more" opens the details inside the card. */
export function ProjectCard({ project, expanded, onToggle }: ProjectCardProps) {
  const detailsId = `project-${project.id}-details`

  return (
    <article
      id={`project-${project.id}`}
      className="flex min-w-0 flex-col overflow-hidden rounded-card border border-border bg-card break-words transition-colors hover:border-accent/60"
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
        <div aria-hidden="true" className="aspect-video w-full border-b border-border bg-bg/60" />
      )}

      <div className="flex flex-1 flex-col p-6">
        {project.organisation && <p className="mb-1 text-sm text-muted">{project.organisation}</p>}
        <h3 className="text-xl font-semibold tracking-tight">{project.title}</h3>
        <p className="mt-3 leading-relaxed text-muted">{project.summary}</p>

        <ul className="mt-5 flex flex-wrap gap-2">
          {project.tags.map((tag, index) => (
            <Tag key={`${index}-${tag}`}>{tag}</Tag>
          ))}
        </ul>

        <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2">
          <button
            type="button"
            aria-expanded={expanded}
            aria-controls={detailsId}
            onClick={onToggle}
            className="flex min-h-11 cursor-pointer items-center rounded-control border border-border px-4 text-sm font-semibold transition-colors hover:border-accent"
          >
            {expanded ? 'Show less' : 'Read more'}
            <span className="sr-only">{` about ${project.title}`}</span>
          </button>

          {project.github && (
            <a
              href={project.github}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${project.title} on GitHub`}
              className="flex min-h-11 items-center text-sm font-semibold text-link hover:underline"
            >
              View on GitHub
            </a>
          )}
        </div>
      </div>

      {/*
        Always in the page so it can slide open and shut. While collapsed it is
        switched off for keyboard and screen readers.
      */}
      <div
        id={detailsId}
        className="expand"
        data-open={expanded}
        inert={!expanded}
        aria-hidden={!expanded}
      >
        <div className="min-h-0 overflow-hidden">
          <ProjectDetails project={project} />
        </div>
      </div>
    </article>
  )
}
