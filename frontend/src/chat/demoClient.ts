import type { Content } from '../content/schema'
import type { ChatClient, Source } from './types'

type Answer = { text: string; sources: Source[] }

const fallback: Answer = {
  text: 'This demo has prepared answers about projects, skills, experience, education and contact. Try one of those topics.',
  sources: [],
}

const includesAny = (question: string, words: string[]) =>
  words.some((word) => question.includes(word))

/**
 * Picks the prepared answer for a question. Every answer is put together
 * from the content files, so the demo cannot say anything the site does not.
 */
function answerFor(rawQuestion: string, content: Content): Answer {
  const question = rawQuestion.toLowerCase()
  const firstName = content.profile.name.split(' ')[0]

  // A question about one project: matched by a word of its id, such as "sre".
  const project = content.projects.find((candidate) =>
    candidate.id
      .split('-')
      .filter((word) => word.length > 2 && word !== 'agent' && word !== 'data')
      .some((word) => question.includes(word)),
  )
  if (project) {
    return {
      text: `${project.title}: ${project.summary}`,
      sources: [{ label: `Project: ${project.title}`, sectionId: `project-${project.id}` }],
    }
  }

  if (question.includes('project')) {
    const titles = content.projects.map((item) => item.title).join(', ')
    return {
      text: `${firstName} has worked on: ${titles}.`,
      sources: [{ label: 'Projects', sectionId: 'projects' }],
    }
  }

  if (includesAny(question, ['skill', 'technolog', 'tool', 'language'])) {
    return {
      text: content.skills
        .map((category) => `${category.name}: ${category.tags.join(', ')}.`)
        .join(' '),
      sources: [{ label: 'Technical Skills', sectionId: 'skills' }],
    }
  }

  if (includesAny(question, ['machine learning', 'ml ', 'experience', 'work'])) {
    return {
      text: content.experience
        .map((entry) => `${entry.title} at ${entry.organisation} (${entry.period}).`)
        .join(' '),
      sources: [{ label: 'Experience', sectionId: 'experience' }],
    }
  }

  if (includesAny(question, ['education', 'study', 'degree', 'university'])) {
    return {
      text: content.education
        .map((entry) => `${entry.degree}, ${entry.institution}, ${entry.start} – ${entry.end}.`)
        .join(' '),
      sources: [{ label: 'Education', sectionId: 'education' }],
    }
  }

  if (includesAny(question, ['contact', 'email', 'reach'])) {
    return {
      text: `You can reach ${firstName} by email at ${content.contact.email}.`,
      sources: [{ label: 'Contact', sectionId: 'contact' }],
    }
  }

  return fallback
}

/** Waits, or stops waiting early when the answer is cancelled. */
function pause(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, ms)
    signal.addEventListener(
      'abort',
      () => {
        clearTimeout(timer)
        resolve()
      },
      { once: true },
    )
  })
}

/**
 * A stand-in for the AI backend. It follows the same contract as the real
 * client, including a short wait and word-by-word delivery, so the chat
 * window can be built and tried before the backend exists.
 */
export function createDemoClient(content: Content, options: { delayMs?: number } = {}): ChatClient {
  const delayMs = options.delayMs ?? 35

  return async (history, onText, signal) => {
    const question = history.findLast((item) => item.role === 'user')?.text ?? ''
    const answer = answerFor(question, content)
    const words = answer.text.split(' ')

    await pause(delayMs * 10, signal)
    for (const [index, word] of words.entries()) {
      if (signal.aborted) break
      onText(index === 0 ? word : ` ${word}`)
      if (index < words.length - 1) await pause(delayMs, signal)
    }
    return { ok: true, sources: answer.sources }
  }
}
