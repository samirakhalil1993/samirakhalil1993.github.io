import type { Availability, Profile } from '../content/schema'

type HeroProps = {
  profile: Profile
  availability: Availability
  /** Path of the CV file, from contact.json. */
  cvPath: string
  /** Called when the visitor clicks "Preview CV". */
  onPreviewCv: () => void
}

/** The first screen: name, title, what the person is looking for, and the photo. */
export function Hero({ profile, availability, cvPath, onPreviewCv }: HeroProps) {
  const outlineButton =
    'flex min-h-11 cursor-pointer items-center rounded-control border border-border px-5 font-semibold transition-colors hover:border-accent'

  return (
    <section
      id="home"
      aria-labelledby="home-heading"
      className="grid items-center gap-10 py-14 md:grid-cols-[3fr_2fr] md:py-24"
    >
      <div className="min-w-0">
        <p className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-sm">
          <span
            aria-hidden="true"
            className={`size-2 shrink-0 rounded-full ${availability.active ? 'pulse-dot bg-accent' : 'bg-muted'}`}
          />
          {availability.status}
        </p>

        <h1
          id="home-heading"
          className="mt-6 text-4xl font-semibold tracking-tight break-words md:text-6xl"
        >
          {profile.name}
        </h1>
        <p className="mt-3 text-lg text-muted md:text-xl">{profile.title}</p>
        <p className="mt-6 max-w-prose text-lg leading-relaxed">{profile.intro}</p>

        <div className="mt-8 flex flex-wrap gap-3">
          <a
            href="#projects"
            className="flex min-h-11 items-center rounded-control bg-button px-5 font-semibold text-white transition-colors hover:bg-button/85"
          >
            View Projects
          </a>
          <button type="button" onClick={onPreviewCv} className={outlineButton}>
            Preview CV
          </button>
          <a href={cvPath} download className={outlineButton}>
            Download CV
          </a>
        </div>
      </div>

      <div className="mx-auto aspect-square w-full max-w-64 overflow-hidden rounded-card border-2 border-accent/60 bg-card md:max-w-80">
        {profile.photo ? (
          <img
            src={profile.photo}
            alt={`Portrait of ${profile.name}`}
            className="size-full object-cover"
          />
        ) : (
          // Placeholder until a photo is added to profile.json.
          <div className="flex size-full items-center justify-center text-6xl font-semibold tracking-tight text-muted">
            {profile.initials}
          </div>
        )}
      </div>
    </section>
  )
}
