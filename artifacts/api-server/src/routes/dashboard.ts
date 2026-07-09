import { Router } from "express";
import { count, eq, isNotNull, desc, sum } from "drizzle-orm";
import { db } from "@workspace/db";
import { customersTable, campaignsTable, campaignLogsTable, uploadsTable } from "@workspace/db";
import { requireAuth } from "../middlewares/auth.js";

const router = Router();

// GET /api/dashboard
router.get("/dashboard", requireAuth, async (req, res) => {
  try {
    const [[totalCustomersRow], [withEmailRow], [withPhoneRow], [totalCampaignsRow], [emailsSentRow], [whatsappSentRow], recentCampaigns, recentUploads] = await Promise.all([
      db.select({ count: count() }).from(customersTable).where(eq(customersTable.unsubscribed, false)),
      db.select({ count: count() }).from(customersTable).where(isNotNull(customersTable.email)),
      db.select({ count: count() }).from(customersTable).where(isNotNull(customersTable.phone)),
      db.select({ count: count() }).from(campaignsTable),
      db.select({ total: sum(campaignsTable.emailSent) }).from(campaignsTable),
      db.select({ total: sum(campaignsTable.whatsappSent) }).from(campaignsTable),
      db.select().from(campaignsTable).orderBy(desc(campaignsTable.createdAt)).limit(5),
      db.select().from(uploadsTable).orderBy(desc(uploadsTable.createdAt)).limit(5),
    ]);

    const recentCampaignsMapped = recentCampaigns.map((c) => ({
      id: c.id,
      name: c.name,
      method: c.method,
      status: c.status,
      recipientCount: c.recipientCount,
      emailSent: c.emailSent,
      whatsappSent: c.whatsappSent,
      successCount: c.successCount,
      failedCount: c.failedCount,
      createdAt: c.createdAt,
      sentAt: c.sentAt,
    }));

    res.json({
      totalCustomers: Number(totalCustomersRow?.count ?? 0),
      customersWithEmail: Number(withEmailRow?.count ?? 0),
      customersWithPhone: Number(withPhoneRow?.count ?? 0),
      totalCampaigns: Number(totalCampaignsRow?.count ?? 0),
      emailsSent: Number(emailsSentRow?.total ?? 0),
      whatsappSent: Number(whatsappSentRow?.total ?? 0),
      lastCampaign: recentCampaignsMapped[0] || null,
      recentCampaigns: recentCampaignsMapped,
      recentUploads: recentUploads.map((u) => ({
        id: u.id,
        filename: u.filename,
        recordCount: u.recordCount,
        successCount: u.successCount,
        errorCount: u.errorCount,
        createdAt: u.createdAt,
      })),
    });
  } catch (err) {
    req.log.error({ err }, "Dashboard error");
    res.status(500).json({ error: "Failed to load dashboard" });
  }
});

export default router;
