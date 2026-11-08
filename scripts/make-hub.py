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
  dict(slug='consectetur-adipiscing-elit', n='02', topic='Strategy', title='Consectetur adipiscing elit, sed do eiusmod.', it='eiusmod', sub='Ut enim ad minim veniam, quis nostrud exercitation',
       ex='Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo.', date='2026-10-28', dlabel='28 October 2026', mins=4, by='David Anson', seed=2),
  dict(slug='duis-aute-irure', n='03', topic='Culture', title='Duis aute irure.', it='irure', sub='Excepteur sint occaecat cupidatat non proident',
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
            <span class="acard-img acard-img--{a['n']}" aria-hidden="true"><picture><source type="image/avif" srcset="/assets/img/r/intro-krakow-800.avif 800w, /assets/img/r/intro-krakow-1200.avif 1200w" sizes="(min-width: 1024px) 34vw, 100vw"><source type="image/webp" srcset="/assets/img/r/intro-krakow-800.webp 800w, /assets/img/r/intro-krakow-1200.webp 1200w" sizes="(min-width: 1024px) 34vw, 100vw"><img class="acard-pic" src="/assets/img/r/intro-krakow-800.jpg" srcset="/assets/img/r/intro-krakow-800.jpg 800w, /assets/img/r/intro-krakow-1200.jpg 1200w" sizes="(min-width: 1024px) 34vw, 100vw" alt="" width="800" height="413" loading="lazy" decoding="async"></picture></span>
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
      <h1 class="h2 ahub-h" id="ahub-h" data-rise><span class="rl-w"><span class="rl">House of <em>Poland</em><span class="tdot">.</span></span></span></h1>
      <p class="ahub-lead">HOP is also the House of Poland: our research and publishing arm, and home of the HOP Index Report.</p>
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
      <p class="art-crumbs"><a class="lbl" href="/articles">← All articles</a></p>
      <h1 class="h1 art-h">{title_html(a)}</h1>
      <p class="art-dek">{e(a['sub'])}</p>
      <div class="art-meta"><p class="lbl"><span data-notr>{e(a['by'])}</span> · <time datetime="{a['date']}">{e(a['dlabel'])}</time> · {a['mins']} min read · {e(a['topic'])}</p><button class="art-share" type="button" data-share>Share <span aria-hidden="true">→</span></button></div>
    </div>
  </header>
  <div class="s art-body">
    <div class="wrap art-hero-w"><figure class="art-hero"><picture><source type="image/avif" srcset="/assets/img/r/intro-krakow-800.avif 800w, /assets/img/r/intro-krakow-1200.avif 1200w, /assets/img/r/intro-krakow-1600.avif 1600w" sizes="(min-width: 1440px) 1200px, calc(100vw - 48px)"><source type="image/webp" srcset="/assets/img/r/intro-krakow-800.webp 800w, /assets/img/r/intro-krakow-1200.webp 1200w, /assets/img/r/intro-krakow-1600.webp 1600w" sizes="(min-width: 1440px) 1200px, calc(100vw - 48px)"><img src="/assets/img/r/intro-krakow-1200.jpg" srcset="/assets/img/r/intro-krakow-800.jpg 800w, /assets/img/r/intro-krakow-1200.jpg 1200w, /assets/img/r/intro-krakow-1600.jpg 1600w" sizes="(min-width: 1440px) 1200px, calc(100vw - 48px)" alt="Kraków from the air: the Old Town and Wawel Castle by the Vistula" width="1600" height="827" decoding="async" fetchpriority="high"></picture></figure></div>
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
        <a class="art-nextlink" href="/articles/{nxt['slug']}"><span class="lbl">Next article</span><span class="art-nt">{title_html(nxt)} <span aria-hidden="true">→</span></span></a>
      </div>
    </div>
  </section>
</main>'''
    open(os.path.join(PUB, 'articles', a['slug'] + '.html'), 'w', encoding='utf8').write(page(a['title'][:-1] + ' · House of Poland · HOP.', a['ex'], main))
print('hub + %d articles written' % len(ARTICLES))

# ---------- the letter (Say Hop.) on the same article template ----------
import json, subprocess
_js = "const vm=require('vm'),fs=require('fs');const sb={window:{}};vm.runInNewContext(fs.readFileSync(process.argv[1],'utf8'),sb);process.stdout.write(JSON.stringify(sb.window.HOP_ARTICLES.find(x=>x.slug==='say-hop')))"
L = json.loads(subprocess.check_output(['node', '-e', _js, os.path.join(PUB, 'assets', 'articles.js')]).decode('utf8'))
def nt(b): return ' data-notr' if b.get('notr') else ''
blocks, heads, closer = [], [], None
for b in L['body']:
    if 'lede' in b: blocks.append(f'<p class="art-lede"{nt(b)}>{e(b["lede"])}</p>')
    elif 'p' in b: blocks.append(f'<p{nt(b)}>{e(b["p"])}</p>')
    elif 'h' in b:
        heads.append(b['h']); k = len(heads)
        blocks.append(f'<h2 class="art-sub" id="s{k}"><span class="lbl lbl--m lbl--red">{k:02d}</span><span{nt(b)}>{tdot(b["h"])}</span></h2>')
    elif 'pull' in b: blocks.append(f'<blockquote class="art-pull"><p{nt(b)}>{tdot(b["pull"])}</p></blockquote>')
    elif 'ol' in b:
        items = ''.join(f'<li><span class="lbl lbl--m lbl--red">{j:02d}</span><span><strong>{e(t)}</strong>{e(d or "")}</span></li>' for j, (t, d) in enumerate(b['ol'], 1))
        blocks.append(f'<ol class="art-list" role="list">{items}</ol>')
    elif 'strong' in b: blocks.append(f'<p class="art-strong"{nt(b)}>{tdot(b["strong"])}</p>')
    elif 'closer' in b: closer = b['closer']
words = len(' '.join(json.dumps(b, ensure_ascii=False) for b in L['body']).split())
mins = max(1, round(words / 230))
toc = ''.join(f'<li><a href="#s{k}"><span class="lbl">{k:02d}</span><span>{e(h[:-1] if h.endswith(".") else h)}</span></a></li>' for k, h in enumerate(heads, 1))
def close_html(c):
    parts = [x.strip() for x in c.split('.') if x.strip()]
    if len(parts) < 2: return tdot(c)
    return e('. '.join(parts[:-1]) + '. ') + '<em>' + e(parts[-1]) + '</em><span class="tdot">.</span>'
nxt = ARTICLES[0]
auth = []
for name, img, bio in [('Philip Jacobson', 'philip', 'Chief Brand Officer at Vimergy. Brand-led growth at Tylko, Autry and Chilly’s; a decade at Nike EMEA; Global Head of Brand Creative at Maserati.'),
                       ('David Anson', 'david', 'Brand Creative Lead at Nike; Head of Business Leadership at BBH Singapore. Led Nike, Samsung, Meta, Netflix and HSBC.')]:
    auth.append(f'<li class="art-author"><img src="/assets/img/{img}.webp" alt="" width="96" height="96" loading="lazy" decoding="async"><span><span class="lbl lbl--m lbl--red">Senior partner</span><span class="art-an">{name}</span><span class="art-ab">{e(bio)}</span></span></li>')
topics = ' · '.join(L['topics'])
from datetime import date as _d
dl = _d.fromisoformat(L['date']).strftime('%-d %B %Y')
main = f'''<main id="main" class="art" data-page="articles">
  <header class="s art-cover ink">
    <div class="wrap">
      <p class="art-crumbs"><a class="lbl" href="/articles">← All articles</a></p>
      <h1 class="h1 art-h">Say <em>Hop</em><span class="tdot">.</span></h1>
      <p class="art-dek">{e(L['subtitle'])}</p>
      <div class="art-meta"><p class="lbl"><span data-notr>{e(L['authors'])}</span> · <time datetime="{L['date']}">{e(dl)}</time> · {mins} min read · {e(topics)}</p><button class="art-share" type="button" data-share>Share <span aria-hidden="true">→</span></button></div>
    </div>
  </header>
  <div class="s art-body">
    <div class="wrap art-hero-w"><figure class="art-hero"><picture><source type="image/avif" srcset="/assets/img/r/intro-krakow-800.avif 800w, /assets/img/r/intro-krakow-1200.avif 1200w, /assets/img/r/intro-krakow-1600.avif 1600w" sizes="(min-width: 1440px) 1200px, calc(100vw - 48px)"><source type="image/webp" srcset="/assets/img/r/intro-krakow-800.webp 800w, /assets/img/r/intro-krakow-1200.webp 1200w, /assets/img/r/intro-krakow-1600.webp 1600w" sizes="(min-width: 1440px) 1200px, calc(100vw - 48px)"><img src="/assets/img/r/intro-krakow-1200.jpg" srcset="/assets/img/r/intro-krakow-800.jpg 800w, /assets/img/r/intro-krakow-1200.jpg 1200w, /assets/img/r/intro-krakow-1600.jpg 1600w" sizes="(min-width: 1440px) 1200px, calc(100vw - 48px)" alt="Kraków from the air: the Old Town and Wawel Castle by the Vistula" width="1600" height="827" decoding="async" fetchpriority="high"></picture></figure></div>
    <div class="wrap art-grid">
      <nav class="art-toc" aria-label="In this letter">
        <p class="lbl">In this letter</p>
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
      <p class="h2 art-close-h">{close_html(closer) if closer else ''}</p>
    </div>
  </section>
  <section class="s art-by" aria-label="Written by">
    <div class="wrap">
      <p class="lbl">Written by</p>
      <ul class="art-authors" role="list">{''.join(auth)}</ul>
      <div class="art-next">
        <p class="art-share-row"><span>Share the letter</span><button class="lbl linkbtn" type="button" data-share>Copy link</button><a class="lbl" href="https://www.linkedin.com/sharing/share-offsite/?url=https%3A%2F%2Fhoppartners.pl%2Farticles%2Fsay-hop" rel="noopener" target="_blank">LinkedIn</a><a class="lbl" href="mailto:?subject=Say%20Hop.&amp;body=https%3A%2F%2Fhoppartners.pl%2Farticles%2Fsay-hop">Email</a></p>
        <a class="art-nextlink" href="/articles/{nxt['slug']}"><span class="lbl">Next article</span><span class="art-nt">{title_html(nxt)} <span aria-hidden="true">→</span></span></a>
      </div>
    </div>
  </section>
</main>'''
open(os.path.join(PUB, 'articles', 'say-hop.html'), 'w', encoding='utf8').write(page('Say Hop. · House of Poland · HOP.', L['summary'], main))
print('letter written: /articles/say-hop (%d sections, %d min read)' % (len(heads), mins))


# ---------- privacy + 404 on the same shell (nav, menu, footer) as every other page ----------
def plain(title, desc, main, robots):
    return page(title, desc, main, robots=robots).replace('<script src="/assets/v2-article.js"></script>\n', '')
privacy_main = '''<main id="main" class="art legal" data-page="privacy">
  <header class="s art-cover ink">
    <div class="wrap">
      <p class="art-crumbs"><span class="lbl lbl--m lbl--red-d">Privacy</span></p>
      <h1 class="h1 art-h">Privacy notice<span class="tdot">.</span></h1>
      <p class="art-dek">How HOP collects and uses personal data on this website, under the GDPR (RODO) and Polish law. Last updated 8 November 2026.</p>
    </div>
  </header>
  <div class="s art-body">
    <div class="wrap">
      <article class="art-col legal-col">
        <h2 class="art-sub" id="controller"><span>1. Who is responsible for your data</span></h2>
        <p>The controller of your personal data is <strong>[Company legal name]</strong>, with its registered office at <strong>[registered address]</strong>, entered in the register under <strong>[KRS / NIP number]</strong> (“HOP”, “we”). For anything about your data, write to <a class="ulink" href="mailto:philip@hoppartners.com" data-notr>philip@hoppartners.com</a> or <a class="ulink" href="mailto:david@hoppartners.com" data-notr>david@hoppartners.com</a>. We have not appointed a Data Protection Officer, as the law does not require one for our activities.</p>
        <h2 class="art-sub" id="law"><span>2. Legal framework</span></h2>
        <p>We process personal data in line with Regulation (EU) 2016/679 of the European Parliament and of the Council of 27 April 2016 (General Data Protection Regulation, “GDPR”, in Polish “RODO”), the Polish Act of 10 May 2018 on the protection of personal data, and, for information stored in your browser, the Polish Electronic Communications Law of 12 July 2024 (Prawo komunikacji elektronicznej).</p>
        <h2 class="art-sub" id="what"><span>3. What data we process, why, and on what legal basis</span></h2>
        <ul>
          <li><strong>Contact form and emails.</strong> Your name, email address, and optionally your company, phone number and anything you write in your message. We use them to reply to you and to discuss a possible collaboration. Legal basis: steps taken at your request before entering into a contract (Art. 6(1)(b) GDPR) and our legitimate interest in answering enquiries (Art. 6(1)(f) GDPR).</li>
          <li><strong>Technical data.</strong> When you visit the site, our hosting provider automatically processes your IP address, browser type, date and time of the request and the page requested. We need this to deliver the site and keep it secure. Legal basis: our legitimate interest in running a secure website (Art. 6(1)(f) GDPR).</li>
          <li><strong>Claims.</strong> Where necessary, we may keep correspondence to establish, exercise or defend legal claims. Legal basis: our legitimate interest (Art. 6(1)(f) GDPR).</li>
        </ul>
        <p>Providing your data is voluntary. Without the fields marked as required in the contact form, we cannot reply to your message.</p>
        <h2 class="art-sub" id="recipients"><span>4. Who receives your data</span></h2>
        <p>We do not sell your data or share it for marketing. We use service providers who process data on our behalf and under our instructions, on the basis of data processing agreements (Art. 28 GDPR):</p>
        <ul>
          <li><strong>Vercel Inc.</strong> (USA): website hosting and technical logs.</li>
          <li><strong>Resend</strong> (Plus Five Five, Inc., USA): delivering contact form messages to our inboxes.</li>
        </ul>
        <p>We may also disclose data where the law requires it, for example to courts or public authorities.</p>
        <h2 class="art-sub" id="transfers"><span>5. Transfers outside the European Economic Area</span></h2>
        <p>Because these providers are based in the United States, your data may be transferred outside the EEA. Such transfers rely on the EU–U.S. Data Privacy Framework where the provider is certified, or on the European Commission’s Standard Contractual Clauses (Art. 46(2)(c) GDPR). You can ask us for a copy of the safeguards used.</p>
        <h2 class="art-sub" id="retention"><span>6. How long we keep your data</span></h2>
        <ul>
          <li>Enquiries and correspondence: for as long as needed to handle your enquiry, and then for up to 3 years after our last contact, or longer only where needed for a contract or a legal claim.</li>
          <li>Technical logs: for the short period set by our hosting provider, needed for security and troubleshooting.</li>
          <li>Information stored in your browser: for the periods shown in the table below.</li>
        </ul>
        <h2 class="art-sub" id="rights"><span>7. Your rights</span></h2>
        <p>Under the GDPR you have the right to:</p>
        <ul>
          <li>access your data and receive a copy (Art. 15);</li>
          <li>have inaccurate data corrected (Art. 16);</li>
          <li>have your data erased (Art. 17);</li>
          <li>restrict processing (Art. 18);</li>
          <li>data portability, where processing is based on a contract or consent (Art. 20);</li>
          <li>object to processing based on our legitimate interest (Art. 21);</li>
          <li>withdraw your consent at any time, where processing is based on consent, without affecting what was done before.</li>
        </ul>
        <p>To use these rights, write to one of the addresses in section 1. You also have the right to lodge a complaint with the supervisory authority: the President of the Personal Data Protection Office (Prezes Urzędu Ochrony Danych Osobowych), ul. Stawki 2, 00-193 Warszawa, <a class="ulink" href="https://uodo.gov.pl" rel="noopener">uodo.gov.pl</a>.</p>
        <h2 class="art-sub" id="automated"><span>8. Automated decisions and profiling</span></h2>
        <p>We do not make decisions based solely on automated processing, and we do not profile visitors.</p>
        <h2 class="art-sub" id="cookies"><span>9. Cookies and browser storage</span></h2>
        <p>This site sets no advertising or tracking cookies and uses no analytics. Fonts are served from this site, so no visitor data is sent to third parties when a page loads. We store a few small items in your browser (local and session storage). Items strictly necessary for the site to work do not require consent (Art. 399 of the Electronic Communications Law); the optional item is stored only if you allow it. You can change your choice at any time with <button class="linkbtn ulink" type="button" data-consent="settings">Cookie settings</button>, also in the footer, or by clearing your browser storage.</p>
        <div class="table-wrap">
          <table class="store-table">
            <thead><tr><th scope="col">Name</th><th scope="col">Category</th><th scope="col">Purpose</th><th scope="col">Kept</th></tr></thead>
            <tbody>
              <tr><td data-notr><code>hop-consent</code></td><td>Necessary</td><td>Remembers your cookie choice</td><td>12 months</td></tr>
              <tr><td data-notr><code>hop-lang</code></td><td>Necessary</td><td>Remembers the language you picked</td><td>Until you clear it</td></tr>
              <tr><td data-notr><code>hop-intro</code></td><td>Necessary</td><td>Plays the opening animation only once per visit</td><td>Until you close the tab</td></tr>
              <tr><td data-notr><code>hop-contact-draft</code></td><td>Preferences</td><td>Keeps an unsent contact form</td><td>Until sent or cleared</td></tr>
            </tbody>
          </table>
        </div>
        <h2 class="art-sub" id="changes"><span>10. Changes to this notice</span></h2>
        <p>We may update this notice when our services or the law change. The date of the latest version is shown at the top of this page.</p>
      </article>
    </div>
  </div>
</main>'''
open(os.path.join(PUB, 'privacy.html'), 'w', encoding='utf8').write(plain('Privacy notice · HOP.', 'How HOP collects and uses personal data, under the GDPR (RODO) and Polish law.', privacy_main, robots=False))
nf_main = '''<main id="main" class="art legal" data-page="404">
  <header class="s art-cover ink nf">
    <div class="wrap">
      <p class="art-crumbs"><span class="lbl lbl--m lbl--red-d">404</span></p>
      <h1 class="h1 art-h">This page didn’t make the leap<span class="tdot">.</span></h1>
      <p class="art-dek">The link may be old, or the address mistyped.</p>
      <p class="nf-act"><a class="btn btn--l" href="/"><span class="btn-t"><span class="btn-r">Back to the home page</span></span><svg class="btn-i" aria-hidden="true" focusable="false"><use href="#i-arrow-r"/></svg></a></p>
    </div>
  </header>
</main>'''
open(os.path.join(PUB, '404.html'), 'w', encoding='utf8').write(plain('Page not found · HOP.', 'This page didn’t make the leap.', nf_main, robots=True))
print('privacy + 404 written on the site shell')
