---
name: api-client-react deep imports
description: Only the root "." export is defined; setBaseUrl, ApiError etc. are re-exported from the root entry.
---

`lib/api-client-react/package.json` only has `"exports": { ".": "./src/index.ts" }`.

**Rule:** Always import from `@workspace/api-client-react` (root), never from `@workspace/api-client-react/src/custom-fetch` or any subpath.

**Why:** Vite resolves exports strictly; deep imports that aren't in the exports map fail at build/serve time with "Missing specifier" errors.

**How to apply:** `setBaseUrl`, `setAuthTokenGetter`, `ApiError`, `customFetch`, and all generated hooks are re-exported from `lib/api-client-react/src/index.ts` which is the root entry. Use the root import everywhere.
