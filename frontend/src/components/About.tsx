import { Section } from './Section'

/** The About Me text, one paragraph per item. */
export function About({ paragraphs }: { paragraphs: string[] }) {
  return (
    <Section id="about" title="About Me">
      <div className="max-w-prose space-y-4 text-lg leading-relaxed">
        {paragraphs.map((paragraph, index) => (
          <p key={index} className={index === 0 ? undefined : 'text-muted'}>
            {paragraph}
          </p>
        ))}
      </div>
    </Section>
  )
}
