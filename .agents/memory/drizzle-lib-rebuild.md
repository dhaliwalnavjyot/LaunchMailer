---
name: Drizzle lib/db rebuild
description: After adding schema tables/columns, must rebuild lib/db declarations before typechecking dependents.
---

When new tables or columns are added to `lib/db/src/schema/`, the TypeScript declaration files in `lib/db/dist/` become stale. Packages that depend on `@workspace/db` (like `api-server`) will show "has no exported member" errors.

**Rule:** After any schema change, run `pnpm run typecheck:libs` (which runs `tsc --build`) before typechecking dependent packages.

**Why:** The workspace uses TypeScript project references. The composite build must be refreshed so that downstream packages see the updated `.d.ts` files.

**How to apply:** Always run `typecheck:libs` → `push` → `typecheck api-server` in that order when modifying `lib/db/src/schema/`.
