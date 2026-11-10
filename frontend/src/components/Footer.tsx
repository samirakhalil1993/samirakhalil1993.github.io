import type { Contact as ContactInfo, Profile } from '../content/schema'
import { sections } from '../sections'

type FooterProps = {
  profile: Profile
  contact: ContactInfo
  /** The year shown in the copyright line. */
  year: number
}

const linkClass = 'flex min-h-11 items-center text-sm text-muted transition-colors hover:text-text'

/** The bottom of the page: who this is, quick links and contact links. */
export function Footer({ profile, contact, year }: FooterProps) {
  return (
    <footer className="mt-12 border-t border-border">
      <div className="mx-auto grid max-w-5xl gap-8 px-4 py-10 md:grid-cols-[2fr_1fr_1fr] md:px-6">
        <div className="min-w-0">
          <p className="font-semibold tracking-tight">{profile.name}</p>
          <p className="mt-1 text-sm text-muted">{profile.title}</p>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted">
            {profile.footerDescription}
          </p>
        </div>

        <nav aria-label="Footer">
          <p className="mb-1 text-sm font-semibold">Sections</p>
          <ul className="grid grid-cols-2 gap-x-4 md:grid-cols-1">
            {sections.map((section) => (
              <li key={section.id}>
                <a href={`#${section.id}`} className={linkClass}>
                  {section.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <p className="mb-1 text-sm font-semibold">Connect</p>
          <ul>
            <li>
              <a
                href={contact.github}
                target="_blank"
                rel="noopener noreferrer"
                className={linkClass}
              >
                GitHub
              </a>
            </li>
            <li>
              <a
                href={contact.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className={linkClass}
              >
                LinkedIn
              </a>
            </li>
            <li>
              <a href={`mailto:${contact.email}`} className={linkClass}>
                Email
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-border">
        {/* Extra room at the bottom on small screens, clear of the chat button. */}
        <p className="mx-auto max-w-5xl px-4 pt-5 pb-24 text-sm text-muted md:px-6 md:pb-5">
          {`© ${year} ${profile.name}`}
        </p>
      </div>
    </footer>
  )
}
