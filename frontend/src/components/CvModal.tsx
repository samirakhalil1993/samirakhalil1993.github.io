import { Modal } from './Modal'

type CvModalProps = {
  open: boolean
  onClose: () => void
  /** Path of the CV file, from contact.json. */
  cvPath: string
  name: string
}

const buttonClass =
  'flex min-h-11 items-center rounded-control px-4 text-sm font-semibold transition-colors'

/** The CV shown inside the page, with links to open it alone or download it. */
export function CvModal({ open, onClose, cvPath, name }: CvModalProps) {
  return (
    <Modal open={open} onClose={onClose} title="CV" wide>
      <div className="mb-4 flex flex-wrap gap-3">
        <a
          href={cvPath}
          download
          className={`${buttonClass} bg-button text-white hover:bg-button/85`}
        >
          Download
        </a>
        <a
          href={cvPath}
          target="_blank"
          rel="noopener noreferrer"
          className={`${buttonClass} border border-border hover:border-accent`}
        >
          Open in new tab
        </a>
      </div>

      {/* Many phone browsers cannot show a PDF inside a page, so small screens
          get the two links above instead of the viewer. */}
      <p className="text-sm text-muted md:hidden">
        Your browser may not show PDFs inside a page. Use the buttons above to read the CV.
      </p>
      <iframe
        src={cvPath}
        title={`CV of ${name}`}
        className="hidden h-[70dvh] w-full rounded-control border border-border bg-white md:block"
      />
    </Modal>
  )
}
