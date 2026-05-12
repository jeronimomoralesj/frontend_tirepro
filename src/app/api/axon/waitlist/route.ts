import { NextResponse } from "next/server";

// AXON launch waitlist — placeholder endpoint. Today this just validates
// the email and logs it server-side so signups don't 404 while we wire
// the real backend (Resend / Mailchimp / Brevo / NestJS endpoint —
// pending product decision). When the destination is chosen, swap the
// console.log for the upstream call; the frontend contract stays the same.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!email || !EMAIL_RE.test(email) || email.length > 200) {
    return NextResponse.json({ ok: false, error: "Email inválido" }, { status: 400 });
  }

  // The signup metadata kept for the real backend swap. Source lets us
  // attribute waitlist growth to specific surfaces (landing teaser vs.
  // marketplace teaser vs. /axon page) once analytics are wired.
  const source = typeof body?.source === "string" ? body.source.slice(0, 60) : "unknown";

  // Best-effort log — visible in Vercel / Node logs. Until a persistent
  // store is hooked up these are the only record of signups, so don't
  // rely on this for the actual launch list.
  console.log(`[axon-waitlist] email=${email} source=${source}`);

  return NextResponse.json({ ok: true });
}
