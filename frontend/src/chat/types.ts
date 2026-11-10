/** Where an answer came from. A section source jumps within the page; a URL source opens another site. */
export type Source = { label: string; sectionId?: string; url?: string }

/**
 * Why an answer could not be given.
 * - network: the request failed or the answer was cut off.
 * - limit: the assistant's usage limit is reached; trying again will not help.
 * - unavailable: the assistant answered that it cannot help right now.
 */
export type ChatFailure = 'network' | 'limit' | 'unavailable'

/** One entry in the conversation as the window shows it. */
export type ChatTurn =
  | { id: number; role: 'user'; text: string }
  | {
      id: number
      role: 'assistant'
      text: string
      /** waiting: nothing yet. streaming: text is arriving. done / failed: finished. */
      status: 'waiting' | 'streaming' | 'done' | 'failed'
      sources: Source[]
      failure?: ChatFailure
    }

/** One entry in the conversation as it is sent to the answering service. */
export type ChatHistoryItem = { role: 'user' | 'assistant'; text: string }

export type ChatResult = { ok: true; sources: Source[] } | { ok: false; reason: ChatFailure }

/**
 * The one contract between the chat window and whatever answers it.
 * Sends the conversation, calls `onText` with each new piece of the answer,
 * and resolves when the answer has ended. Stops early when `signal` aborts.
 */
export type ChatClient = (
  history: ChatHistoryItem[],
  onText: (piece: string) => void,
  signal: AbortSignal,
) => Promise<ChatResult>

export const MAX_MESSAGE_LENGTH = 500
export const MAX_USER_MESSAGES = 15
