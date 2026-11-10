/* Search and sharing, done at build time:
   - one pre-rendered page per article at /house-of-poland/<slug>, with the full text in the HTML
   - canonical URL, Open Graph / X cards and structured data (JSON-LD) on every page
   - sitemap.xml and robots.txt

   Environment:
     SITE_URL   the public address, e.g. https://hoppartners.pl. Setting it is the launch switch:
                without it every page is marked noindex, so the vercel.app copy with placeholder
                text never ends up in Google. */

import {existsSync, mkdirSync, readFileSync, readdirSync, renameSync, writeFileSync} from 'node:fs'
import {join} from 'node:path'

const NAME = 'HOP.'
const LOGO = '/assets/icon-512.png'
const OG = {src: '/assets/og.jpg', w: 1200, h: 630, alt: 'hop. — HOP. wordmark on a textured black board'}
const ORG_DESC = 'HOP is Poland’s first global brand partner. Brand strategy for businesses ready to leap.'
const PEOPLE = [
  {name: 'Philip Jacobson', city: 'Poznań', li: 'https://www.linkedin.com/in/philip-jacobson-2276556/'},
  {name: 'David Anson', city: 'Warsaw', li: 'https://www.linkedin.com/in/david-anson-9a08334/'},
]
const SERVICES = ['Brand strategy', 'Brand positioning', 'Brand audit', 'Audience research', 'Brand identity and messaging', 'Brand experiences and activations', 'Brand internationalisation', 'Performance and optimisation']
const PROD = 'https://hoppartners.pl'
/* placeholder articles stay out of search until they carry real text */
const PLACEHOLDER = /lorem|ipsum|consectetur|eiusmod|duis aute/i

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const en = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? v.en || '' : v || '')
const pad = (n) => (n < 10 ? '0' : '') + n
/* JSON inside <script> must not be able to close the tag */
const ld = (obj) => `<script type="application/ld+json">${JSON.stringify(obj).replace(/</g, '\\u003c')}</script>`

function siteOrigin() {
  /* canonical URLs always point at the real domain, so vercel.app copies and previews never compete with it */
  const raw = process.env.SITE_URL || PROD
  return raw.replace(/\/+$/, '')
}

function headBlock({origin, path, title, description, type = 'website', indexable, extra = '', published, og = OG}) {
  const url = origin + path
  const OG_ = og
  return [
    `<link rel="canonical" href="${esc(url)}">`,
    indexable ? '<meta name="robots" content="index, follow, max-image-preview:large">' : '<meta name="robots" content="noindex, nofollow">',
    `<meta property="og:site_name" content="${NAME}">`,
    `<meta property="og:type" content="${type}">`,
    `<meta property="og:title" content="${esc(title)}">`,
    `<meta property="og:description" content="${esc(description)}">`,
    `<meta property="og:url" content="${esc(url)}">`,
    `<meta property="og:image" content="${origin}${OG_.src}">`,
    `<meta property="og:image:width" content="${OG_.w}">`,
    `<meta property="og:image:height" content="${OG_.h}">`,
    `<meta property="og:image:alt" content="${esc(OG_.alt)}">`,
    `<meta name="twitter:image" content="${origin}${OG_.src}">`,
    `<meta name="twitter:title" content="${esc(title)}">`,
    `<meta name="twitter:description" content="${esc(description)}">`,
    `<link rel="alternate" hreflang="en" href="${esc(url)}">`,
    `<link rel="alternate" hreflang="x-default" href="${esc(url)}">`,
    '<meta property="og:locale" content="en_GB">',
    published ? `<meta property="article:published_time" content="${esc(published)}">` : '',
    '<meta name="twitter:card" content="summary_large_image">',
    extra,
  ].filter(Boolean).join('\n')
}

function personLd(origin, p) {
  return {'@type': 'Person', '@id': origin + '/#' + p.name.toLowerCase().replace(/\s+/g, '-'), name: p.name, jobTitle: 'Senior partner', worksFor: {'@id': origin + '/#org'}, workLocation: {'@type': 'Place', name: p.city + ', Poland'}, sameAs: [p.li]}
}

