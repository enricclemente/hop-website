/* Vercel build: copies the static site to dist/ and writes the House of Poland
   articles from Sanity into dist/assets/articles.js.

   Environment (set in Vercel → Project → Settings → Environment Variables):
     SANITY_PROJECT_ID   your Sanity project ID (required to use Sanity)
     SANITY_DATASET      defaults to "production"
   Without SANITY_PROJECT_ID the build keeps the sample articles in public/assets/articles.js,
   so the site always deploys.

   For local testing without Sanity: SANITY_FIXTURE=path/to/response.json node scripts/build.mjs */

import {cpSync, existsSync, readFileSync, rmSync, writeFileSync} from 'node:fs'
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

if (!existsSync(join(dist, 'index.html'))) throw new Error('Build failed: dist/index.html missing')
console.log('Built to dist/')
