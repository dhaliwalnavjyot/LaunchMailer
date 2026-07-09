import { pgTable, text, timestamp, integer, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export type RecipientFilter = {
  hasEmail?: boolean;
  hasPhone?: boolean;
  city?: string;
  tags?: string[];
};

export const campaignsTable = pgTable("campaigns", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  subject: text("subject"),
  emailContent: text("email_content"),
  whatsappMessage: text("whatsapp_message"),
  imageUrl: text("image_url"),
  method: text("method", { enum: ["email", "whatsapp", "both"] }).notNull().default("email"),
  status: text("status", { enum: ["draft", "sending", "sent", "failed"] }).notNull().default("draft"),
  recipientCount: integer("recipient_count").default(0).notNull(),
  recipientFilter: jsonb("recipient_filter").$type<RecipientFilter>(),
  emailSent: integer("email_sent").default(0).notNull(),
  whatsappSent: integer("whatsapp_sent").default(0).notNull(),
  successCount: integer("success_count").default(0).notNull(),
  failedCount: integer("failed_count").default(0).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  sentAt: timestamp("sent_at", { withTimezone: true }),
});

export const insertCampaignSchema = createInsertSchema(campaignsTable).omit({ id: true, createdAt: true });
export type InsertCampaign = z.infer<typeof insertCampaignSchema>;
export type Campaign = typeof campaignsTable.$inferSelect;
