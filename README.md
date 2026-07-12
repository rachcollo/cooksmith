# Cooksmith MVP

A deliberately lean, mobile-first prototype for testing Cooksmith with real households.

## Included

- Shared recipe library with 12 seeded recipes
- Personal recipes with original-source links
- Lightweight pantry list
- Seven-day meal planner
- Shopping list generated from the meal plan
- Supabase email magic-link authentication
- Private household persistence with row-level security

## Run locally

1. Run `supabase/migrations/001_initial_schema.sql` in the Supabase SQL Editor.
2. Copy `.env.example` to `.env.local`.
3. Add the Supabase Project URL and publishable/anon key.
4. Run `npm install` then `npm run dev`.

## Production build

```bash
npm run build
```

The output is written to `dist/` and can be deployed to Vercel. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` to the Vercel project settings before deployment. Never add the service-role key to the browser or repository.
