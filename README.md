# Cooksmith MVP

A deliberately lean, mobile-first prototype for testing Cooksmith with real households.

## Included

- Shared recipe library with 12 seeded recipes
- Personal recipes with original-source links
- Lightweight pantry list
- Seven-day meal planner
- Shopping list generated from the meal plan
- Browser persistence for zero-setup product testing

## Run locally

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build
```

The output is written to `dist/` and can be deployed to Vercel or Netlify. Browser storage is intentionally used in this first product prototype. Supabase authentication, household data and row-level security are the next hardening step before broader testing.
