import { Router } from "express";
import { eq, and, isNotNull, inArray, desc, sql } from "drizzle-orm";
import { db } from "@workspace/db";
import { campaignsTable, customersTable, campaignLogsTable, settingsTable } from "@workspace/db";
import type { RecipientFilter } from "@workspace/db";
import { requireAuth } from "../middlewares/auth.js";
import { sendEmailCampaign, type EmailRecipient } from "../services/emailService.js";
import { sendWhatsAppCampaign, type WhatsAppRecipient } from "../services/whatsappService.js";

const router = Router();

async function getSettings() {
  const [settings] = await db.select().from(settingsTable).where(eq(settingsTable.id, String("default"))).limit(1);
  return settings;
}

/**
 * Build WHERE conditions from a campaign's stored recipientFilter.
 * Always excludes unsubscribed customers.
 */
function buildRecipientConditions(method: string, filter?: RecipientFilter | null) {
  const conditions = [eq(customersTable.unsubscribed, false)];

  // Channel-driven field requirements
  if (method === "email" || method === "both") {
    conditions.push(isNotNull(customersTable.email));
  }
  if (method === "whatsapp" || method === "both") {
    conditions.push(isNotNull(customersTable.phone));
  }

  // Optional audience filters saved on the campaign
  if (filter?.hasEmail) conditions.push(isNotNull(customersTable.email));
  if (filter?.hasPhone) conditions.push(isNotNull(customersTable.phone));
  if (filter?.city) {
    conditions.push(sql`lower(${customersTable.city}) LIKE lower(${"%" + filter.city + "%"})`);
  }
  if (filter?.tags && filter.tags.length > 0) {
    conditions.push(sql`${customersTable.tags} && ${filter.tags}::text[]`);
  }

  return conditions;
}

// POST /api/send/email
router.post("/send/email", requireAuth, async (req, res) => {
  try {
    const { campaignId } = req.body as { campaignId?: string };
    if (!campaignId) {
      res.status(400).json({ error: "campaignId is required" });
      return;
    }

    const [campaign] = await db.select().from(campaignsTable).where(eq(campaignsTable.id, campaignId)).limit(1);
    if (!campaign) {
      res.status(404).json({ error: "Campaign not found" });
      return;
    }
    if (!campaign.subject || !campaign.emailContent) {
      res.status(400).json({ error: "Campaign is missing subject or email content" });
      return;
    }

    const settings = await getSettings();
    const resendApiKey = settings?.resendApiKey || process.env["RESEND_API_KEY"];
    const senderEmail = settings?.senderEmail || process.env["SENDER_EMAIL"];
    const senderName = settings?.senderName || process.env["SENDER_NAME"] || "LaunchMailer";

    if (!resendApiKey) {
      res.status(400).json({ error: "Resend API key is not configured. Please add it in Settings." });
      return;
    }
    if (!senderEmail) {
      res.status(400).json({ error: "Sender email is not configured. Please add it in Settings." });
      return;
    }

    // Mark as sending
    await db.update(campaignsTable).set({ status: "sending" }).where(eq(campaignsTable.id, campaignId));

    // Fetch ONLY the recipients matching the campaign's stored filter
    const conditions = buildRecipientConditions("email", campaign.recipientFilter);
    const customers = await db.select().from(customersTable).where(and(...conditions));

    const recipients: EmailRecipient[] = customers.map((c) => ({
      customerId: c.id,
      email: c.email!,
      name: [c.firstName, c.lastName].filter(Boolean).join(" ") || c.email!,
      data: { firstName: c.firstName, lastName: c.lastName, email: c.email, city: c.city },
    }));

    const baseUrl = process.env["BASE_URL"] || `https://${process.env["REPLIT_DOMAINS"]?.split(",")[0] || "localhost"}`;
    const results = await sendEmailCampaign(resendApiKey, {
      subject: campaign.subject,
      content: campaign.emailContent,
      imageUrl: campaign.imageUrl,
      from: senderEmail,
      fromName: senderName,
      companyName: settings?.companyName || senderName,
      companyLogoUrl: settings?.companyLogoUrl,
      recipients,
      baseUrl,
    });

    const sent = results.filter((r) => r.status === "sent").length;
    const failed = results.filter((r) => r.status === "failed").length;

    // Store logs
    if (results.length > 0) {
      const customerMap = new Map(customers.map((c) => [c.id, c]));
      await db.insert(campaignLogsTable).values(
        results.map((r) => {
          const c = customerMap.get(r.customerId);
          return {
            campaignId,
            customerId: r.customerId,
            customerName: c ? [c.firstName, c.lastName].filter(Boolean).join(" ") : null,
            customerEmail: c?.email || null,
            customerPhone: c?.phone || null,
            channel: "email" as const,
            status: r.status,
            messageId: r.messageId || null,
            error: r.error || null,
          };
        })
      );
    }

    await db.update(campaignsTable).set({
      status: failed > 0 && sent === 0 ? "failed" : "sent",
      emailSent: sent,
      failedCount: failed,
      successCount: sent,
      recipientCount: recipients.length,
      sentAt: new Date(),
    }).where(eq(campaignsTable.id, campaignId));

    res.json({ total: recipients.length, sent, failed, errors: results.filter((r) => r.error).map((r) => r.error!) });
  } catch (err) {
    req.log.error({ err }, "Send email error");
    // Reset status on failure
    try {
      const { campaignId } = req.body as { campaignId?: string };
      if (campaignId) {
        await db.update(campaignsTable).set({ status: "failed" }).where(eq(campaignsTable.id, campaignId));
      }
    } catch { /* best-effort */ }
    res.status(500).json({ error: err instanceof Error ? err.message : "Failed to send emails" });
  }
});

