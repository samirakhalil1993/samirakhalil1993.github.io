import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { expect, test } from 'vitest'
import { BANNED_NAME_FOUND, BANNED_NAMES, bannedName, findBannedText } from '../test/banned'
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

test('accepts projects and experience entries with only the required fields', () => {
  const c = clone()
  c.projects = [{ id: 'p', title: 'T', summary: 'S', tags: ['x'], details: {} }]
  c.experience.forEach((entry: { projectId?: string; context?: string; location?: string }) => {
    delete entry.projectId
    delete entry.context
    delete entry.location
  })
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

test('rejects a project image without a description', () => {
  const c = clone()
  c.projects[0].image = 'images/sre.png'
  expect(() => validateContent(c)).toThrow(/imageAlt/)
})

test('rejects an empty project list', () => {
  const c = clone()
  c.projects = []
  c.experience.forEach((entry: { projectId?: string }) => delete entry.projectId)
  expect(() => validateContent(c)).toThrow(/projects/)
})

test.each(['/cv.pdf', 'javascript:alert(1)', 'cv.docx', 'https://example.com/cv.pdf'])(
  'rejects the CV path %s (it must be a relative .pdf path)',
  (cvPath) => {
    const c = clone()
    c.contact.cvPath = cvPath
    expect(() => validateContent(c)).toThrow(/cvPath/)
  },
)

const sampleKey = '0a1b2c3d-1234-4567-8901-234567890abc'

test('accepts a Web3Forms access key', () => {
  const c = clone()
  c.contact.formAccessKey = sampleKey
  expect(() => validateContent(c)).not.toThrow()
})

test('rejects an access key that is not a UUID', () => {
  const c = clone()
  c.contact.formAccessKey = 'abc'
  expect(() => validateContent(c)).toThrow(/formAccessKey/)
})

test('rejects the old formEndpoint field', () => {
  const c = clone()
  c.contact.formEndpoint = 'https://example.com/form'
  expect(() => validateContent(c)).toThrow(/formEndpoint/)
})

test('findBannedText ignores an access key, although its digits resemble a phone number', () => {
  expect(findBannedText(`"formAccessKey": "${sampleKey}"`)).toEqual([])
})

test('findBannedText still catches a phone number next to an access key', () => {
  expect(findBannedText(`"${sampleKey}" call 070-1234567`)).not.toEqual([])
})

test('the chat settings are complete and point at the live backend', () => {
  expect(content.chat.title).toBe('Ask about Samir')
  expect(content.chat.demo).toBe(false)
  expect(content.chat.demoNotice).toMatch(/prepared example answers/)
  expect(content.chat.errorMessage).toMatch(/not available/)
  expect(content.chat.wakingMessage).toMatch(/waking up/)
  expect(content.chat.apiUrl).toMatch(/^https:\/\/[a-z0-9-]+\.onrender\.com$/)
})

test('the chat has a notice for live mode', () => {
  expect(content.chat.liveNotice).toMatch(/AI model/)
})

test.each(['https://api.example.com', 'https://samir-portfolio-api.onrender.com'])(
  'accepts the chat API address %s',
  (apiUrl) => {
    const c = clone()
    c.chat.apiUrl = apiUrl
    expect(() => validateContent(c)).not.toThrow()
  },
)

// The address in chat.json is the one that gets published. A local test
// address, or one with a path the code would not expect, must stop the build.
test.each([
  'http://example.com',
  'http://localhost:8000',
  'http://127.0.0.1:8000',
  'https://localhost',
  'https://localhost:8000',
  'https://127.0.0.1:8000',
  'https://api.example.com/',
  'https://api.example.com/api',
  'https://api.example.com?x=1',
  'https://api.example.com#x',
  'https://api example.com',
])('rejects the chat API address %s', (apiUrl) => {
  const c = clone()
  c.chat.apiUrl = apiUrl
  expect(() => validateContent(c)).toThrow(/apiUrl/)
})

test('rejects chat settings without a waking message', () => {
  const c = clone()
  delete c.chat.wakingMessage
  expect(() => validateContent(c)).toThrow(/wakingMessage/)
})

test('rejects chat settings without a live notice', () => {
  const c = clone()
  delete c.chat.liveNotice
  expect(() => validateContent(c)).toThrow(/liveNotice/)
})

test('rejects chat settings without a title', () => {
  const c = clone()
  delete c.chat.title
  expect(() => validateContent(c)).toThrow(/title/)
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

// The content folder as it is on disk. The backend will read these files
// directly, so the checks below look at the files, not at the joined object.
const contentDir = path.resolve(import.meta.dirname, '../../../content')
const contentFiles = readdirSync(contentDir).sort()

test('the content folder holds exactly the nine known files', () => {
  expect(contentFiles).toEqual([
    'availability.json',
    'chat.json',
    'contact.json',
    'education.json',
    'experience.json',
    'knowledge-sources.json',
    'profile.json',
    'projects.json',
    'skills.json',
  ])
})

test.each([
  ['skills.json', 'categories'],
  ['projects.json', 'projects'],
  ['education.json', 'entries'],
  ['experience.json', 'entries'],
])('%s has no keys besides "%s"', (file, key) => {
  const parsed = JSON.parse(readFileSync(path.join(contentDir, file), 'utf8'))
  expect(Object.keys(parsed)).toEqual([key])
})

test.each([
  ['an international phone number', '"phone": "+46 70 123 45 67"'],
  ['a phone number with a 00 prefix', 'call 0046 70 123 45 67'],
  ['a phone number with brackets', '(070) 123 45 67'],
  ['a phone number with a dash', '070-1234567'],
])('findBannedText catches %s', (_name, text) => {
  expect(findBannedText(text)).not.toEqual([])
})

// The real name is stored only as a fingerprint, so these tests use an
// invented one to prove that the mechanism works.
const example = [bannedName('Zorvex')]

test.each([
  ['as a word', '"notes": "Worked at Zorvex AB"'],
  ['in another case', 'worked at ZORVEX'],
  ['inside a longer word', 'the ZorvexAgent project'],
  ['next to punctuation', 'github.com/zorvex-ab/tool'],
])('findBannedText catches a banned name %s, without repeating it', (_name, text) => {
  expect(findBannedText(text, example)).toEqual([BANNED_NAME_FOUND])
})

test('findBannedText does not flag other words', () => {
  expect(findBannedText('Worked at Zorve and at Orvex on vortex research', example)).toEqual([])
})

test('the list of banned names holds fingerprints, not readable names', () => {
  expect(BANNED_NAMES.length).toBeGreaterThan(0)
  for (const name of BANNED_NAMES) {
    expect(name.sha256).toMatch(/^[0-9a-f]{64}$/)
    expect(name.length).toBeGreaterThan(2)
  }
})

test('findBannedText accepts ordinary numbers and dates', () => {
  expect(findBannedText('2025 - 2026, Sep 2026 – Jan 2027, 7.5 million, about 130 sensors')).toEqual([])
})

test.each(contentFiles)('%s contains no banned text', (file) => {
  expect(findBannedText(readFileSync(path.join(contentDir, file), 'utf8'))).toEqual([])
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
