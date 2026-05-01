# Task Notebook (Todo List)

## About

Task Notebook is a lightweight task planner built with Vanilla JS and Vite.
It uses Supabase for authentication and cloud persistence so each user sees only their own notebook data.

## Features

- Mandatory first-load auth modal (create account, log in, or continue as guest)
- Per-user data isolation with Supabase RLS policies
- Merge guest-session data into account data on signup/login
- Folder/tab-based todo organization
- Cloud-backed todo persistence (not just browser storage)
- Theme support (day/night style)

## Tech

- Vite
- Vanilla JS (ES modules)
- Supabase (`@supabase/supabase-js`)
- pnpm

## Setup Local Development

To run this project on your machine:

1. Clone the repository
2. Create a local `.env` file in the project root
3. Install dependencies:

```bash
pnpm install
```

4. Start the dev server:

```bash
pnpm dev
```

## Environment Variables

Create `.env` in the project root:

```bash
VITE_SUPABASE_PROJECT_URL=your-project-url
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key
```

Notes:

- `VITE_SUPABASE_PROJECT_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` are required.
- `VITE_APP_URL` is used for auth email redirects.

## Available Scripts

```bash
pnpm dev      # Start Vite dev server
pnpm build    # Build for production
pnpm preview  # Preview production build locally
```

## Supabase Notes (Important)

- Supabase migrations live in `supabase/migrations`.
- Auth and data access are designed around user ownership + RLS.


## Project Structure (High Level)

- `src/main.js` - app bootstrap + UI wiring
- `src/auth.js` - auth/session helpers + guest-to-user merge flow
- `src/supabase.js` - Supabase client initialization
- `src/styles/` - modular CSS files
- `supabase/` - local Supabase config and SQL migrations
