"""Generates the V3 article hub: public/articles/index.html and three lorem-ipsum
article pages at public/articles/<slug>.html, using the contact page's shell
(head, nav, menu, footer, scripts). Re-run after editing ARTICLES or the shell."""
import re, html, os, random
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUB = os.path.join(ROOT, 'public')
shell = open(os.path.join(PUB, 'contact.html'), encoding='utf8').read()
head_end = shell.index('<main'); main_end = shell.index('</main>') + len('</main>')
pre, post = shell[:head_end], shell[main_end:]
post = post.replace('<script src="/assets/v2-contact.js"></script>\n', '<script src="/assets/v2-article.js"></script>\n')

W = ('lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua '
     'enim ad minim veniam quis nostrud exercitation ullamco laboris nisi aliquip ex ea commodo consequat duis aute irure in '
     'reprehenderit voluptate velit esse cillum fugiat nulla pariatur excepteur sint occaecat cupidatat non proident sunt culpa '
     'qui officia deserunt mollit anim id est laborum curabitur pretium tincidunt lacus gravida orci odio varius turpis pharetra').split()
def sent(r, n): w = [r.choice(W) for _ in range(n)]; return (' '.join(w)).capitalize() + '.'
def para(r, k): return ' '.join(sent(r, r.randint(7, 15)) for _ in range(k))
def e(s): return html.escape(s, quote=False)
def tdot(s): return e(s[:-1]) + '<span class="tdot">.</span>' if s.endswith('.') else e(s)

ARTICLES = [
  dict(slug='lorem-ipsum-dolor', n='01', topic='Brand', title='Lorem ipsum dolor.', it='dolor', sub='Sed do eiusmod tempor incididunt ut labore et dolore',
       ex='Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua, quis nostrud exercitation.', date='2026-11-11', dlabel='11 November 2026', mins=6, by='Philip Jacobson', seed=1),
  dict(slug='consectetur-adipiscing-elit', n='02', topic='Strategy', title='Consectetur adipiscing elit.', it='elit', sub='Ut enim ad minim veniam, quis nostrud exercitation',
       ex='Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo.', date='2026-10-28', dlabel='28 October 2026', mins=4, by='David Anson', seed=2),
  dict(slug='duis-aute-irure', n='03', topic='Culture', title='Duis aute irure in voluptate.', it='voluptate', sub='Excepteur sint occaecat cupidatat non proident',
       ex='Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit.', date='2026-10-14', dlabel='14 October 2026', mins=8, by='Philip Jacobson and David Anson', seed=3),
]
def title_html(a, cls=''):
    t = a['title']; i = t.find(a['it']); body = t[:-1]
    s = e(body[:i]) + '<em>' + e(a['it']) + '</em>' + e(body[i+len(a['it']):]) + '<span class="tdot">.</span>'
    return s

def page(title, desc, main, robots=True):
    p = pre
    p = re.sub(r'<title>.*?</title>', f'<title>{e(title)}</title>', p, count=1, flags=re.S)
    p = re.sub(r'<meta name="description" content="[^"]*">', f'<meta name="description" content="{html.escape(desc)}">', p, count=1)
    if robots: p = p.replace('<!--SEO-->', '<meta name="robots" content="noindex">')
    return p + main + post

# ---------- hub ----------
cards = []
for a in ARTICLES:
    cards.append(f'''        <li class="acard">
          <a class="acard-a" href="/articles/{a['slug']}">
            <span class="acard-img acard-img--{a['n']}" aria-hidden="true"><picture><source type="image/avif" srcset="/assets/img/r/intro-krakow-800.avif 800w, /assets/img/r/intro-krakow-1200.avif 1200w" sizes="(min-width: 1024px) 34vw, 100vw"><source type="image/webp" srcset="/assets/img/r/intro-krakow-800.webp 800w, /assets/img/r/intro-krakow-1200.webp 1200w" sizes="(min-width: 1024px) 34vw, 100vw"><img class="acard-pic" src="/assets/img/r/intro-krakow-800.jpg" srcset="/assets/img/r/intro-krakow-800.jpg 800w, /assets/img/r/intro-krakow-1200.jpg 1200w" sizes="(min-width: 1024px) 34vw, 100vw" alt="" width="800" height="413" loading="lazy" decoding="async"></picture><span class="acard-no">No. {a['n']}</span></span>
            <span class="acard-t">
              <span class="lbl lbl--m acard-topic">{e(a['topic'])}</span>
              <span class="acard-h">{title_html(a)}</span>
              <span class="acard-ex">{e(a['ex'])}</span>
              <span class="acard-f"><span class="lbl">{e(a['dlabel'])} · {a['mins']} min read</span><span class="acard-read">Read <span aria-hidden="true">→</span></span></span>
            </span>
          </a>
        </li>''')
hub_main = f'''<main id="main" class="ahub">
  <section class="s ahub-head ink" aria-labelledby="ahub-h">
    <div class="wrap">
      <h1 class="h2 ahub-h" id="ahub-h">Thinking out <em>loud</em><span class="tdot">.</span></h1>
      <p class="ahub-lead">Notes on brand, positioning and taking Polish companies global, from the two partners.</p>
    </div>
  </section>
  <section class="s ahub-list" aria-label="All articles">
    <div class="wrap">
      <ul class="acards" role="list">
{chr(10).join(cards)}
      </ul>
    </div>
  </section>
</main>'''
os.makedirs(os.path.join(PUB, 'articles'), exist_ok=True)
open(os.path.join(PUB, 'articles', 'index.html'), 'w', encoding='utf8').write(
    page('House of Poland · HOP.', 'Notes on brand, positioning and taking Polish companies global, from the two partners of HOP.', hub_main, robots=False).replace('<main id="main" class="ahub">', '<main id="main" class="ahub" data-page="articles">'))

