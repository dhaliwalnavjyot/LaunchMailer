---
name: Express 5 wildcard routes
description: Express 5 + path-to-regexp v8 requires named wildcards; bare /* throws PathError at startup.
---

Express 5 uses path-to-regexp v8 which requires all wildcards to be named parameters.

**Rule:** Use `/*splat` (or any name) instead of `/*` for catch-all routes.

**Why:** path-to-regexp v8 throws `PathError: Missing parameter name` at startup for bare `*` wildcards. This is a breaking change from Express 4.

**How to apply:** Anywhere you write `app.use("/api/*", ...)` change to `app.use("/api/*splat", ...)`.
