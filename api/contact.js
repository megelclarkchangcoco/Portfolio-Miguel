// /api/contact.js
// Vercel Serverless Function (Node.js runtime).
// Receives the contact form POST from the browser and emails it to you
// using Resend (https://resend.com) — no PHP, no server to manage.
//
// SETUP (see README.md for the full walkthrough):
//   1. Create a free Resend account and API key.
//   2. In your Vercel project: Settings -> Environment Variables, add:
//        RESEND_API_KEY = re_xxx...
//        TO_EMAIL        = mcpolison@email.com   (where messages land)
//        FROM_EMAIL      = onboarding@resend.dev (or your verified domain)
//   3. Redeploy. The form at /#contact will now send real email.

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 5;
// naive in-memory rate limit — resets on cold start, good enough to deter bots
const hits = new Map();

function isRateLimited(ip) {
  const now = Date.now();
  const entry = hits.get(ip) || { count: 0, start: now };
  if (now - entry.start > RATE_LIMIT_WINDOW_MS) {
    entry.count = 0;
    entry.start = now;
  }
  entry.count += 1;
  hits.set(ip, entry);
  return entry.count > RATE_LIMIT_MAX;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed.' });
    return;
  }

  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown';
  if (isRateLimited(ip)) {
    res.status(429).json({ error: 'Too many requests. Please try again in a minute.' });
    return;
  }

  let body = req.body;
  if (!body || typeof body === 'string') {
    try {
      body = JSON.parse(body || '{}');
    } catch {
      res.status(400).json({ error: 'Invalid request body.' });
      return;
    }
  }

  const name = (body.name || '').toString().trim();
  const email = (body.email || '').toString().trim();
  const message = (body.message || '').toString().trim();

  if (!name || !email || !message) {
    res.status(400).json({ error: 'Name, email, and message are all required.' });
    return;
  }
  if (name.length > 200 || message.length > 5000) {
    res.status(400).json({ error: 'That message is too long.' });
    return;
  }
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(email)) {
    res.status(400).json({ error: 'Please provide a valid email address.' });
    return;
  }

  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  const TO_EMAIL = process.env.TO_EMAIL || 'mcpolison@email.com';
  const FROM_EMAIL = process.env.FROM_EMAIL || 'Portfolio Contact <onboarding@resend.dev>';

  if (!RESEND_API_KEY) {
    console.error('RESEND_API_KEY is not set.');
    res.status(500).json({
      error: 'The contact form is not fully configured yet. Please email me directly.'
    });
    return;
  }

  try {
    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [TO_EMAIL],
        reply_to: email,
        subject: `Portfolio message from ${name}`,
        html: `
          <div style="font-family: sans-serif; font-size: 14px; color: #111;">
            <p><strong>From:</strong> ${escapeHtml(name)} &lt;${escapeHtml(email)}&gt;</p>
            <p><strong>Message:</strong></p>
            <p style="white-space: pre-wrap;">${escapeHtml(message)}</p>
          </div>
        `,
        text: `From: ${name} <${email}>\n\n${message}`
      })
    });

    if (!emailRes.ok) {
      const errText = await emailRes.text();
      console.error('Resend API error:', emailRes.status, errText);
      res.status(502).json({ error: 'Could not send your message right now. Please try again shortly.' });
      return;
    }

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Contact form send failed:', err);
    res.status(500).json({ error: 'Unexpected server error. Please email me directly.' });
  }
};
