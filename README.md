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
- Account login with tasks synced across every device you sign in on

## Tech stack

- React (Create React App + [craco](https://craco.js.org/) for config overrides)
- Tailwind CSS (via CDN in `public/index.html`)
- [lucide-react](https://lucide.dev/) icons
- [@dnd-kit](https://dndkit.com/) for drag-and-drop
- [Supabase](https://supabase.com/) for auth and data sync

## Getting started

```bash
npm install
npm start
```

The app runs at [http://localhost:3000](http://localhost:3000).

### Environment variables

Create a `.env.local` with your Supabase project's URL and anon key:

```
REACT_APP_SUPABASE_URL=https://your-project.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-anon-key
```

Then run the SQL in `supabase-schema.sql` once, in your Supabase project's SQL editor, to create the `user_storage` table and its row-level security policies.

### Available scripts

- `npm start` — run the dev server
- `npm run build` — production build
- `npm test` — run tests

## Project structure

```
src/
  components/   UI components (sidebar, task sheet, project views, settings, focus timer, auth, etc.)
  lib/          Dates, filters, natural-language parsing, karma, constants, Supabase client
  state/        App state (reducer + actions)
  storage.js    Persistence layer with schema migration
  theme.js      Theme context (light/dark + accent presets)
```

## Data

Task data is stored per-account in Supabase, scoped by row-level security so each user can only ever read or write their own data.
