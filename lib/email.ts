const RESEND_API_URL = "https://api.resend.com/emails";

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char] as string
  ));
}

export async function sendPasswordResetEmail({
  to,
  displayName,
  url,
}: {
  to: string;
  displayName: string;
  url: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY is not configured");
  const from = process.env.EMAIL_FROM || "Marvin <onboarding@resend.dev>";

  const res = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to,
      subject: "Reset your Marvin password",
      html: `<p>Hi ${escapeHtml(displayName)},</p><p>Someone asked to reset the password for your Marvin kitchen account. If this was you, choose a new password:</p><p><a href="${url}">${url}</a></p><p>This link works once and expires in an hour. If you didn&rsquo;t request this, you can safely ignore this email.</p><p>&mdash; Marvin</p>`,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Resend request failed: ${res.status} ${body}`);
  }
}
