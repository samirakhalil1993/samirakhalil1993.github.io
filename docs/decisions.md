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

## 9. One contract between the chat window and whatever answers it

The chat window never calls a server itself. It calls a `ChatClient`: one
function that receives the conversation, reports each new piece of the
answer, and resolves with the sources or a failure reason
(`frontend/src/chat/types.ts`). The demo client and the future backend
client both follow this contract, so connecting the real AI in Phase 6 does
not change the window, the conversation rules or their tests.

The conversation rules (one answer at a time, 500 characters per message,
15 questions per conversation, retry after a failure) live in `useChat`,
apart from the markup, and are tested without drawing anything.

## 10. An honest demo mode

Before the backend exists, the chat can only give prepared answers. Shown
without comment, that would pass off canned text as an AI assistant. So the
demo client builds its answers only from the content files, the window
shows a "Demo" badge and a notice, and `chat.json` can switch the chat off
entirely. The chat window is not loaded lazily yet; that is a performance
item for Phase 7.

## 11. Groq as the model provider

The budget is free tier only. Of the providers compared in November 2026,
Groq was the only one with a standing free plan, published limits and no
payment card. Google Gemini's terms allow only paid use for sites with
visitors in the European Economic Area, and OpenAI has no free usage. The
provider sits behind a small interface (`backend/app/providers/base.py`), and
the model id is a setting, so either can be changed without touching the
rest.

## 12. Keyword search for retrieval

Groq offers no embedding model, a second provider would have received every
visitor's question, and a local embedding model needs more memory than free
hosts give. The knowledge base is also small (about 15 pieces). So retrieval
is BM25 keyword search with two small word lists: Swedish question words to
English, and English question words to the words the content uses. It sits
behind a `Retriever` interface, so embeddings can replace it later. Pieces
that score far below the best match are dropped, which keeps unrelated text
out of both the prompt and the source labels.

## 13. Sources are the pieces that were found

The source labels under an answer are the top pieces retrieval found (at
most three), not citations chosen by the model. This cannot be faked by the
model and needs no parsing of its text; the cost is that a label can appear
for a piece the answer did not end up using.

## 14. The wire format between site and backend

`POST /api/chat` takes `{"messages": [{"role", "text"}]}` and answers with a
stream of `data: {json}` events: `text` pieces, then exactly one `done` (with
sources) or `error` (with a reason). Refusals before the stream are plain
JSON with status 422, 413 or 429. Both sides are tested against this format,
and the site's API client keeps only the fields it knows from each source.

## 15. What the backend trusts and what it records

Everything from the browser is treated as untrusted: message shapes and
sizes are checked, assistant messages are cut short, and the rules always
come first in the prompt with the found content in a marked block. The
Groq key exists only as an environment variable. Log lines hold a status,
counts and timings, and a visitor code that changes at every start; never
message text or addresses.

## 16. Limits sized to the free plan, and a visitor address that cannot be invented

A security review of the backend changed four things. A request must state
its size up front, so an endless body is refused unread. Behind a proxy the
visitor is the last address in `X-Forwarded-For` (the one the proxy added),
and an IPv6 network counts as one visitor, so the per-visitor limit cannot be
dodged by inventing addresses. The limits follow the provider's token
allowance: 4 questions a minute and 100 a day for everyone, 20 an hour per
visitor. And the model is told to think briefly and not to send its
thinking, with an answer that ran out of room treated as a failure, so a
visitor never gets an empty bubble.
