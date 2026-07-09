import { Router } from "express";
import { eq } from "drizzle-orm";
import { db } from "@workspace/db";
import { settingsTable } from "@workspace/db";
import { requireAuth } from "../middlewares/auth.js";

const router = Router();

// GET /api/settings
router.get("/settings", requireAuth, async (req, res) => {
  try {
    const [settings] = await db.select().from(settingsTable).where(eq(settingsTable.id, "default")).limit(1);

    res.json({
      resendConfigured: !!(settings?.resendApiKey || process.env["RESEND_API_KEY"]),
      senderEmail: settings?.senderEmail || process.env["SENDER_EMAIL"] || null,
      senderName: settings?.senderName || process.env["SENDER_NAME"] || null,
      twilioConfigured: !!(settings?.twilioSid || process.env["TWILIO_SID"]),
      twilioWhatsappNumber: settings?.twilioWhatsappNumber || process.env["TWILIO_WHATSAPP_NUMBER"] || null,
      claudeConfigured: !!(settings?.claudeApiKey || process.env["CLAUDE_API_KEY"]),
      companyName: settings?.companyName || null,
      companyLogoUrl: settings?.companyLogoUrl || null,
    });
  } catch (err) {
    req.log.error({ err }, "Get settings error");
    res.status(500).json({ error: "Failed to get settings" });
  }
});

// PUT /api/settings
router.put("/settings", requireAuth, async (req, res) => {
  try {
    const body = req.body as {
      resendApiKey?: string;
      senderEmail?: string;
      senderName?: string;
      twilioSid?: string;
      twilioAuthToken?: string;
      twilioWhatsappNumber?: string;
      claudeApiKey?: string;
      companyName?: string;
      companyLogoUrl?: string;
    };

    // Build update payload — only include fields that are provided
    const updateData: Partial<typeof body & { updatedAt: Date }> = { updatedAt: new Date() };
    if (body.resendApiKey !== undefined) updateData.resendApiKey = body.resendApiKey;
    if (body.senderEmail !== undefined) updateData.senderEmail = body.senderEmail;
    if (body.senderName !== undefined) updateData.senderName = body.senderName;
    if (body.twilioSid !== undefined) updateData.twilioSid = body.twilioSid;
    if (body.twilioAuthToken !== undefined) updateData.twilioAuthToken = body.twilioAuthToken;
    if (body.twilioWhatsappNumber !== undefined) updateData.twilioWhatsappNumber = body.twilioWhatsappNumber;
    if (body.claudeApiKey !== undefined) updateData.claudeApiKey = body.claudeApiKey;
    if (body.companyName !== undefined) updateData.companyName = body.companyName;
    if (body.companyLogoUrl !== undefined) updateData.companyLogoUrl = body.companyLogoUrl;

    // Upsert settings
    await db.insert(settingsTable)
      .values({ id: "default", ...updateData })
      .onConflictDoUpdate({ target: settingsTable.id, set: updateData });

    const [updated] = await db.select().from(settingsTable).where(eq(settingsTable.id, "default")).limit(1);

    res.json({
      resendConfigured: !!(updated?.resendApiKey || process.env["RESEND_API_KEY"]),
      senderEmail: updated?.senderEmail || process.env["SENDER_EMAIL"] || null,
      senderName: updated?.senderName || process.env["SENDER_NAME"] || null,
      twilioConfigured: !!(updated?.twilioSid || process.env["TWILIO_SID"]),
      twilioWhatsappNumber: updated?.twilioWhatsappNumber || process.env["TWILIO_WHATSAPP_NUMBER"] || null,
      claudeConfigured: !!(updated?.claudeApiKey || process.env["CLAUDE_API_KEY"]),
      companyName: updated?.companyName || null,
      companyLogoUrl: updated?.companyLogoUrl || null,
    });
  } catch (err) {
    req.log.error({ err }, "Update settings error");
    res.status(500).json({ error: "Failed to update settings" });
  }
});

export default router;
