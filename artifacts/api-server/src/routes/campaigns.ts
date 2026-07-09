import { Router } from "express";
import { eq, and, isNotNull, inArray, desc, sql } from "drizzle-orm";
import { db } from "@workspace/db";
import { campaignsTable, customersTable, campaignLogsTable } from "@workspace/db";
import { requireAuth } from "../middlewares/auth.js";

const router = Router();

// GET /api/campaigns
router.get("/campaigns", requireAuth, async (req, res) => {
  try {
    const campaigns = await db.select().from(campaignsTable).orderBy(desc(campaignsTable.createdAt));
    res.json(campaigns);
  } catch (err) {
    req.log.error({ err }, "List campaigns error");
    res.status(500).json({ error: "Failed to list campaigns" });
  }
});

// POST /api/campaigns
router.post("/campaigns", requireAuth, async (req, res) => {
  try {
    const { name, subject, emailContent, whatsappMessage, imageUrl, method, recipientFilter } = req.body as {
      name: string;
      subject?: string;
      emailContent?: string;
      whatsappMessage?: string;
      imageUrl?: string;
      method: "email" | "whatsapp" | "both";
      recipientFilter?: {
        hasEmail?: boolean;
        hasPhone?: boolean;
        city?: string;
        tags?: string[];
      };
    };

    if (!name) {
      res.status(400).json({ error: "Campaign name is required" });
      return;
    }

    // Validate based on method
    if ((method === "email" || method === "both") && !subject) {
      res.status(400).json({ error: "Subject is required for email campaigns" });
      return;
    }
    if ((method === "email" || method === "both") && !emailContent) {
      res.status(400).json({ error: "Email content is required for email campaigns" });
      return;
    }
    if ((method === "whatsapp" || method === "both") && !whatsappMessage) {
      res.status(400).json({ error: "WhatsApp message is required for WhatsApp campaigns" });
      return;
    }

    // Count recipients
    const conditions = [eq(customersTable.unsubscribed, false)];
    if (recipientFilter?.hasEmail) conditions.push(isNotNull(customersTable.email));
    if (recipientFilter?.hasPhone) conditions.push(isNotNull(customersTable.phone));
    if (recipientFilter?.city) conditions.push(sql`${customersTable.city} ILIKE ${'%' + recipientFilter.city + '%'}`);
    if (recipientFilter?.tags && recipientFilter.tags.length > 0) {
      conditions.push(sql`${customersTable.tags} && ${recipientFilter.tags}::text[]`);
    }

    const [recipientCountRow] = await db.select({ count: sql<number>`count(*)` }).from(customersTable).where(and(...conditions));
    const recipientCount = Number(recipientCountRow?.count ?? 0);

    const [campaign] = await db.insert(campaignsTable).values({
      name,
      subject: subject || null,
      emailContent: emailContent || null,
      whatsappMessage: whatsappMessage || null,
      imageUrl: imageUrl || null,
      method,
      status: "draft",
      recipientCount,
      recipientFilter: recipientFilter ?? null,
    }).returning();

    res.status(201).json(campaign);
  } catch (err) {
    req.log.error({ err }, "Create campaign error");
    res.status(500).json({ error: "Failed to create campaign" });
  }
});

// GET /api/campaigns/:id
router.get("/campaigns/:id", requireAuth, async (req, res) => {
  try {
    const id = String(req.params["id"]);
    const [campaign] = await db.select().from(campaignsTable).where(eq(campaignsTable.id, id)).limit(1);
    if (!campaign) {
      res.status(404).json({ error: "Campaign not found" });
      return;
    }

    const logs = await db.select().from(campaignLogsTable)
      .where(eq(campaignLogsTable.campaignId, id))
      .orderBy(desc(campaignLogsTable.createdAt));

    res.json({ ...campaign, logs });
  } catch (err) {
    req.log.error({ err }, "Get campaign error");
    res.status(500).json({ error: "Failed to get campaign" });
  }
});

// DELETE /api/campaigns/:id
router.delete("/campaigns/:id", requireAuth, async (req, res) => {
  try {
    const id = String(req.params["id"]);
    await db.delete(campaignLogsTable).where(eq(campaignLogsTable.campaignId, id));
    const [deleted] = await db.delete(campaignsTable).where(eq(campaignsTable.id, id)).returning();
    if (!deleted) {
      res.status(404).json({ error: "Campaign not found" });
      return;
    }
    res.json({ success: true, message: "Campaign deleted" });
  } catch (err) {
    req.log.error({ err }, "Delete campaign error");
    res.status(500).json({ error: "Failed to delete campaign" });
  }
});

export default router;
