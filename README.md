# Punctual

A fast, keyboard-friendly task manager in the spirit of Todoist — projects, labels, filters, recurring tasks, board/calendar views, and a focus timer, wrapped in a warm cream/terracotta visual style.

## Features

- Inbox, projects, sections, and sub-tasks
- Natural-language quick add (dates, priorities, labels, recurrence)
- List, board, and calendar views per project
- Filters, labels, and saved views (Today, Upcoming, Filters & Labels)
- Priorities, due dates, reminders, and recurring due dates
- Light/dark themes with selectable accent colors
- Productivity/karma tracking and a built-in focus timer
- Command menu for quick keyboard navigation

## Tech stack

- React (Create React App + [craco](https://craco.js.org/) for config overrides)
- Tailwind CSS (via CDN in `public/index.html`)
- [lucide-react](https://lucide.dev/) icons
- [@dnd-kit](https://dndkit.com/) for drag-and-drop
- Local-first storage via a small async wrapper around `localStorage`

## Getting started

```bash
npm install
npm start
```

The app runs at [http://localhost:3000](http://localhost:3000).

### Available scripts

- `npm start` — run the dev server
- `npm run build` — production build
- `npm test` — run tests

## Project structure

```
src/
  components/   UI components (sidebar, task sheet, project views, settings, focus timer, etc.)
  lib/          Dates, filters, natural-language parsing, karma, constants
  state/        App state (reducer + actions)
  storage.js    localStorage persistence with schema migration
  theme.js      Theme context (light/dark + accent presets)
```

## Data

All data is stored locally in the browser via `localStorage` — no backend or account required.
