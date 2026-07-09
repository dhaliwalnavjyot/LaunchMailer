import { Resend } from "resend";
import { buildEmailHtml, personalize, type PersonalizeData } from "../utils/personalize.js";
import { logger } from "../lib/logger.js";

export interface EmailRecipient {
  customerId: string;
  email: string;
  name: string;
  data: PersonalizeData;
}

export interface EmailCampaignOptions {
  subject: string;
  content: string;
  imageUrl?: string | null;
  from: string;
  fromName: string;
  companyName: string;
  companyLogoUrl?: string | null;
  recipients: EmailRecipient[];
  baseUrl: string;
}

export interface SendEmailResult {
  customerId: string;
  status: "sent" | "failed";
  messageId?: string;
  error?: string;
}

export async function sendEmailCampaign(
  apiKey: string,
  options: EmailCampaignOptions
): Promise<SendEmailResult[]> {
  const resend = new Resend(apiKey);
  const results: SendEmailResult[] = [];

  for (const recipient of options.recipients) {
    try {
      const personalizedContent = personalize(options.content, recipient.data);
      const personalizedSubject = personalize(options.subject, recipient.data);
      const unsubscribeUrl = `${options.baseUrl}/api/unsubscribe?email=${encodeURIComponent(recipient.email)}`;

      const html = buildEmailHtml({
        subject: personalizedSubject,
        content: personalizedContent,
        customerName: recipient.name,
        companyName: options.companyName,
        companyLogoUrl: options.companyLogoUrl,
        imageUrl: options.imageUrl,
        unsubscribeUrl,
      });

      const { data, error } = await resend.emails.send({
        from: `${options.fromName} <${options.from}>`,
        to: recipient.email,
        subject: personalizedSubject,
        html,
      });

      if (error || !data) {
        results.push({
          customerId: recipient.customerId,
          status: "failed",
          error: error?.message || "Unknown error",
        });
      } else {
        results.push({
          customerId: recipient.customerId,
          status: "sent",
          messageId: data.id,
        });
      }
    } catch (err) {
      logger.error({ err, customerId: recipient.customerId }, "Failed to send email");
      results.push({
        customerId: recipient.customerId,
        status: "failed",
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  return results;
}
