# Architecture decisions

Short notes on the main technical choices and the reason for each. New
decisions are added at the bottom.

## 1. Static frontend with React and Vite

The site is interactive (expandable cards, a CV modal, a chat window) but
needs no server rendering. React with Vite builds to plain static files, so
the site can be hosted anywhere and still works when the AI backend is down.

## 2. Content lives in JSON files at the top of the repository

All text and settings are in `content/`, outside `frontend/`. JSON can be
read by both the TypeScript frontend and the Python backend that is added
later, so the website and the AI assistant use the same source and cannot
disagree. Components receive content as input; only
`frontend/src/content/` imports the JSON files.

## 3. Content is checked before every build, and the checker does not ship

`frontend/src/content/schema.ts` describes the required shape of the content
with zod. The checks run as tests, and `npm run build` runs the tests first.
A missing field, a misspelled key or a banned word stops the build. zod is a
development dependency only: browser code imports the types from the schema
but never the library, which keeps the published site small.

## 4. Retrieval without a database (planned for Phase 6)

The AI assistant's knowledge base is small, so version 1 keeps it in one
index file that the backend loads into memory. This keeps hosting free. The
retriever sits behind an interface, so a database such as PostgreSQL with
pgvector can replace it later without changing the rest of the backend.

## 5. Three blues, each for one job

The accent colour `#3B82F6` from the design cannot be used for everything,
because text needs a contrast of at least 4.5 to 1 to be readable:

- White text on the accent has only 3.68 to 1, so **button backgrounds** use
  the darker `#2563EB` (5.17 to 1 with white text).
- Accent-coloured text on a card has only 4.33 to 1, so **blue text such as
  links** uses the lighter `#60A5FA` (6.3 to 1 on a card).
- The **accent** itself stays `#3B82F6` for borders, focus rings, the active
  navigation marker and indicators, where the text rule does not apply.

Tests in `frontend/src/styles/tokens.test.ts` keep these rules true.

## 6. Inter as the starting font

The site starts with Inter, bundled with the site so no request goes to an
external font service. The font is one token (`--font-sans` in
`frontend/src/styles/tokens.css`) and can be changed in one place.

## 7. The browser's own dialog, and animation in CSS only

The CV preview and the enlarged project image use the browser's `<dialog>`
element. The browser then keeps keyboard focus inside the window, closes it
on Escape and returns focus to the button that opened it, so none of that
has to be written and tested by hand.

All animation (scroll fade-in, card expansion, the availability pulse) is
plain CSS inside a "motion allowed" block. A visitor who has asked their
system to reduce motion gets none of it, and sections are never hidden when
the browser cannot watch scrolling. No animation library is used.

## 8. Contact form through Web3Forms, without a CAPTCHA

The form posts directly from the browser to Web3Forms, which emails the
message. No server of our own is involved and the project holds no email
password. The access key in `content/contact.json` is public by design: it
can only be used to send a message to the inbox it belongs to. The inbox
address itself is set at Web3Forms and is not in the code.

Spam protection is a hidden trap field that people never see, plus the
service's own filter. A CAPTCHA was left out on purpose: it would load a
third-party script on every visit and add a step for every real visitor.
If spam becomes a problem, hCaptcha (supported by Web3Forms) can be added
to the form without changing its structure.

The sending code never throws. Every outcome, including a timeout after 15
seconds, becomes a plain result that the form turns into a message, and a
failed send always keeps what the visitor typed.
