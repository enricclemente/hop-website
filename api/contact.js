/* Contact form, as a Vercel serverless function.

   1. Saves every message to the private "inbox" dataset in Sanity (the Inbox in the editor).
      SANITY_PROJECT_ID   your Sanity project ID
      SANITY_WRITE_TOKEN  a token with Editor rights (sanity.io/manage → API → Tokens)

   2. Optionally also emails it, once Resend is set up:
      RESEND_API_KEY  API key from resend.com
      CONTACT_TO      e.g. "philip@hoppartners.com,david@hoppartners.com"
      CONTACT_FROM    sender on your verified domain, e.g. "HOP. Website <website@hoppartners.com>"
      The visitor's address is set as Reply-To.

   The visitor sees success if at least one of the two worked. */

const MAX = { name: 120, email: 200, company: 160, phone: 40, message: 2000 }
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const recent = new Map() // light rate limit per warm instance

function clean(v, max) {
  return String(v ?? '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim().slice(0, max)
}
function esc(s) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ ok: false, error: 'method' })
  }

  // Only accept JSON posted from this site's own pages
  const type = String(req.headers['content-type'] || '')
  if (!type.startsWith('application/json')) return res.status(415).json({ ok: false, error: 'type' })
  const origin = req.headers.origin
  const host = req.headers['x-forwarded-host'] || req.headers.host
  if (origin && host && new URL(origin).host !== host) return res.status(403).json({ ok: false, error: 'origin' })
  if (Number(req.headers['content-length'] || 0) > 16 * 1024) return res.status(413).json({ ok: false, error: 'size' })

  let body = req.body
  if (typeof body === 'string') { try { body = JSON.parse(body) } catch { body = {} } }
  body = body || {}

  // Spam traps: a hidden field people never fill, and a minimum time on the page
  if (body.website || Number(body.elapsed) < 3000) return res.status(200).json({ ok: true })

  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim()
  const now = Date.now()
  const hits = (recent.get(ip) || []).filter((t) => now - t < 10 * 60 * 1000)
  if (hits.length >= 5) return res.status(429).json({ ok: false, error: 'rate' })
  recent.set(ip, [...hits, now])

  const d = {
    name: clean(body.name, MAX.name),
    email: clean(body.email, MAX.email),
    company: clean(body.company, MAX.company),
    phone: clean(body.phone, MAX.phone),
    message: clean(body.message, MAX.message),
    partner: ['Either', 'Philip', 'David'].includes(body.partner) ? body.partner : 'Either',
    interests: Array.isArray(body.interests) ? body.interests.slice(0, 12).map((x) => clean(x, 60)) : [],
    lang: body.lang === 'pl' ? 'pl' : 'en',
  }
  const errors = []
  if (!d.name) errors.push('name')
  if (!EMAIL.test(d.email)) errors.push('email')
  if (d.message.length < 20) errors.push('message')
  if (body.consent !== true) errors.push('consent')
  if (errors.length) return res.status(400).json({ ok: false, error: 'invalid', fields: errors })

  const results = await Promise.all([saveToSanity(d), sendEmail(d)])
  const saved = results.filter((r) => r === true).length
  const configured = results.filter((r) => r !== null).length
  if (!configured) {
    console.error('Contact form: neither Sanity (SANITY_PROJECT_ID, SANITY_WRITE_TOKEN) nor Resend is configured')
    return res.status(503).json({ ok: false, error: 'not-configured' })
  }
  if (!saved) return res.status(502).json({ ok: false, error: 'send' })
  return res.status(200).json({ ok: true })
}

/* Returns true on success, false on failure, null when not configured */
async function saveToSanity(d) {
  const { SANITY_PROJECT_ID, SANITY_WRITE_TOKEN } = process.env
  if (!SANITY_PROJECT_ID || !SANITY_WRITE_TOKEN) return null
  const dataset = process.env.SANITY_INBOX_DATASET || 'inbox'
  try {
    const r = await fetch(`https://${SANITY_PROJECT_ID}.api.sanity.io/v2025-02-19/data/mutate/${dataset}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${SANITY_WRITE_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mutations: [{
          create: {
            _type: 'message',
            status: 'New',
            receivedAt: new Date().toISOString(),
            name: d.name, email: d.email, company: d.company, phone: d.phone,
            partner: d.partner, interests: d.interests, message: d.message, lang: d.lang,
          },
        }],
      }),
    })
    if (!r.ok) { console.error('Sanity error', r.status, await r.text()); return false }
    return true
  } catch (e) {
    console.error('Sanity failed', e)
    return false
  }
}

async function sendEmail(d) {
  const { RESEND_API_KEY, CONTACT_TO, CONTACT_FROM } = process.env
  if (!RESEND_API_KEY || !CONTACT_TO || !CONTACT_FROM) return null

  const rows = [
    ['Name', d.name], ['Email', d.email], ['Company', d.company], ['Phone', d.phone],
    ['Wants to talk to', d.partner], ['Interested in', d.interests.join(', ')], ['Language', d.lang.toUpperCase()],
  ].filter(([, v]) => v)
  const text = rows.map(([k, v]) => `${k}: ${v}`).join('\n') + `\n\n${d.message}\n`
  const html = `<table cellpadding="6" style="font:14px/1.5 sans-serif">${rows
    .map(([k, v]) => `<tr><td style="color:#666">${esc(k)}</td><td>${esc(v)}</td></tr>`).join('')}</table>
    <p style="font:15px/1.6 sans-serif;white-space:pre-wrap;max-width:600px">${esc(d.message)}</p>`

  let to = CONTACT_TO.split(',').map((s) => s.trim()).filter(Boolean)
  if (d.partner !== 'Either') {
    const pick = to.find((a) => a.toLowerCase().startsWith(d.partner.toLowerCase()))
    if (pick) to = [pick, ...to.filter((a) => a !== pick)]
  }
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: CONTACT_FROM, to, reply_to: d.email,
        subject: `Website: ${d.name}${d.company ? ` (${d.company})` : ''}`,
        text, html,
      }),
    })
    if (!r.ok) { console.error('Resend error', r.status, await r.text()); return false }
    return true
  } catch (e) {
    console.error('Resend failed', e)
    return false
  }
}
