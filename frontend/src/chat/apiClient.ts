import type { ChatClient, ChatFailure, ChatResult, Source } from './types'

/**
 * Keeps only what the chat window understands from a source the backend
 * sent, so nothing unexpected can reach the page.
 */
function toSource(raw: unknown): Source | null {
  if (typeof raw !== 'object' || raw === null) return null
  const { label, sectionId, url } = raw as Record<string, unknown>
  if (typeof label !== 'string' || label === '') return null

  const source: Source = { label }
  if (typeof url === 'string' && url.startsWith('https://')) source.url = url
  else if (typeof sectionId === 'string' && sectionId !== '') source.sectionId = sectionId
  return source
}

/** The JSON of one `data: {...}` event, or null for anything else. */
function parseEvent(block: string): Record<string, unknown> | null {
  const line = block.split('\n').find((candidate) => candidate.startsWith('data:'))
  if (!line) return null
  try {
    const data: unknown = JSON.parse(line.slice(5))
    return typeof data === 'object' && data !== null ? (data as Record<string, unknown>) : null
  } catch {
    return null
  }
}

/**
 * The chat client that talks to the AI backend.
 *
 * It posts the conversation to `<apiUrl>/api/chat` and reads the answer as a
 * stream of events: `text` pieces, then one `done` (with sources) or `error`.
 * Like every ChatClient it never throws: each outcome is a ChatResult.
 */
export function createApiClient(apiUrl: string, fetchFn: typeof fetch = fetch): ChatClient {
  const endpoint = `${apiUrl.replace(/\/+$/, '')}/api/chat`

  return async (history, onText, signal): Promise<ChatResult> => {
    try {
      const response = await fetchFn(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history }),
        signal,
      })

      if (response.status === 429) return { ok: false, reason: 'limit' }
      if (response.status !== 200 || !response.body) return { ok: false, reason: 'unavailable' }

      const reader = response.body.getReader()
      // `stream: true` lets a letter that is split across two network chunks
      // be put together again.
      const decoder = new TextDecoder()
      let buffer = ''

      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })

        // Events are separated by an empty line. The last part may be
        // incomplete, so it stays in the buffer until more arrives.
        const blocks = buffer.split('\n\n')
        buffer = blocks.pop() ?? ''

        for (const block of blocks) {
          const event = parseEvent(block)
          if (!event) continue

          if (event.type === 'text' && typeof event.text === 'string') {
            onText(event.text)
          } else if (event.type === 'done') {
            const raw = Array.isArray(event.sources) ? event.sources : []
            const sources = raw.map(toSource).filter((source) => source !== null)
            return { ok: true, sources }
          } else if (event.type === 'error') {
            const reason: ChatFailure = event.reason === 'limit' ? 'limit' : 'unavailable'
            return { ok: false, reason }
          }
        }
      }

      // The stream ended without saying how: the answer was cut off.
      return { ok: false, reason: 'network' }
    } catch {
      // The request could not be made, the connection broke, or it was cancelled.
      return { ok: false, reason: 'network' }
    }
  }
}
