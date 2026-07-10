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

/**
 * Strips any existing whatsapp: prefix, cleans whitespace/dashes,
 * ensures a leading +, then returns the bare E.164 number.
 *
 * Order matters: trim first so leading spaces don't defeat prefix detection.
 */
function normalizePhone(phone: string): string {
  // 1. Trim surrounding whitespace first
  let cleaned = phone.trim();
  // 2. Strip whatsapp: prefix if already present (prevents double-prefix)
  cleaned = cleaned.replace(/^whatsapp:/i, "");
  // 3. Remove internal spaces, dashes, parentheses
  cleaned = cleaned.replace(/[\s\-\(\)]/g, "");
  // 4. Ensure it starts with +
  if (!cleaned.startsWith("+")) {
    cleaned = "+" + cleaned;
  }
  return cleaned;
}

/** Returns a Twilio-ready whatsapp:+E164 string */
function toWhatsAppAddress(phone: string): string {
  return `whatsapp:${normalizePhone(phone)}`;
}

export async function sendWhatsAppCampaign(
  accountSid: string,
  authToken: string,
  options: WhatsAppCampaignOptions
): Promise<SendWhatsAppResult[]> {
  const client = twilio(accountSid, authToken);
  const results: SendWhatsAppResult[] = [];

  const fromAddress = toWhatsAppAddress(options.fromNumber);

  // Log the SID prefix and resolved from-number to help debug auth issues
  logger.info(
    {
      accountSidPrefix: accountSid.slice(0, 8),
      fromAddress,
      recipientCount: options.recipients.length,
    },
    "Starting WhatsApp campaign send"
  );

  for (const recipient of options.recipients) {
    try {
      const personalizedMessage = personalize(options.message, recipient.data);
      const toAddress = toWhatsAppAddress(recipient.phone);

      const messageOptions: Parameters<typeof client.messages.create>[0] = {
        from: fromAddress,
        to: toAddress,
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
      const twilioErr = err as { code?: number; status?: number; message?: string };
      logger.error(
        {
          err,
          customerId: recipient.customerId,
          twilioCode: twilioErr?.code,
          twilioStatus: twilioErr?.status,
          fromAddress,
        },
        "Failed to send WhatsApp message"
      );
      results.push({
        customerId: recipient.customerId,
        status: "failed",
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  return results;
}
