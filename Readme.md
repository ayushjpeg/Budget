
# Budget Tracker

Single-page monthly budget app built in the same style as Food, Gym, and Tasks.

## Features

- Google-auth protected frontend via the shared backend
- One-page monthly overview with total expenditure on top
- Collapsible sections for Investments, Rusty, Household, and Extra
- Add, edit, and delete budget entries
- Data stored in the shared PostgreSQL database through common-backend

## Run locally

```bash
npm install
npm run dev
```

The Vite dev server is pinned to port `8011`.

## Build

```bash
npm run build
```

## Backend dependency

This frontend expects the shared backend to expose the authenticated budget endpoints under:

- `/api/budget/entries`

It also expects the backend auth flow to be enabled, matching the other apps.

