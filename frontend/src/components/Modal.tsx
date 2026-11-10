import { useEffect, useId, useRef, type MouseEvent, type ReactNode } from 'react'

type ModalProps = {
  open: boolean
  /** Called when the visitor asks to close: Close button, Escape, or a click outside. */
  onClose: () => void
  title: string
  children: ReactNode
  /** A wider window, for content such as a PDF. */
  wide?: boolean
}

/**
 * A window on top of the page, built on the browser's own <dialog>.
 * The browser keeps keyboard focus inside it, closes it on Escape and puts
 * focus back where it was, so none of that is written by hand here.
 */
export function Modal({ open, onClose, title, children, wide = false }: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  // A click that lands on the dialog element itself is a click on the dark
  // area around the content.
  function handleClick(event: MouseEvent<HTMLDialogElement>) {
    if (event.target === event.currentTarget) onClose()
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={handleClick}
      className={`m-auto w-[calc(100%-2rem)] rounded-card border border-border bg-card p-0 text-text backdrop:bg-black/70 ${
        wide ? 'max-w-4xl' : 'max-w-2xl'
      }`}
    >
      {open && (
        <div className="flex max-h-[calc(100dvh-2rem)] flex-col">
          <div className="flex items-center justify-between gap-4 border-b border-border px-5 py-3">
            <h2 id={titleId} className="min-w-0 font-semibold break-words">
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="flex min-h-11 shrink-0 cursor-pointer items-center rounded-control border border-border px-4 text-sm font-semibold transition-colors hover:border-accent"
            >
              Close
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-auto p-5">{children}</div>
        </div>
      )}
    </dialog>
  )
}
