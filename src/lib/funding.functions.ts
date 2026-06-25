import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Input = z.object({
  managerName: z.string(),
  companyName: z.string(),
  recipientEmail: z.string(),
  amount: z.number(),
  reason: z.string().optional().nullable(),
  repaymentPeriod: z.string().optional().nullable(),
  attachmentName: z.string().optional().nullable(),
});

export const generateFundingMessage = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => Input.parse(data))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");

    const hasArabic = /[\u0600-\u06FF]/.test(`${data.reason ?? ""} ${data.companyName ?? ""}`);
    const prompt = `Write a concise, professional message in ENGLISH asking a financial team member to vote on a funding request.
Rules:
- Write the entire message in English FIRST.
- For each piece of free-text the manager provided (Reason / Target company / any other Arabic), if the original is in Arabic, put the original Arabic in parentheses immediately after the English translation. If the original is already English, do NOT add parentheses.
- Do NOT include a "To:", "Subject:", "From:", or any email-header line — the recipient is shown elsewhere in the UI.
- Do NOT include greetings like "Dear" or signatures — go straight to the facts.
- Keep it under 110 words.
- End with exactly: "Please review and vote: Approve or Reject."

Data:
- Manager name: ${data.managerName}
- Proposed funding amount: ${data.amount.toLocaleString()} SAR
- Target company: ${data.companyName}
- Reason: ${data.reason || "(not provided)"}
- Repayment period: ${data.repaymentPeriod || "(not provided)"}
- Attached document: ${data.attachmentName || "(none)"}
- Manager-typed text language: ${hasArabic ? "Arabic (translate to English and append the Arabic in parentheses)" : "English (no parentheses needed)"}`;

    try {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${key}`,
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: "You write concise, professional bilingual funding-vote request messages." },
            { role: "user", content: prompt },
          ],
        }),
      });
      if (!res.ok) {
        const txt = await res.text();
        console.error("AI gateway error", res.status, txt);
        return { message: fallbackMessage(data) };
      }
      const json = await res.json() as { choices?: Array<{ message?: { content?: string } }> };
      const content = json.choices?.[0]?.message?.content?.trim();
      return { message: content || fallbackMessage(data) };
    } catch (e) {
      console.error("AI call failed", e);
      return { message: fallbackMessage(data) };
    }
  });

function fallbackMessage(d: z.infer<typeof Input>) {
  const hasArabic = /[\u0600-\u06FF]/.test(`${d.reason ?? ""} ${d.companyName ?? ""}`);
  const company = hasArabic ? `${d.companyName} (${d.companyName})` : d.companyName;
  const reason = d.reason
    ? (/[\u0600-\u06FF]/.test(d.reason) ? `${d.reason} (${d.reason})` : d.reason)
    : "(not provided)";
  return `${d.managerName} requests your vote on a funding request for ${company}, totaling ${d.amount.toLocaleString()} SAR. The purpose is ${reason}, with a repayment period of ${d.repaymentPeriod || "(not specified)"}.

Please review and vote: Approve or Reject.`;
}
