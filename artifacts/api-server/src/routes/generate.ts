import { Router } from "express";
import { eq } from "drizzle-orm";
import { db } from "@workspace/db";
import { settingsTable } from "@workspace/db";
import { generateLaunchContent } from "../services/aiService.js";
import { requireAuth } from "../middlewares/auth.js";

const router = Router();

// POST /api/generate
router.post("/generate", requireAuth, async (req, res) => {
  try {
    const { brandName, productName, launchDate, tone, targetAudience, additionalContext } = req.body as {
      brandName?: string;
      productName?: string;
      launchDate?: string;
      tone?: "professional" | "friendly" | "exciting" | "formal" | "casual";
      targetAudience?: string;
      additionalContext?: string;
    };

    if (!brandName || !productName || !launchDate || !tone || !targetAudience) {
      res.status(400).json({ error: "All fields are required: brandName, productName, launchDate, tone, targetAudience" });
      return;
    }

    // Get Claude API key from settings
    const [settings] = await db.select().from(settingsTable).where(eq(settingsTable.id, String("default"))).limit(1);
    const claudeApiKey = settings?.claudeApiKey || process.env["CLAUDE_API_KEY"];

    if (!claudeApiKey) {
      res.status(400).json({ error: "Claude API key is not configured. Please add it in Settings." });
      return;
    }

    const content = await generateLaunchContent(claudeApiKey, {
      brandName,
      productName,
      launchDate,
      tone,
      targetAudience,
      additionalContext,
    });

    res.json(content);
  } catch (err) {
    req.log.error({ err }, "Generate content error");
    const message = err instanceof Error ? err.message : "Failed to generate content";
    res.status(500).json({ error: message });
  }
});

export default router;
