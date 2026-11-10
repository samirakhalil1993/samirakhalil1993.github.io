import { useState, type ReactNode } from 'react'
import type { Project } from '../content/schema'
import { Modal } from './Modal'
import { Tag } from './Tag'

const linkClass = 'flex min-h-11 w-fit items-center text-sm font-semibold text-link hover:underline'

/** One titled part of the details. */
function Part({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h4 className="mb-2 text-sm font-semibold">{title}</h4>
      {children}
    </div>
  )
}

/** A text part, shown only when the project has that text. */
function TextPart({ title, text }: { title: string; text?: string }) {
  if (!text) return null
  return (
    <Part title={title}>
      <p className="leading-relaxed whitespace-pre-line text-muted">{text}</p>
    </Part>
  )
}

/**
 * The expanded part of a project card. A part without content is left out,
 * so nothing here is ever filled with invented text.
 */
export function ProjectDetails({ project }: { project: Project }) {
  const [imageOpen, setImageOpen] = useState(false)
  const { details } = project

  const hasText = Boolean(
    details.problemGoal ||
      details.solutionArchitecture ||
      details.contributions ||
      details.resultsChallenges,
  )
  const documentation = details.documentation ?? []
  const hasLinks = Boolean(project.github) || documentation.length > 0

  return (
    <div className="space-y-6 border-t border-border p-6">
      {!hasText && <p className="text-muted">More details will be added soon.</p>}

      <TextPart title="Problem & Goal" text={details.problemGoal} />
      <TextPart title="Solution & Architecture" text={details.solutionArchitecture} />
      <TextPart title="My Contributions" text={details.contributions} />

      <Part title="Technologies Used">
        <ul className="flex flex-wrap gap-2">
          {project.tags.map((tag, index) => (
            <Tag key={`${index}-${tag}`}>{tag}</Tag>
          ))}
        </ul>
      </Part>

      <TextPart title="Results & Challenges" text={details.resultsChallenges} />

      {project.image && (
        <Part title="Screenshots & Diagrams">
          <button
            type="button"
            onClick={() => setImageOpen(true)}
            aria-label={`Enlarge image: ${project.imageAlt}`}
            className="block w-full cursor-zoom-in overflow-hidden rounded-control border border-border transition-colors hover:border-accent"
          >
            <img src={project.image} alt="" loading="lazy" className="w-full" />
          </button>
          <Modal
            open={imageOpen}
            onClose={() => setImageOpen(false)}
            title={project.imageAlt ?? project.title}
            wide
          >
            <img src={project.image} alt={project.imageAlt} className="mx-auto max-w-full" />
          </Modal>
        </Part>
      )}

      {hasLinks && (
        <Part title="GitHub & Documentation">
          <ul>
            {project.github && (
              <li>
                <a
                  href={project.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={linkClass}
                >
                  Source code on GitHub
                </a>
              </li>
            )}
            {documentation.map((item) => (
              <li key={item.url}>
                <a href={item.url} target="_blank" rel="noopener noreferrer" className={linkClass}>
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </Part>
      )}
    </div>
  )
}