// POST /api/send/whatsapp
router.post("/send/whatsapp", requireAuth, async (req, res) => {
  try {
    const { campaignId } = req.body as { campaignId?: string };
    if (!campaignId) {
      res.status(400).json({ error: "campaignId is required" });
      return;
    }

    const [campaign] = await db.select().from(campaignsTable).where(eq(campaignsTable.id, campaignId)).limit(1);
    if (!campaign) {
      res.status(404).json({ error: "Campaign not found" });
      return;
    }
    if (!campaign.whatsappMessage) {
      res.status(400).json({ error: "Campaign is missing WhatsApp message" });
      return;
    }

    const settings = await getSettings();
    const twilioSid = settings?.twilioSid || process.env["TWILIO_SID"];
    const twilioAuthToken = settings?.twilioAuthToken || process.env["TWILIO_AUTH_TOKEN"];
    const twilioNumber = settings?.twilioWhatsappNumber || process.env["TWILIO_WHATSAPP_NUMBER"];

    if (!twilioSid || !twilioAuthToken) {
      res.status(400).json({ error: "Twilio credentials are not configured. Please add them in Settings." });
      return;
    }
    if (!twilioNumber) {
      res.status(400).json({ error: "Twilio WhatsApp number is not configured. Please add it in Settings." });
      return;
    }

    // Mark as sending
    await db.update(campaignsTable).set({ status: "sending" }).where(eq(campaignsTable.id, campaignId));

    // Fetch ONLY the recipients matching the campaign's stored filter
    const conditions = buildRecipientConditions("whatsapp", campaign.recipientFilter);
    const customers = await db.select().from(customersTable).where(and(...conditions));

    const recipients: WhatsAppRecipient[] = customers.map((c) => ({
      customerId: c.id,
      phone: c.phone!,
      data: { firstName: c.firstName, lastName: c.lastName, email: c.email, city: c.city },
    }));

    const results = await sendWhatsAppCampaign(twilioSid, twilioAuthToken, {
      message: campaign.whatsappMessage,
      imageUrl: campaign.imageUrl,
      fromNumber: twilioNumber,
      recipients,
    });

    const sent = results.filter((r) => r.status === "sent").length;
    const failed = results.filter((r) => r.status === "failed").length;

    // Store logs
    if (results.length > 0) {
      const customerMap = new Map(customers.map((c) => [c.id, c]));
      await db.insert(campaignLogsTable).values(
        results.map((r) => {
          const c = customerMap.get(r.customerId);
          return {
            campaignId,
            customerId: r.customerId,
            customerName: c ? [c.firstName, c.lastName].filter(Boolean).join(" ") : null,
            customerEmail: c?.email || null,
            customerPhone: c?.phone || null,
            channel: "whatsapp" as const,
            status: r.status,
            messageId: r.messageId || null,
            error: r.error || null,
          };
        })
      );
    }

    await db.update(campaignsTable).set({
      status: failed > 0 && sent === 0 ? "failed" : "sent",
      whatsappSent: sent,
      failedCount: (campaign.failedCount || 0) + failed,
      successCount: (campaign.successCount || 0) + sent,
      recipientCount: recipients.length,
      sentAt: new Date(),
    }).where(eq(campaignsTable.id, campaignId));

    res.json({ total: recipients.length, sent, failed, errors: results.filter((r) => r.error).map((r) => r.error!) });
  } catch (err) {
    req.log.error({ err }, "Send WhatsApp error");
    try {
      const { campaignId } = req.body as { campaignId?: string };
      if (campaignId) {
        await db.update(campaignsTable).set({ status: "failed" }).where(eq(campaignsTable.id, campaignId));
      }
    } catch { /* best-effort */ }
    res.status(500).json({ error: err instanceof Error ? err.message : "Failed to send WhatsApp messages" });
  }
});

