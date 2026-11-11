import { content } from '../content'
import { createChatClient, resolveApiUrl } from './createChatClient'

// Written out in full so that a published build contains no trace of a
// local address: the build tool replaces MODE with "production" and drops
// the other branch.
const localApiUrl =
  import.meta.env.MODE === 'production' ? undefined : import.meta.env.VITE_CHAT_API_URL

/** The chat settings from chat.json, with the backend address this page really uses. */
export const chatSettings = {
  ...content.chat,
  apiUrl: resolveApiUrl(content.chat.apiUrl, import.meta.env.MODE, localApiUrl),
}

/** Who answers the chat: the AI backend, the demo, or nobody (see chat.json). */
export const chatClient = createChatClient({ ...content, chat: chatSettings })
