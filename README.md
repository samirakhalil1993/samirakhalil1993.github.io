# Samir Akhalil – Portfolio

A single-page portfolio website with an AI assistant. This repository holds
the website (`frontend/`), all of its text and settings (`content/`), and the
project documents (`docs/`). The AI backend is added in a later phase.

The full design is described in the
[design document](https://claude.ai/artifact/9w7t6wEDyTCQwsnaz3Aow3).
Short notes on the main technical choices are in
[`docs/decisions.md`](docs/decisions.md).

## Current status

Phase 1 (project foundation) is finished. The site shows a small
"under construction" card with the name, title and availability status.
The real sections come in Phase 2.

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

## Folder overview

```
content/     all text and settings, as JSON
frontend/    the website (React, Vite, TypeScript, Tailwind CSS)
docs/        design decisions and implementation plans
```
