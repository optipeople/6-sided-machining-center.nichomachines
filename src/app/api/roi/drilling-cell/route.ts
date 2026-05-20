import { NextResponse } from "next/server";
import { Resend } from "resend";
import { site } from "@/lib/site";
import { SubmissionSchema } from "@/features/drilling-cell-roi/schema";

const fmtEur = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const parsed = SubmissionSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Please check the highlighted fields." },
      { status: 400 },
    );
  }

  const { website, ...data } = parsed.data;
  if (website) {
    // Looks like a bot — silently accept.
    return NextResponse.json({ ok: true });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const toRaw =
    process.env.ROI_TO_EMAIL ?? process.env.CONTACT_TO_EMAIL ?? site.email;
  const to = toRaw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const from =
    process.env.CONTACT_FROM_EMAIL ?? `website@${new URL(site.url).host}`;

  const totalUnitsPerDay = data.products.reduce(
    (sum, p) => sum + (p.unitsPerDay || 0),
    0,
  );

  const productRowsText = data.products
    .map(
      (p) =>
        `  • ${p.id.padEnd(12)} ${(p.name || "—").padEnd(24)} ${p.size.padEnd(28)} ${p.unitsPerDay} units/day`,
    )
    .join("\n");

  const productRowsHtml = data.products
    .map(
      (p) => `
      <tr>
        <td style="padding:6px 12px 6px 0;border-bottom:1px solid #eee;font-family:monospace;font-size:13px;color:#0e2238;">${escapeHtml(p.id)}</td>
        <td style="padding:6px 12px 6px 0;border-bottom:1px solid #eee;font-size:13px;color:#2a2d33;">${escapeHtml(p.name || "—")}</td>
        <td style="padding:6px 12px 6px 0;border-bottom:1px solid #eee;font-size:12px;color:#5a7c9a;">${escapeHtml(p.size)}</td>
        <td style="padding:6px 0;border-bottom:1px solid #eee;font-size:13px;color:#0f1115;text-align:right;font-weight:600;">${p.unitsPerDay.toLocaleString("en-US")}</td>
      </tr>`,
    )
    .join("");

  const text = [
    `New 6-Side Machining Cell ROI submission`,
    ``,
    `Contact`,
    `  Name:    ${data.contact.name}`,
    `  Email:   ${data.contact.email}`,
    `  Job:     ${data.contact.job}`,
    `  Company: ${data.contact.company ?? "-"}`,
    ``,
    `Production`,
    `  Operators today:     ${data.operators}`,
    `  Total units / day:   ${totalUnitsPerDay}`,
    `  Capital investment:  ${fmtEur.format(data.investment)}`,
    ``,
    `Products (${data.products.length})`,
    productRowsText,
    ``,
    `Submitted: ${new Date().toISOString()}`,
  ].join("\n");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>6-Side Machining Cell ROI submission</title>
</head>
<body style="margin:0;padding:24px;background:#fcf8ee;">
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:640px;margin:0 auto;color:#2a2d33;">
      <h2 style="margin:0 0 16px;color:#0e2238;font-size:20px;">New 6-Side Machining Cell ROI submission</h2>

      <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
        <tr><td style="padding:4px 0;color:#5a7c9a;width:140px;font-size:13px;">Name</td><td style="padding:4px 0;font-size:14px;color:#0f1115;">${escapeHtml(data.contact.name)}</td></tr>
        <tr><td style="padding:4px 0;color:#5a7c9a;font-size:13px;">Email</td><td style="padding:4px 0;font-size:14px;"><a href="mailto:${escapeHtml(data.contact.email)}" style="color:#0e2238;">${escapeHtml(data.contact.email)}</a></td></tr>
        <tr><td style="padding:4px 0;color:#5a7c9a;font-size:13px;">Job title</td><td style="padding:4px 0;font-size:14px;color:#0f1115;">${escapeHtml(data.contact.job)}</td></tr>
        ${data.contact.company ? `<tr><td style="padding:4px 0;color:#5a7c9a;font-size:13px;">Company</td><td style="padding:4px 0;font-size:14px;color:#0f1115;">${escapeHtml(data.contact.company)}</td></tr>` : ""}
      </table>

      <h3 style="margin:24px 0 8px;color:#0e2238;font-size:15px;border-bottom:2px solid #0e2238;padding-bottom:4px;">Production</h3>
      <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
        <tr><td style="padding:4px 0;color:#5a7c9a;width:200px;font-size:13px;">Operators today</td><td style="padding:4px 0;font-size:14px;color:#0f1115;">${data.operators}</td></tr>
        <tr><td style="padding:4px 0;color:#5a7c9a;font-size:13px;">Total units / day</td><td style="padding:4px 0;font-size:14px;color:#0f1115;">${totalUnitsPerDay.toLocaleString("en-US")}</td></tr>
        <tr><td style="padding:4px 0;color:#5a7c9a;font-size:13px;">Capital investment</td><td style="padding:4px 0;font-size:14px;color:#0f1115;">${escapeHtml(fmtEur.format(data.investment))}</td></tr>
      </table>

      <h3 style="margin:24px 0 8px;color:#0e2238;font-size:15px;border-bottom:2px solid #0e2238;padding-bottom:4px;">Products (${data.products.length})</h3>
      <table style="width:100%;border-collapse:collapse;">
        <thead>
          <tr>
            <th style="text-align:left;padding:4px 12px 4px 0;font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:#5a7c9a;border-bottom:1px solid #ddd;">ID</th>
            <th style="text-align:left;padding:4px 12px 4px 0;font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:#5a7c9a;border-bottom:1px solid #ddd;">Name</th>
            <th style="text-align:left;padding:4px 12px 4px 0;font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:#5a7c9a;border-bottom:1px solid #ddd;">Size</th>
            <th style="text-align:right;padding:4px 0;font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:#5a7c9a;border-bottom:1px solid #ddd;">Units / day</th>
          </tr>
        </thead>
        <tbody>${productRowsHtml}</tbody>
      </table>

      <p style="margin-top:24px;font-size:12px;color:#a8acb4;">Submitted ${new Date().toISOString()}</p>
    </div>
</body>
</html>`;

  // If Resend isn't configured, log + accept so dev/preview deploys keep working.
  if (!apiKey) {
    console.info("[roi] received (no Resend key configured)", data);
    return NextResponse.json({ ok: true });
  }

  try {
    const resend = new Resend(apiKey);
    const result = await resend.emails.send({
      from,
      to,
      replyTo: data.contact.email,
      subject: `6-Side Machining Cell ROI - ${data.contact.name}${data.contact.company ? ` (${data.contact.company})` : ""}`,
      text,
      html,
    });
    if (result.error) {
      console.error("[roi] resend rejected send", result.error, { from, to });
      return NextResponse.json(
        { error: "Could not send right now. Please try again or call us." },
        { status: 502 },
      );
    }
    console.info("[roi] sent", { id: result.data?.id, to });
  } catch (err) {
    console.error("[roi] send failed", err);
    return NextResponse.json(
      { error: "Could not send right now. Please try again or call us." },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true });
}

function escapeHtml(s: string) {
  // Escape HTML special chars AND encode any non-ASCII as numeric entities.
  // This makes the HTML body pure ASCII, so it renders correctly regardless of
  // which charset the recipient's mail client decides to use.
  return s.replace(/[&<>"']|[^\x20-\x7E]/g, (c) => {
    switch (c) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      case "'":
        return "&#39;";
      default:
        return `&#${c.codePointAt(0)};`;
    }
  });
}
