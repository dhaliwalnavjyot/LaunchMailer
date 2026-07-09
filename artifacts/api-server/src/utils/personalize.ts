/**
 * Replace personalization variables in message templates.
 * Supported variables: {{firstName}}, {{lastName}}, {{email}}, {{city}}
 */
export interface PersonalizeData {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  city?: string | null;
}

export function personalize(template: string, data: PersonalizeData): string {
  return template
    .replace(/\{\{firstName\}\}/g, data.firstName || "")
    .replace(/\{\{lastName\}\}/g, data.lastName || "")
    .replace(/\{\{email\}\}/g, data.email || "")
    .replace(/\{\{city\}\}/g, data.city || "");
}

/**
 * Build a responsive HTML email from content and settings.
 */
export function buildEmailHtml(opts: {
  subject: string;
  content: string;
  customerName: string;
  companyName: string;
  companyLogoUrl?: string | null;
  imageUrl?: string | null;
  ctaText?: string;
  ctaUrl?: string;
  unsubscribeUrl: string;
}): string {
  const {
    content,
    companyName,
    companyLogoUrl,
    imageUrl,
    unsubscribeUrl,
  } = opts;

  const logoHtml = companyLogoUrl
    ? `<img src="${companyLogoUrl}" alt="${companyName}" style="max-height:50px;max-width:200px;display:block;margin:0 auto 16px;" />`
    : `<h1 style="color:#0f172a;font-size:24px;font-weight:700;margin:0 0 16px;text-align:center;">${companyName}</h1>`;

  const heroImageHtml = imageUrl
    ? `<img src="${imageUrl}" alt="Campaign Image" style="width:100%;border-radius:8px;margin-bottom:24px;" />`
    : "";

  const contentLines = content
    .split("\n")
    .map((line) => `<p style="color:#374151;font-size:16px;line-height:1.6;margin:0 0 12px;">${line}</p>`)
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Email from ${companyName}</title>
</head>
<body style="background:#f3f4f6;margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background:#0f172a;padding:32px 40px;text-align:center;">
              ${logoHtml}
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              ${heroImageHtml}
              ${contentLines}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#f9fafb;padding:24px 40px;text-align:center;border-top:1px solid #e5e7eb;">
              <p style="color:#9ca3af;font-size:12px;margin:0 0 8px;">
                &copy; ${new Date().getFullYear()} ${companyName}. All rights reserved.
              </p>
              <p style="color:#9ca3af;font-size:12px;margin:0;">
                <a href="${unsubscribeUrl}" style="color:#6b7280;text-decoration:underline;">Unsubscribe</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
