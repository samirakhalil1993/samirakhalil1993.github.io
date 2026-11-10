# Samir Akhalil – Portfolio

A single-page portfolio website with an AI assistant. This repository holds
the website (`frontend/`), all of its text and settings (`content/`), and the
project documents (`docs/`). The AI backend is added in a later phase.

The full design is described in the
[design document](https://claude.ai/artifact/9w7t6wEDyTCQwsnaz3Aow3).
Short notes on the main technical choices are in
[`docs/decisions.md`](docs/decisions.md).

## Current status

Phase 6 (AI backend) is built and tested with a stand-in for the AI model.
The backend lives in `backend/` and has its own guide,
[`backend/README.md`](backend/README.md), which includes the steps for the
first real test with a Groq key. Until the chat is connected (`apiUrl` in
`content/chat.json`), it stays in demo mode. Phase 7 is testing and
deployment.

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

### The chat: demo mode, texts and suggested questions

Until the AI backend exists, the chat cannot really answer questions. To
keep the site honest, it runs in demo mode: it gives prepared answers taken
from the content files and shows a "Demo" badge. Everything about the chat
is set in `content/chat.json`:

| Setting | What it does |
| --- | --- |
| `demo` | `true` shows the chat with prepared answers and the Demo badge. `false` hides the chat completely (as long as no `apiUrl` is set). |
| `demoNotice` | The line under the title that explains demo mode. |
| `title`, `welcome`, `placeholder` | The texts of the window. |
| `suggestedQuestions` | The questions offered before the first message. |
| `errorMessage`, `limitMessage` | Shown when an answer fails, or when the usage limit is reached. |
| `apiUrl` | The address of the AI backend. When it is set, the chat sends questions there and shows the AI notice; the Demo badge disappears. Use `http://localhost:8000` while testing on your own computer. |
| `liveNotice` | The line under the title when the chat is connected to the AI backend. |

In demo mode, a question is answered only if it contains a word the demo
knows (project, skill, experience, education, contact, or a general word
such as "who" or "why"). If you change the suggested questions, run
`npm test`: a check fails when one of them would get no real answer.

After changing any content, rebuild the assistant's index (see
`backend/README.md`), or the assistant keeps answering from the old text.

**Before the site goes public, set `"demo": false` unless the AI backend is
connected.** A visitor should not meet a chat that can only give prepared
answers.

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

## Folder overview

```
content/     all text and settings, as JSON
frontend/    the website (React, Vite, TypeScript, Tailwind CSS)
backend/     the AI assistant's server (Python, FastAPI)
docs/        design decisions and implementation plans
```