function orgLd(origin) {
  return {
    '@type': ['Organization', 'ProfessionalService'],
    '@id': origin + '/#org',
    name: NAME,
    alternateName: ['HOP', 'HOP Partners', 'hop.'],
    url: origin + '/',
    logo: {'@type': 'ImageObject', url: origin + LOGO, width: 512, height: 512},
    image: origin + '/assets/og-partners.jpg',
    description: ORG_DESC,
    slogan: 'Brand strategy for businesses ready to leap.',
    address: {'@type': 'PostalAddress', addressLocality: 'Poznań', addressCountry: 'PL'},
    areaServed: [{'@type': 'Country', name: 'Poland'}, 'Europe'],
    knowsAbout: SERVICES,
    hasOfferCatalog: {'@type': 'OfferCatalog', name: 'Brand strategy services', itemListElement: SERVICES.map((n) => ({'@type': 'Offer', itemOffered: {'@type': 'Service', name: n}}))},
    founder: PEOPLE.map((p) => ({'@id': origin + '/#' + p.name.toLowerCase().replace(/\s+/g, '-')})),
    sameAs: ['https://www.linkedin.com/company/hoppartner/', 'https://www.instagram.com/hoppartner/'],
    contactPoint: {'@type': 'ContactPoint', contactType: 'new business', url: origin + '/contact', availableLanguage: ['English', 'Polish']},
  }
}

const crumbs = (origin, items) => ({'@type': 'BreadcrumbList', itemListElement: items.map(([name, path], i) => ({'@type': 'ListItem', position: i + 1, name, item: origin + path}))})

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

