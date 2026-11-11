import type { Content } from '../content/schema'
import { createApiClient } from './apiClient'
import { createDemoClient } from './demoClient'
import type { ChatClient } from './types'

/**
 * The backend address the page should use.
 *
 * A published build always uses the address from chat.json. Every other
 * mode (the dev server, the end-to-end tests) may replace it with a local
 * address, so that work on your own computer never reaches the live backend.
 */
export function resolveApiUrl(
  configured: string | undefined,
  mode: string,
  override: string | undefined,
): string | undefined {
  if (mode !== 'production' && override) return override
  return configured
}

/**
 * Decides who answers the chat, from the chat settings:
 * the AI backend when its address is set, prepared demo answers when demo
 * mode is on, and nobody (no chat on the page) otherwise.
 */
export function createChatClient(content: Content, fetchFn: typeof fetch = fetch): ChatClient | null {
  if (content.chat.apiUrl) return createApiClient(content.chat.apiUrl, fetchFn)
  if (content.chat.demo) return createDemoClient(content)
  return null
}
