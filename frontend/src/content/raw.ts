import availability from '@content/availability.json'
import chat from '@content/chat.json'
import contact from '@content/contact.json'
import education from '@content/education.json'
import experience from '@content/experience.json'
import knowledgeSources from '@content/knowledge-sources.json'
import profile from '@content/profile.json'
import projects from '@content/projects.json'
import skills from '@content/skills.json'

/**
 * The nine content files joined into one object, exactly as written on disk.
 * Nothing here is checked: `schema.ts` checks it in the tests, and `index.ts`
 * gives it its type.
 */
export const rawContent = {
  profile,
  availability,
  skills: skills.categories,
  projects: projects.projects,
  education: education.entries,
  experience: experience.entries,
  contact,
  knowledgeSources,
  chat,
}
