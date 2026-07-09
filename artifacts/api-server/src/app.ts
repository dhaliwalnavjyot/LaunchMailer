import express, { type Express, type Request, type Response } from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import pinoHttp from "pino-http";
import { eq } from "drizzle-orm";
import router from "./routes/index.js";
import { logger } from "./lib/logger.js";

const app: Express = express();

// Security headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false, // Managed by frontend
}));

// CORS — allow all origins in dev, restrict in prod via env
const allowedOrigins = process.env["CORS_ORIGIN"]
  ? process.env["CORS_ORIGIN"].split(",")
  : ["*"];

app.use(cors({
  origin: allowedOrigins[0] === "*" ? true : allowedOrigins,
  credentials: true,
}));

// Logging
app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return { id: req.id, method: req.method, url: req.url?.split("?")[0] };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },
  }),
);

// Trust the Replit proxy (one hop) so rate-limiting reads the real client IP
app.set("trust proxy", 1);

// Body parsing
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Rate limiting — general API
app.use("/api", rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later" },
}));

// Stricter rate limit for auth endpoints
app.use("/api/auth/login", rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many login attempts, please try again later" },
}));

// Stricter rate limit for send endpoints (expensive operations)
app.use("/api/send", rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Send rate limit exceeded, please wait before sending again" },
}));

// Unsubscribe endpoint (public, no auth)
app.get("/api/unsubscribe", async (req: Request, res: Response) => {
  try {
    const { email } = req.query as { email?: string };
    if (!email) {
      res.status(400).send("Invalid unsubscribe link");
      return;
    }
    // Lazy import to avoid circular deps at startup
    const { db } = await import("@workspace/db");
    const { customersTable } = await import("@workspace/db");
    await db.update(customersTable)
      .set({ unsubscribed: true })
      .where(eq(customersTable.email, email.toLowerCase()));

    res.send(`
      <!DOCTYPE html>
      <html>
      <head><title>Unsubscribed</title></head>
      <body style="font-family:sans-serif;max-width:480px;margin:80px auto;text-align:center">
        <h2>You've been unsubscribed</h2>
        <p>You will no longer receive marketing emails from us.</p>
      </body>
      </html>
    `);
  } catch (err) {
    logger.error({ err }, "Unsubscribe error");
    res.status(500).send("Something went wrong");
  }
});

// Health check (simple, no auth needed)
app.get("/api/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Main API routes (mounted at /api)
app.use("/api", router);

// 404 for unmatched API routes
app.use("/api/*splat", (_req: Request, res: Response) => {
  res.status(404).json({ error: "Route not found" });
});

export default app;
