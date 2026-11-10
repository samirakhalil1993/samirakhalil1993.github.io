import type { Contact as ContactInfo } from '../content/schema'
import { ContactForm } from './ContactForm'
import { Section } from './Section'

const rowClass =
  'flex min-h-11 flex-col justify-center gap-0.5 rounded-control border border-border px-4 py-2 transition-colors hover:border-accent sm:flex-row sm:items-center sm:justify-between sm:gap-4'

/** Ways to get in touch: the contact form (when it is set up) and direct links. */
export function Contact({ contact }: { contact: ContactInfo }) {
  const links = (
    <div className="rounded-card border border-border bg-card p-6">
      <p className="mb-5 leading-relaxed text-muted">The best way to reach me is by email.</p>
      <div className="space-y-3">
        <a href={`mailto:${contact.email}`} className={rowClass}>
          <span className="font-semibold">Email</span>
          <span className="text-sm break-all text-link">{contact.email}</span>
        </a>
        <a href={contact.linkedin} target="_blank" rel="noopener noreferrer" className={rowClass}>
          <span className="font-semibold">LinkedIn</span>
          <span className="text-sm text-link">View profile</span>
        </a>
        <a href={contact.github} target="_blank" rel="noopener noreferrer" className={rowClass}>
          <span className="font-semibold">GitHub</span>
          <span className="text-sm text-link">View repositories</span>
        </a>
        <a href={contact.cvPath} download className={rowClass}>
          <span className="font-semibold">Download CV</span>
          <span className="text-sm text-link">PDF</span>
        </a>
      </div>
    </div>
  )

  return (
    <Section id="contact" title="Contact">
      {contact.formAccessKey ? (
        // With a form: the form on the left, the direct links beside it.
        <div className="grid items-start gap-6 md:grid-cols-[3fr_2fr]">
          <div className="min-w-0 rounded-card border border-border bg-card p-6">
            <ContactForm accessKey={contact.formAccessKey} email={contact.email} />
          </div>
          {links}
        </div>
      ) : (
        <div className="max-w-2xl">{links}</div>
      )}
    </Section>
  )
}
