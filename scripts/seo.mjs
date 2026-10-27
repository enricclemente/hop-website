/* Search and sharing, done at build time:
   - one pre-rendered page per article at /house-of-poland/<slug>, with the full text in the HTML
   - canonical URL, Open Graph / X cards and structured data (JSON-LD) on every page
   - sitemap.xml and robots.txt

   Environment:
     SITE_URL   the public address, e.g. https://hoppartners.pl. Setting it is the launch switch:
                without it every page is marked noindex, so the vercel.app copy with placeholder
                text never ends up in Google. */

import {mkdirSync, readFileSync, readdirSync, renameSync, writeFileSync} from 'node:fs'
import {join} from 'node:path'

const NAME = 'HOP.'
const LOGO = '/assets/icon-512.png'
const OG = {src: '/assets/og.jpg', w: 1200, h: 630, alt: 'hop. — HOP. wordmark on a textured black board'}
const ORG_DESC = 'HOP. is a brand strategy company in Poland. We build brands for Polish challengers whose brand hasn’t caught up with their product.'
const PEOPLE = [
  {name: 'Philip Jacobson', email: 'philip@hoppartners.com'},
  {name: 'David Anson', email: 'david@hoppartners.com'},
]

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const en = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? v.en || '' : v || '')
const pad = (n) => (n < 10 ? '0' : '') + n
/* JSON inside <script> must not be able to close the tag */
const ld = (obj) => `<script type="application/ld+json">${JSON.stringify(obj).replace(/</g, '\\u003c')}</script>`

function siteOrigin() {
  const raw = process.env.SITE_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : 'https://hop-website-olive.vercel.app')
  return raw.replace(/\/+$/, '')
}

function headBlock({origin, path, title, description, type = 'website', indexable, extra = '', published}) {
  const url = origin + path
  return [
    `<link rel="canonical" href="${esc(url)}">`,
    indexable ? '<meta name="robots" content="index, follow, max-image-preview:large">' : '<meta name="robots" content="noindex, nofollow">',
    `<meta property="og:site_name" content="${NAME}">`,
    `<meta property="og:type" content="${type}">`,
    `<meta property="og:title" content="${esc(title)}">`,
    `<meta property="og:description" content="${esc(description)}">`,
    `<meta property="og:url" content="${esc(url)}">`,
    `<meta property="og:image" content="${origin}${OG.src}">`,
    `<meta property="og:image:width" content="${OG.w}">`,
    `<meta property="og:image:height" content="${OG.h}">`,
    `<meta property="og:image:alt" content="${esc(OG.alt)}">`,
    '<meta property="og:locale" content="en_GB">',
    published ? `<meta property="article:published_time" content="${esc(published)}">` : '',
    '<meta name="twitter:card" content="summary_large_image">',
    extra,
  ].filter(Boolean).join('\n')
}

function orgLd(origin) {
  return {
    '@type': 'Organization',
    '@id': origin + '/#org',
    name: NAME,
    alternateName: 'HOP',
    url: origin + '/',
    logo: origin + LOGO,
    description: ORG_DESC,
    address: {'@type': 'PostalAddress', addressLocality: 'Poznań', addressCountry: 'PL'},
    founder: PEOPLE.map((p) => ({'@type': 'Person', name: p.name, jobTitle: 'Senior partner', email: 'mailto:' + p.email})),
  }
}