# ---------- articles ----------
for idx, a in enumerate(ARTICLES):
    r = random.Random(a['seed'])
    heads = [sent(r, r.randint(4, 7)) for _ in range(5)]
    blocks = [f'<p class="art-lede">{e(sent(r, 8))}</p>', f'<p>{e(para(r, 4))}</p>', f'<p>{e(para(r, 3))}</p>']
    for k, h in enumerate(heads, 1):
        blocks.append(f'<h2 class="art-sub" id="s{k}"><span class="lbl lbl--m lbl--red">{k:02d}</span><span>{tdot(h)}</span></h2>')
        blocks += [f'<p>{e(para(r, r.randint(3, 5)))}</p>', f'<p>{e(para(r, r.randint(2, 4)))}</p>']
        if k == 2: blocks.append(f'<blockquote class="art-pull"><p>{tdot(sent(r, 9))}</p></blockquote>')
        if k == 4:
            items = ''.join(f'<li><span class="lbl lbl--m lbl--red">{j:02d}</span><span><strong>{e(sent(r, 4))}</strong>{e(sent(r, 11))}</span></li>' for j in range(1, 6))
            blocks.append(f'<ol class="art-list" role="list">{items}</ol>')
    blocks.append(f'<p class="art-strong">{tdot(sent(r, 6))}</p>')
    toc = ''.join(f'<li><a href="#s{k}"><span class="lbl">{k:02d}</span><span>{e(h[:-1])}</span></a></li>' for k, h in enumerate(heads, 1))
    nxt = ARTICLES[(idx + 1) % len(ARTICLES)]
    authors = []
    for name, img, bio in [('Philip Jacobson', 'philip', 'Chief Brand Officer at Vimergy. Brand-led growth at Tylko, Autry and Chilly’s; a decade at Nike EMEA; Global Head of Brand Creative at Maserati.'),
                           ('David Anson', 'david', 'Brand Creative Lead at Nike; Head of Business Leadership at BBH Singapore. Led Nike, Samsung, Meta, Netflix and HSBC.')]:
        if name in a['by']:
            authors.append(f'<li class="art-author"><img src="/assets/img/{img}.webp" alt="" width="96" height="96" loading="lazy" decoding="async"><span><span class="lbl lbl--m lbl--red">Senior partner</span><span class="art-an">{name}</span><span class="art-ab">{e(bio)}</span></span></li>')
    main = f'''<main id="main" class="art" data-page="articles">
  <header class="s art-cover ink">
    <div class="wrap">
      <p class="art-crumbs"><a class="lbl" href="/articles">← All articles</a><span class="kdot" aria-hidden="true"></span><span class="lbl lbl--m lbl--red-d">Article No. {a['n']} · {e(a['topic'])}</span></p>
      <h1 class="h1 art-h">{title_html(a)}</h1>
      <p class="art-dek">{e(a['sub'])}</p>
      <div class="art-meta"><p class="lbl"><span data-notr>{e(a['by'])}</span> · <time datetime="{a['date']}">{e(a['dlabel'])}</time> · {a['mins']} min read · {e(a['topic'])}</p><button class="art-share" type="button" data-share>Share <span aria-hidden="true">→</span></button></div>
    </div>
  </header>
  <div class="s art-body">
    <div class="wrap art-grid">
      <nav class="art-toc" aria-label="In this article">
        <p class="lbl">In this article</p>
        <ol role="list">{toc}</ol>
        <div class="art-prog" aria-hidden="true"><span></span></div>
      </nav>
      <article class="art-col">
        {chr(10).join('        ' + b for b in blocks).strip()}
      </article>
    </div>
  </div>
  <section class="s art-close ink" aria-label="In short">
    <div class="wrap">
      <p class="lbl">In short</p>
      <p class="h2 art-close-h">Lorem ipsum. Dolor sit amet. <em>Consectetur adipiscing</em><span class="tdot">.</span></p>
    </div>
  </section>
  <section class="s art-by" aria-label="Written by">
    <div class="wrap">
      <p class="lbl">Written by</p>
      <ul class="art-authors" role="list">{''.join(authors)}</ul>
      <div class="art-next">
        <p class="art-share-row"><span>Share the article</span><button class="lbl linkbtn" type="button" data-share>Copy link</button><a class="lbl" href="https://www.linkedin.com/sharing/share-offsite/?url=https%3A%2F%2Fhoppartners.pl%2Farticles%2F{a['slug']}" rel="noopener" target="_blank">LinkedIn</a><a class="lbl" href="mailto:?subject={html.escape(a['title'])}&amp;body=https%3A%2F%2Fhoppartners.pl%2Farticles%2F{a['slug']}">Email</a></p>
        <a class="art-nextlink" href="/articles/{nxt['slug']}"><span class="lbl">Next · Article No. {nxt['n']}</span><span class="art-nt">{title_html(nxt)} <span aria-hidden="true">→</span></span></a>
      </div>
    </div>
  </section>
</main>'''
    open(os.path.join(PUB, 'articles', a['slug'] + '.html'), 'w', encoding='utf8').write(page(a['title'][:-1] + ' · House of Poland · HOP.', a['ex'], main))
print('hub + %d articles written' % len(ARTICLES))
