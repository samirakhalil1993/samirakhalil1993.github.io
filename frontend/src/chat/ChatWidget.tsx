import { useEffect, useRef, useState } from 'react'
import type { ChatConfig } from '../content/schema'
import { ChatWindow } from './ChatWindow'
import type { ChatClient } from './types'
import { useChat } from './useChat'

type ChatWidgetProps = {
  chat: ChatConfig
  /** Whatever answers the questions: the demo client now, the backend later. */
  client: ChatClient
}

const WINDOW_ID = 'chat-window'

/**
 * The floating chat button and, while open, the chat window. The
 * conversation lives here, so closing the window does not lose it.
 */
export function ChatWidget({ chat, client }: ChatWidgetProps) {
  const [open, setOpen] = useState(false)
  const conversation = useChat(client)
  const buttonRef = useRef<HTMLButtonElement>(null)

  function close() {
    setOpen(false)
    buttonRef.current?.focus()
  }

  // Escape closes the window and puts focus back on the button.
  useEffect(() => {
    if (!open) return
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') close()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open])

  // On a phone the window covers the page, so a link to a section closes it.
  function handleSectionLink() {
    if (window.matchMedia?.('(max-width: 639px)').matches) setOpen(false)
  }

  return (
    <>
      {open && (
        <ChatWindow
          id={WINDOW_ID}
          chat={chat}
          turns={conversation.turns}
          busy={conversation.busy}
          limitReached={conversation.limitReached}
          onSend={conversation.send}
          onRetry={conversation.retry}
          onClose={close}
          onSectionLink={handleSectionLink}
        />
      )}

      <button
        ref={buttonRef}
        type="button"
        aria-label={open ? 'Close chat' : 'Open chat'}
        aria-expanded={open}
        aria-controls={open ? WINDOW_ID : undefined}
        onClick={() => (open ? close() : setOpen(true))}
        className="fixed right-4 bottom-4 z-50 flex size-14 cursor-pointer items-center justify-center rounded-full bg-button text-white shadow-lg transition-colors hover:bg-button/85"
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          {open ? (
            <path d="M6 6l12 12M18 6L6 18" />
          ) : (
            <path d="M21 12a8 8 0 0 1-8 8H5l-2 2V12a8 8 0 0 1 8-8h2a8 8 0 0 1 8 8z" />
          )}
        </svg>
      </button>
    </>
  )
}
