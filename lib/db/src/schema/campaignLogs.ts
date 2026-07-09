import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const campaignLogsTable = pgTable("campaign_logs", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  campaignId: text("campaign_id").notNull(),
  customerId: text("customer_id").notNull(),
  customerName: text("customer_name"),
  customerEmail: text("customer_email"),
  customerPhone: text("customer_phone"),
  channel: text("channel", { enum: ["email", "whatsapp"] }).notNull(),
  status: text("status", { enum: ["sent", "delivered", "failed", "opened"] }).notNull().default("sent"),
  messageId: text("message_id"),
  error: text("error"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertCampaignLogSchema = createInsertSchema(campaignLogsTable).omit({ id: true, createdAt: true });
export type InsertCampaignLog = z.infer<typeof insertCampaignLogSchema>;
export type CampaignLog = typeof campaignLogsTable.$inferSelect;
