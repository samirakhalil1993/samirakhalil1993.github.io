/** What the visitor types into the contact form. */
export type ContactValues = {
  name: string
  email: string
  subject: string
  message: string
}

/** One message per wrong field. An empty object means everything is fine. */
export type ContactErrors = Partial<Record<keyof ContactValues, string>>

/** The longest allowed value of each field. */
const maxLength = { name: 100, email: 254, subject: 150, message: 5000 } as const

// Something before the @, then a domain with at least one dot, and no spaces.
const emailShape = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/

/** Checks the form values. Spaces at the start and end do not count. */
export function validateContact(values: ContactValues): ContactErrors {
  const errors: ContactErrors = {}
  const name = values.name.trim()
  const email = values.email.trim()
  const subject = values.subject.trim()
  const message = values.message.trim()

  if (name.length < 2) errors.name = 'Please enter your name.'
  else if (name.length > maxLength.name) errors.name = 'Name must be at most 100 characters.'

  if (email.length === 0) errors.email = 'Please enter your email address.'
  else if (email.length > maxLength.email || !emailShape.test(email))
    errors.email = 'Please enter a valid email address.'

  if (subject.length < 3) errors.subject = 'Please enter a subject.'
  else if (subject.length > maxLength.subject)
    errors.subject = 'Subject must be at most 150 characters.'

  if (message.length < 10) errors.message = 'Please write a message of at least 10 characters.'
  else if (message.length > maxLength.message)
    errors.message = 'Message must be at most 5000 characters.'

  return errors
}
