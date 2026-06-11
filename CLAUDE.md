# Project Rules

This is a Next.js (App Router) site deployed on Vercel.

## GitHub

- Always use the `gh` CLI for interacting with GitHub (PRs, issues, releases, API, etc.). Do not use the web UI or raw API calls when `gh` can do it.

## Git workflow

- **`main` only.** We use a single branch. Never create separate/feature branches. Everything gets committed and pushed to `main`.
- **At the start of every session:** check the git remote for updates and pull any changes before starting work, so we don't create merge conflicts.
  ```
  git fetch origin
  git pull --ff-only origin main   # or pull/merge if needed
  ```
- **Before pushing:** check for remote updates again. If there are any, pull and merge, and resolve any conflicts before pushing.
- Make sure all work is committed and pushed to `main`.

## Builds (test Vercel build locally before pushing)

- **Always run a production build before pushing**, to verify the Vercel build will succeed:
  ```
  npm run build
  ```
- If the build fails, **fix the errors and re-run the build until it passes** before pushing. Never push a failing build.
- Recommended pre-push sequence:
  ```
  npm run typecheck
  npm run lint
  npm run build
  ```
