/* House of Poland articles from Sanity, rendered at build time into the site's own design.

   For every published article: dist/articles/<slug>.html (from the shell make-hub.py writes to
   articles/_cms.html) and a card on /articles. English and Polish both go into the page; CSS shows
   the one matching the site language (data-l="en|pl"), so the Polish dictionary isn't involved.

   Env: SANITY_PROJECT_ID (no ID = no Sanity, the hand-built articles stay as they are),
        SANITY_DATASET (default "production"). Testing: SANITY_FIXTURE=file.json (an API response). */

import {existsSync, readFileSync, rmSync, writeFileSync} from 'node:fs'
import {join} from 'node:path'

const QUERY = `*[_type == "article" && defined(slug.current) && defined(publishedAt) && !(_id in path("drafts.**"))] | order(publishedAt desc){
  _id, "slug": slug.current, publishedAt, label, authors,
  title, italic, summary, body, closing,
  titlePl, italicPl, summaryPl, bodyPl, closingPl,
  image{alt, altPl, crop, hotspot, asset->{_id, url, metadata{dimensions{width, height}}}},
  "bodyImages": body[_type == "image"]{_key, asset->{_id, url, metadata{dimensions{width, height}}}},
  "bodyImagesPl": bodyPl[_type == "image"]{_key, asset->{_id, url, metadata{dimensions{width, height}}}}
}`

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const MONTHS = {
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  pl: ['stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca', 'lipca', 'sierpnia', 'września', 'października', 'listopada', 'grudnia'],
}
const LABEL_PL = {Article: 'Artykuł', Letter: 'List', Opinion: 'Opinia', Research: 'Badania', News: 'Aktualności', About: 'O nas'}
const dateLabel = (iso, l) => { const [y, m, d] = String(iso).slice(0, 10).split('-').map(Number); return `${d} ${MONTHS[l][m - 1]} ${y}` }

/* One string per language: both in the page, CSS shows the active one */
const both = (en, pl, tag = 'span') => (pl && pl !== en
  ? `<${tag} data-l="en" data-notr>${en}</${tag}><${tag} data-l="pl" lang="pl" data-notr>${pl}</${tag}>`
  : `<${tag} data-notr>${en}</${tag}>`)

/* Title: escaped, one word in italics, a final full stop becomes the red dot */
function titleHTML(t, it) {
  let s = String(t || '').trim(), dot = ''
  if (s.endsWith('.')) { s = s.slice(0, -1); dot = '<span class="tdot">.</span>' }
  const i = it ? s.indexOf(it) : -1
  return (i >= 0 ? esc(s.slice(0, i)) + '<em>' + esc(it) + '</em>' + esc(s.slice(i + it.length)) : esc(s)) + dot
}
const tdotText = (s) => { s = String(s || '').trim(); return s.endsWith('.') ? esc(s.slice(0, -1)) + '<span class="tdot">.</span>' : esc(s) }

/* Sanity image URLs: crop (if set) then fit to the box around the hotspot */
function imgURL(img, w, h) {
  const a = img?.asset
  if (!a?.url) return ''
  const p = new URLSearchParams({w: String(w), auto: 'format', q: '80'})
  const dim = a.metadata?.dimensions
  if (img.crop && dim) {
    const c = img.crop
    const L = Math.round(c.left * dim.width), T = Math.round(c.top * dim.height)
    p.set('rect', [L, T, Math.round(dim.width - L - c.right * dim.width), Math.round(dim.height - T - c.bottom * dim.height)].join(','))
  }
  if (h) {
    p.set('h', String(h)); p.set('fit', 'crop')
    if (img.hotspot) { p.set('crop', 'focalpoint'); p.set('fp-x', img.hotspot.x.toFixed(3)); p.set('fp-y', img.hotspot.y.toFixed(3)) }
  }
  return a.url + '?' + p.toString()
}

