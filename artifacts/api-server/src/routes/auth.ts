import { Router } from "express";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@workspace/db";
import { adminsTable } from "@workspace/db";
import { generateToken, requireAuth, type AuthenticatedRequest } from "../middlewares/auth.js";

const router = Router();

// POST /api/auth/login
router.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body as { email?: string; password?: string };
    if (!email || !password) {
      res.status(400).json({ error: "Email and password are required" });
      return;
    }

    const [admin] = await db.select().from(adminsTable).where(eq(adminsTable.email, email.toLowerCase())).limit(1);

    if (!admin) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    const valid = await bcrypt.compare(password, admin.passwordHash);
    if (!valid) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    const token = generateToken(admin.id, admin.email);
    res.json({
      token,
      admin: { id: admin.id, email: admin.email, createdAt: admin.createdAt },
    });
  } catch (err) {
    req.log.error({ err }, "Login error");
    res.status(500).json({ error: "Login failed" });
  }
});

// POST /api/auth/setup — only works when no admin exists
router.post("/auth/setup", async (req, res) => {
  try {
    const existing = await db.select({ id: adminsTable.id }).from(adminsTable).limit(1);
    if (existing.length > 0) {
      res.status(400).json({ error: "Admin account already exists" });
      return;
    }

    const { email, password } = req.body as { email?: string; password?: string };
    if (!email || !password) {
      res.status(400).json({ error: "Email and password are required" });
      return;
    }
    if (password.length < 8) {
      res.status(400).json({ error: "Password must be at least 8 characters" });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const [admin] = await db.insert(adminsTable).values({
      email: email.toLowerCase(),
      passwordHash,
    }).returning();

    const token = generateToken(admin.id, admin.email);
    res.status(201).json({
      token,
      admin: { id: admin.id, email: admin.email, createdAt: admin.createdAt },
    });
  } catch (err) {
    req.log.error({ err }, "Setup error");
    res.status(500).json({ error: "Setup failed" });
  }
});

// GET /api/auth/me
router.get("/auth/me", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const [admin] = await db.select().from(adminsTable).where(eq(adminsTable.id, req.adminId!)).limit(1);
    if (!admin) {
      res.status(401).json({ error: "Admin not found" });
      return;
    }
    res.json({ id: admin.id, email: admin.email, createdAt: admin.createdAt });
  } catch (err) {
    req.log.error({ err }, "Get me error");
    res.status(500).json({ error: "Failed to get admin info" });
  }
});

export default router;
