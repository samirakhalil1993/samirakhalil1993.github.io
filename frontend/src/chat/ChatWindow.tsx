import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import type { ChatConfig } from '../content/schema'
import { ChatMessage } from './ChatMessage'
import { MAX_MESSAGE_LENGTH, type ChatTurn } from './types'

type ChatWindowProps = {
  id: string
  chat: ChatConfig
  turns: ChatTurn[]
  busy: boolean
  limitReached: boolean
  onSend: (text: string) => void
  onRetry: () => void
  onClose: () => void
  onSectionLink: () => void
}

/** After this long without any text, a live answer is probably waiting for a sleeping backend. */
export const WAKING_AFTER_MS = 5000

/** True once `active` has stayed true for `ms`; false again as soon as it ends. */
function useSlow(active: boolean, ms: number) {
  const [slow, setSlow] = useState(false)
  useEffect(() => {
    if (!active) return
    const timer = setTimeout(() => setSlow(true), ms)
    return () => {
      clearTimeout(timer)
      setSlow(false)
    }
  }, [active, ms])
  return slow
}

/** From this many characters the counter is shown, so it does not distract earlier. */
const COUNTER_FROM = 400

/** The chat window: header, conversation, suggested questions and the question field. */
export function ChatWindow(props: ChatWindowProps) {
  const { id, chat, turns, busy, limitReached, onSend, onRetry, onClose, onSectionLink } = props
  const [draft, setDraft] = useState('')

  // Demo answers are only given while no AI backend is connected.
  const live = Boolean(chat.apiUrl)
  const demo = chat.demo && !live

  // Only a live answer can be slow to start; demo answers come from the page.
  const waitingId = turns.findLast((turn) => turn.role === 'assistant' && turn.status === 'waiting')?.id
  const waking = useSlow(live && waitingId !== undefined, WAKING_AFTER_MS)

  const inputRef = useRef<HTMLTextAreaElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const limitLinkRef = useRef<HTMLAnchorElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const tooLong = draft.length > MAX_MESSAGE_LENGTH
  const canSend = !busy && !tooLong && draft.trim() !== ''

  // Opening the window puts the cursor where the visitor will type. On a
  // touch screen that would raise the keyboard over half the window before
  // anything has been read, so focus goes to the Close button there.
  useEffect(() => {
    const touch = window.matchMedia?.('(pointer: coarse)').matches
    ;((touch ? null : inputRef.current) ?? closeRef.current)?.focus()
  }, [])

  // When the limit bar replaces the question field, the field (and the
  // focus in it) is gone. Move focus to the bar's link so it is not lost.
  useEffect(() => {
    if (limitReached) limitLinkRef.current?.focus()
  }, [limitReached])

  /** For buttons that vanish when used: put focus back in the question field. */
  function thenFocusInput(action: () => void) {
    action()
    inputRef.current?.focus()
  }

  // Keep the newest message in view as the conversation grows.
  useEffect(() => {
    const list = listRef.current
    if (list) list.scrollTop = list.scrollHeight
  }, [turns, waking])

  function sendDraft() {
    if (!canSend) return
    onSend(draft)
    setDraft('')
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    sendDraft()
  }

  // Enter sends; Shift+Enter starts a new line, as in most chat apps.
  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault()
      sendDraft()
    }
  }

  return (
    <div
      id={id}
      role="dialog"
      aria-labelledby={`${id}-title`}
      // Escape closes the chat only when focus is inside it, so it never
      // steals the key from the rest of the page or from the CV window.
      onKeyDown={(event) => {
        if (event.key === 'Escape') onClose()
      }}
      className="chat-enter fixed inset-x-2 top-2 bottom-20 z-50 flex flex-col overflow-hidden rounded-card border border-border bg-card shadow-2xl sm:inset-x-auto sm:top-auto sm:right-4 sm:bottom-24 sm:h-[min(36rem,calc(100dvh-7rem))] sm:w-96"
    >
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <h2 id={`${id}-title`} className="truncate font-semibold">
            {chat.title}
          </h2>
          {demo && (
            <span className="shrink-0 rounded-full border border-control-border px-2 py-0.5 text-xs font-semibold">
              Demo
            </span>
          )}
        </div>
        <button
          ref={closeRef}
          type="button"
          aria-label="Close chat"
          onClick={onClose}
          className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-control transition-colors hover:bg-bg"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>

      <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        {demo && <p className="mb-3 text-sm text-muted">{chat.demoNotice}</p>}
        {live && <p className="mb-3 text-sm text-muted">{chat.liveNotice}</p>}

        {turns.length === 0 && (
          <div>
            <p className="leading-relaxed">{chat.welcome}</p>
            <ul aria-label="Suggested questions" className="mt-4 space-y-2">
              {chat.suggestedQuestions.map((question) => (
                <li key={question}>
                  <button
                    type="button"
                    onClick={() => thenFocusInput(() => onSend(question))}
                    className="flex min-h-11 w-full cursor-pointer items-center rounded-control border border-border px-3 py-2 text-left text-sm transition-colors hover:border-accent"
                  >
                    {question}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/*
          A log: screen readers announce new messages. While an answer is
          still arriving it is marked busy, so it is read once, when complete.
        */}
        <div role="log" aria-live="polite" aria-busy={busy} aria-label="Conversation">
          <ul className="space-y-3">
            {turns.map((turn, index) => (
              <ChatMessage
                key={turn.id}
                turn={turn}
                chat={chat}
                canRetry={index === turns.length - 1}
                onRetry={() => thenFocusInput(onRetry)}
                onSectionLink={onSectionLink}
              />
            ))}
          </ul>
        </div>

        {/* Always on the page, so a screen reader announces the text when it appears. */}
        <p role="status" className={waking ? 'mt-3 text-sm text-muted' : 'sr-only'}>
          {waking ? chat.wakingMessage : ''}
        </p>
      </div>

      {limitReached ? (
        <div className="border-t border-border px-4 py-3 text-sm">
          <p>{chat.limitMessage}</p>
          <a
            ref={limitLinkRef}
            href="#contact"
            onClick={onSectionLink}
            className="mt-1 flex min-h-11 w-fit items-center font-semibold text-link hover:underline"
          >
            Go to contact
          </a>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="border-t border-border px-4 py-3">
          <label htmlFor={`${id}-input`} className="sr-only">
            Your question
          </label>
          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              id={`${id}-input`}
              rows={2}
              value={draft}
              placeholder={chat.placeholder}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={handleKeyDown}
              enterKeyHint="send"
              aria-invalid={tooLong || undefined}
              aria-describedby={draft.length >= COUNTER_FROM ? `${id}-counter` : undefined}
              className="max-h-32 min-h-11 flex-1 resize-none rounded-control border border-control-border bg-bg px-3 py-2 placeholder:text-muted aria-invalid:border-error"
            />
            <button
              type="submit"
              aria-disabled={!canSend}
              className="flex min-h-11 cursor-pointer items-center rounded-control bg-button px-4 font-semibold text-white transition-colors hover:bg-button/85 aria-disabled:cursor-not-allowed aria-disabled:opacity-60"
            >
              Send
            </button>
          </div>
          {draft.length >= COUNTER_FROM && (
            <p id={`${id}-counter`} className={`mt-1.5 text-sm ${tooLong ? 'text-error' : 'text-muted'}`}>
              <span className="sr-only">Characters used: </span>
              {`${draft.length} / ${MAX_MESSAGE_LENGTH}`}
            </p>
          )}
        </form>
      )}
    </div>
  )
}