/* Portable Text → the site's article markup */
function spans(block) {
  const defs = Object.fromEntries((block.markDefs || []).map((d) => [d._key, d]))
  return (block.children || []).map((c) => {
    let t = esc(c.text || '').replace(/\n/g, '<br>')
    for (const m of c.marks || []) {
      if (m === 'strong') t = `<strong>${t}</strong>`
      else if (m === 'em') t = `<em>${t}</em>`
      else if (defs[m]?._type === 'link' && defs[m].href) {
        const ext = /^https?:/.test(defs[m].href) && !/hoppartners\.pl/.test(defs[m].href)
        t = `<a class="ulink" href="${esc(defs[m].href)}"${ext ? ' rel="noopener" target="_blank"' : ''}>${t}</a>`
      }
    }
    return t
  }).join('')
}
const plain = (block) => (block.children || []).map((c) => c.text || '').join('').trim()

function renderBody(blocks, images) {
  const out = []
  let list = null, n = 0, h = 0
  const close = () => { if (list) { out.push(list.type === 'number' ? `<ol class="art-list" role="list">${list.items.join('')}</ol>` : `<ul class="art-bullets" role="list">${list.items.join('')}</ul>`); list = null; n = 0 } }
  const imgs = Object.fromEntries((images || []).map((i) => [i._key, i]))
  for (const b of blocks || []) {
    if (b._type === 'image') {
      close()
      const im = {...b, asset: imgs[b._key]?.asset}
      if (!im.asset) continue
      const d = im.asset.metadata?.dimensions || {width: 1600, height: 1067}
      const src = (w) => imgURL(im, w)
      out.push(`<figure class="art-fig"><img src="${src(1200)}" srcset="${src(800)} 800w, ${src(1200)} 1200w, ${src(1600)} 1600w" sizes="(min-width: 1024px) 720px, calc(100vw - 48px)" alt="${esc(b.alt || '')}" width="${d.width}" height="${d.height}" loading="lazy" decoding="async">${b.caption ? `<figcaption class="lbl">${esc(b.caption)}</figcaption>` : ''}</figure>`)
      continue
    }
    if (b._type !== 'block') continue
    if (b.listItem) {
      const type = b.listItem === 'number' ? 'number' : 'bullet'
      if (!list || list.type !== type) { close(); list = {type, items: []} }
      n++
      list.items.push(type === 'number' ? `<li><span class="lbl lbl--m lbl--red">${String(n).padStart(2, '0')}</span><span>${spans(b)}</span></li>` : `<li>${spans(b)}</li>`)
      continue
    }
    close()
    if (!plain(b)) continue
    if (b.style === 'h2') { h++; out.push(`<h2 class="art-sub"><span class="lbl lbl--m lbl--red">${String(h).padStart(2, '0')}</span><span>${tdotText(plain(b))}</span></h2>`) }
    else if (b.style === 'blockquote') out.push(`<blockquote class="art-pull"><p>${tdotText(plain(b))}</p></blockquote>`)
    else if (b.style === 'lede') out.push(`<p class="art-lede">${spans(b)}</p>`)
    else out.push(`<p>${spans(b)}</p>`)
  }
  close()
  return out.join('\n        ')
}
const words = (blocks) => (blocks || []).filter((b) => b._type === 'block').map(plain).join(' ').split(/\s+/).filter(Boolean).length
const mins = (blocks) => Math.max(1, Math.round(words(blocks) / 230))

function closingHTML(c) {
  const parts = String(c || '').split('.').map((x) => x.trim()).filter(Boolean)
  if (parts.length < 2) return tdotText(c)
  return esc(parts.slice(0, -1).join('. ') + '. ') + '<em>' + esc(parts.at(-1)) + '</em><span class="tdot">.</span>'
}

