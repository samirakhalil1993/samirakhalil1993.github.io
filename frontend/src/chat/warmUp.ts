/**
 * Wakes the AI backend before the visitor needs it.
 *
 * A free backend goes to sleep when nobody uses it and needs about a minute
 * to start again. One small request when the page loads starts that minute
 * early. The answer does not matter and a failure is ignored: the chat shows
 * its own message if the backend really is unavailable.
 */
export function warmUp(apiUrl: string | undefined, fetchFn: typeof fetch = fetch): void {
  if (!apiUrl) return
  try {
    void fetchFn(`${apiUrl.replace(/\/+$/, '')}/api/health`, { cache: 'no-store' }).catch(() => {})
  } catch {
    // fetch itself can throw (for example on a malformed address).
  }
}
