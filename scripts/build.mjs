/* Vercel build: copies the static site to dist/, renders House of Poland articles from Sanity
   (scripts/cms.mjs) and the editor at /studio (scripts/build-studio.mjs, run after this).

   Environment (set in Vercel → Project → Settings → Environment Variables):
     SANITY_PROJECT_ID   your Sanity project ID (required to use Sanity)
     SANITY_DATASET      defaults to "production"
   Without SANITY_PROJECT_ID the build keeps the sample articles in public/assets/articles.js,
   so the site always deploys.

   For local testing without Sanity: SANITY_FIXTURE=path/to/response.json node scripts/build.mjs */

import {cpSync, existsSync, readFileSync, readdirSync, rmSync, writeFileSync} from 'node:fs'
import {dirname, join} from 'node:path'
import {fileURLToPath} from 'node:url'
import vm from 'node:vm'
import {applySEO} from './seo.mjs'
import {buildCMS} from './cms.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const pub = join(root, 'public')
const dist = join(root, 'dist')

rmSync(dist, {recursive: true, force: true})
cpSync(pub, dist, {recursive: true})

/* House of Poland articles written in Sanity (hoppartners.pl/studio) become real pages in the
   site's design, with cards on /articles. Without SANITY_PROJECT_ID only the hand-built articles show. */
await buildCMS(root, dist)

/* Legacy /house-of-poland/<slug> pages (permanently redirected) still come from the old sample list */
const sandbox = {window: {}}
vm.runInNewContext(readFileSync(join(pub, 'assets', 'articles.js'), 'utf8'), sandbox)
const ARTICLES = sandbox.window.HOP_ARTICLES || []

applySEO(dist, ARTICLES)

/* Analytics: Umami Cloud (cookieless). The page carries the website ID; consent.js loads the tracker
   unless the visitor has switched Statistics off, and only on hoppartners.pl (data-domains).
   Clicks worth counting get data-umami-event attributes here, so the HTML sources stay clean. */
{
  const UMAMI_ID = (process.env.UMAMI_WEBSITE_ID || '10cbe963-2e08-4bdf-a52c-86447e0ef658').trim()
  const walkH = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walkH(join(d, e.name)) : e.name.endsWith('.html') ? [join(d, e.name)] : [])
  const tag = (html, re, name, extra = () => '') => html.replace(re, (m, ...g) => m.includes('data-umami-event') ? m : m.replace(/^<(a|button)\b/, `<$1 data-umami-event="${name}"${extra(m, ...g)}`))
  for (const f of walkH(dist)) {
    let h = readFileSync(f, 'utf8'), o = h
    if (/^[0-9a-f-]{36}$/i.test(UMAMI_ID) && !h.includes('name="hop-umami"')) h = h.replace('</head>', `<meta name="hop-umami" content="${UMAMI_ID}">\n</head>`)
    h = tag(h, /<a class="pcta[^"]*"[^>]*href="\/contact"[^>]*>/g, 'CTA: Let’s make the leap', (m) => ` data-umami-event-where="${/nav-cta/.test(m) ? 'nav' : /pcta--menu/.test(m) ? 'menu' : /f-cta/.test(m) ? 'footer' : 'page'}"`)
    h = tag(h, /<a [^>]*href="mailto:([^"]+)"[^>]*>/g, 'Email click', (m, to) => ` data-umami-event-to="${to}"`)
    h = tag(h, /<a [^>]*href="tel:([^"]+)"[^>]*>/g, 'Phone click', (m, to) => ` data-umami-event-to="${to}"`)
    h = tag(h, /<a class="foot-social"[^>]*aria-label="HOP on (LinkedIn|Instagram)"[^>]*>/g, 'Social click', (m, n) => ` data-umami-event-network="${n}"`)
    h = tag(h, /<button type="button" data-lang="(en|pl)"[^>]*>/g, 'Language switch', (m, l) => ` data-umami-event-to="${l.toUpperCase()}"`)
    h = tag(h, /<button[^>]*id="letter-toggle"[^>]*>/g, 'Letter opened')
    if (h !== o) writeFileSync(f, h)
  }
}

