import { useEffect, useRef, useState } from 'react'
import {
  MAX_MESSAGE_LENGTH,
  MAX_USER_MESSAGES,
  type ChatClient,
  type ChatHistoryItem,
  type ChatResult,
  type ChatTurn,
} from './types'

type AssistantTurn = Extract<ChatTurn, { role: 'assistant' }>

/** What the service is told: finished answers and every question. */
function toHistory(turns: ChatTurn[]): ChatHistoryItem[] {
  return turns
    .filter((turn) => turn.role === 'user' || (turn.status === 'done' && turn.text !== ''))
    .map((turn) => ({ role: turn.role, text: turn.text }))
}

/**
 * The conversation and its rules: one answer at a time, a length limit per
 * message, a limit on the number of questions, and retry after a failure.
 * The conversation exists only in memory and is gone when the page reloads.
 */
export function useChat(client: ChatClient) {
  const [turns, setTurns] = useState<ChatTurn[]>([])

  // Mirrors of the state that event handlers must read at once, without
  // waiting for the next drawing of the page.
  const turnsRef = useRef<ChatTurn[]>([])
  const busyRef = useRef(false)
  const nextIdRef = useRef(1)
  const abortRef = useRef<AbortController | null>(null)

  // Cancel an answer that is still arriving when the chat leaves the page.
  useEffect(() => () => abortRef.current?.abort(), [])

  function commit(next: ChatTurn[]) {
    turnsRef.current = next
    setTurns(next)
  }

  function updateAssistant(id: number, change: (turn: AssistantTurn) => AssistantTurn) {
    commit(
      turnsRef.current.map((turn) =>
        turn.id === id && turn.role === 'assistant' ? change(turn) : turn,
      ),
    )
  }

  /** Asks the service to fill the assistant turn `id`, given `history`. */
  async function ask(history: ChatHistoryItem[], id: number) {
    const controller = new AbortController()
    abortRef.current = controller
    busyRef.current = true

    let result: ChatResult
    try {
      result = await client(
        history,
        (piece) =>
          updateAssistant(id, (turn) => ({ ...turn, status: 'streaming', text: turn.text + piece })),
        controller.signal,
      )
    } catch {
      result = { ok: false, reason: 'network' }
    }

    busyRef.current = false
    if (controller.signal.aborted) return
    updateAssistant(id, (turn) =>
      result.ok
        ? { ...turn, status: 'done', sources: result.sources }
        : { ...turn, status: 'failed', failure: result.reason },
    )
  }

  const userMessages = turns.filter((turn) => turn.role === 'user').length
  const last = turns.at(-1)
  const lastFailed = last?.role === 'assistant' && last.status === 'failed' ? last : null
  const limitReached = userMessages >= MAX_USER_MESSAGES || lastFailed?.failure === 'limit'
  const busy = last?.role === 'assistant' && (last.status === 'waiting' || last.status === 'streaming')

  function send(rawText: string) {
    const text = rawText.trim()
    const current = turnsRef.current
    const sent = current.filter((turn) => turn.role === 'user').length
    const previous = current.at(-1)
    const stopped =
      previous?.role === 'assistant' && previous.status === 'failed' && previous.failure === 'limit'

    if (text === '' || text.length > MAX_MESSAGE_LENGTH) return
    if (busyRef.current || stopped || sent >= MAX_USER_MESSAGES) return

    const questionId = nextIdRef.current++
    const answerId = nextIdRef.current++
    const withQuestion: ChatTurn[] = [...current, { id: questionId, role: 'user', text }]
    commit([
      ...withQuestion,
      { id: answerId, role: 'assistant', text: '', status: 'waiting', sources: [] },
    ])
    void ask(toHistory(withQuestion), answerId)
  }

  function retry() {
    const current = turnsRef.current
    const failed = current.at(-1)
    if (busyRef.current || failed?.role !== 'assistant' || failed.status !== 'failed') return
    if (failed.failure === 'limit') return

    updateAssistant(failed.id, (turn) => ({
      ...turn,
      text: '',
      status: 'waiting',
      failure: undefined,
    }))
    void ask(toHistory(current.slice(0, -1)), failed.id)
  }

  return { turns, busy, limitReached, send, retry }
}
