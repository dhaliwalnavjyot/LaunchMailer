---
name: JWT startup guard pattern
description: Fail fast at boot when JWT_SECRET is absent or weak; never silently fall back to a hardcoded default.
---

**Rule:** Check `JWT_SECRET` at module load time. In production, call `process.exit(1)` if it's missing or shorter than 32 characters. In development, log a clear warning.

**Why:** A hardcoded fallback secret means tokens are forgeable by anyone who reads the source code. Silent fallbacks are a critical auth vulnerability.

**How to apply:**
```ts
const JWT_SECRET = process.env["JWT_SECRET"];
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  if (process.env["NODE_ENV"] === "production") { process.exit(1); }
  else { console.warn("WARNING: JWT_SECRET is weak..."); }
}
const EFFECTIVE_SECRET = JWT_SECRET?.length >= 32 ? JWT_SECRET : "dev-only-placeholder";
```
The `JWT_SECRET` secret must be set via Replit secrets before deploying.