// POST /api/send/retry/:campaignId
// Re-dispatches only the customers who failed in the previous send attempt.
router.post("/send/retry/:campaignId", requireAuth, async (req, res) => {
  try {
    const campaignId = String(req.params["campaignId"]);
    const [campaign] = await db.select().from(campaignsTable).where(eq(campaignsTable.id, campaignId)).limit(1);
    if (!campaign) {
      res.status(404).json({ error: "Campaign not found" });
      return;
    }

    // Find logs for failed sends
    const failedLogs = await db.select().from(campaignLogsTable)
      .where(and(eq(campaignLogsTable.campaignId, campaignId), eq(campaignLogsTable.status, "failed")));

    if (failedLogs.length === 0) {
      res.json({ total: 0, sent: 0, failed: 0, errors: [], message: "No failed sends to retry" });
      return;
    }

    const settings = await getSettings();
    let totalSent = 0;
    let totalFailed = 0;
    const allErrors: string[] = [];

    // Group by channel to retry efficiently
    const emailFailures = failedLogs.filter((l) => l.channel === "email");
    const whatsappFailures = failedLogs.filter((l) => l.channel === "whatsapp");

    // Retry emails
    if (emailFailures.length > 0) {
      const failedCustomerIds = [...new Set(emailFailures.map((l) => l.customerId))];
      const resendApiKey = settings?.resendApiKey || process.env["RESEND_API_KEY"];
      const senderEmail = settings?.senderEmail || process.env["SENDER_EMAIL"];
      const senderName = settings?.senderName || process.env["SENDER_NAME"] || "LaunchMailer";

      if (!resendApiKey || !senderEmail || !campaign.subject || !campaign.emailContent) {
        allErrors.push("Email credentials or content missing — email retries skipped");
        totalFailed += emailFailures.length;
      } else {
        const customers = await db.select().from(customersTable)
          .where(and(
            inArray(customersTable.id, failedCustomerIds),
            eq(customersTable.unsubscribed, false),
            isNotNull(customersTable.email)
          ));

        const recipients: EmailRecipient[] = customers.map((c) => ({
          customerId: c.id,
          email: c.email!,
          name: [c.firstName, c.lastName].filter(Boolean).join(" ") || c.email!,
          data: { firstName: c.firstName, lastName: c.lastName, email: c.email, city: c.city },
        }));

        if (recipients.length > 0) {
          const baseUrl = process.env["BASE_URL"] || `https://${process.env["REPLIT_DOMAINS"]?.split(",")[0] || "localhost"}`;
          const results = await sendEmailCampaign(resendApiKey, {
            subject: campaign.subject,
            content: campaign.emailContent,
            imageUrl: campaign.imageUrl,
            from: senderEmail,
            fromName: senderName,
            companyName: settings?.companyName || senderName,
            companyLogoUrl: settings?.companyLogoUrl,
            recipients,
            baseUrl,
          });

          // Update existing failed logs → new status
          const customerMap = new Map(customers.map((c) => [c.id, c]));
          for (const r of results) {
            // Mark old failed log as superseded by deleting and inserting fresh
            await db.delete(campaignLogsTable).where(
              and(
                eq(campaignLogsTable.campaignId, campaignId),
                eq(campaignLogsTable.customerId, r.customerId),
                eq(campaignLogsTable.channel, "email"),
                eq(campaignLogsTable.status, "failed")
              )
            );
            const c = customerMap.get(r.customerId);
            await db.insert(campaignLogsTable).values({
              campaignId,
              customerId: r.customerId,
              customerName: c ? [c.firstName, c.lastName].filter(Boolean).join(" ") : null,
              customerEmail: c?.email || null,
              customerPhone: c?.phone || null,
              channel: "email",
              status: r.status,
              messageId: r.messageId || null,
              error: r.error || null,
            });
          }

          const sent = results.filter((r) => r.status === "sent").length;
          const failed = results.filter((r) => r.status === "failed").length;
          totalSent += sent;
          totalFailed += failed;
          allErrors.push(...results.filter((r) => r.error).map((r) => r.error!));
        }
      }
    }

    // Retry WhatsApp
    if (whatsappFailures.length > 0) {
      const failedCustomerIds = [...new Set(whatsappFailures.map((l) => l.customerId))];
      const twilioSid = settings?.twilioSid || process.env["TWILIO_SID"];
      const twilioAuthToken = settings?.twilioAuthToken || process.env["TWILIO_AUTH_TOKEN"];
      const twilioNumber = settings?.twilioWhatsappNumber || process.env["TWILIO_WHATSAPP_NUMBER"];

      if (!twilioSid || !twilioAuthToken || !twilioNumber || !campaign.whatsappMessage) {
        allErrors.push("Twilio credentials or WhatsApp message missing — WhatsApp retries skipped");
        totalFailed += whatsappFailures.length;
      } else {
        const customers = await db.select().from(customersTable)
          .where(and(
            inArray(customersTable.id, failedCustomerIds),
            eq(customersTable.unsubscribed, false),
            isNotNull(customersTable.phone)
          ));

        const recipients: WhatsAppRecipient[] = customers.map((c) => ({
          customerId: c.id,
          phone: c.phone!,
          data: { firstName: c.firstName, lastName: c.lastName, email: c.email, city: c.city },
        }));

        if (recipients.length > 0) {
          const results = await sendWhatsAppCampaign(twilioSid, twilioAuthToken, {
            message: campaign.whatsappMessage,
            imageUrl: campaign.imageUrl,
            fromNumber: twilioNumber,
            recipients,
          });

          const customerMap = new Map(customers.map((c) => [c.id, c]));
          for (const r of results) {
            await db.delete(campaignLogsTable).where(
              and(
                eq(campaignLogsTable.campaignId, campaignId),
                eq(campaignLogsTable.customerId, r.customerId),
                eq(campaignLogsTable.channel, "whatsapp"),
                eq(campaignLogsTable.status, "failed")
              )
            );
            const c = customerMap.get(r.customerId);
            await db.insert(campaignLogsTable).values({
              campaignId,
              customerId: r.customerId,
              customerName: c ? [c.firstName, c.lastName].filter(Boolean).join(" ") : null,
              customerEmail: c?.email || null,
              customerPhone: c?.phone || null,
              channel: "whatsapp",
              status: r.status,
              messageId: r.messageId || null,
              error: r.error || null,
            });
          }

          const sent = results.filter((r) => r.status === "sent").length;
          const failed = results.filter((r) => r.status === "failed").length;
          totalSent += sent;
          totalFailed += failed;
          allErrors.push(...results.filter((r) => r.error).map((r) => r.error!));
        }
      }
    }

    // Update campaign counters
    await db.update(campaignsTable).set({
      status: totalFailed > 0 && totalSent === 0 ? "failed" : "sent",
      successCount: (campaign.successCount || 0) + totalSent,
      failedCount: totalFailed,
    }).where(eq(campaignsTable.id, campaignId));

    res.json({
      total: failedLogs.length,
      sent: totalSent,
      failed: totalFailed,
      errors: allErrors,
    });
  } catch (err) {
    req.log.error({ err }, "Retry campaign error");
    res.status(500).json({ error: "Failed to retry campaign" });
  }
});

export default router;
