import type { Project } from '../content/schema'
import { ProjectCard } from './ProjectCard'
import { Section } from './Section'

/** The project grid: two columns on desktop, one on mobile. */
export function Projects({ projects }: { projects: Project[] }) {
  if (projects.length === 0) return null

  return (
    <Section id="projects" title="Featured Projects">
      <div className="grid gap-6 md:grid-cols-2">
        {projects.map((project) => (
          <ProjectCard key={project.id} project={project} />
        ))}
      </div>
    </Section>
  )
}
