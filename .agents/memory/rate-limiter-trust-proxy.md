---
name: Rate limiter trust proxy
description: express-rate-limit throws ERR_ERL_UNEXPECTED_X_FORWARDED_FOR unless trust proxy is set.
---

Replit routes all traffic through a proxy that sets `X-Forwarded-For`. express-rate-limit validates this header against the Express `trust proxy` setting.

**Rule:** Add `app.set("trust proxy", 1)` before any `rateLimit()` middleware when running behind a proxy.

**Why:** Without it, express-rate-limit throws a `ValidationError` on every request, polluting logs and potentially breaking rate limit accuracy.

**How to apply:** Place `app.set("trust proxy", 1)` early in `app.ts`, before body parsing and route mounting.
