/* Vercel build: copies the static site to dist/ and writes the House of Poland
   articles from Sanity into dist/assets/articles.js.

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

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const pub = join(root, 'public')
const dist = join(root, 'dist')

rmSync(dist, {recursive: true, force: true})
cpSync(pub, dist, {recursive: true})

const projectId = process.env.SANITY_PROJECT_ID
const dataset = process.env.SANITY_DATASET || 'production'
const fixture = process.env.SANITY_FIXTURE

const QUERY = `*[_type == "article" && defined(slug.current) && defined(publishedAt)] | order(publishedAt desc){
  "slug": slug.current, number, "date": publishedAt, featured, authors, topics,
  title, subtitle, summary, "bodyEn": body.en, "bodyPl": body.pl
}`

/* Portable Text → the site's simple block format */
function spansText(block) {
  return (block.children || []).map((c) => c.text || '').join('').trim()
}
function allStrong(block) {
  const kids = (block.children || []).filter((c) => (c.text || '').trim())
  return kids.length > 0 && kids.every((c) => (c.marks || []).includes('strong'))
}
function toBlocks(portable) {
  if (!Array.isArray(portable) || !portable.length) return null
  const out = []
  let list = null
  for (const b of portable) {
    if (b._type === 'pullQuote') {
      list = null
      if (b.text) out.push({pull: b.text})
      continue
    }
    if (b._type !== 'block') continue
    if (b.listItem === 'number') {
      if (!list) { list = {ol: []}; out.push(list) }
      /* First bold run is the point's title, the rest its explanation */
      const kids = b.children || []
      const head = kids.filter((c) => (c.marks || []).includes('strong')).map((c) => c.text).join('').trim()
      const rest = kids.filter((c) => !(c.marks || []).includes('strong')).map((c) => c.text).join('').trim()
      list.ol.push(head ? [head, rest] : [rest, ''])
      continue
    }
    list = null
    const text = spansText(b)
    if (!text) continue
    if (b.style === 'h2') out.push({h: text})
    else if (b.style === 'lede') out.push({lede: text})
    else if (b.style === 'closer') out.push({closer: text})
    else if (allStrong(b)) out.push({strong: text})
    else out.push({p: text})
  }
  return out
}
function locale(v) {
  if (!v) return ''
  if (typeof v === 'string') return v
  return v.pl ? {en: v.en || '', pl: v.pl} : v.en || ''
}

async function loadArticles() {
  if (fixture) return JSON.parse(readFileSync(fixture, 'utf8')).result
  const url = `https://${projectId}.apicdn.sanity.io/v2025-02-19/data/query/${dataset}?query=${encodeURIComponent(QUERY)}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Sanity answered ${res.status}: ${await res.text()}`)
  return (await res.json()).result
}

let ARTICLES
if (projectId || fixture) {
  const raw = await loadArticles()
  const articles = raw.map((a, i) => {
    const en = toBlocks(a.bodyEn) || []
    const pl = toBlocks(a.bodyPl)
    return {
      slug: a.slug,
      number: a.number ?? raw.length - i,
      date: a.date,
      featured: !!a.featured,
      title: locale(a.title),
      subtitle: locale(a.subtitle),
      summary: locale(a.summary),
      authors: a.authors || 'Philip Jacobson and David Anson',
      topics: Array.isArray(a.topics) ? a.topics : [],
      body: pl ? {en, pl} : en,
    }
  })
  const file = `/* Generated from Sanity at build time. Do not edit: changes are overwritten. */\nwindow.HOP_ARTICLES = ${JSON.stringify(articles, null, 2)};\n`
  writeFileSync(join(dist, 'assets', 'articles.js'), file)
  ARTICLES = articles
  console.log(`House of Poland: ${articles.length} article(s) from ${fixture ? 'fixture' : `Sanity project ${projectId}`}`)
} else {
  console.log('House of Poland: SANITY_PROJECT_ID not set, using the sample articles')
  const sandbox = {window: {}}
  vm.runInNewContext(readFileSync(join(pub, 'assets', 'articles.js'), 'utf8'), sandbox)
  ARTICLES = sandbox.window.HOP_ARTICLES || []
}

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
