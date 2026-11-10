import { useState } from 'react'
import { About } from './components/About'
import { Contact } from './components/Contact'
import { CvModal } from './components/CvModal'
import { Education } from './components/Education'
import { Experience } from './components/Experience'
import { Footer } from './components/Footer'
import { Hero } from './components/Hero'
import { Navbar } from './components/Navbar'
import { Projects } from './components/Projects'
import { Skills } from './components/Skills'
import { content } from './content'
import { useActiveSection } from './hooks/useActiveSection'
import { useHashScroll } from './hooks/useHashScroll'
import { sections } from './sections'

const sectionIds = sections.map((section) => section.id)

// Read once when the page loads; a page is not kept open across New Year.
const currentYear = new Date().getFullYear()

/**
 * The whole page. This is the only place that reads the content files;
 * every component below gets its text handed to it.
 */
function App() {
  const activeId = useActiveSection(sectionIds)
  const [cvOpen, setCvOpen] = useState(false)
  useHashScroll()

  return (
    <>
      <Navbar name={content.profile.name} activeId={activeId} />

      <main className="mx-auto max-w-5xl px-4 md:px-6">
        <Hero
          profile={content.profile}
          availability={content.availability}
          cvPath={content.contact.cvPath}
          onPreviewCv={() => setCvOpen(true)}
        />
        <About paragraphs={content.profile.about} />
        <Skills categories={content.skills} />
        <Projects projects={content.projects} />
        <Education entries={content.education} />
        <Experience entries={content.experience} />
        <Contact contact={content.contact} />
      </main>

      <CvModal
        open={cvOpen}
        onClose={() => setCvOpen(false)}
        cvPath={content.contact.cvPath}
        name={content.profile.name}
      />

      <Footer profile={content.profile} contact={content.contact} year={currentYear} />
    </>
  )
}

export default App