/* Same markup the browser renderer (site.js renderBody) produces */
function bodyHTML(a) {
  const blocks = Array.isArray(a.body) ? a.body : a.body?.en || []
  const stop = (t) => esc(String(t).replace(/\.\s*$/, '')) + '<span class="stop">.</span>'
  const out = blocks.map((b) => {
    const nt = b.notr ? ' data-notr' : ''
    if (b.lede) return `<p class="lede"${nt}>${esc(b.lede)}</p>`
    if (b.p) return `<p${nt}>${esc(b.p)}</p>`
    if (b.h) return `<h2${nt}>${esc(b.h)}</h2>`
    if (b.pull) return `<blockquote class="pull"${nt}>${stop(b.pull)}</blockquote>`
    if (b.strong) return `<p class="strong-line"${nt}>${esc(b.strong)}</p>`
    if (b.closer) return `<p class="closer"${nt}>${esc(b.closer)}</p>`
    if (b.ol) return `<ol${nt}>` + b.ol.map((i) => `<li><div><strong>${esc(i[0])}</strong>${i[1] ? `<span>${esc(i[1])}</span>` : ''}</div></li>`).join('') + '</ol>'
    return ''
  })
  out.push(`<div class="sign"><span class="wordmark" aria-label="Hop."><span aria-hidden="true">Hop</span><span class="wm-dot" aria-hidden="true"></span></span><p data-notr>${esc(a.authors || '')}</p></div>`)
  return out.join('\n')
}

