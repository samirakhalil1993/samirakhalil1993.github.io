# Samir Akhalil – Portfolio

A single-page portfolio website with an AI assistant. This repository holds
the website (`frontend/`), all of its text and settings (`content/`), and the
project documents (`docs/`). The AI backend is added in a later phase.

The full design is described in the
[design document](https://claude.ai/artifact/9w7t6wEDyTCQwsnaz3Aow3).
Short notes on the main technical choices are in
[`docs/decisions.md`](docs/decisions.md).

## Current status

All seven phases are built. The site is published by GitHub Pages and the AI
backend runs on Render; both are described under
[How the site is published](#how-the-site-is-published). The backend has its
own guide, [`backend/README.md`](backend/README.md).

## Run the site on your computer

The site is built with Node.js tools, so Node.js must be installed first.
Version 22 or newer is required. You can check your version with
`node --version`.

The commands are run inside the `frontend` folder, because that is where the
website's `package.json` lives.

```bash
cd frontend
npm install      # downloads the libraries the site needs (first time only)
npm run dev      # starts the site and prints a local address to open
```

Open the address that `npm run dev` prints (normally
`http://localhost:5173`). The page reloads by itself when you save a file.

On your computer the chat talks to a backend on your computer
(`http://localhost:8000`, set in `frontend/.env.development`), never to the
published one. Start that backend as described in `backend/README.md`, or
the chat shows its "not available" message. The rest of the site works
without it.

## Check and build the site

The tests check that the content files are complete and that the colours are
readable. Run them after every content change, so a mistake is found before
the site is published.

```bash
cd frontend
npm test         # runs all checks
npm run build    # runs the checks, then builds the finished site into dist/
```

Only `npm test` and `npm run build` check the content. `npm run dev` shows
whatever is in the files, even when something is missing.

`npm run build` refuses to build when a check fails. This is on purpose: a
broken content file can never reach the published site.

## Change the content

All text on the site comes from the JSON files in `content/`. You never need
to edit a component to change text.

| File | What it changes |
| --- | --- |
| `profile.json` | Name, title, introduction, About text, location, photo, footer description |
| `availability.json` | The status line in the hero, and whether its dot is lit |
| `skills.json` | The skill categories and their tags |
| `projects.json` | The project cards and their detail text |
| `education.json` | The education entries |
| `experience.json` | The experience entries |
| `contact.json` | Email, LinkedIn, GitHub, the CV file, the contact form address |
| `knowledge-sources.json` | What the AI assistant is allowed to read |
| `chat.json` | The assistant's welcome text and suggested questions |

Three rules make editing safe:

- **Optional fields hide their part of the page.** A project without a
  `github` link shows no GitHub button. An experience entry without a
  `context` line shows none.
- **The order in the file is the order on the page.** Move a project up in
  `projects.json` and its card moves up.
- **The checks tell you what is wrong.** If you delete a required field or
  misspell a key, `npm test` fails and names the field.

### Example: change the availability status

Open `content/availability.json` and change the text after `"status"`:

```json
{
  "status": "Open to Internships",
  "active": true
}
```

Save the file. The page updates at once while `npm run dev` is running.

### Turn on the contact form

The form sends messages through a service called Web3Forms, which forwards
them to your inbox. The service must know which inbox to use, and it
identifies your form by an access key. Until that key is in the content
files, the site hides the form and shows only the direct links.

1. Go to https://web3forms.com and enter the email address that should
   receive the messages. This is where the inbox is chosen; the address is
   never written in this project.
2. Web3Forms emails you an access key. It looks like
   `0a1b2c3d-1234-4567-8901-234567890abc`.
3. Add the key to `content/contact.json` as a new last line inside the
   braces. The line before it must end with a comma:

   ```json
   "cvPath": "cv.pdf",
   "formAccessKey": "paste-your-key-here"
   ```

4. Run `npm test`, then `npm run dev`, and send yourself one test message.

Web3Forms keeps a copy of each message for a while. You can choose how long
in your Web3Forms account; a short period is kinder to the people who write
to you.

The key is not a secret. It only allows sending a message to your inbox,
which the form on the public site does anyway, so it is safe to keep in the
repository. The free plan allows 250 messages a month.

### The chat: address, texts and suggested questions

Everything about the chat is set in `content/chat.json`:

| Setting | What it does |
| --- | --- |
| `apiUrl` | The public address of the AI backend. It must start with `https://` and have nothing after the address. A check stops the build if a local address is put here by mistake. |
| `liveNotice` | The line under the title: it says the answers come from an AI model and may be wrong. |
| `wakingMessage` | Shown when an answer takes more than 5 seconds to start. The free backend sleeps when nobody uses it and needs about a minute to wake. |
| `title`, `welcome`, `placeholder` | The texts of the window. |
| `suggestedQuestions` | The questions offered before the first message. |
| `errorMessage`, `limitMessage` | Shown when an answer fails, or when the usage limit is reached. |
| `demo`, `demoNotice` | Demo mode: prepared answers with a "Demo" badge. It is only used when `apiUrl` is removed. With `"demo": false` and no `apiUrl`, the page has no chat at all. |

If you ever need to take the AI chat offline, remove the `apiUrl` line and
keep `"demo": false`. The chat button then disappears from the page.

After changing any content, rebuild the assistant's index (see
`backend/README.md`), or the assistant keeps answering from the old text.
The automatic checks on GitHub refuse a change where this was forgotten.

### Replace the CV

The site shows one CV file everywhere (hero, contact section and preview
window), so replacing that one file updates all of them. Save your CV as a
PDF named `cv.pdf` and put it in `frontend/public/`, replacing the file that
is there. The file in the repository now is only a placeholder.

### Add details and an image to a project

Each project in `content/projects.json` has a `details` object. Every field
is optional, and a part without text is simply not shown, so you can fill
them in one at a time:

```json
"image": "images/sre-agent.png",
"imageAlt": "Diagram of the agent reading metrics, logs and code",
"details": {
  "problemGoal": "What problem the project solves.",
  "solutionArchitecture": "How the solution works.",
  "contributions": "What you did yourself.",
  "resultsChallenges": "Results, limits and lessons."
}
```

Images go in `frontend/public/images/`. An `image` must always come with an
`imageAlt` text that describes it; the checks fail without one.

## How the site is published

Publishing is automatic, so that nothing untested can reach visitors.

1. You push a change to the `main` branch on GitHub.
2. GitHub runs three groups of checks (file `.github/workflows/ci.yml`): the
   site's tests and build, the backend's tests, and tests that use the whole
   site in a real browser.
3. If every check passes, GitHub publishes the site to GitHub Pages, and
   Render starts the new backend. If one fails, the published site stays as
   it was, and GitHub sends you an email.

| Part | Where it runs | Address |
| --- | --- | --- |
| The site | GitHub Pages | `https://samirakhalil1993.github.io` |
| The AI backend | Render, free plan (`render.yaml`) | `https://samir-portfolio-api.onrender.com` |

The Groq key is stored only in Render's dashboard (Environment), never in
this repository.

### Change content and publish

```bash
# 1. edit files in content/
cd frontend && npm test                             # 2. check the content
cd ../backend && python -m ingest.build_index       # 3. rebuild the assistant's index
git add -A && git commit -m "Update content" && git push
```

A few minutes later the change is online. The "Actions" tab of the
repository shows the progress.

### When the chat does not answer

| What you see | Likely cause | What to do |
| --- | --- | --- |
| "The assistant is waking up", then an answer | The backend was asleep. This is normal on the free plan. | Nothing. |
| The "not available" message on every question | The backend is down, the Groq key is wrong, or the model name no longer exists | Open the service in Render and read "Logs". Check `GROQ_API_KEY` and `GROQ_MODEL` under "Environment". |
| The limit message | The usage limit of the day or of the hour is reached | It clears by itself. The limits are explained in `backend/README.md`. |
| The chat works on the site but not on your computer | The local backend is not running | Start it (see `backend/README.md`). |

### Run the browser tests yourself

```bash
cd e2e
npm install
npx playwright install chromium      # first time only: downloads a browser
E2E_PYTHON=../backend/.venv/bin/python npx playwright test             # macOS / Linux
```

On Windows PowerShell, set the variable first:
`$env:E2E_PYTHON = "..\backend\.venv\Scripts\python.exe"`, then run
`npx playwright test`.

## Folder overview

```
content/     all text and settings, as JSON
frontend/    the website (React, Vite, TypeScript, Tailwind CSS)
backend/     the AI assistant's server (Python, FastAPI)
e2e/         tests that use the whole site in a real browser (Playwright)
.github/     the automatic checks and the publishing steps
render.yaml  tells Render how to run the backend
docs/        design decisions and implementation plans
```
