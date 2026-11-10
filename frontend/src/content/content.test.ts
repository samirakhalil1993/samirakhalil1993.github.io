import { expect, test } from 'vitest'
import { content } from './index'
import { rawContent } from './raw'
import { validateContent } from './schema'

// A deep copy of the real content that a test can break on purpose.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const clone = () => structuredClone(rawContent) as any

test('the real content files are valid', () => {
  expect(() => validateContent(rawContent)).not.toThrow()
})

test('rejects a profile without a title', () => {
  const c = clone()
  delete c.profile.title
  expect(() => validateContent(c)).toThrow(/profile.*title|title.*profile/s)
})

test('rejects a misspelled key', () => {
  const c = clone()
  c.profile.titel = 'x'
  expect(() => validateContent(c)).toThrow(/titel/)
})

test('rejects an empty string', () => {
  const c = clone()
  c.profile.name = ''
  expect(() => validateContent(c)).toThrow(/name/)
})

test('accepts a project with only the required fields', () => {
  const c = clone()
  c.projects = [{ id: 'p', title: 'T', summary: 'S', tags: ['x'], details: {} }]
  c.experience.forEach((entry: { projectId?: string }) => delete entry.projectId)
  expect(() => validateContent(c)).not.toThrow()
})

test('rejects an experience entry with an unknown projectId', () => {
  const c = clone()
  c.experience[0].projectId = 'nope'
  expect(() => validateContent(c)).toThrow(/nope/)
})

test('rejects two projects with the same id', () => {
  const c = clone()
  c.projects[1].id = c.projects[0].id
  expect(() => validateContent(c)).toThrow(/sre-agent/)
})

test('rejects a knowledge source that is not a content file', () => {
  const c = clone()
  c.knowledgeSources.contentFiles.push('secrets')
  expect(() => validateContent(c)).toThrow(/contentFiles/)
})

test('rejects a contact link that is not https', () => {
  const c = clone()
  c.contact.github = 'http://github.com/someone'
  expect(() => validateContent(c)).toThrow(/github/)
})

test('contains no banned text', () => {
  const text = JSON.stringify(rawContent)
  expect(text).not.toMatch(/ExampleCo/i)
  expect(text).not.toMatch(/\+46|073[\s-]?916/)
})

test('holds the agreed headline facts', () => {
  expect(content.profile.title).toBe('M.Sc. Engineering Student | AI & Machine Learning')
  expect(content.availability.status).toBe("Seeking a Master's Thesis in AI · Spring 2027")
  expect(content.projects.map((p) => p.id)).toEqual([
    'sre-agent',
    'sensor-classification',
    'distilbert-data-poisoning',
    'hospital-readmission',
  ])
  expect(content.experience.map((e) => e.organisation)).toEqual([
    'Trafikverket (Swedish Transport Administration)',
    'Axiogreen',
    'Ericsson',
  ])
  expect(content.skills.map((s) => s.name)).toEqual([
    'Languages',
    'Machine Learning',
    'AI Methods',
    'Backend & Data',
    'DevOps & Tools',
  ])
})
