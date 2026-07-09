---
name: Express 5 params casting
description: req.params values are typed as string|string[] in @types/express v5; must cast explicitly.
---

In `@types/express` v5 (^5.0.6), `req.params["key"]` has type `string | string[]`, not just `string`. This breaks Drizzle `eq()` and similar calls that expect a plain `string`.

**Rule:** Always cast route params with `String(req.params["key"])` before passing to DB queries.

**Why:** Without the cast, TypeScript infers the union type and no Drizzle overload matches, causing TS errors even when the runtime value is always a string.

**How to apply:** Any time you write `eq(table.col, req.params.id)`, change it to `eq(table.col, String(req.params["id"]))`.
