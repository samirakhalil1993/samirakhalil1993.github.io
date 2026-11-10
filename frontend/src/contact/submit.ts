import type { ContactValues } from './validate'

/** Where Web3Forms receives form messages. */
export const WEB3FORMS_URL = 'https://api.web3forms.com/submit'

/**
 * How a send attempt ended.
 * - network: the request could not be made, or no answer came in time.
 * - busy: the service is limiting how many messages it accepts right now.
 * - rejected: the service answered, but did not accept the message.
 */
export type SubmitResult = { ok: true } | { ok: false; reason: 'network' | 'rejected' | 'busy' }

/**
 * Sends one contact message through Web3Forms, which emails it to the inbox
 * the access key belongs to. Never throws: every outcome is a SubmitResult.
 *
 * `fetchFn` exists so tests can run without the network.
 */
export async function submitContact(
  values: ContactValues,
  accessKey: string,
  fetchFn: typeof fetch = fetch,
  timeoutMs = 15_000,
): Promise<SubmitResult> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetchFn(WEB3FORMS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        access_key: accessKey,
        name: values.name.trim(),
        email: values.email.trim(),
        subject: values.subject.trim(),
        message: values.message.trim(),
      }),
      signal: controller.signal,
    })

    if (response.status === 429) return { ok: false, reason: 'busy' }
    if (response.status !== 200) return { ok: false, reason: 'rejected' }

    // A 200 answer that is not JSON, or does not say success, is not a success.
    const body: unknown = await response.json().catch(() => null)
    const accepted =
      typeof body === 'object' && body !== null && (body as { success?: unknown }).success === true
    return accepted ? { ok: true } : { ok: false, reason: 'rejected' }
  } catch {
    return { ok: false, reason: 'network' }
  } finally {
    clearTimeout(timer)
  }
}
