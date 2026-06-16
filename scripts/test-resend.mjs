// One-off Resend connectivity test.
//
// Sends a single "Hello World" email so you can confirm the API key works and
// the sending domain (mail.oviz.ca) is verified, before relying on patient
// intake email in the app.
//
// The API key is read from the environment — never hardcode it in source.
// RESEND_API_KEY is already in .env.local.
//
// Usage (Node 20.6+ can load the env file directly):
//   node --env-file=.env.local scripts/test-resend.mjs
//   # optional override of the recipient:
//   node --env-file=.env.local scripts/test-resend.mjs you@example.com

const apiKey = process.env.RESEND_API_KEY;
const from = process.env.INTAKE_EMAIL_FROM || "intake@mail.oviz.ca";
const to = process.argv[2] || "sl@evear.ca";

if (!apiKey) {
  console.error(
    "RESEND_API_KEY is not set. Run with: node --env-file=.env.local scripts/test-resend.mjs",
  );
  process.exit(1);
}

const res = await fetch("https://api.resend.com/emails", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    from,
    to: [to],
    subject: "Hello World",
    html: "<p>Congrats on sending your <strong>first email</strong>!</p>",
  }),
});

const body = await res.json().catch(() => ({}));

if (res.ok) {
  console.log(`OK — sent from ${from} to ${to}. Resend id: ${body.id}`);
} else {
  console.error(`FAILED — Resend returned ${res.status}`);
  console.error(body);
  console.error(
    "\nIf this is a 403/422 about the domain, verify mail.oviz.ca in Resend first.",
  );
  process.exit(1);
}
