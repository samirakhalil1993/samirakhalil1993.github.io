import type { ReactNode } from 'react'

/** A small label for one skill or technology. Use inside a <ul>. */
export function Tag({ children }: { children: ReactNode }) {
  return (
    <li className="rounded-control border border-border bg-bg/40 px-2.5 py-1 text-sm break-words">
      {children}
    </li>
  )
}
