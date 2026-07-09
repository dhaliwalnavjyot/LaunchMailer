import Anthropic from "@anthropic-ai/sdk";
import { logger } from "../lib/logger.js";

export interface GenerateContentInput {
  brandName: string;
  productName: string;
  launchDate: string;
  tone: "professional" | "friendly" | "exciting" | "formal" | "casual";
  targetAudience: string;
  additionalContext?: string;
}

export interface GeneratedContent {
  emailSubject: string;
  professionalEmail: string;
  marketingEmail: string;
  whatsappMessage: string;
  callToAction: string;
}

export async function generateLaunchContent(
  apiKey: string,
  input: GenerateContentInput
): Promise<GeneratedContent> {
  const client = new Anthropic({ apiKey });

  const toneDesc: Record<string, string> = {
    professional: "professional and authoritative",
    friendly: "warm and conversational",
    exciting: "energetic and enthusiastic with a sense of urgency",
    formal: "formal and corporate",
    casual: "relaxed and casual",
  };

  const prompt = `You are a marketing copywriter. Generate launch announcement content for the following:

Brand Name: ${input.brandName}
Product Name: ${input.productName}
Launch Date: ${input.launchDate}
Tone: ${toneDesc[input.tone] || input.tone}
Target Audience: ${input.targetAudience}
${input.additionalContext ? `Additional Context: ${input.additionalContext}` : ""}

Generate the following in JSON format:
{
  "emailSubject": "A compelling email subject line (max 60 chars)",
  "professionalEmail": "A professional HTML-ready email body (use line breaks with \\n, support {{firstName}}, {{lastName}}, {{email}}, {{city}} personalization variables)",
  "marketingEmail": "A more punchy/marketing-focused email body (use line breaks with \\n, support personalization variables)",
  "whatsappMessage": "A short WhatsApp message (max 300 chars, support {{firstName}} personalization variable, no HTML)",
  "callToAction": "A short compelling call-to-action phrase (max 30 chars)"
}

Return ONLY the JSON object, no other text.`;

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    messages: [{ role: "user", content: prompt }],
  });

  const content = message.content[0];
  if (content.type !== "text") {
    throw new Error("Unexpected response format from AI");
  }

  try {
    // Extract JSON from the response
    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON found in AI response");
    }
    const parsed = JSON.parse(jsonMatch[0]) as GeneratedContent;
    return parsed;
  } catch (err) {
    logger.error({ err, response: content.text }, "Failed to parse AI response");
    throw new Error("Failed to parse AI-generated content");
  }
}