function topicSlug(t) {
  return String(t).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function fill(html, attr, inner) {
  const re = new RegExp(`(<([a-z0-9]+)[^>]*data-a="${attr}"[^>]*>)([\\s\\S]*?)(</\\2>)`)
  if (!re.test(html)) throw new Error(`article template: data-a="${attr}" not found`)
  return html.replace(re, (_, open, _t, _old, close) => open + inner + close)
}

function articlePage(tpl, a, i, list, origin, indexable) {
  const title = en(a.title), sub = en(a.subtitle), summary = en(a.summary) || sub
  const path = `/house-of-poland/${a.slug}`
  const older = list[i + 1], newer = list[i - 1]
  const people = String(a.authors || '').split(/\s+and\s+|,\s*|\s*&\s*/).map((s) => s.trim()).filter(Boolean)
  const date = String(a.date || '').slice(0, 10)

  const data = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Article',
        headline: title,
        description: summary,
        datePublished: date,
        inLanguage: 'en',
        mainEntityOfPage: origin + path,
        image: origin + OG.src,
        author: people.map((n) => ({'@type': 'Person', name: n})),
        publisher: {'@id': origin + '/#org'},
        isPartOf: {'@type': 'Periodical', name: 'House of Poland', url: origin + '/house-of-poland'},
        keywords: (a.topics || []).join(', ') || undefined,
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          {'@type': 'ListItem', position: 1, name: NAME, item: origin + '/'},
          {'@type': 'ListItem', position: 2, name: 'House of Poland', item: origin + '/house-of-poland'},
          {'@type': 'ListItem', position: 3, name: title, item: origin + path},
        ],
      },
      orgLd(origin),
    ],
  }

  let h = tpl
  h = h.replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(title.replace(/\.\s*$/, ''))}. House of Poland · HOP.</title>`)
  h = h.replace(/<meta name="description"[^>]*>/, `<meta name="description" content="${esc(summary)}">`)
  h = h.replace('<!--SEO-->', headBlock({origin, path, title, description: summary, type: 'article', indexable, published: date, extra: ld(data)}))
  h = h.replace('<article id="article"', `<article id="article" data-slug="${esc(a.slug)}"`)
  h = fill(h, 'number', `House of Poland · No. ${pad(a.number)}`)
  h = fill(h, 'title', esc(title.replace(/\.\s*$/, '')) + '<span class="stop">.</span>')
  h = fill(h, 'subtitle', esc(sub))
  h = fill(h, 'authors', esc(a.authors || ''))
  h = h.replace(/<time data-a="date" datetime="">/, `<time data-a="date" datetime="${esc(date)}">`)
  h = fill(h, 'body', '\n' + bodyHTML(a) + '\n')
  if ((a.topics || []).length) {
    h = h.replace(/(<ul class="topic-chips" data-a="topics"[^>]*?) hidden>[\s\S]*?<\/ul>/, (_, open) => open + '>' + a.topics.map((t) => `<li><a class="chip" href="/articles#${topicSlug(t)}">${esc(t)}</a></li>`).join('') + '</ul>')
  }
  const pn = (dir, art) => {
    const re = new RegExp(`<a class="pn pn--${dir}" href="#" data-a="${dir === 'prev' ? 'older' : 'newer'}" hidden>([\\s\\S]*?)<span class="t"></span></a>`)
    return art ? h.replace(re, (_, lab) => `<a class="pn pn--${dir}" href="/house-of-poland/${esc(art.slug)}" data-a="${dir === 'prev' ? 'older' : 'newer'}">${lab}<span class="t">${esc(en(art.title))}</span></a>`) : h
  }
  h = pn('prev', older)
  h = pn('next', newer)
  return h
}

/* Static pages: path, and structured data where it helps */
const PAGES = {
  'index.html': {path: '/', data: (o) => ({'@context': 'https://schema.org', '@graph': [orgLd(o), {'@type': 'WebSite', '@id': o + '/#site', name: NAME, url: o + '/', publisher: {'@id': o + '/#org'}, inLanguage: 'en'}]})},
  'house-of-poland.html': {path: '/house-of-poland'},
  'articles.html': {path: '/articles'},
  'contact.html': {path: '/contact'},
  'privacy.html': {path: '/privacy'},
}

export function applySEO(dist, articles) {
  const origin = siteOrigin()
  const indexable = !!process.env.SITE_URL
  const meta = (html) => ({
    title: (html.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || NAME,
    description: (html.match(/<meta name="description" content="([^"]*)"/) || [])[1] || ORG_DESC,
  })
  const unesc = (s) => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"')

  for (const [file, cfg] of Object.entries(PAGES)) {
    const p = join(dist, file)
    let html = readFileSync(p, 'utf8')
    const m = meta(html)
    html = html.replace('<!--SEO-->', headBlock({origin, path: cfg.path, title: unesc(m.title), description: unesc(m.description), indexable, extra: cfg.data ? ld(cfg.data(origin)) : ''}))
    writeFileSync(p, html)
  }

  /* The 404 page and the old hash-based article page are never indexed */
  for (const file of ['404.html', 'article.html']) {
    const p = join(dist, file)
    writeFileSync(p, readFileSync(p, 'utf8').replace('<!--SEO-->', '<meta name="robots" content="noindex">'))
  }

  /* One real page per article */
  const tpl = readFileSync(join(dist, 'article.html'), 'utf8').replace('<meta name="robots" content="noindex">', '<!--SEO-->')
  const sorted = [...articles].sort((a, b) => String(b.date).localeCompare(String(a.date)))
  mkdirSync(join(dist, 'house-of-poland'), {recursive: true})
  for (const [i, a] of sorted.entries()) {
    writeFileSync(join(dist, 'house-of-poland', `${a.slug}.html`), articlePage(tpl, a, i, sorted, origin, indexable))
  }

  /* /house-of-poland is both the landing page and the articles' folder: the landing page becomes the folder's index */
  renameSync(join(dist, 'house-of-poland.html'), join(dist, 'house-of-poland', 'index.html'))

  /* Sitemap and robots */
  const today = new Date().toISOString().slice(0, 10)
  const urls = [
    ...Object.values(PAGES).map((c) => ({loc: origin + c.path, lastmod: today})),
    ...sorted.map((a) => ({loc: `${origin}/house-of-poland/${a.slug}`, lastmod: String(a.date).slice(0, 10)})),
  ]
  writeFileSync(join(dist, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${esc(u.loc)}</loc><lastmod>${u.lastmod}</lastmod></url>`).join('\n')}\n</urlset>\n`)
  writeFileSync(join(dist, 'robots.txt'), `User-agent: *\n${indexable ? 'Allow: /' : 'Allow: /\n# Not launched yet: every page carries noindex until SITE_URL is set.'}\n\nSitemap: ${origin}/sitemap.xml\n`)

  const left = readdirSync(dist).filter((f) => f.endsWith('.html') && readFileSync(join(dist, f), 'utf8').includes('<!--SEO-->'))
  if (left.length) throw new Error('SEO: no metadata written for ' + left.join(', '))
  console.log(`SEO: ${sorted.length} article page(s), sitemap with ${urls.length} URLs, origin ${origin}, ${indexable ? 'indexable' : 'noindex until SITE_URL is set'}`)
}
