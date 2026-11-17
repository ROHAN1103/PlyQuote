# Frontend

React 19 + TypeScript (strict) + Vite + Tailwind 4. `npm run dev`, `npm test`, `npm run typecheck`, `npm run build`.
Feature folders under `src/features`; all HTTP goes through `src/lib/api.ts` (cookies, CSRF, error mapping).
shadcn-style primitives are in `src/components/ui` (`components.json` is configured so the shadcn CLI can add more).
