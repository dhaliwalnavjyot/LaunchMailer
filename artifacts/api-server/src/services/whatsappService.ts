import twilio from "twilio";
import { personalize, type PersonalizeData } from "../utils/personalize.js";
import { logger } from "../lib/logger.js";

export interface WhatsAppRecipient {
  customerId: string;
  phone: string;
  data: PersonalizeData;
}

export interface WhatsAppCampaignOptions {
  message: string;
  imageUrl?: string | null;
  fromNumber: string;
  recipients: WhatsAppRecipient[];
}

export interface SendWhatsAppResult {
  customerId: string;
  status: "sent" | "failed";
  messageId?: string;
  error?: string;
}

function normalizePhone(phone: string): string {
  // Remove spaces, dashes, parentheses
  let cleaned = phone.replace(/[\s\-\(\)]/g, "");
  // Ensure it starts with +
  if (!cleaned.startsWith("+")) {
    cleaned = "+" + cleaned;
  }
  return cleaned;
}

export async function sendWhatsAppCampaign(
  accountSid: string,
  authToken: string,
  options: WhatsAppCampaignOptions
): Promise<SendWhatsAppResult[]> {
  const client = twilio(accountSid, authToken);
  const results: SendWhatsAppResult[] = [];

  for (const recipient of options.recipients) {
    try {
      const personalizedMessage = personalize(options.message, recipient.data);
      const toNumber = `whatsapp:${normalizePhone(recipient.phone)}`;
      const fromNumber = `whatsapp:${options.fromNumber}`;

      const messageOptions: Parameters<typeof client.messages.create>[0] = {
        from: fromNumber,
        to: toNumber,
        body: personalizedMessage,
      };

      if (options.imageUrl) {
        messageOptions.mediaUrl = [options.imageUrl];
      }

      const message = await client.messages.create(messageOptions);

      results.push({
        customerId: recipient.customerId,
        status: "sent",
        messageId: message.sid,
      });
    } catch (err) {
      logger.error({ err, customerId: recipient.customerId }, "Failed to send WhatsApp message");
      results.push({
        customerId: recipient.customerId,
        status: "failed",
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  return results;
}
