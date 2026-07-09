import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// Single-row settings table (id = 'default')
export const settingsTable = pgTable("settings", {
  id: text("id").primaryKey().default("default"),
  resendApiKey: text("resend_api_key"),
  senderEmail: text("sender_email"),
  senderName: text("sender_name"),
  twilioSid: text("twilio_sid"),
  twilioAuthToken: text("twilio_auth_token"),
  twilioWhatsappNumber: text("twilio_whatsapp_number"),
  claudeApiKey: text("claude_api_key"),
  companyName: text("company_name"),
  companyLogoUrl: text("company_logo_url"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertSettingsSchema = createInsertSchema(settingsTable);
export type InsertSettings = z.infer<typeof insertSettingsSchema>;
export type Settings = typeof settingsTable.$inferSelect;
