import { useState } from 'react'
import type { Project } from '../content/schema'
import { ProjectCard } from './ProjectCard'
import { Section } from './Section'

/** The project grid: two columns on desktop, one on mobile. */
export function Projects({ projects }: { projects: Project[] }) {
  // Only one card is open at a time, so the grid moves once, not twice.
  const [expandedId, setExpandedId] = useState<string | null>(null)

  if (projects.length === 0) return null

  return (
    <Section id="projects" title="Featured Projects">
      {/* Cards in the same row always share one height, open or closed. */}
      <div className="grid gap-6 md:grid-cols-2">
        {projects.map((project) => (
          <ProjectCard
            key={project.id}
            project={project}
            expanded={project.id === expandedId}
            onToggle={() => setExpandedId(project.id === expandedId ? null : project.id)}
          />
        ))}
      </div>
    </Section>
  )
}
