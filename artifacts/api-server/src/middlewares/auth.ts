import { type Request, type Response, type NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface AuthenticatedRequest extends Request {
  adminId?: string;
  adminEmail?: string;
}

// Fail fast at startup — never fall back to a weak default in production
const JWT_SECRET = process.env["JWT_SECRET"];

if (!JWT_SECRET || JWT_SECRET.length < 32) {
  // Only allow weak/missing secrets in test; exit otherwise
  if (process.env["NODE_ENV"] === "production") {
    console.error(
      "FATAL: JWT_SECRET env var is missing or too short (< 32 chars). " +
      "Set a strong secret before starting the server."
    );
    process.exit(1);
  } else {
    console.warn(
      "WARNING: JWT_SECRET is not set or is too short. " +
      "Using a temporary dev secret. Set JWT_SECRET in production."
    );
  }
}

const EFFECTIVE_SECRET = JWT_SECRET && JWT_SECRET.length >= 32
  ? JWT_SECRET
  : "launchmailer-dev-secret-do-not-use-in-prod-at-all";

export function generateToken(adminId: string, email: string): string {
  return jwt.sign({ adminId, email }, EFFECTIVE_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): { adminId: string; email: string } | null {
  try {
    const payload = jwt.verify(token, EFFECTIVE_SECRET) as { adminId: string; email: string };
    return payload;
  } catch {
    return null;
  }
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const token = authHeader.slice(7);
  const payload = verifyToken(token);

  if (!payload) {
    res.status(401).json({ error: "Invalid or expired token" });
    return;
  }

  req.adminId = payload.adminId;
  req.adminEmail = payload.email;
  next();
}
