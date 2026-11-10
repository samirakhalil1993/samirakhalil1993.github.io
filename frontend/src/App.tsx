import { content } from './content'

/**
 * Phase 1 shell: a single card that proves the design tokens and the content
 * files work together. Phase 2 replaces this body with the real sections.
 */
function App() {
  const { profile, availability } = content

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-xl rounded-card border border-border bg-card p-8">
        <h1 className="text-3xl font-semibold tracking-tight">{profile.name}</h1>
        <p className="mt-2 text-muted">{profile.title}</p>

        <p className="mt-6 flex items-center gap-2 text-sm">
          <span
            aria-hidden="true"
            className={`size-2 shrink-0 rounded-full ${availability.active ? 'bg-accent' : 'bg-muted'}`}
          />
          {availability.status}
        </p>

        <p className="mt-8 border-t border-border pt-4 text-sm text-muted">
          Site under construction.
        </p>
      </div>
    </main>
  )
}

export default App