export async function buildCMS(root, dist) {
  const shellPath = join(dist, 'articles', '_cms.html')
  const shell = existsSync(shellPath) ? readFileSync(shellPath, 'utf8') : null
  rmSync(shellPath, {force: true})
  const hubPath = join(dist, 'articles', 'index.html')
  const projectId = process.env.SANITY_PROJECT_ID
  const dataset = process.env.SANITY_DATASET || 'production'
  const fixture = process.env.SANITY_FIXTURE
  const clearMarker = () => writeFileSync(hubPath, readFileSync(hubPath, 'utf8').replace('<!--CMS-CARDS-->\n', ''))
  if (!projectId && !fixture) { clearMarker(); console.log('House of Poland CMS: SANITY_PROJECT_ID not set, hand-built articles only'); return [] }
  if (!shell) throw new Error('CMS: articles/_cms.html missing (run scripts/make-hub.py)')

  let raw
  if (fixture) raw = JSON.parse(readFileSync(fixture, 'utf8')).result
  else {
    const url = `https://${projectId}.api.sanity.io/v2025-02-19/data/query/${dataset}?query=${encodeURIComponent(QUERY)}&perspective=published`
    const res = await fetch(url)
    if (!res.ok) throw new Error(`Sanity answered ${res.status}: ${(await res.text()).slice(0, 300)}`)
    raw = (await res.json()).result || []
  }
  const parts = JSON.parse(readFileSync(join(root, 'scripts', 'cms_parts.json'), 'utf8'))
  const taken = new Set(parts.static.map((s) => s.slug))
  const arts = raw.filter((a) => a.slug && a.title && !taken.has(a.slug) && /^[a-z0-9][a-z0-9-]*$/.test(a.slug))

  /* reading order for "Next article": newest Sanity articles, then the hand-built ones */
  const order = [
    ...arts.map((a) => ({slug: a.slug, title: titleHTML(a.title, a.italic), titlePl: a.titlePl ? titleHTML(a.titlePl, a.italicPl) : ''})),
    ...parts.static.map((s) => ({slug: s.slug, title: titleHTML(s.title, s.it), titlePl: ''})),
  ]

  const cards = []
  arts.forEach((a, i) => {
    const pl = !!(a.titlePl && a.bodyPl?.length)
    const L = (en, plv, tag) => both(en, pl ? plv || en : '', tag)
    const authors = (a.authors?.length ? a.authors : ['philip', 'david']).filter((k) => parts.authors[k])
    const names = authors.map((k) => parts.authors[k].name)
    const byEn = names.join(' and '), byPl = names.join(' i ')
    const mEn = mins(a.body), mPl = mins(a.bodyPl)
    const dEn = dateLabel(a.publishedAt, 'en'), dPl = dateLabel(a.publishedAt, 'pl')
    const label = a.label || 'Article'
    const heroSrc = (w) => imgURL(a.image, w, Math.round(w * 2 / 3))
    const hero = a.image?.asset ? `<div class="wrap art-hero-w"><figure class="art-hero"><img src="${heroSrc(1200)}" srcset="${heroSrc(800)} 800w, ${heroSrc(1200)} 1200w, ${heroSrc(1600)} 1600w, ${heroSrc(2400)} 2400w" sizes="(min-width: 1440px) 1200px, calc(100vw - 48px)" alt="${esc(a.image.alt || '')}"${a.image.altPl ? ` data-alt-pl="${esc(a.image.altPl)}"` : ''} width="1600" height="1067" decoding="async" fetchpriority="high"></figure></div>` : ''
    const next = order[i + 1] || order[0]
    const bodyEn = renderBody(a.body, a.bodyImages)
    const bodyPl = pl ? renderBody(a.bodyPl, a.bodyImagesPl) : ''
    const closing = a.closing ? `
  <section class="s art-close ink" aria-label="In short">
    <div class="wrap">
      <p class="lbl">In short</p>
      <p class="h2 art-close-h">${L(closingHTML(a.closing), a.closingPl ? closingHTML(a.closingPl) : '')}</p>
    </div>
  </section>` : ''
    const authorLis = authors.map((k) => {
      const p = parts.authors[k]
      return `<li class="art-author"><img src="${p.img}" alt="" width="96" height="96" loading="lazy" decoding="async"><span><span class="lbl lbl--m lbl--red">Senior partner</span><span class="art-an" data-notr>${esc(p.name)}</span><span class="art-ab">${both(esc(p.en), pl ? esc(p.pl) : '')}</span></span></li>`
    }).join('')
    const url = `https%3A%2F%2Fhoppartners.pl%2Farticles%2F${a.slug}`
    const main = `<main id="main" class="art art--note" data-page="articles" data-cms>
  <header class="s art-cover ink">
    <div class="wrap">
      <p class="art-crumbs"><a class="lbl" href="/articles">← All articles</a></p>
      <h1 class="h1 art-h">${L(titleHTML(a.title, a.italic), a.titlePl ? titleHTML(a.titlePl, a.italicPl) : '')}</h1>
      ${a.summary ? `<p class="art-dek">${L(esc(a.summary), a.summaryPl ? esc(a.summaryPl) : '')}</p>` : ''}
      <div class="art-meta"><p class="lbl"><span data-notr>${L(esc(byEn), esc(byPl))}</span> · <time datetime="${esc(String(a.publishedAt).slice(0, 10))}">${L(dEn, dPl)}</time> · ${L(`${mEn} min read`, `${mPl} min czytania`)}</p></div>
    </div>
  </header>
  <div class="s art-body">
    ${hero}
    <div class="wrap art-grid art-grid--solo">
      <article class="art-col">
        ${pl ? `<div data-l="en" data-notr>\n        ${bodyEn}\n        </div><div data-l="pl" lang="pl" data-notr>\n        ${bodyPl}\n        </div>` : `<div data-notr>\n        ${bodyEn}\n        </div>`}
      </article>
    </div>
  </div>${closing}
  <section class="s art-by" aria-label="Written by">
    <div class="wrap">
      <p class="lbl">Written by</p>
      <ul class="art-authors" role="list">${authorLis}</ul>
      <div class="art-next">
        <p class="art-share-row"><span>Share the article</span><button class="lbl linkbtn" type="button" data-share>Copy link</button><a class="lbl" href="https://www.linkedin.com/sharing/share-offsite/?url=${url}" rel="noopener" target="_blank">LinkedIn</a><a class="lbl" href="mailto:?subject=${esc(encodeURIComponent(a.title))}&amp;body=${url}">Email</a></p>
        <a class="art-nextlink" href="/articles/${next.slug}"><span class="lbl">Next article</span><span class="art-nt">${both(next.title, pl ? next.titlePl : '')} <span aria-hidden="true">→</span></span></a>
      </div>
    </div>
  </section>
</main>`
    const og = a.image?.asset ? `<meta name="hop-og" content="${esc(imgURL(a.image, 1200, 630).replace('auto=format', 'fm=jpg'))}" data-alt="${esc(a.image.alt || '')}">` : ''
    const page = shell
      .replace('<title>__TITLE__</title>', `<title>${esc(a.title)} · House of Poland · HOP.</title>`)
      .replace('content="__DESC__"', `content="${esc(a.summary || '')}"`)
      .replace('</head>', og + '\n</head>')
      .replace('<!--CMS-MAIN-->', main)
    writeFileSync(join(dist, 'articles', `${a.slug}.html`), page)

    const cs = (w) => imgURL(a.image, w, Math.round(w * 2 / 3))
    cards.push(`        <li class="acard">
          <a class="acard-a" href="/articles/${a.slug}">
            <span class="acard-img" aria-hidden="true">${a.image?.asset ? `<img class="acard-pic" src="${cs(800)}" srcset="${cs(800)} 800w, ${cs(1200)} 1200w" sizes="(min-width: 1024px) 34vw, 100vw" alt="" width="800" height="533" loading="lazy" decoding="async">` : ''}</span>
            <span class="acard-t">
              <span class="lbl lbl--m acard-topic">${L(esc(label), esc(LABEL_PL[label] || label))}</span>
              <span class="acard-h">${L(titleHTML(a.title, a.italic), a.titlePl ? titleHTML(a.titlePl, a.italicPl) : '')}</span>
              ${a.summary ? `<span class="acard-ex">${L(esc(a.summary), a.summaryPl ? esc(a.summaryPl) : '')}</span>` : ''}
              <span class="acard-f"><span class="lbl">${L(`${dEn} · ${mEn} min read`, `${dPl} · ${mPl} min czytania`)}</span><span class="acard-read">Read <span aria-hidden="true">→</span></span></span>
            </span>
          </a>
        </li>`)
  })
  writeFileSync(hubPath, readFileSync(hubPath, 'utf8').replace('<!--CMS-CARDS-->', cards.join('\n')))
  console.log(`House of Poland CMS: ${arts.length} article(s) from ${fixture ? 'fixture' : `Sanity project ${projectId}`}`)
  return arts.map((a) => a.slug)
}
