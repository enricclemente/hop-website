/* HOP. site behaviour: language switch, the field of holes and the opener,
   the letter expander, and House of Poland rendering. No dependencies. */
(function () {
  "use strict";

  var doc = document.documentElement;
  doc.classList.add("js");
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function store(key, value) {
    try {
      if (value === undefined) return window.localStorage.getItem(key);
      window.localStorage.setItem(key, value);
    } catch (e) { return null; }
  }

  /* ------------------------------------------------------------------
     Language
     English is written in the HTML. Polish is placeholder text for now,
     generated with the same number of words so layouts can be tested.
     When the real Polish copy arrives, put it in PL_COPY keyed by the
     English text (or switch to /pl/ pages from the CMS) and it is used
     instead of the placeholder.
     ------------------------------------------------------------------ */

  var PL_COPY = {
    /* "English text": "Polski tekst" */
  };

  var LOREM = ("lorem ipsum dolor sit amet źródło łąka zażółć gęślą jaźń consectetur adipiscing " +
    "świat elit sed miód tempor ręka labore dolore magna wąż aliqua enim minim pióro veniam " +
    "nostrud ćma laboris nisi aliquip źdźbło commodo duis aute irure mężny reprehenderit " +
    "voluptate velit esse cillum dolore fugiat nulla pariatur excepteur sint occaecat " +
    "cupidatat proident sunt culpa officia deserunt mollit anim laborum słowo pewność").split(" ");

  function hash(str) {
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }

  function pseudoPolish(text) {
    var trimmed = text.trim();
    if (!trimmed) return text;
    if (PL_COPY[trimmed]) return text.replace(trimmed, PL_COPY[trimmed]);
    var seed = hash(trimmed);
    var i = 0;
    return text.replace(/[A-Za-zÀ-ž’'\-]+/g, function (word) {
      if (word.length < 2 && !/[A-Za-z]/.test(word)) return word;
      var w = LOREM[(seed + i * 7919) % LOREM.length];
      i++;
      if (word === word.toUpperCase() && word.length > 1) return w.toUpperCase();
      if (word[0] === word[0].toUpperCase() && word[0] !== word[0].toLowerCase()) return w[0].toUpperCase() + w.slice(1);
      return w;
    });
  }

  var originals = new WeakMap();
  var SKIP = "script, style, noscript, [data-notr], time, .lang, .wordmark";

  function translateTree(root, lang) {
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: function (node) {
        if (!node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        var p = node.parentElement;
        if (!p || p.closest(SKIP)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    var nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(function (node) {
      if (!originals.has(node)) originals.set(node, node.nodeValue);
      var en = originals.get(node);
      node.nodeValue = lang === "pl" ? pseudoPolish(en) : en;
    });
    root.querySelectorAll("[data-label-en]").forEach(function (el) {
      el.setAttribute("aria-label", lang === "pl" ? pseudoPolish(el.dataset.labelEn) : el.dataset.labelEn);
    });
  }

  function formatDates(root, lang) {
    root.querySelectorAll("time[datetime]").forEach(function (t) {
      var d = new Date(t.getAttribute("datetime") + "T12:00:00");
      if (isNaN(d)) return;
      try {
        t.textContent = d.toLocaleDateString(lang === "pl" ? "pl-PL" : "en-GB", { day: "numeric", month: "long", year: "numeric" });
      } catch (e) { t.textContent = t.getAttribute("datetime"); }
    });
  }

  var currentLang = store("hop-lang") === "pl" ? "pl" : "en";

  function placeLangDot(animate) {
    document.querySelectorAll(".lang").forEach(function (sw) {
      var dot = sw.querySelector(".lang-dot");
      var active = sw.querySelector('button[data-lang="' + currentLang + '"]');
      if (!dot || !active) return;
      var x = active.offsetLeft + active.offsetWidth + 3;
      var from = parseFloat(dot.dataset.x || x);
      dot.dataset.x = x;
      dot.style.transform = "translateX(" + x + "px)";
      if (animate && !reduceMotion && dot.animate && from !== x) {
        var mid = (from + x) / 2;
        dot.animate([
          { transform: "translateX(" + from + "px) scale(1, 1)" },
          { transform: "translateX(" + from + "px) scale(1.25, 0.75)", offset: 0.12 },
          { transform: "translate(" + mid + "px, -14px) scale(0.9, 1.1)", offset: 0.5 },
          { transform: "translateX(" + x + "px) scale(1.25, 0.75)", offset: 0.86 },
          { transform: "translateX(" + x + "px) scale(1, 1)" }
        ], { duration: 520, easing: "cubic-bezier(.3, .6, .4, 1)" });
      }
    });
  }

  function applyLang(lang, animate) {
    currentLang = lang;
    doc.setAttribute("lang", lang);
    store("hop-lang", lang);
    document.querySelectorAll(".lang button").forEach(function (b) {
      b.setAttribute("aria-pressed", String(b.dataset.lang === lang));
    });
    if (typeof renderContent === "function") renderContent();
    translateTree(document.body, lang);
    formatDates(document.body, lang);
    placeLangDot(animate);
  }

  document.addEventListener("click", function (e) {
    var b = e.target.closest(".lang button");
    if (!b || b.dataset.lang === currentLang) return;
    applyLang(b.dataset.lang, true);
  });

  /* ------------------------------------------------------------------
     House of Poland
     Articles come from window.HOP_ARTICLES, which the build writes from
     Sanity (see scripts/build.mjs). Text fields are either a string
     (English only) or { en, pl }. Where Polish is missing, the English
     is shown with placeholder Polish in PL mode.
     ------------------------------------------------------------------ */

  var ARTICLES = (window.HOP_ARTICLES || []).slice().sort(function (a, b) {
    return a.date < b.date ? 1 : -1;
  });

  function hasPl(v) { return v && typeof v === "object" && !Array.isArray(v) && v.pl && (typeof v.pl !== "object" || v.pl.length); }
  function tx(v) {
    if (v == null) return "";
    if (typeof v === "object" && !Array.isArray(v)) return (currentLang === "pl" && hasPl(v)) ? v.pl : (v.en || "");
    return v;
  }
  /* true when the value has real Polish and we're showing it */
  function realPl(v) { return currentLang === "pl" && hasPl(v); }
  function mark(node, v) { if (realPl(v)) node.setAttribute("data-notr", ""); return node; }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  /* Ends a line with the red dot in place of its full stop */
  function withStop(node, text) {
    node.appendChild(document.createTextNode(String(text).replace(/\.\s*$/, "")));
    node.appendChild(el("span", "stop", "."));
    return node;
  }
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function isLetter(a) { return a.featured || a.slug === "say-hop"; }

  function renderBody(article, container) {
    container.textContent = "";
    var src = article.body;
    var blocks = Array.isArray(src) ? src : tx(src);
    var keep = !Array.isArray(src) && realPl(src);
    if (keep) container.setAttribute("data-notr", ""); else container.removeAttribute("data-notr");
    (blocks || []).forEach(function (b) {
      var n;
      if (b.lede) n = el("p", "lede", b.lede);
      else if (b.p) n = el("p", null, b.p);
      else if (b.h) n = el("h2", null, b.h);
      else if (b.pull) n = withStop(el("blockquote", "pull"), b.pull);
      else if (b.strong) n = el("p", "strong-line", b.strong);
      else if (b.closer) n = el("p", "closer", b.closer);
      else if (b.ol) {
        n = el("ol");
        b.ol.forEach(function (item) {
          var li = el("li");
          var wrap = el("div");
          wrap.appendChild(el("strong", null, item[0]));
          if (item[1]) wrap.appendChild(el("span", null, item[1]));
          li.appendChild(wrap);
          n.appendChild(li);
        });
      }
      if (!n) return;
      if (b.notr) n.setAttribute("data-notr", "");
      container.appendChild(n);
    });
    /* Every article closes with the signature */
    var sign = el("div", "sign");
    sign.innerHTML = '<span class="wordmark" aria-label="Hop."><span aria-hidden="true">Hop</span><span class="wm-dot" aria-hidden="true"></span></span>';
    var who = el("p", null, article.authors || "");
    who.setAttribute("data-notr", "");
    sign.appendChild(who);
    container.appendChild(sign);
  }

  /* ---------- Topics and authors (for filters and chips) ---------- */
  function topicSlug(tpc) { return String(tpc).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }
  function authorsOf(a) { return String(a.authors || "").split(/\s+and\s+|,\s*|\s*&\s*/).map(function (x) { return x.trim(); }).filter(Boolean); }
  function fold(str) { return String(str || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ł/g, "l"); }

  var ALL_TOPICS = [];
  var ALL_AUTHORS = [];
  ARTICLES.forEach(function (a) {
    (a.topics || []).forEach(function (tpc) { if (ALL_TOPICS.indexOf(tpc) < 0) ALL_TOPICS.push(tpc); });
    authorsOf(a).forEach(function (n) { if (ALL_AUTHORS.indexOf(n) < 0) ALL_AUTHORS.push(n); });
  });
  ALL_TOPICS.sort();

  /* Wraps matches of q in <mark>, for search results */
  function setHighlighted(node, text, q) {
    node.textContent = "";
    if (!q) { node.appendChild(document.createTextNode(text)); return; }
    var hay = fold(text), needle = fold(q), i = 0, j;
    while ((j = hay.indexOf(needle, i)) > -1) {
      if (j > i) node.appendChild(document.createTextNode(text.slice(i, j)));
      node.appendChild(el("mark", null, text.slice(j, j + needle.length)));
      i = j + needle.length;
    }
    if (i < text.length) node.appendChild(document.createTextNode(text.slice(i)));
  }

  /* One article row, shared by every list */
  function articleRow(a, q) {
    var li = el("li", "article-row");
    var link = el("a");
    link.href = "/house-of-poland/" + a.slug;

    var meta = el("div", "meta label");
    meta.setAttribute("data-notr", "");
    meta.appendChild(document.createTextNode("No. " + pad(a.number) + " · "));
    var tm = el("time");
    tm.setAttribute("datetime", a.date);
    meta.appendChild(tm);

    var h = mark(el("h2"), a.title);
    var ht = el("span");
    setHighlighted(ht, tx(a.title), q);
    h.appendChild(ht);
    if (a.sample) h.appendChild(el("span", "tag-sample", "SAMPLE"));

    var sum = mark(el("p", "summary"), a.summary);
    setHighlighted(sum, tx(a.summary), q);

    var foot = el("div", "row-foot");
    if (a.topics && a.topics.length) {
      var tags = el("span", "row-topics");
      a.topics.forEach(function (tpc) { tags.appendChild(el("span", "chip chip--static", tpc)); });
      foot.appendChild(tags);
    }
    foot.appendChild(el("span", "row-by label", authorsOf(a).map(function (n) { return n.split(" ")[0]; }).join(" & ")));
    foot.lastChild.setAttribute("data-notr", "");

    link.appendChild(meta);
    link.appendChild(h);
    var right = el("div", "row-right");
    right.appendChild(sum);
    right.appendChild(foot);
    link.appendChild(right);
    var go = el("span", "go", "→");
    go.setAttribute("aria-hidden", "true");
    link.appendChild(go);
    li.appendChild(link);
    return li;
  }

  function renderList(list, items, q) {
    list.textContent = "";
    (items || ARTICLES).forEach(function (a) { list.appendChild(articleRow(a, q)); });
    if (!(items || ARTICLES).length) list.appendChild(el("li", "article-row empty-row", "No articles yet."));
  }

  /* ---------- House of Poland landing: latest article, recent ones, link to all ---------- */
  function renderLanding() {
    var feat = document.getElementById("hop-featured");
    if (!feat) return;
    var a = ARTICLES[0];
    feat.textContent = "";
    if (!a) return;
    var link = el("a", "feature");
    link.href = "/house-of-poland/" + a.slug;
    var left = el("div", "feature-text");
    var meta = el("p", "label");
    meta.setAttribute("data-notr", "");
    meta.appendChild(document.createTextNode("No. " + pad(a.number) + " · "));
    var tm = el("time"); tm.setAttribute("datetime", a.date); meta.appendChild(tm);
    var h = mark(el("h3", "feature-title"), a.title);
    withStop(h, tx(a.title));
    left.appendChild(meta);
    left.appendChild(h);
    left.appendChild(mark(el("p", "feature-sub", tx(a.subtitle)), a.subtitle));
    left.appendChild(mark(el("p", "body-copy feature-sum", tx(a.summary)), a.summary));
    var cta = el("span", "btn");
    cta.appendChild(document.createTextNode("Read the article "));
    var ar = el("span", null, "→"); ar.setAttribute("aria-hidden", "true"); cta.appendChild(ar);
    left.appendChild(cta);
    var num = el("div", "feature-num");
    num.setAttribute("aria-hidden", "true");
    num.setAttribute("data-notr", "");
    num.appendChild(el("span", "label", "No."));
    num.appendChild(el("span", "n", pad(a.number)));
    link.appendChild(left);
    link.appendChild(num);
    feat.appendChild(link);

    var recent = document.getElementById("hop-recent");
    if (recent) renderList(recent, ARTICLES.slice(1, 4));
    document.querySelectorAll("[data-article-count]").forEach(function (n) { n.textContent = String(ARTICLES.length); });
  }

  /* ---------- All articles: search, topic, author, sort, month groups ---------- */
  var archive = document.getElementById("archive");
  var A = { q: "", topic: "all", author: "all", sort: "new", limit: 8 };
  var PAGE = 8;
  var archiveReady = false;

  function setupArchive() {
    if (!archive || archiveReady) return;
    archiveReady = true;
    var chips = document.getElementById("topic-chips");
    var mk = function (value, text, count) {
      var b = el("button", "chip");
      b.type = "button";
      b.dataset.topic = value;
      b.appendChild(el("span", null, text));
      if (count != null) { var c = el("span", "chip-n", String(count)); c.setAttribute("data-notr", ""); b.appendChild(c); }
      return b;
    };
    chips.appendChild(mk("all", "All", ARTICLES.length));
    ALL_TOPICS.forEach(function (tpc) {
      chips.appendChild(mk(topicSlug(tpc), tpc, ARTICLES.filter(function (a) { return (a.topics || []).indexOf(tpc) > -1; }).length));
    });
    chips.addEventListener("click", function (e) {
      var b = e.target.closest(".chip");
      if (!b) return;
      A.topic = b.dataset.topic; A.limit = PAGE;
      syncHash();
      renderArchive();
      b.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", inline: "center", block: "nearest" });
    });

    var authorSel = document.getElementById("f-author");
    ALL_AUTHORS.forEach(function (n) { var o = el("option", null, n); o.value = n; o.setAttribute("data-notr", ""); authorSel.appendChild(o); });
    authorSel.addEventListener("change", function () { A.author = authorSel.value; A.limit = PAGE; renderArchive(); });
    var sortSel = document.getElementById("f-sort");
    sortSel.addEventListener("change", function () { A.sort = sortSel.value; renderArchive(); });

    var q = document.getElementById("f-q");
    var qClear = document.getElementById("f-q-clear");
    var qt;
    q.addEventListener("input", function () {
      qClear.hidden = !q.value;
      clearTimeout(qt);
      qt = setTimeout(function () { A.q = q.value.trim(); A.limit = PAGE; renderArchive(); }, 120);
    });
    q.addEventListener("keydown", function (e) { if (e.key === "Escape" && q.value) { e.stopPropagation(); q.value = ""; q.dispatchEvent(new Event("input")); } });
    qClear.addEventListener("click", function () { q.value = ""; q.dispatchEvent(new Event("input")); q.focus(); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "/" && !/input|textarea|select/i.test((document.activeElement || {}).tagName || "")) { e.preventDefault(); q.focus(); }
    });

    document.getElementById("more-btn").addEventListener("click", function () {
      A.limit += PAGE;
      renderArchive();
    });
    archive.addEventListener("click", function (e) {
      if (e.target.closest("[data-reset]")) resetArchive();
    });
    document.querySelectorAll("[data-reset]").forEach(function (b) { b.addEventListener("click", resetArchive); });

    readHash();
    window.addEventListener("hashchange", function () { readHash(); renderArchive(); });
  }
  function resetArchive() {
    A.q = ""; A.topic = "all"; A.author = "all"; A.limit = PAGE;
    var q = document.getElementById("f-q"); q.value = ""; document.getElementById("f-q-clear").hidden = true;
    document.getElementById("f-author").value = "all";
    syncHash();
    renderArchive();
  }
  function readHash() {
    var h = (location.hash || "").replace(/^#/, "");
    var match = ALL_TOPICS.filter(function (tpc) { return topicSlug(tpc) === h; })[0];
    A.topic = match ? h : "all";
  }
  function syncHash() {
    try { history.replaceState(null, "", A.topic === "all" ? location.pathname + location.search : "#" + A.topic); } catch (e) {}
  }

  function monthName(ym) {
    var d = new Date(ym + "-15T12:00:00");
    try { return d.toLocaleDateString(currentLang === "pl" ? "pl-PL" : "en-GB", { month: "long", year: "numeric" }); }
    catch (e) { return ym; }
  }

  function renderArchive() {
    if (!archive) return;
    setupArchive();
    var q = fold(A.q);
    var items = ARTICLES.filter(function (a) {
      if (A.topic !== "all" && !(a.topics || []).some(function (tpc) { return topicSlug(tpc) === A.topic; })) return false;
      if (A.author !== "all" && authorsOf(a).indexOf(A.author) < 0) return false;
      if (!q) return true;
      return fold([tx(a.title), tx(a.subtitle), tx(a.summary), a.authors, (a.topics || []).join(" "), "no " + a.number].join(" ")).indexOf(q) > -1;
    });
    if (A.sort === "old") items = items.slice().reverse();

    document.querySelectorAll("#topic-chips .chip").forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.topic === A.topic)); });
    var filtered = A.q || A.topic !== "all" || A.author !== "all";
    document.querySelectorAll(".f-reset").forEach(function (b) { b.hidden = !filtered; });

    var count = document.getElementById("result-count");
    count.setAttribute("data-notr", "");
    var shown = Math.min(A.limit, items.length);
    var pl = currentLang === "pl";
    count.textContent = filtered
      ? (pl ? items.length + " z " + ARTICLES.length + " artykułów" : items.length + " of " + ARTICLES.length + " articles")
      : (pl ? ARTICLES.length + " artykułów" : ARTICLES.length + (ARTICLES.length === 1 ? " article" : " articles"));

    archive.textContent = "";
    if (!items.length) {
      var empty = el("div", "empty");
      empty.setAttribute("data-notr", "");
      empty.appendChild(el("span", "empty-hole"));
      empty.lastChild.setAttribute("aria-hidden", "true");
      empty.appendChild(el("p", "empty-title", pl ? "Brak wyników." : (A.q ? "Nothing matches “" + A.q + "”." : "Nothing here yet.")));
      empty.appendChild(el("p", "body-copy", pl ? "Spróbuj innego słowa lub tematu." : "Try another word, topic or author."));
      var rb = el("button", "btn btn--ghost", pl ? "Wyczyść filtry" : "Clear filters");
      rb.type = "button"; rb.setAttribute("data-reset", "");
      empty.appendChild(rb);
      archive.appendChild(empty);
    }

    var groups = [], byKey = {};
    items.slice(0, shown).forEach(function (a) {
      var k = a.date.slice(0, 7);
      if (!byKey[k]) { byKey[k] = { key: k, items: [] }; groups.push(byKey[k]); }
      byKey[k].items.push(a);
    });
    groups.forEach(function (g) {
      var sec = el("section", "month");
      var mh = el("h2", "month-h");
      mh.setAttribute("data-notr", "");
      mh.appendChild(el("span", "month-name", monthName(g.key)));
      var total = items.filter(function (a) { return a.date.slice(0, 7) === g.key; }).length;
      mh.appendChild(el("span", "month-n", String(total)));
      var ol = el("ol", "articles");
      g.items.forEach(function (a) { ol.appendChild(articleRow(a, A.q)); });
      sec.appendChild(mh);
      sec.appendChild(ol);
      archive.appendChild(sec);
    });

    var moreWrap = document.getElementById("more-wrap");
    var rest = items.length - shown;
    moreWrap.hidden = rest <= 0;
    document.getElementById("more-n").textContent = String(rest);
    var bar = document.getElementById("more-bar");
    if (bar) bar.style.setProperty("--f", (shown / Math.max(1, items.length)).toFixed(3));
    document.getElementById("more-of").textContent = pl ? shown + " z " + items.length : "Showing " + shown + " of " + items.length;

    translateTree(archive, currentLang);
    formatDates(archive, currentLang);
  }

  function renderArticlePage(root) {
    /* Pre-rendered article pages carry their slug; the old article.html#slug form forwards to them */
    var slug = root.getAttribute("data-slug");
    if (!slug) {
      var h = decodeURIComponent((location.hash || "").replace(/^#/, ""));
      var hit = ARTICLES.filter(function (x) { return x.slug === h; })[0] || ARTICLES[0];
      if (hit) { location.replace("/house-of-poland/" + hit.slug); return; }
    }
    var idx = 0;
    ARTICLES.forEach(function (a, i) { if (a.slug === slug) idx = i; });
    var a = ARTICLES[idx];
    if (!a) return;

    var num = root.querySelector("[data-a=number]");
    num.textContent = "House of Poland · No. " + pad(a.number);
    var title = mark(root.querySelector("[data-a=title]"), a.title);
    title.textContent = "";
    withStop(title, tx(a.title));
    mark(root.querySelector("[data-a=subtitle]"), a.subtitle).textContent = tx(a.subtitle);
    root.querySelector("[data-a=authors]").textContent = a.authors || "";
    root.querySelector("[data-a=date]").setAttribute("datetime", a.date);
    renderBody(a, root.querySelector("[data-a=body]"));
    var tl = root.querySelector("[data-a=topics]");
    if (tl) {
      tl.textContent = "";
      (a.topics || []).forEach(function (tpc) {
        var li = el("li");
        var l = el("a", "chip", tpc);
        l.href = "/articles#" + topicSlug(tpc);
        li.appendChild(l);
        tl.appendChild(li);
      });
      tl.hidden = !(a.topics || []).length;
    }

    var older = ARTICLES[idx + 1], newer = ARTICLES[idx - 1];
    var prev = root.querySelector("[data-a=older]"), next = root.querySelector("[data-a=newer]");
    prev.hidden = !older; next.hidden = !newer;
    if (older) { prev.href = "/house-of-poland/" + older.slug; mark(prev.querySelector(".t"), older.title).textContent = tx(older.title); }
    if (newer) { next.href = "/house-of-poland/" + newer.slug; mark(next.querySelector(".t"), newer.title).textContent = tx(newer.title); }

    document.title = tx(a.title) + ". House of Poland · HOP.";
  }

  var listEl = document.getElementById("article-list");
  var articleEl = document.getElementById("article");

  /* The letter, revealed on the master page */
  var toggle = document.getElementById("letter-toggle");
  var panel = document.getElementById("letter-panel");
  var letter = ARTICLES.filter(isLetter)[0];
  var letterOpen = false;
  function renderLetter() {
    if (!panel || !letter || !letterOpen) return;
    renderBody(letter, panel.querySelector("[data-a=body]"));
    var link = panel.querySelector("[data-a=open]");
    if (link) link.href = "/house-of-poland/" + letter.slug;
  }
  if (toggle && panel) {
    var setOpen = function (open) {
      letterOpen = open;
      if (open) { renderLetter(); translateTree(panel, currentLang); updateReadTimes(); }
      toggle.setAttribute("aria-expanded", String(open));
      panel.classList.toggle("open", open);
      panel.inert = !open;
      if (open) panel.removeAttribute("aria-hidden"); else panel.setAttribute("aria-hidden", "true");
    };
    panel.inert = true;
    toggle.addEventListener("click", function () {
      setOpen(toggle.getAttribute("aria-expanded") !== "true");
    });
    var closeBtn = panel.querySelector("[data-close]");
    if (closeBtn) closeBtn.addEventListener("click", function () {
      setOpen(false);
      toggle.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
      toggle.focus({ preventScroll: true });
    });
    if (location.hash === "#letter") setOpen(true);
  }

  /* Re-render CMS content in the chosen language, before the page-wide pass */
  function renderContent() {
    if (listEl) renderList(listEl);
    renderLanding();
    renderArchive();
    if (articleEl) renderArticlePage(articleEl);
    renderLetter();
    if (typeof updateReadTimes === "function") { updateReadTimes(); }
    document.querySelectorAll(".copy").forEach(function (b) { if (!b.classList.contains("done")) b.textContent = currentLang === "pl" ? "Kopiuj" : "Copy"; });
  }

  /* ------------------------------------------------------------------
     The field of holes (Brand Book p.12: Random by rule)
     1 One size: every hole is one dot, the cap height of the wordmark.
     2 On the grid: centres snap to half a dot, measured from the foot of the H.
     3 Seven to nine, with one or two overlapping pairs offset half a dot diagonally.
     4 Bleed: at least two holes leave the page.
     5 Keep out: no hole within one dot of the word or the red dot.
     6 Cut, never drawn: shading lives in CSS.
     ------------------------------------------------------------------ */

  function buildField(hero, animate) {
    var field = hero.querySelector(".field");
    var mark = hero.querySelector("[data-anchor]") || hero.querySelector(".wordmark");
    var dot = hero.querySelector(".wm-dot");
    var word = mark && mark.querySelector(".wm-word");
    if (!field || !mark || !dot || !word) return;
    field.textContent = "";

    var hb = hero.getBoundingClientRect();
    var W = hb.width, H = hb.height;
    var mb = mark.getBoundingClientRect();
    var db = dot.getBoundingClientRect();
    var wb = word.getBoundingClientRect();
    var D = db.height;
    if (!D || !W) return;
    var g = D / 2;
    var ox = wb.left - hb.left;   /* foot of the H */
    var oy = db.bottom - hb.top;  /* baseline */

    /* Keep-out zones, in hero coordinates, each with its own clearance */
    var zones = [{
      l: Math.min(mb.left, wb.left) - hb.left, t: db.top - hb.top,
      r: db.right - hb.left, b: db.bottom - hb.top, pad: D
    }];
    hero.querySelectorAll("[data-keepout]").forEach(function (n) {
      var r = n.getBoundingClientRect();
      zones.push({ l: r.left - hb.left, t: r.top - hb.top, r: r.right - hb.left, b: r.bottom - hb.top, pad: g });
    });

    function clearOfZones(x, y) {
      for (var i = 0; i < zones.length; i++) {
        var z = zones[i];
        var dx = Math.max(z.l - x, 0, x - z.r);
        var dy = Math.max(z.t - y, 0, y - z.b);
        if (Math.sqrt(dx * dx + dy * dy) < D / 2 + z.pad) return false;
      }
      return true;
    }
    function inBounds(x, y) {
      return x > -D * 0.35 && x < W + D * 0.35 && y > -D * 0.35 && y < H + D * 0.35;
    }
    function bleeds(x, y) {
      return x < D / 2 || x > W - D / 2 || y < D / 2 || y > H - D / 2;
    }

    var seed = Math.floor(Math.random() * 1e9);
    function rand() { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; }
    function snap(v, o) { return o + Math.round((v - o) / g) * g; }

    var holes = [];
    function clearOfHoles(x, y, except) {
      for (var i = 0; i < holes.length; i++) {
        if (holes[i] === except) continue;
        var dx = holes[i].x - x, dy = holes[i].y - y;
        if (Math.sqrt(dx * dx + dy * dy) < D * 1.3) return false;
      }
      return true;
    }
    function tryPlace(wantBleed) {
      for (var k = 0; k < 400; k++) {
        var x = snap(-D * 0.3 + rand() * (W + D * 0.6), ox);
        var y = snap(-D * 0.3 + rand() * (H + D * 0.6), oy);
        if (!inBounds(x, y) || !clearOfZones(x, y) || !clearOfHoles(x, y)) continue;
        if (wantBleed !== bleeds(x, y)) continue;
        var h = { x: x, y: y };
        holes.push(h);
        return h;
      }
      return null;
    }
    function addPartner(h) {
      var dirs = [[1, 1], [-1, 1], [1, -1], [-1, -1]];
      var start = Math.floor(rand() * 4);
      for (var i = 0; i < 4; i++) {
        var d = dirs[(start + i) % 4];
        var x = h.x + d[0] * g, y = h.y + d[1] * g;
        if (!inBounds(x, y) || !clearOfZones(x, y) || !clearOfHoles(x, y, h)) continue;
        var p = { x: x, y: y, partner: true };
        holes.push(p);
        return p;
      }
      return null;
    }

    var narrow = W < 640;
    var target = narrow ? 7 : 7 + Math.floor(rand() * 3);
    var pairs = narrow ? 1 : 1 + Math.floor(rand() * 2);

    tryPlace(true); tryPlace(true);
    var made = 0;
    for (var guard = 0; guard < 40 && made < pairs && holes.length < target - 1; guard++) {
      var base = tryPlace(rand() < 0.4);
      if (!base) continue;
      if (addPartner(base)) made++; else holes.pop();
    }
    for (guard = 0; guard < 60 && holes.length < target; guard++) tryPlace(rand() < 0.3);

    field.style.setProperty("--d", D + "px");
    /* Punch order: shuffled, like a hand working across the board */
    var order = holes.slice().sort(function () { return rand() - 0.5; });
    order.forEach(function (h, i) {
      var n = document.createElement("span");
      n.className = "hole";
      n.style.left = h.x + "px";
      n.style.top = h.y + "px";
      if (animate) n.style.animationDelay = (0.7 + i * 0.23).toFixed(2) + "s";
      field.appendChild(n);
    });

    if (animate) {
      var dropAt = 0.7 + order.length * 0.23 + 0.17;
      hero.style.setProperty("--drop-at", dropAt.toFixed(2) + "s");
      hero.style.setProperty("--drop-from", -(db.bottom - hb.top + D) + "px");
    }
  }

  /* The cover plays the opener on load. The closing (footer) plays it again
     the first time it comes into view, as in a presentation (p.15). */
  var fields = Array.prototype.slice.call(document.querySelectorAll(".hero, .closing")).filter(function (n) { return n.querySelector("[data-anchor]"); });
  function play(root) {
    root.classList.remove("opening");
    void root.offsetWidth;
    buildField(root, !reduceMotion);
    if (!root.querySelector(".field")) {
      /* No field: the dot alone drops onto the baseline */
      var dot = root.querySelector("[data-anchor] .wm-dot");
      if (dot) {
        root.style.setProperty("--drop-at", ".7s");
        root.style.setProperty("--drop-from", -(dot.getBoundingClientRect().bottom - root.getBoundingClientRect().top + dot.offsetHeight) + "px");
      }
    }
    if (!reduceMotion) root.classList.add("opening");
  }
  if (fields.length) {
    var lastW = window.innerWidth;
    var start = function () {
      fields.forEach(function (root) {
        if (root.classList.contains("hero")) play(root);
        else buildField(root, false);
      });
      var closing = document.querySelector(".closing");
      if (closing && closing.querySelector("[data-anchor]") && !reduceMotion && "IntersectionObserver" in window) {
        var once = new IntersectionObserver(function (en) {
          if (en[0].isIntersecting) { once.disconnect(); play(closing); }
        }, { threshold: 0.45 });
        once.observe(closing);
      }
    };
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(start); else window.addEventListener("load", start);

    var rt;
    window.addEventListener("resize", function () {
      clearTimeout(rt);
      rt = setTimeout(function () {
        if (Math.abs(window.innerWidth - lastW) < 40) return; /* ignore mobile toolbar resizes */
        lastW = window.innerWidth;
        fields.forEach(function (root) { root.classList.remove("opening"); buildField(root, false); });
      }, 200);
    });
  }

  /* Header takes the surface beneath it and names the section, like the
     running head in the brand book (p.2). */
  var surfaces = Array.prototype.slice.call(document.querySelectorAll("[data-surface]"));
  var headEl = document.getElementById("site-head");
  var runCur = headEl && headEl.querySelector(".runhead");
  var lastRun = null;
  function setRun(text) {
    if (!runCur || text === lastRun) return;
    lastRun = text;
    var old = runCur.querySelector(".rh-cur");
    var nu = document.createElement("span");
    nu.className = "rh-cur rh-in";
    nu.textContent = text ? (currentLang === "pl" && text !== "HOP." ? pseudoPolish(text) : text) : "";
    if (old) { old.className = "rh-out"; setTimeout(function () { old.remove(); }, 450); }
    runCur.appendChild(nu);
  }
  function syncHead() {
    if (!headEl) return;
    var y = headEl.offsetHeight + 1;
    var cur = null;
    surfaces.forEach(function (sec) { var r = sec.getBoundingClientRect(); if (r.top <= y && r.bottom > y) cur = sec; });
    var dark = cur ? cur.dataset.surface === "carbon" : false;
    headEl.classList.toggle("on-carbon", dark);
    doc.classList.toggle("head-carbon", dark);
    headEl.classList.toggle("at-cover", !!(cur && cur.classList.contains("hero")));
    if (cur) setRun(cur.dataset.run || "");
  }
  if (surfaces.length) {
    syncHead();
    var hTick = false;
    window.addEventListener("scroll", function () { if (!hTick) { hTick = true; requestAnimationFrame(function () { hTick = false; syncHead(); }); } }, { passive: true });
    window.addEventListener("resize", syncHead);
  } else if (headEl) {
    /* Pages without marked sections: header stays on paper */
    headEl.classList.remove("on-carbon");
  }

  /* ==================================================================
     Components
     ================================================================== */

  var head = document.getElementById("site-head");
  var mqPhone = window.matchMedia("(max-width: 620px)");
  var mqDesktop = window.matchMedia("(min-width: 1100px)");
  var T = {
    copied: { en: "Copied", pl: "Skopiowano" },
    link: { en: "Link copied", pl: "Link skopiowany" },
    read: { en: " min read", pl: " min czytania" }
  };
  function tr(key) { return T[key][currentLang] || T[key].en; }

  /* On the master page, section links scroll in place instead of reloading */
  document.querySelectorAll('a[href^="/#"]').forEach(function (a) {
    var id = a.getAttribute("href").split("#")[1];
    if (document.getElementById(id)) a.setAttribute("href", "#" + id);
  });

  /* --- Toast --- */
  var toastEl = document.querySelector(".toast");
  if (!toastEl) { toastEl = el("div", "toast"); toastEl.setAttribute("role", "status"); document.body.appendChild(toastEl); }
  toastEl.setAttribute("data-notr", "");
  var toastTimer;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove("show"); }, 2000);
  }

  /* --- Copy to clipboard, with a fallback for older browsers --- */
  function copyText(text) {
    function fallback() {
      var ta = document.createElement("textarea");
      ta.value = text; ta.setAttribute("readonly", ""); ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select();
      var ok = false;
      try { ok = document.execCommand("copy"); } catch (e) {}
      ta.remove();
      return ok ? Promise.resolve() : Promise.reject();
    }
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text).catch(fallback);
    return fallback();
  }
  document.addEventListener("click", function (e) {
    var b = e.target.closest(".copy");
    if (!b) return;
    copyText(b.dataset.copy).then(function () {
      b.classList.add("done");
      b.textContent = tr("copied");
      toast(tr("copied") + ": " + b.dataset.copy);
      setTimeout(function () { b.classList.remove("done"); b.textContent = currentLang === "pl" ? "Kopiuj" : "Copy"; }, 1800);
    }, function () { toast(b.dataset.copy); });
  });

  /* --- Mobile menu --- */
  var menu = document.getElementById("menu");
  var menuBtn = document.querySelector(".menu-btn");
  var menuTimer;
  function setMenu(open, opts) {
    if (!menu || !menuBtn) return;
    clearTimeout(menuTimer);
    menuBtn.setAttribute("aria-expanded", String(open));
    doc.classList.toggle("menu-open", open);
    ["main", ".site-foot", ".cta-float"].forEach(function (s) { var n = document.querySelector(s); if (n) n.inert = open; });
    if (open) {
      menu.hidden = false;
      head && head.classList.remove("is-hidden");
      requestAnimationFrame(function () { requestAnimationFrame(function () { menu.classList.add("open"); }); });
      var first = menu.querySelector("a");
      if (first) setTimeout(function () { first.focus({ preventScroll: true }); }, 50);
    } else {
      menu.classList.remove("open");
      menuTimer = setTimeout(function () { menu.hidden = true; }, reduceMotion ? 0 : 350);
      if (!opts || !opts.silent) menuBtn.focus({ preventScroll: true });
    }
  }
  if (menu && menuBtn) {
    menuBtn.addEventListener("click", function () { setMenu(menuBtn.getAttribute("aria-expanded") !== "true"); });
    menu.addEventListener("click", function (e) { if (e.target.closest("a")) setMenu(false, { silent: true }); });
    document.addEventListener("keydown", function (e) {
      if (menuBtn.getAttribute("aria-expanded") !== "true") return;
      if (e.key === "Escape") { setMenu(false); return; }
      if (e.key !== "Tab") return;
      /* Keep focus inside the menu and its header while it's open */
      var items = Array.prototype.slice.call(head.querySelectorAll("a, button")).concat(Array.prototype.slice.call(menu.querySelectorAll("a")))
        .filter(function (n) { return n.offsetParent !== null; });
      var i = items.indexOf(document.activeElement);
      if (e.shiftKey && i <= 0) { e.preventDefault(); items[items.length - 1].focus(); }
      else if (!e.shiftKey && i === items.length - 1) { e.preventDefault(); items[0].focus(); }
    });
  }

  /* --- Header tucks away while scrolling down, returns on the way up --- */
  var lastY = window.scrollY;
  var ticking = false;
  function onScroll() {
    var y = window.scrollY;
    if (head && !doc.classList.contains("menu-open") && !head.contains(document.activeElement)) {
      if (y < 140) head.classList.remove("is-hidden");
      else if (y > lastY + 6) head.classList.add("is-hidden");
      else if (y < lastY - 6) head.classList.remove("is-hidden");
    }
    lastY = y;
    updateProgress();
    if (stepsSync) stepsSync();
    ticking = false;
  }
  window.addEventListener("scroll", function () {
    if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
  }, { passive: true });
  if (head) head.addEventListener("focusin", function () { head.classList.remove("is-hidden"); });

  /* --- Desktop nav: the dot follows the section in view --- */
  var navEl = document.querySelector(".nav");
  var navDot = navEl && navEl.querySelector(".nav-dot");
  var activeLink = null;
  function placeNavDot(link) {
    if (!navDot) return;
    activeLink = link;
    if (!link) { navDot.classList.remove("on"); return; }
    var x = link.offsetLeft + link.offsetWidth / 2;
    navDot.style.transform = "translateX(" + x + "px)";
    navDot.classList.add("on");
  }
  if (navEl) {
    var current = navEl.querySelector('[aria-current="page"]');
    var spyLinks = {};
    navEl.querySelectorAll("[data-spy]").forEach(function (a) { spyLinks[a.dataset.spy] = a; });
    var spied = ["who", "contact", "what", "how"].map(function (id) { return document.getElementById(id); }).filter(Boolean);
    if (spied.length && "IntersectionObserver" in window) {
      var visible = {};
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) { visible[en.target.id] = en.isIntersecting; });
        var on = null;
        spied.forEach(function (s) { if (visible[s.id]) on = s.id; });
        navEl.querySelectorAll(".is-active").forEach(function (a) { a.classList.remove("is-active"); });
        if (on && spyLinks[on]) spyLinks[on].classList.add("is-active");
        placeNavDot(on ? spyLinks[on] : null);
      }, { rootMargin: "-45% 0px -50% 0px" });
      spied.forEach(function (s) { io.observe(s); });
    } else if (current) {
      placeNavDot(current);
    }
    if (current && !spied.length) placeNavDot(current);
    window.addEventListener("resize", function () { if (activeLink) placeNavDot(activeLink); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { if (activeLink) placeNavDot(activeLink); });
  }

  /* --- Services: an accordion at every width --- */
  var svcBtns = Array.prototype.slice.call(document.querySelectorAll(".svc-btn"));
  function svcBody(b) { return document.getElementById(b.getAttribute("aria-controls")); }
  svcBtns.forEach(function (b) {
    svcBody(b).classList.toggle("open", b.getAttribute("aria-expanded") === "true");
    b.addEventListener("click", function () {
      var open = b.getAttribute("aria-expanded") !== "true";
      b.setAttribute("aria-expanded", String(open));
      svcBody(b).classList.toggle("open", open);
    });
  });

  /* --- Partner bios: Read more on phones --- */
  document.querySelectorAll(".more").forEach(function (b) {
    b.addEventListener("click", function () {
      var open = b.getAttribute("aria-expanded") !== "true";
      b.setAttribute("aria-expanded", String(open));
      document.getElementById(b.getAttribute("aria-controls")).classList.toggle("open", open);
    });
  });

  /* --- Steps: swipeable cards with a pager on phones --- */
  var stepsSync = null;
  var stepsEl = document.getElementById("steps");
  if (stepsEl) {
    var items = Array.prototype.slice.call(stepsEl.children);
    var pager = stepsEl.parentNode.querySelector(".pager");
    var dotsEl = pager.querySelector(".pager-dots");
    var curEl = pager.querySelector(".cur");
    pager.querySelector(".tot").textContent = pad(items.length);
    var dots = items.map(function (it, i) {
      var d = document.createElement("button");
      d.type = "button";
      d.setAttribute("role", "tab");
      d.setAttribute("aria-label", "Step " + (i + 1));
      d.addEventListener("click", function () { goStep(i); });
      dotsEl.appendChild(d);
      return d;
    });
    var arrows = pager.querySelectorAll(".arrow");
    var stepIdx = -1;
    function padL() { return parseFloat(getComputedStyle(stepsEl).paddingLeft) || 0; }
    function goStep(i) {
      i = Math.max(0, Math.min(items.length - 1, i));
      stepsEl.scrollTo({ left: items[i].offsetLeft - padL(), behavior: reduceMotion ? "auto" : "smooth" });
    }
    stepsSync = function () {
      var x = stepsEl.scrollLeft;
      var best = 0, bestD = Infinity;
      items.forEach(function (it, i) {
        var d = Math.abs(it.offsetLeft - padL() - x);
        if (d < bestD) { bestD = d; best = i; }
      });
      if (x + stepsEl.clientWidth >= stepsEl.scrollWidth - 4) best = items.length - 1;
      if (best === stepIdx) return;
      stepIdx = best;
      curEl.textContent = pad(best + 1);
      dots.forEach(function (d, i) { d.setAttribute("aria-selected", String(i === best)); });
      arrows[0].disabled = best === 0;
      arrows[1].disabled = best === items.length - 1;
    };
    arrows.forEach(function (a) { a.addEventListener("click", function () { goStep(stepIdx + Number(a.dataset.dir)); }); });
    var stTick = false;
    stepsEl.addEventListener("scroll", function () { if (!stTick) { stTick = true; requestAnimationFrame(function () { stTick = false; stepsSync(); }); } }, { passive: true });
    stepsSync();
  }

  /* --- Floating "Talk to us" on phones: hidden over the hero, contact and footer --- */
  var cta = document.querySelector(".cta-float");
  if (cta && "IntersectionObserver" in window) {
    doc.classList.add("has-cta");
    var blockers = [document.querySelector(".hero"), document.getElementById("contact"), document.querySelector(".site-foot")].filter(Boolean);
    var seen = new Map();
    var ctaIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { seen.set(en.target, en.isIntersecting); });
      var blocked = false;
      seen.forEach(function (v) { if (v) blocked = true; });
      cta.classList.toggle("show", !blocked);
      cta.setAttribute("aria-hidden", String(blocked));
      cta.tabIndex = blocked ? -1 : 0;
    });
    blockers.forEach(function (b) { ctaIO.observe(b); });
  }

  /* --- Back to top --- */
  document.querySelectorAll("[data-totop]").forEach(function (b) {
    b.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
      var skip = document.querySelector(".site-head a");
      if (skip) skip.focus({ preventScroll: true });
    });
  });

  /* --- Reading progress and time --- */
  function readingTarget() {
    var art = document.getElementById("article-body");
    if (art) return art;
    if (letterOpen) return document.getElementById("letter-body");
    return null;
  }
  function updateProgress() {
    if (!head) return;
    var tgt = readingTarget();
    if (!tgt) { head.classList.remove("has-progress"); return; }
    var r = tgt.getBoundingClientRect();
    var vh = window.innerHeight;
    var p = (vh * 0.35 - r.top) / Math.max(1, r.height);
    p = Math.max(0, Math.min(1, p));
    head.style.setProperty("--p", p.toFixed(4));
    head.classList.toggle("has-progress", r.top < vh && r.bottom > 0);
  }
  function updateReadTimes() {
    /* Reading time straight from the article data, for links to an article */
    document.querySelectorAll("[data-readtime-article]").forEach(function (n) {
      var a = ARTICLES.filter(function (x) { return x.slug === n.dataset.readtimeArticle; })[0];
      if (!a) return;
      var blocks = Array.isArray(a.body) ? a.body : (a.body && a.body.en) || [];
      var words = JSON.stringify(blocks).replace(/"[a-z]+":/g, " ").split(/\s+/).filter(Boolean).length;
      n.textContent = Math.max(1, Math.round(words / 230)) + tr("read");
    });
    document.querySelectorAll("[data-readtime-for]").forEach(function (n) {
      var tgt = document.getElementById(n.dataset.readtimeFor);
      if (!tgt) return;
      var words = (tgt.textContent || "").trim().split(/\s+/).filter(Boolean).length;
      n.setAttribute("data-notr", "");
      n.textContent = words ? Math.max(1, Math.round(words / 230)) + tr("read") : "";
    });
  }

  /* --- Share an article: native share sheet on phones, copy link elsewhere --- */
  document.querySelectorAll("[data-share]").forEach(function (b) {
    b.addEventListener("click", function () {
      var data = { title: document.title, url: location.href };
      if (navigator.share) {
        navigator.share(data).catch(function () {});
      } else {
        copyText(location.href).then(function () { toast(tr("link")); }, function () { toast(location.href); });
      }
    });
  });

  /* ==================================================================
     Contact form
     Posts JSON to /api/contact (a Vercel function that emails it on).
     In the design preview there is no server: set window.HOP_FORM_DEMO
     to show the success state without sending anything.
     ================================================================== */
  var form = document.getElementById("contact-form");
  if (form) {
    var sent = document.getElementById("form-sent");
    var alertBox = document.getElementById("form-alert");
    var submitBtn = document.getElementById("c-submit");
    var msg = document.getElementById("c-message");
    var counter = document.getElementById("c-message-count");
    var startedAt = Date.now();
    var DRAFT = "hop-contact-draft";
    var M = {
      en: {
        name: "Please enter your name.",
        email: "Please enter your email address.",
        emailBad: "This doesn’t look like an email address. Check for typos.",
        phone: "Use digits, spaces and + only.",
        message: "Please write a few words about what you need.",
        messageShort: "A little more, please: at least 20 characters.",
        consent: "Please tick the box so we can store your details and reply.",
        summary: "Please fix the following:",
        fail: "Your message wasn’t sent. Please try again, or email us directly at ",
        offline: "You seem to be offline. Your message is saved here; send it again when you’re back online."
      },
      pl: {
        name: "Podaj imię i nazwisko.",
        email: "Podaj adres e-mail.",
        emailBad: "To nie wygląda na adres e-mail. Sprawdź, czy nie ma literówki.",
        phone: "Użyj tylko cyfr, spacji i znaku +.",
        message: "Napisz kilka słów o tym, czego potrzebujesz.",
        messageShort: "Jeszcze trochę: co najmniej 20 znaków.",
        consent: "Zaznacz zgodę, abyśmy mogli zapisać dane i odpowiedzieć.",
        summary: "Popraw następujące pola:",
        fail: "Wiadomość nie została wysłana. Spróbuj ponownie lub napisz bezpośrednio na ",
        offline: "Brak połączenia. Wiadomość jest zapisana; wyślij ją ponownie, gdy wrócisz online."
      }
    };
    function m(k) { return (M[currentLang] || M.en)[k]; }
    var fieldOrder = ["name", "email", "phone", "message", "consent"];
    function input(name) { return form.elements[name]; }
    function box(name) { return form.querySelector('[data-field="' + name + '"]'); }

    function check(name) {
      var v = input(name);
      var val = v.type === "checkbox" ? v.checked : String(v.value || "").trim();
      switch (name) {
        case "name": return val ? "" : m("name");
        case "email": return !val ? m("email") : (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(val) ? "" : m("emailBad"));
        case "phone": return !val || /^[+()\d\s.\-]{6,}$/.test(val) ? "" : m("phone");
        case "message": return !val ? m("message") : (val.length < 20 ? m("messageShort") : "");
        case "consent": return val ? "" : m("consent");
      }
      return "";
    }
    function show(name, error) {
      var b = box(name);
      if (!b) return;
      var errEl = b.querySelector(".err");
      var inp = input(name);
      b.classList.toggle("invalid", !!error);
      var filled = inp.type === "checkbox" ? inp.checked : String(inp.value || "").trim();
      b.classList.toggle("valid", !error && !!filled && inp.type !== "checkbox" && name !== "message");
      inp.setAttribute("aria-invalid", error ? "true" : "false");
      if (errEl) { errEl.textContent = error; errEl.setAttribute("data-notr", ""); }
    }
    var touched = {};
    fieldOrder.forEach(function (name) {
      var inp = input(name);
      inp.addEventListener("blur", function () { touched[name] = true; show(name, check(name)); });
      inp.addEventListener(inp.type === "checkbox" ? "change" : "input", function () {
        if (touched[name] || box(name).classList.contains("invalid")) show(name, check(name));
      });
    });

    /* Message: grows with the text, counts characters */
    function grow() {
      msg.style.height = "auto";
      msg.style.height = Math.min(msg.scrollHeight + 2, 640) + "px";
      var n = msg.value.length;
      counter.textContent = n + " / 2000";
      counter.classList.toggle("near", n > 1800);
    }
    msg.addEventListener("input", grow);

    /* Drafts: kept in this browser only, until the message is sent */
    function data() {
      var interests = Array.prototype.slice.call(form.querySelectorAll('input[name="interests"]:checked')).map(function (c) { return c.value; });
      var partner = (form.querySelector('input[name="partner"]:checked') || {}).value || "Either";
      return {
        name: input("name").value.trim(), email: input("email").value.trim(),
        company: input("company").value.trim(), phone: input("phone").value.trim(),
        interests: interests, message: msg.value.trim(), partner: partner,
        consent: input("consent").checked, website: input("website").value,
        lang: currentLang, page: location.pathname, elapsed: Date.now() - startedAt
      };
    }
    function saveDraft() {
      /* Drafts are optional storage: only with "Preferences" consent */
      if (!(window.HOPConsent && window.HOPConsent.allowed("preferences"))) return;
      var d = data();
      delete d.website; delete d.elapsed; delete d.consent;
      store(DRAFT, JSON.stringify(d));
    }
    var dt;
    form.addEventListener("input", function () { clearTimeout(dt); dt = setTimeout(saveDraft, 300); });
    form.addEventListener("change", saveDraft);
    function restoreDraft() {
      if (!(window.HOPConsent && window.HOPConsent.allowed("preferences"))) return;
      var raw = store(DRAFT);
      if (!raw) return;
      try {
        var d = JSON.parse(raw);
        var any = false;
        ["name", "email", "company", "phone"].forEach(function (k) { if (d[k]) { input(k).value = d[k]; any = true; } });
        if (d.message) { msg.value = d.message; any = true; }
        (d.interests || []).forEach(function (v) {
          var c = form.querySelector('input[name="interests"][value="' + v.replace(/"/g, "") + '"]');
          if (c) { c.checked = true; any = true; }
        });
        var r = form.querySelector('input[name="partner"][value="' + String(d.partner || "Either").replace(/"/g, "") + '"]');
        if (r) r.checked = true;
        if (any) document.getElementById("draft-note").hidden = false;
      } catch (e) {}
      grow();
    }
    function clearDraft() { try { localStorage.removeItem(DRAFT); } catch (e) {} }
    document.getElementById("draft-clear").addEventListener("click", function () {
      form.reset(); clearDraft(); grow();
      fieldOrder.forEach(function (n) { show(n, ""); box(n) && box(n).classList.remove("valid"); });
      document.getElementById("draft-note").hidden = true;
      input("name").focus();
    });

    function showAlert(nodes) {
      alertBox.textContent = "";
      nodes.forEach(function (n) { alertBox.appendChild(n); });
      alertBox.setAttribute("data-notr", "");
      alertBox.hidden = false;
      alertBox.focus();
      alertBox.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      alertBox.hidden = true;
      var errors = [];
      fieldOrder.forEach(function (name) {
        touched[name] = true;
        var err = check(name);
        show(name, err);
        if (err) errors.push({ name: name, err: err });
      });
      if (errors.length) {
        if (errors.length === 1) { input(errors[0].name).focus(); return; }
        var ul = el("ul");
        errors.forEach(function (x) {
          var li = el("li");
          var a = el("a", null, x.err);
          a.href = "#" + input(x.name).id;
          a.addEventListener("click", function (ev) { ev.preventDefault(); input(x.name).focus(); });
          li.appendChild(a); ul.appendChild(li);
        });
        showAlert([el("strong", null, m("summary")), ul]);
        return;
      }

      var payload = data();
      submitBtn.classList.add("busy");
      submitBtn.setAttribute("aria-busy", "true");
      submitBtn.querySelector(".btn-txt").textContent = currentLang === "pl" ? "Wysyłanie…" : "Sending…";

      var send = window.HOP_FORM_DEMO
        ? new Promise(function (res) { setTimeout(function () { res({ ok: true, demo: true }); }, 900); })
        : fetch("/api/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
            .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { j.ok = r.ok && j.ok !== false; return j; }); });

      send.then(function (res) {
        if (!res.ok) throw new Error(res.error || "failed");
        clearDraft();
        sent.querySelector('[data-sent="name"]').textContent = payload.name ? ", " + payload.name.split(" ")[0] : "";
        sent.querySelector('[data-sent="name"]').setAttribute("data-notr", "");
        sent.querySelector('[data-sent="email"]').textContent = payload.email;
        sent.querySelector(".sent-demo").hidden = !res.demo;
        form.hidden = true;
        sent.hidden = false;
        translateTree(sent, currentLang);
        sent.focus();
        sent.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
      }).catch(function () {
        var p = el("p");
        if (!navigator.onLine) { p.textContent = m("offline"); }
        else {
          p.appendChild(document.createTextNode(m("fail")));
          var who = payload.partner === "David" ? "david@hoppartners.com" : "philip@hoppartners.com";
          var a = el("a", null, who); a.href = "mailto:" + who;
          p.appendChild(a); p.appendChild(document.createTextNode("."));
        }
        showAlert([p]);
      }).then(function () {
        submitBtn.classList.remove("busy");
        submitBtn.removeAttribute("aria-busy");
        submitBtn.querySelector(".btn-txt").textContent = currentLang === "pl" ? "Wyślij wiadomość" : "Send message";
      });
    });

    document.getElementById("send-another").addEventListener("click", function () {
      form.reset(); grow();
      fieldOrder.forEach(function (n) { touched[n] = false; show(n, ""); });
      document.getElementById("draft-note").hidden = true;
      startedAt = Date.now();
      sent.hidden = true; form.hidden = false;
      input("name").focus();
    });

    restoreDraft();
    grow();
  }

  /* Filters bar gets a soft shadow once it sticks */
  var filtersEl = document.getElementById("filters");
  if (filtersEl && "IntersectionObserver" in window) {
    var sentinel = document.createElement("div");
    sentinel.style.height = "1px";
    filtersEl.parentNode.insertBefore(sentinel, filtersEl);
    new IntersectionObserver(function (en) { filtersEl.classList.toggle("stuck", !en[0].isIntersecting); }, { rootMargin: "-140px 0px 0px 0px" }).observe(sentinel);
  }

  /* ==================================================================
     Motion: entrances, held back only for what starts below the fold
     ================================================================== */
  var revealEls = Array.prototype.slice.call(document.querySelectorAll("[data-reveal]"));
  if (revealEls.length && "IntersectionObserver" in window && !reduceMotion) {
    var vh0 = window.innerHeight;
    revealEls.forEach(function (n) {
      var rc = n.getBoundingClientRect();
      /* Leave alone anything that starts off to the side (swipe rows) */
      if (rc.left >= window.innerWidth || rc.right <= 0) return;
      if (rc.top > vh0 * 0.92) n.classList.add("pre");
      else if (n.dataset.reveal === "circle") n.classList.add("in");
    });
    /* Siblings arrive in a short sequence */
    revealEls.forEach(function (n) {
      var sibs = Array.prototype.filter.call(n.parentNode.children, function (c) { return c.hasAttribute("data-reveal"); });
      var i = sibs.indexOf(n);
      if (i > 0) n.style.setProperty("--d", Math.min(i, 6) * 0.08 + "s");
    });
    var rio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.classList.remove("pre");
        if (en.target.dataset.reveal === "circle") en.target.classList.add("in");
        rio.unobserve(en.target);
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    revealEls.forEach(function (n) { if (n.classList.contains("pre")) rio.observe(n); });
  } else {
    revealEls.forEach(function (n) { if (n.dataset.reveal === "circle") n.classList.add("in"); });
  }

  /* The cover lifts away a little as you leave it */
  var heroInner = document.querySelector(".hero-inner");
  if (heroInner && !reduceMotion && !document.querySelector(".stage")) {
    var heroTick = false;
    var heroMove = function () {
      heroTick = false;
      var y = window.scrollY, h = window.innerHeight;
      if (y > h) return;
      heroInner.style.setProperty("--hero-y", (y * -0.18).toFixed(1) + "px");
      heroInner.style.setProperty("--hero-o", Math.max(0, 1 - y / (h * 0.75)).toFixed(3));
    };
    window.addEventListener("scroll", function () { if (!heroTick) { heroTick = true; requestAnimationFrame(heroMove); } }, { passive: true });
  }

  /* ==================================================================
     THE STAGE: Poznań clock, the statement lit word by word, and one red
     dot that leaps from the logo to the full stop of each headline.
     ================================================================== */
  var stageEl = document.querySelector(".stage");

  var clockEl = document.getElementById("clock");
  if (clockEl) {
    var tick = function () {
      try { clockEl.textContent = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Warsaw" }).format(new Date()); }
      catch (e) { clockEl.textContent = ""; }
    };
    tick(); setInterval(tick, 20000);
  }

  var statement = document.getElementById("statement");
  if (statement && !reduceMotion) {
    Array.prototype.slice.call(statement.childNodes).forEach(function (node) {
      if (node.nodeType !== 3) return;
      var frag = document.createDocumentFragment();
      node.nodeValue.split(/(\s+)/).forEach(function (part) {
        if (!part) return;
        if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
        var w = document.createElement("span"); w.className = "w"; w.textContent = part; frag.appendChild(w);
      });
      statement.replaceChild(frag, node);
    });
    var words = statement.querySelectorAll(".w");
    var lTick = false, lastN = -1;
    var lightUp = function () {
      var r = statement.getBoundingClientRect(), vh = window.innerHeight;
      var p = (vh * 0.86 - r.top) / (r.height + vh * 0.3);
      var n = Math.min(words.length, Math.round(Math.max(0, Math.min(1, p)) * words.length * 1.1));
      if (n === lastN) return;
      lastN = n;
      for (var i = 0; i < words.length; i++) words[i].classList.toggle("lit", i < n);
    };
    window.addEventListener("scroll", function () { if (!lTick) { lTick = true; requestAnimationFrame(function () { lTick = false; lightUp(); }); } }, { passive: true });
    window.addEventListener("resize", lightUp);
    lightUp();
  }

  if (stageEl && !reduceMotion && window.Element && Element.prototype.animate) {
    var BASE = 100;
    var dotEl = document.createElement("div");
    dotEl.id = "leap-dot"; dotEl.setAttribute("aria-hidden", "true");
    document.body.appendChild(dotEl);
    doc.classList.add("leap");
    var current = null, override = null, flight = null, ready = false;

    var visibleTargets = function () {
      return Array.prototype.filter.call(document.querySelectorAll("[data-dot]"), function (n) { return n.getClientRects().length > 0; });
    };
    var geom = function (t) {
      var r = t.getBoundingClientRect();
      return { x: r.left + window.scrollX, y: r.top + window.scrollY, s: Math.max(r.width, 1) / BASE };
    };
    var tf = function (x, y, s, kx, ky) {
      kx = kx || 1; ky = ky || 1;
      return "translate(" + (x - (kx - 1) * s * BASE / 2).toFixed(2) + "px," + (y + (1 - ky) * s * BASE).toFixed(2) + "px) scale(" + (s * kx).toFixed(4) + "," + (s * ky).toFixed(4) + ")";
    };
    var readPos = function () {
      var m = new DOMMatrixReadOnly(getComputedStyle(dotEl).transform);
      return { x: m.e, y: m.f, s: m.a || 0.0001 };
    };
    var settle = function (g) {
      if (flight) { flight.cancel(); flight = null; }
      dotEl.style.transform = tf(g.x, g.y, g.s);
    };
    var leapTo = function (t, opts) {
      opts = opts || {};
      var to = geom(t);
      var from = opts.from || readPos();
      if (flight) { dotEl.style.transform = getComputedStyle(dotEl).transform; flight.cancel(); flight = null; }
      var dx = to.x - from.x, dy = to.y - from.y, dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 1 && Math.abs(to.s - from.s) < 0.001) { settle(to); return; }
      var lift = opts.fall ? 0 : Math.max(60, Math.min(dist * 0.32, 420));
      var frames = [], N = 18;
      for (var i = 0; i <= N; i++) {
        var u = i / N;
        var e = u < .5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;   /* ease in-out along the path */
        var x = from.x + dx * e, y = from.y + dy * (opts.fall ? u * u : e) - 4 * lift * e * (1 - e);
        var sc = from.s + (to.s - from.s) * e;
        frames.push({ transform: tf(x, y, sc), offset: u * 0.82 });
      }
      /* landing: squash wide and short, one small bounce, settle */
      frames.push({ transform: tf(to.x, to.y, to.s, 1.16, 0.82), offset: 0.88 });
      frames.push({ transform: tf(to.x, to.y - to.s * BASE * 0.08, to.s, 0.97, 1.04), offset: 0.94 });
      frames.push({ transform: tf(to.x, to.y, to.s), offset: 1 });
      var dur = opts.fall ? 900 : Math.max(620, Math.min(1150, 560 + dist * 0.35));
      flight = dotEl.animate(frames, { duration: dur, easing: "linear", fill: "forwards" });
      flight.onfinish = function () { settle(geom(t)); };
    };
    var choose = function () {
      if (override) return override;
      var vh = window.innerHeight, best = null, bestD = Infinity, lastAbove = null;
      visibleTargets().forEach(function (t) {
        var r = t.getBoundingClientRect();
        if (r.top >= -10 && r.top <= vh * 0.92) {
          var d = Math.abs(r.top - vh * 0.42);
          if (d < bestD) { bestD = d; best = t; }
        } else if (r.top < 0) lastAbove = t;
      });
      return best || lastAbove || visibleTargets()[0];
    };
    var update = function () {
      if (!ready) return;
      var t = choose();
      if (!t || t === current) return;
      if (current) current.classList.remove("dot-here");
      current = t; t.classList.add("dot-here");
      leapTo(t);
    };
    var start = function () {
      var home = document.querySelector(".hero [data-dot]") || visibleTargets()[0];
      if (!home) return;
      current = home; home.classList.add("dot-here");
      var g = geom(home);
      leapTo(home, { fall: true, from: { x: g.x, y: g.y - window.innerHeight * 0.7, s: g.s } });
      ready = true;
      setTimeout(update, 950);
    };
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { setTimeout(start, 350); }); else window.addEventListener("load", start);

    var sTick = false;
    window.addEventListener("scroll", function () { if (!sTick) { sTick = true; requestAnimationFrame(function () { sTick = false; update(); }); } }, { passive: true });
    /* Layout changes (letter opening, resizing): keep the dot on its spot */
    var relayout = function () { if (ready && current && !flight) settle(geom(current)); };
    window.addEventListener("resize", relayout);
    if ("ResizeObserver" in window) new ResizeObserver(relayout).observe(document.body);
    document.addEventListener("transitionend", relayout);

    /* Point at a service and the dot hops onto that line */
    var fine = window.matchMedia("(hover: hover) and (pointer: fine)");
    document.querySelectorAll(".svc-btn").forEach(function (b) {
      var spot = b.querySelector(".svc-stop");
      if (!spot) return;
      b.addEventListener("mouseenter", function () { if (fine.matches) { override = spot; update(); } });
    });
    var svcList = document.getElementById("services");
    if (svcList) svcList.addEventListener("mouseleave", function () { override = null; update(); });
  }

  /* Start */
  applyLang(currentLang, false);
  updateProgress();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { placeLangDot(false); });
  window.addEventListener("resize", function () { placeLangDot(false); });
})();
