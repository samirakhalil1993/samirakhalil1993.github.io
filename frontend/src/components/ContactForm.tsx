import { useRef, useState, type FormEvent } from 'react'
import { flushSync } from 'react-dom'
import { submitContact, type SubmitResult } from '../contact/submit'
import {
  validateContact,
  type ContactErrors,
  type ContactValues,
} from '../contact/validate'

type ContactFormProps = {
  /** The public Web3Forms key from contact.json. */
  accessKey: string
  /** Shown as a direct alternative when sending fails. */
  email: string
  /** The function that sends the message. Tests replace it. */
  submit?: (values: ContactValues, accessKey: string) => Promise<SubmitResult>
}

type Status = 'idle' | 'sending' | 'sent' | 'network' | 'busy' | 'rejected'

const empty: ContactValues = { name: '', email: '', subject: '', message: '' }

const fields = [
  { name: 'name', label: 'Full Name', type: 'text', autoComplete: 'name' },
  { name: 'email', label: 'Email Address', type: 'email', autoComplete: 'email' },
  { name: 'subject', label: 'Subject', type: 'text', autoComplete: 'off' },
] as const

const failureText = {
  network: 'The message could not be sent. Please check your connection and try again, or email me directly',
  busy: 'Too many messages were sent just now. Please wait a minute and try again, or email me directly',
  rejected: 'The message could not be sent. Please try again later, or email me directly',
} as const

const fieldClass =
  'w-full rounded-control border bg-bg px-3 py-2 text-text placeholder:text-muted aria-invalid:border-error border-control-border'

/** The contact form: checks the input, sends it once, and reports the result. */
export function ContactForm({ accessKey, email, submit = submitContact }: ContactFormProps) {
  const [values, setValues] = useState<ContactValues>(empty)
  const [errors, setErrors] = useState<ContactErrors>({})
  const [status, setStatus] = useState<Status>('idle')
  // Errors are shown only after the first attempt, then kept up to date.
  const [attempted, setAttempted] = useState(false)

  const formRef = useRef<HTMLFormElement>(null)
  // State updates arrive a moment later, so a ref is what stops a double submit.
  const sendingRef = useRef(false)

  function handleChange(name: keyof ContactValues, value: string) {
    const next = { ...values, [name]: value }
    setValues(next)
    if (attempted) setErrors(validateContact(next))
    // An old result message no longer describes what is on screen.
    if (status !== 'sending') setStatus('idle')
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (sendingRef.current) return

    const found = validateContact(values)
    const firstWrong = (Object.keys(found) as (keyof ContactValues)[])[0]
    // Drawn at once, so that the error is already tied to the field when
    // focus moves there and a screen reader reads both together.
    flushSync(() => {
      setErrors(found)
      setAttempted(true)
      if (firstWrong) setStatus('idle')
    })
    if (firstWrong) {
      formRef.current?.querySelector<HTMLElement>(`[name="${firstWrong}"]`)?.focus()
      return
    }

    // The hidden box is invisible to people. A ticked box means a bot, which
    // gets an ordinary success message so it has no reason to try again.
    const trap = formRef.current?.querySelector<HTMLInputElement>('input[name="botcheck"]')
    if (trap?.checked) {
      setStatus('sent')
      return
    }

    sendingRef.current = true
    setStatus('sending')
    let result: SubmitResult
    try {
      result = await submit(values, accessKey)
    } catch {
      // The sender promises never to throw; if it does, treat it as a failed send.
      result = { ok: false, reason: 'network' }
    } finally {
      sendingRef.current = false
    }

    if (result.ok) {
      setValues(empty)
      setAttempted(false)
      setStatus('sent')
    } else {
      setStatus(result.reason)
    }
  }

  const sending = status === 'sending'
  const failed = status === 'network' || status === 'busy' || status === 'rejected'

  /** The attributes that tie a field to its error message. */
  function errorProps(name: keyof ContactValues) {
    return errors[name]
      ? { 'aria-invalid': true as const, 'aria-describedby': `contact-${name}-error` }
      : {}
  }

  function errorMessage(name: keyof ContactValues) {
    if (!errors[name]) return null
    return (
      <p id={`contact-${name}-error`} className="mt-1.5 text-sm text-error">
        <span className="sr-only">Error: </span>
        {errors[name]}
      </p>
    )
  }

  return (
    <form
      ref={formRef}
      aria-label="Contact form"
      noValidate
      onSubmit={handleSubmit}
      className="space-y-5"
    >
      {fields.map((field) => (
        <div key={field.name}>
          <label htmlFor={`contact-${field.name}`} className="mb-1.5 block text-sm font-semibold">
            {field.label}
          </label>
          <input
            id={`contact-${field.name}`}
            name={field.name}
            type={field.type}
            autoComplete={field.autoComplete}
            required
            readOnly={sending}
            value={values[field.name]}
            onChange={(event) => handleChange(field.name, event.target.value)}
            className={`${fieldClass} min-h-11`}
            {...errorProps(field.name)}
          />
          {errorMessage(field.name)}
        </div>
      ))}

      <div>
        <label htmlFor="contact-message" className="mb-1.5 block text-sm font-semibold">
          Message
        </label>
        <textarea
          id="contact-message"
          name="message"
          rows={6}
          required
          readOnly={sending}
          value={values.message}
          onChange={(event) => handleChange('message', event.target.value)}
          className={fieldClass}
          {...errorProps('message')}
        />
        {errorMessage('message')}
      </div>

      {/* The spam trap: people never see or reach this box; simple bots tick it. */}
      <div aria-hidden="true" className="sr-only">
        <label>
          Leave this box empty
          <input type="checkbox" name="botcheck" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      {/*
        Not `disabled` while sending: a disabled button drops keyboard focus.
        The double-submit guard in handleSubmit does the real blocking.
      */}
      <button
        type="submit"
        aria-disabled={sending}
        className="flex min-h-11 cursor-pointer items-center rounded-control bg-button px-5 font-semibold text-white transition-colors hover:bg-button/85 aria-disabled:cursor-wait aria-disabled:opacity-70"
      >
        {sending ? 'Sending…' : 'Send message'}
      </button>

      {/*
        Both result areas are always on the page and only their text changes.
        Screen readers announce text that appears inside an existing area, but
        often miss an area that is added already filled.
      */}
      <div role="status">
        {status === 'sent' && (
          <p className="rounded-control border border-success px-4 py-3">
            Thank you. Your message has been sent.
          </p>
        )}
      </div>

      <div role="alert">
        {failed && (
          <p className="rounded-control border border-error px-4 py-3">
            {failureText[status]}:{' '}
            <a href={`mailto:${email}`} className="break-all text-link underline">
              {email}
            </a>
          </p>
        )}
      </div>

      <p className="text-sm text-muted">
        Your message is sent to my inbox through Web3Forms, a form service that also keeps a copy of
        it.
      </p>
    </form>
  )
}
