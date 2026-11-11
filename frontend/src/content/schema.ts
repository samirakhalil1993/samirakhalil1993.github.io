import { z } from 'zod'

/*
 * The shape every content file must have. This file is used by the tests
 * only (the build runs the tests first), so zod never ships to the browser.
 * Other files may import the types below with `import type`.
 */

const text = z.string().trim().min(1)
const httpsUrl = z.url({ protocol: /^https$/ })

/** Content files the chatbot is allowed to read. */
const knowledgeFileNames = [
  'profile',
  'availability',
  'skills',
  'projects',
  'education',
  'experience',
  'contact',
]

// Kept as a plain string (not an enum type) so the JSON file can be given the
// `Content` type directly; the list above is still enforced when checked.
const knowledgeFileName = text.refine((name) => knowledgeFileNames.includes(name), {
  error: `Must be one of: ${knowledgeFileNames.join(', ')}`,
})

const profileSchema = z.strictObject({
  name: text,
  title: text,
  intro: text,
  location: text,
  initials: text,
  photo: text.optional(),
  about: z.array(text).min(1),
  footerDescription: text,
})

const availabilitySchema = z.strictObject({
  status: text,
  active: z.boolean(),
})

const skillCategorySchema = z.strictObject({
  name: text,
  tags: z.array(text).min(1),
})

const projectDetailsSchema = z.strictObject({
  problemGoal: text.optional(),
  solutionArchitecture: text.optional(),
  contributions: text.optional(),
  resultsChallenges: text.optional(),
  documentation: z.array(z.strictObject({ label: text, url: httpsUrl })).optional(),
})

const projectSchema = z.strictObject({
  id: text,
  title: text,
  summary: text,
  tags: z.array(text).min(1),
  organisation: text.optional(),
  image: text.optional(),
  imageAlt: text.optional(),
  github: httpsUrl.optional(),
  details: projectDetailsSchema,
})

const educationEntrySchema = z.strictObject({
  institution: text,
  degree: text,
  location: text,
  start: text,
  end: text,
  coursework: z.array(text),
  description: text.optional(),
})

const experienceEntrySchema = z.strictObject({
  id: text,
  title: text,
  organisation: text,
  context: text.optional(),
  location: text.optional(),
  period: text,
  summary: text,
  responsibilities: z.array(text).min(1),
  technologies: z.array(text),
  projectId: text.optional(),
})

const contactSchema = z.strictObject({
  email: z.email(),
  linkedin: httpsUrl,
  github: httpsUrl,
  // A path relative to the site, so it also works when the site is in a sub-folder.
  cvPath: z.string().regex(/^(?!\/)[\w./-]+\.pdf$/, 'Must be a relative path to a .pdf file'),
  // The public key from web3forms.com. Without it the contact form is not shown.
  formAccessKey: z.uuid().optional(),
})

const knowledgeSourcesSchema = z.strictObject({
  contentFiles: z.array(knowledgeFileName),
  includeCv: z.boolean(),
  repos: z.array(httpsUrl),
})

const chatSchema = z.strictObject({
  title: text,
  // Demo mode shows prepared answers with a visible notice. It is only used
  // while no apiUrl is set.
  demo: z.boolean(),
  demoNotice: text,
  // Shown when the chat is connected to the AI backend.
  liveNotice: text,
  // Address of the AI backend. Without it there is no live chat. This is the
  // public address that gets published, so it must be https, must not point
  // at your own computer, and is the bare address with nothing after it.
  // (For local work the address comes from frontend/.env.development.)
  apiUrl: z
    .string()
    .regex(
      /^https:\/\/(?!localhost\b|127\.0\.0\.1\b)[^\s/?#]+$/,
      'Must be a public https:// address with no path, for example https://my-api.example.com',
    )
    .optional(),
  // Shown when a live answer takes long to start (the backend was asleep).
  wakingMessage: text,
  errorMessage: text,
  welcome: text,
  placeholder: text,
  limitMessage: text,
  suggestedQuestions: z.array(text).min(1),
})

/** Adds an error for every id that appears more than once. */
function checkUniqueIds(
  entries: { id: string }[],
  listName: 'projects' | 'experience',
  ctx: z.RefinementCtx,
) {
  const seen = new Set<string>()
  entries.forEach((entry, index) => {
    if (seen.has(entry.id)) {
      ctx.addIssue({
        code: 'custom',
        path: [listName, index, 'id'],
        message: `Duplicate id "${entry.id}" in ${listName}`,
      })
    }
    seen.add(entry.id)
  })
}

export const contentSchema = z
  .strictObject({
    profile: profileSchema,
    availability: availabilitySchema,
    skills: z.array(skillCategorySchema).min(1),
    projects: z.array(projectSchema).min(1),
    education: z.array(educationEntrySchema),
    experience: z.array(experienceEntrySchema),
    contact: contactSchema,
    knowledgeSources: knowledgeSourcesSchema,
    chat: chatSchema,
  })
  .superRefine((content, ctx) => {
    checkUniqueIds(content.projects, 'projects', ctx)
    checkUniqueIds(content.experience, 'experience', ctx)

    content.projects.forEach((project, index) => {
      if (project.image !== undefined && project.imageAlt === undefined) {
        ctx.addIssue({
          code: 'custom',
          path: ['projects', index, 'imageAlt'],
          message: `Project "${project.id}" has an image but no imageAlt description`,
        })
      }
    })

    const projectIds = new Set(content.projects.map((project) => project.id))
    content.experience.forEach((entry, index) => {
      if (entry.projectId !== undefined && !projectIds.has(entry.projectId)) {
        ctx.addIssue({
          code: 'custom',
          path: ['experience', index, 'projectId'],
          message: `Experience "${entry.id}" points to unknown project "${entry.projectId}"`,
        })
      }
    })
  })

export type Content = z.infer<typeof contentSchema>
export type Profile = Content['profile']
export type Availability = Content['availability']
export type SkillCategory = Content['skills'][number]
export type Project = Content['projects'][number]
export type ProjectDetails = Project['details']
export type EducationEntry = Content['education'][number]
export type ExperienceEntry = Content['experience'][number]
export type Contact = Content['contact']
export type KnowledgeSources = Content['knowledgeSources']
export type ChatConfig = Content['chat']

/**
 * Checks the joined content and returns it typed.
 * Throws an error that names the file key and field of every problem.
 */
export function validateContent(raw: unknown): Content {
  return contentSchema.parse(raw)
}
