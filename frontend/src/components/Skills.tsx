import type { SkillCategory } from '../content/schema'
import { Section } from './Section'
import { Tag } from './Tag'

/** Technical skills as plain tags, grouped by category. */
export function Skills({ categories }: { categories: SkillCategory[] }) {
  return (
    <Section id="skills" title="Technical Skills">
      <div className="grid gap-6 md:grid-cols-2">
        {categories.map((category) => (
          <div
            key={category.name}
            className="min-w-0 rounded-card border border-border bg-card p-6"
          >
            <h3 className="mb-4 font-semibold">{category.name}</h3>
            <ul className="flex flex-wrap gap-2">
              {category.tags.map((tag) => (
                <Tag key={tag}>{tag}</Tag>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Section>
  )
}
