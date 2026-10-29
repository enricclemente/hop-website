/* Private-preview gate (Vercel Routing Middleware, runs before every page).

   ON:  set SITE_PASSWORD in Vercel → Settings → Environment Variables, then redeploy.
   OFF: delete SITE_PASSWORD (or leave it empty) and redeploy. Nothing else to change.

   Visitors see a branded password page once; a correct password sets an
   HttpOnly cookie for 30 days. Changing the password signs everyone out. */

export const config = { matcher: '/:path*' }

const COOKIE = 'hop_gate'
const MAX_AGE = 60 * 60 * 24 * 30
/* Files the password page itself needs; nothing with content in it */
const PUBLIC = [/^\/assets\/site\.css$/, /^\/assets\/fonts\//, /^\/assets\/tex\//, /^\/assets\/(favicon\.svg|favicon-32\.png|apple-touch-icon\.png|icon-512\.png|og\.jpg)$/, /^\/robots\.txt$/]

const SECURITY = {
  'Content-Security-Policy': "default-src 'self'; script-src 'none'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'none'; object-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
  'Strict-Transport-Security': 'max-age=63072000',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'same-origin',
  'X-Robots-Tag': 'noindex, nofollow',
  'Cache-Control': 'no-store',
}

/* Same as next() from @vercel/functions: let the request through untouched */
const pass = () => new Response(null, { headers: { 'x-middleware-next': '1' } })

async function token(password) {
  const data = new TextEncoder().encode('hop-gate:v1:' + password)
  const hash = new Uint8Array(await crypto.subtle.digest('SHA-256', data))
  return btoa(String.fromCharCode(...hash)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function same(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

function readCookie(req, name) {
  const raw = req.headers.get('cookie') || ''
  for (const part of raw.split(/;\s*/)) {
    const i = part.indexOf('=')
    if (i > 0 && part.slice(0, i) === name) return decodeURIComponent(part.slice(i + 1))
  }
  return null
}

/* Only same-site paths, so the form can't be used to bounce people elsewhere */
function safeNext(v) {
  return typeof v === 'string' && v.startsWith('/') && !v.startsWith('//') && !v.startsWith('/\\') ? v : '/'
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

function page(next, failed) {
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Private preview · HOP.</title>
<meta name="robots" content="noindex, nofollow">
<meta name="theme-color" content="#2C2C2F">
<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="/assets/site.css">
</head>
<body class="gate-body">
<main class="gate carbon">
  <div class="gate-card">
    <p class="wordmark wordmark--press wordmark--hero gate-mark" aria-label="HOP."><span class="wm-word" aria-hidden="true">hop</span><span class="wm-dot" aria-hidden="true"></span></p>
    <h1 class="gate-title">Private preview<span class="stop">.</span></h1>
    <p class="gate-text">This site isn’t public yet. Enter the password to continue.</p>
    <form class="gate-form" method="post" action="/__unlock">
      <input type="hidden" name="next" value="${esc(next)}">
      <label class="sr-only" for="gate-pw">Password</label>
      <input class="gate-input" id="gate-pw" name="password" type="password" autocomplete="current-password" placeholder="Password" required autofocus${failed ? ' aria-invalid="true" aria-describedby="gate-err"' : ''}>
      <button class="btn gate-btn" type="submit">Enter <span class="btn-arrow" aria-hidden="true">→</span></button>
      ${failed ? '<p class="gate-err" id="gate-err" role="alert">That password isn’t right. Try again.</p>' : ''}
    </form>
  </div>
  <p class="label gate-foot">HOP. · Poznań</p>
</main>
</body>
</html>`
  return new Response(html, { status: 401, headers: { ...SECURITY, 'Content-Type': 'text/html; charset=utf-8' } })
}

export default async function middleware(request) {
  const password = process.env.SITE_PASSWORD
  if (!password) return pass()                       /* gate off */

  const url = new URL(request.url)
  if (PUBLIC.some((re) => re.test(url.pathname))) return pass()

  const expected = await token(password)

  if (url.pathname === '/__unlock') {
    if (request.method !== 'POST') return Response.redirect(new URL('/', url), 303)
    let form
    try { form = await request.formData() } catch { form = new FormData() }
    const next = safeNext(form.get('next'))
    const given = await token(String(form.get('password') || ''))
    if (!same(given, expected)) {
      await new Promise((r) => setTimeout(r, 700))     /* slows down guessing */
      return page(next, true)
    }
    return new Response(null, {
      status: 303,
      headers: {
        ...SECURITY,
        Location: next,
        'Set-Cookie': `${COOKIE}=${expected}; Path=/; Max-Age=${MAX_AGE}; HttpOnly; Secure; SameSite=Lax`,
      },
    })
  }

  if (same(readCookie(request, COOKIE), expected)) return pass()

  /* Not signed in: pages get the password page, everything else a plain 401 */
  const wantsPage = request.method === 'GET' || request.method === 'HEAD'
  const accept = request.headers.get('accept') || ''
  if (wantsPage && (accept.includes('text/html') || !/\.[a-z0-9]+$/i.test(url.pathname))) {
    return page(url.pathname + url.search, false)
  }
  return new Response('Private preview', { status: 401, headers: { ...SECURITY, 'Content-Type': 'text/plain; charset=utf-8' } })
}