/* The Say Hop letter on the home page: same content, headings one level down */
function letterHTML(a) {
  const blocks = Array.isArray(a.body) ? a.body : a.body?.en || []
  return blocks.map((b) => {
    const nt = b.notr ? ' data-notr' : ''
    if (b.lede) return `<p class="lede"${nt}>${esc(b.lede)}</p>`
    if (b.p) return `<p${nt}>${esc(b.p)}</p>`
    if (b.h) return `<h3${nt}>${esc(b.h)}</h3>`
    if (b.pull) return `<blockquote class="pull"${nt}><p>${esc(b.pull)}</p></blockquote>`
    if (b.strong) return `<p class="strong-line"${nt}>${esc(b.strong)}</p>`
    if (b.closer) return `<p class="closer"${nt}>${esc(b.closer)}</p>`
    if (b.ol) return `<ol${nt}>` + b.ol.map((i) => `<li><p><strong>${esc(i[0])}</strong>${i[1] ? esc(i[1]) : ''}</p></li>`).join('') + '</ol>'
    return ''
  }).join('\n')
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
const OG_HOME = {src: '/assets/og-partners.jpg', w: 1200, h: 630, alt: 'Philip Jacobson and David Anson, the two senior partners of HOP, on a street in Poznań'}
const PAGES = {
  'index.html': {path: '/', og: OG_HOME, data: (o) => ({'@context': 'https://schema.org', '@graph': [orgLd(o), ...PEOPLE.map((p) => personLd(o, p)), {'@type': 'WebSite', '@id': o + '/#site', name: NAME, url: o + '/', publisher: {'@id': o + '/#org'}, inLanguage: 'en'}, {'@type': 'WebPage', '@id': o + '/#page', url: o + '/', name: 'HOP. Brand strategy for Polish businesses ready to leap', isPartOf: {'@id': o + '/#site'}, about: {'@id': o + '/#org'}, primaryImageOfPage: o + OG_HOME.src, inLanguage: 'en'}]})},
  'articles/index.html': {path: '/articles', og: OG_HOME, data: (o) => ({'@context': 'https://schema.org', '@graph': [{'@type': 'CollectionPage', '@id': o + '/articles#page', url: o + '/articles', name: 'House of Poland', description: 'Notes on brand strategy, positioning and taking Polish companies global, from the two senior partners of HOP.', isPartOf: {'@id': o + '/#site'}, publisher: {'@id': o + '/#org'}, inLanguage: 'en'}, crumbs(o, [['Home', '/'], ['House of Poland', '/articles']])]})},
  'contact.html': {path: '/contact', og: OG_HOME, data: (o) => ({'@context': 'https://schema.org', '@graph': [{'@type': 'ContactPage', '@id': o + '/contact#page', url: o + '/contact', name: 'Contact HOP.', about: {'@id': o + '/#org'}, inLanguage: 'en'}, orgLd(o), ...PEOPLE.map((p) => personLd(o, p)), crumbs(o, [['Home', '/'], ['Contact', '/contact']])]})},
  'privacy.html': {path: '/privacy'},
}

/* The real article pages, built by make-hub.py at /articles/<slug> */
function articleHead(html, slug, origin, indexable) {
  const title = ((html.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || '').replace(/\s*·\s*(House of Poland\s*·\s*)?HOP\.\s*$/, '').replace(/&amp;/g, '&')
  const description = ((html.match(/<meta name="description" content="([^"]*)"/) || [])[1] || ORG_DESC).replace(/&amp;/g, '&').replace(/&quot;/g, '"')
  const placeholder = PLACEHOLDER.test(title + ' ' + description)
  const path = '/articles/' + slug
  const img = slug === 'say-hop'
    ? {src: '/assets/og-say-hop.jpg', w: 1200, h: 630, alt: 'A ski jumper in full flight, in ivory on HOP red'}
    : slug === 'why-were-here'
      ? {src: '/assets/og-founders.jpg', w: 1200, h: 630, alt: 'Philip Jacobson and David Anson, the two senior partners of HOP'}
      : {src: '/assets/img/r/intro-krakow-1200.jpg', w: 1200, h: 620, alt: 'Kraków, Poland'}
  const data = {
    '@context': 'https://schema.org',
    '@graph': [
      {'@type': 'Article', '@id': origin + path + '#article', headline: title.replace(/\.$/, ''), description, inLanguage: 'en', mainEntityOfPage: origin + path, image: {'@type': 'ImageObject', url: origin + img.src, width: img.w, height: img.h}, author: PEOPLE.map((p) => ({'@id': origin + '/#' + p.name.toLowerCase().replace(/\s+/g, '-'), '@type': 'Person', name: p.name, url: p.li})), publisher: {'@id': origin + '/#org'}, isPartOf: {'@type': 'Blog', name: 'House of Poland', url: origin + '/articles'}},
      crumbs(origin, [['Home', '/'], ['House of Poland', '/articles'], [title.replace(/\.$/, ''), path]]),
      orgLd(origin),
    ],
  }
  return {placeholder, path, block: headBlock({origin, path, title, description, type: 'article', indexable: indexable && !placeholder, og: img, extra: ld(data)})}
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
    html = html.replace('<!--SEO-->', headBlock({origin, path: cfg.path, title: unesc(m.title), description: unesc(m.description), indexable, og: cfg.og, extra: cfg.data ? ld(cfg.data(origin)) : ''}))
    if (file === 'index.html') {
      const letter = articles.find((a) => a.slug === 'say-hop')
      if (letter) html = html.replace('<!--LETTER-BODY-->', letterHTML(letter))
    }
    writeFileSync(p, html)
  }

  /* The real article pages */
  const live = []
  const adir = join(dist, 'articles')
  for (const f of existsSync(adir) ? readdirSync(adir) : []) {
    if (!f.endsWith('.html') || f === 'index.html') continue
    const p = join(adir, f)
    let html = readFileSync(p, 'utf8')
    const r = articleHead(html, f.replace(/\.html$/, ''), origin, indexable)
    html = html.includes('<!--SEO-->') ? html.replace('<!--SEO-->', r.block) : html.replace(/<meta name="robots" content="noindex">/, r.block)
    writeFileSync(p, html)
    if (!r.placeholder) live.push(r.path)
  }

  /* The 404 page and the old hash-based article page are never indexed */
  for (const file of ['404.html', 'article.html', 'house-of-poland.html']) {
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
  /* only real, canonical, indexable URLs: no redirects, no placeholders */
  const urls = [
    {loc: origin + '/', pri: '1.0'},
    {loc: origin + '/articles', pri: '0.7'},
    ...live.map((p) => ({loc: origin + p, pri: '0.6'})),
    {loc: origin + '/contact', pri: '0.8'},
    {loc: origin + '/privacy', pri: '0.2'},
  ]
  writeFileSync(join(dist, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${esc(u.loc)}</loc><lastmod>${today}</lastmod><priority>${u.pri}</priority></url>`).join('\n')}\n</urlset>\n`)
  writeFileSync(join(dist, 'robots.txt'), `User-agent: *\n${indexable ? 'Allow: /' : 'Allow: /\n# Not launched yet: every page carries noindex until SITE_URL is set.'}\n\nSitemap: ${origin}/sitemap.xml\n`)

  const left = readdirSync(dist).filter((f) => f.endsWith('.html') && readFileSync(join(dist, f), 'utf8').includes('<!--SEO-->'))
  if (left.length) throw new Error('SEO: no metadata written for ' + left.join(', '))
  console.log(`SEO: ${live.length} live article page(s), sitemap with ${urls.length} URLs, origin ${origin}, ${indexable ? 'indexable' : 'noindex until SITE_URL is set'}`)
}