/* Speed: one minified stylesheet, the tiny intro gate inlined (allowed by its CSP hash), body scripts deferred */
{
  const { createHash } = await import('node:crypto')
  const { readdirSync } = await import('node:fs')
  const minCSS = (css) => css
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s*([{};,])\s*/g, '$1')
    .replace(/;}/g, '}')
    .trim()
  const css = minCSS(readFileSync(join(dist, 'assets', 'v2.css'), 'utf8') + '\n' + readFileSync(join(dist, 'assets', 'v5.css'), 'utf8'))
  writeFileSync(join(dist, 'assets', 'hop.css'), css + '\n')
  const gate = readFileSync(join(dist, 'assets', 'intro5.js'), 'utf8').replace(/^\/\*[\s\S]*?\*\/\s*/, '').trim()
  const gateHash = "'sha256-" + createHash('sha256').update(gate).digest('base64') + "'"
  const vj = readFileSync(join(root, 'vercel.json'), 'utf8')
  if (!vj.includes(gateHash)) throw new Error(`vercel.json CSP must allow the inlined intro gate: add ${gateHash} to script-src`)
  const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(join(d, e.name)) : e.name.endsWith('.html') ? [join(d, e.name)] : [])
  for (const f of walk(dist)) {
    const html = readFileSync(f, 'utf8')
    let out = html.replace(/<link rel="stylesheet" href="\/assets\/v2\.css">\s*<link rel="stylesheet" href="\/assets\/v5\.css">/, '<link rel="stylesheet" href="/assets/hop.css">')
    out = out.replace('<script src="/assets/intro5.js"></script>', '<script>' + gate + '</script>')
    if (!out.includes('InstrumentSans.woff2" as="font"')) out = out.replace('<link rel="preload" href="/assets/fonts/Newsreader-V.woff2" as="font" type="font/woff2" crossorigin>', '<link rel="preload" href="/assets/fonts/InstrumentSans.woff2" as="font" type="font/woff2" crossorigin>\n<link rel="preload" href="/assets/fonts/Newsreader-V.woff2" as="font" type="font/woff2" crossorigin>')
    const b = out.indexOf('<body')
    if (b > 0) out = out.slice(0, b) + out.slice(b).replace(/<script src="([^"]+)"><\/script>/g, '<script src="$1" defer></script>')
    if (out !== html) writeFileSync(f, out)
  }
}

/* Cache-busting: version every /assets/*.css|js link with a short content hash */
{
  const { createHash } = await import('node:crypto')
  const { readdirSync } = await import('node:fs')
  const ver = new Map()
  const v = (f) => { if (!ver.has(f)) { const fp = join(dist, f); ver.set(f, existsSync(fp) ? createHash('sha1').update(readFileSync(fp)).digest('hex').slice(0, 8) : null) } return ver.get(f) }
  const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(join(d, e.name)) : e.name.endsWith('.html') ? [join(d, e.name)] : [])
  for (const f of walk(dist)) {
    const html = readFileSync(f, 'utf8')
    /* House rule: a title that ends with a full stop ends with the red dot */
    const dotted = html.replace(/(<h[1-4]\b[^>]*>)([\s\S]*?)(<\/h[1-4]>)/g, (m, open, inner, close) => {
      if (/class="(?:tdot|hs-stop|i5-stop)"/.test(inner)) return m
      const r = inner.replace(/\.((?:\s*<\/[a-z0-9]+>)*\s*)$/i, (mm, tail) => '<span class="tdot">.</span>' + tail)
      return open + r + close
    })
    const out = dotted.replace(/(href|src)="\/(assets\/[^"?#]+\.(?:css|js))"/g, (m, a, path) => { const h = v(path); return h ? `${a}="/${path}?v=${h}"` : m })
    if (out !== html) writeFileSync(f, out)
  }
}

if (!existsSync(join(dist, 'index.html'))) throw new Error('Build failed: dist/index.html missing')
console.log('Built to dist/')
