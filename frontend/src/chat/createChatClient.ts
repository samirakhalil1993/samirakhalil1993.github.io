import type { Content } from '../content/schema'
import { createApiClient } from './apiClient'
import { createDemoClient } from './demoClient'
import type { ChatClient } from './types'

/**
 * Decides who answers the chat, from the settings in chat.json:
 * the AI backend when its address is set, prepared demo answers when demo
 * mode is on, and nobody (no chat on the page) otherwise.
 */
export function createChatClient(content: Content, fetchFn: typeof fetch = fetch): ChatClient | null {
  if (content.chat.apiUrl) return createApiClient(content.chat.apiUrl, fetchFn)
  if (content.chat.demo) return createDemoClient(content)
  return null
}
