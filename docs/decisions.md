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

## 5. A darker blue for button backgrounds

The accent colour `#3B82F6` with white text has a contrast of 3.68 to 1,
below the 4.5 to 1 needed for readable text. The accent stays `#3B82F6` for
borders, links, focus rings and indicators. Button backgrounds use
`#2563EB`, which gives 5.17 to 1 with white text. A test in
`frontend/src/styles/tokens.test.ts` keeps both rules true.

## 6. Inter as the starting font

The site starts with Inter, bundled with the site so no request goes to an
external font service. The font is one token (`--font-sans` in
`frontend/src/styles/tokens.css`) and can be changed in one place.
