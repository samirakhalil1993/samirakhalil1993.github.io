import type { ChatConfig } from '../content/schema'
import type { ChatTurn, Source } from './types'

type ChatMessageProps = {
  turn: ChatTurn
  chat: ChatConfig
  onRetry: () => void
  /** Called when a link to a section of the page is chosen. */
  onSectionLink: () => void
}

const sourceClass =
  'flex min-h-11 items-center rounded-control border border-border px-3 text-sm text-link transition-colors hover:border-accent'

function SourceLink({ source, onSectionLink }: { source: Source; onSectionLink: () => void }) {
  if (source.url) {
    return (
      <a href={source.url} target="_blank" rel="noopener noreferrer" className={sourceClass}>
        {source.label}
      </a>
    )
  }
  if (source.sectionId) {
    return (
      <a href={`#${source.sectionId}`} onClick={onSectionLink} className={sourceClass}>
        {source.label}
      </a>
    )
  }
  return <span className={`${sourceClass} text-muted`}>{source.label}</span>
}

/** One message in the conversation: the visitor's question or the assistant's answer. */
export function ChatMessage({ turn, chat, onRetry, onSectionLink }: ChatMessageProps) {
  if (turn.role === 'user') {
    return (
      <li className="flex justify-end">
        <p className="max-w-[85%] rounded-card bg-button px-4 py-2.5 break-words whitespace-pre-wrap text-white">
          {turn.text}
        </p>
      </li>
    )
  }

  const limited = turn.failure === 'limit'

  return (
    <li className="flex flex-col items-start gap-2">
      {turn.status === 'waiting' && (
        <p className="rounded-card border border-border bg-bg px-4 py-3">
          <span className="sr-only">The assistant is writing</span>
          <span aria-hidden="true" className="flex gap-1">
            <span className="typing-dot size-2 rounded-full bg-muted" />
            <span className="typing-dot size-2 rounded-full bg-muted" />
            <span className="typing-dot size-2 rounded-full bg-muted" />
          </span>
        </p>
      )}

      {turn.text !== '' && (
        <p className="max-w-[92%] rounded-card border border-border bg-bg px-4 py-2.5 leading-relaxed break-words whitespace-pre-wrap">
          {turn.text}
        </p>
      )}

      {turn.status === 'done' && turn.sources.length > 0 && (
        <ul aria-label="Sources" className="flex flex-wrap gap-2">
          {turn.sources.map((source, index) => (
            <li key={`${index}-${source.label}`}>
              <SourceLink source={source} onSectionLink={onSectionLink} />
            </li>
          ))}
        </ul>
      )}

      {turn.status === 'failed' && (
        <div className="max-w-[92%] rounded-card border border-error px-4 py-2.5">
          <p>{limited ? chat.limitMessage : chat.errorMessage}</p>
          {!limited && (
            <button
              type="button"
              onClick={onRetry}
              className="mt-2 flex min-h-11 cursor-pointer items-center rounded-control border border-control-border px-4 text-sm font-semibold transition-colors hover:border-accent"
            >
              Try again
            </button>
          )}
        </div>
      )}
    </li>
  )
}
