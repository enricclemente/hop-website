/* HOP. home page V2 behaviour. No dependencies.
   Everything here is progressive: the page reads fine without it.
   Motion is transform/opacity only; one rAF-throttled scroll loop runs only while
   a scroll-linked section is on screen. */
(function () {
  "use strict";

  var doc = document.documentElement;
  doc.classList.add("js");
  var mqReduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  var reduce = mqReduce.matches;
  var mqDesk = window.matchMedia("(min-width: 1024px)");
  var mqArc = window.matchMedia("(min-width: 900px)");
  if (!reduce) doc.classList.add("can-pin");
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }
  function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }

  /* ------------------------------------------------------------------
     Language. English is in the HTML. Real Polish goes in PL_COPY, keyed by the
     English text; anything missing shows placeholder Polish of the same length
     (same approach as the rest of the site), with the notice at the bottom.
     ------------------------------------------------------------------ */
  var PL_COPY = { /* "English text": "Polski tekst" */ };
  function hash(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  /* Real Polish comes from /assets/pl.js (window.HOP_PL), keyed by the English text. A heading whose
     full stop became the red dot is found by its key with the stop. Anything not yet translated
     stays in English (never placeholder text), and the note at the bottom says so. */
  var missing = 0;
  function plOf(t) {
    var D = window.HOP_PL || PL_COPY, has = Object.prototype.hasOwnProperty;
    if (has.call(D, t)) return D[t];
    if (has.call(D, t + ".")) return D[t + "."].replace(/\.$/, "");
    return null;
  }
  function pseudo(text) {
    var t = text.trim(); if (!t) return text;
    var r = plOf(t);
    if (r == null) { if (/[A-Za-z]{3,}/.test(t)) { missing++; if (window.HOP_PL_DEBUG) (window.HOP_PL_MISS = window.HOP_PL_MISS || []).push(t); } return text; }
    return text.replace(t, r);
  }
  var originals = new WeakMap();
  var SKIP = "script, style, svg, [data-notr], time, .lang";
  function translate(root, lang) {
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode: function (n) {
      if (!n.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
      var p = n.parentElement; return !p || p.closest(SKIP) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
    } });
    var nodes = []; while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(function (n) {
      if (!originals.has(n)) originals.set(n, n.nodeValue);
      var en = originals.get(n); n.nodeValue = lang === "pl" ? pseudo(en) : en;
      /* a Polish line that ends in ':' or '?' keeps its own mark: the red full stop steps aside */
      var nx = n.nextSibling;
      if (nx && nx.nodeType === 1 && nx.classList.contains("tdot")) nx.hidden = lang === "pl" && /[:?!]\s*$/.test(n.nodeValue);
    });
    $$("[aria-label]", root).forEach(function (el) {
      if (el.closest("[data-notr]")) return;
      if (!el.dataset.labelEn) el.dataset.labelEn = el.getAttribute("aria-label");
      el.setAttribute("aria-label", lang === "pl" ? pseudo(el.dataset.labelEn) : el.dataset.labelEn);
    });
  }
  var lang = store("hop-lang") === "pl" ? "pl" : "en";
  var langNote = $(".lang-note");
  function applyLang(l) {
    lang = l; doc.setAttribute("lang", l); store("hop-lang", l);
    $$(".lang button").forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.lang === l)); });
    missing = 0;
    translate(document.body, l);
    if (langNote) langNote.hidden = !(l === "pl" && missing > 0);
    placeLangDot(true);
    try { document.dispatchEvent(new CustomEvent("hop:lang", { detail: l })); } catch (e) {}
  }
  /* The red dot sits after the chosen language and hops to the other one on a switch */
  $$(".lang").forEach(function (sw) {
    var d = document.createElement("span"); d.className = "lang-dot"; d.setAttribute("aria-hidden", "true");
    sw.appendChild(d); sw.classList.add("has-dot");
  });
  function placeLangDot(animate) {
    $$(".lang").forEach(function (sw) {
      var dot = sw.querySelector(".lang-dot");
      var active = sw.querySelector('button[data-lang="' + lang + '"]');
      if (!dot || !active || !active.offsetWidth) return;
      var box = sw.getBoundingClientRect(), rg = document.createRange(); rg.selectNodeContents(active); var r = rg.getBoundingClientRect();
      var fs = parseFloat(getComputedStyle(active).fontSize) || 12;
      var x = Math.round(r.right - box.left + 3), y = Math.round(r.top - box.top + r.height / 2 + fs * 0.36 - 4);
      var from = dot.dataset.x != null ? parseFloat(dot.dataset.x) : x;
      dot.dataset.x = x;
      dot.style.transform = "translate(" + x + "px," + y + "px)";
      if (animate && !reduce && dot.animate) {
        var mid = (from + x) / 2, lift = from === x ? 10 : 14;
        dot.animate([
          { transform: "translate(" + from + "px," + y + "px) scale(1, 1)" },
          { transform: "translate(" + from + "px," + y + "px) scale(1.25, .75)", offset: .12 },
          { transform: "translate(" + mid + "px," + (y - lift) + "px) scale(.9, 1.1)", offset: .5 },
          { transform: "translate(" + x + "px," + y + "px) scale(1.25, .75)", offset: .86 },
          { transform: "translate(" + x + "px," + y + "px) scale(1, 1)" }
        ], { duration: 520, easing: "cubic-bezier(.3, .6, .4, 1)" });
      }
    });
  }
  placeLangDot(false);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { placeLangDot(false); });
  window.addEventListener("resize", function () { placeLangDot(false); });
  document.addEventListener("click", function (e) {
    var b = e.target.closest(".lang button"); if (!b) return;
    /* On phones the nav shows one code; tapping it switches to the other */
    var narrow = b.closest(".nav") && !mqDesk.matches;
    var next = narrow ? (lang === "en" ? "pl" : "en") : b.dataset.lang;
    if (next !== lang) applyLang(next);
  });
  if (lang === "pl") applyLang("pl");

  window.HOPv2 = { lang: function () { return lang; }, translate: function (root) { translate(root, lang); }, store: store, reduce: reduce, say: function (m) { say(m); } };

  /* ------------------------------------------------------------------
     Toast and copy-to-clipboard
     ------------------------------------------------------------------ */
  var toast = $("#toast"), toastT;
  function say(msg) { if (!toast) return; toast.textContent = msg; toast.classList.add("is-on"); clearTimeout(toastT); toastT = setTimeout(function () { toast.classList.remove("is-on"); }, 1800); }
  document.addEventListener("click", function (e) {
    var b = e.target.closest("[data-copy]"); if (!b) return;
    var text = b.getAttribute("data-copy");
    function fallback() {
      /* Select the address so the visitor can copy it themselves */
      var a = b.parentElement.querySelector(".person-e, a");
      if (a) { var r = document.createRange(); r.selectNodeContents(a); var s = getSelection(); s.removeAllRanges(); s.addRange(r); }
      say(lang === "pl" ? "Zaznaczono" : "Selected. Press Ctrl+C or ⌘C");
    }
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(function () { say(lang === "pl" ? "Skopiowano" : "Copied"); }, fallback);
    else fallback();
  });

  /* ------------------------------------------------------------------
     Nav: state Top → Scrolled after the hero, scroll-spy, mobile menu,
     sticky CTA on phones
     ------------------------------------------------------------------ */
  var nav = $("#nav"), hero = $("#top"), sticky = $("#sticky-cta"), contact = $("#contact-offer"), menu = $("#menu");
  var heroGone = false, contactIn = false, menuOpen = false;
  function updateSticky() {
    if (!sticky) return;
    var on = heroGone && !contactIn && !menuOpen;
    sticky.classList.toggle("is-on", on);
    sticky.setAttribute("aria-hidden", String(!on));
    if (on) sticky.removeAttribute("inert"); else sticky.setAttribute("inert", "");
    var a = sticky.querySelector("a"); if (a) a.tabIndex = on ? 0 : -1;
  }
  /* The nav turns solid once the dark top of the page has scrolled away */
  var navSentinel = $("[data-nav-sentinel]") || $(".hero-bar") || hero;
  if (!navSentinel) nav.classList.add("is-scrolled");
  /* Solid as soon as the page moves, so nothing ever slides under a see-through nav */
  var navTick = false;
  function navSolid() { navTick = false; nav.classList.toggle("is-scrolled", !navSentinel || window.scrollY > 4); }
  navSolid();
  window.addEventListener("scroll", function () { if (!navTick) { navTick = true; requestAnimationFrame(navSolid); } }, { passive: true });
  if ("IntersectionObserver" in window) {
    if (navSentinel) new IntersectionObserver(function (es) {
      es.forEach(function (e) { heroGone = !e.isIntersecting; });
      updateSticky();
    }, { rootMargin: "-80px 0px 0px 0px" }).observe(navSentinel);
    if (contact) {
      /* Hide the sticky CTA while the closing headline or the sprint offer is on screen */
      var closing = [contact].filter(Boolean), seen = new Map();
      var cio = new IntersectionObserver(function (es) { es.forEach(function (e) { seen.set(e.target, e.isIntersecting); }); contactIn = closing.some(function (el) { return seen.get(el); }); updateSticky(); }, { threshold: 0.05 });
      closing.forEach(function (el) { cio.observe(el); });
    }

    /* Scroll-spy: the section crossing a line 35% down the screen is current */
    var spyIds = ["letter", "partners", "approach"];
    var current = null;
    var spy = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) current = e.target.id; else if (current === e.target.id) current = null; });
      $$("[data-spy]").forEach(function (a) { if (a.dataset.spy === current) a.setAttribute("aria-current", "true"); else a.removeAttribute("aria-current"); });
    }, { rootMargin: "-35% 0px -64% 0px" });
    spyIds.forEach(function (id) { var el = document.getElementById(id); if (el) spy.observe(el); });
  }

  var menuBtn = $(".nav-menu"), lastFocus = null;
  function focusables() { return $$('a[href], button:not([disabled])', menu).filter(function (el) { return el.offsetParent !== null; }); }
  function openMenu() {
    lastFocus = document.activeElement; menu.hidden = false; menuOpen = true;
    menuBtn.setAttribute("aria-expanded", "true"); document.body.classList.add("menu-open"); requestAnimationFrame(function () { placeLangDot(false); });
    $("main").setAttribute("inert", ""); $("#site-foot").setAttribute("inert", ""); nav.setAttribute("inert", "");
    updateSticky();
    var f = focusables(); if (f.length) f[0].focus();
  }
  function closeMenu(restore) {
    if (!menuOpen) return;
    menu.hidden = true; menuOpen = false;
    menuBtn.setAttribute("aria-expanded", "false"); document.body.classList.remove("menu-open");
    $("main").removeAttribute("inert"); $("#site-foot").removeAttribute("inert"); nav.removeAttribute("inert");
    updateSticky();
    if (restore !== false) (lastFocus && lastFocus.focus ? lastFocus : menuBtn).focus();
  }
  if (menuBtn && menu) {
    menuBtn.addEventListener("click", openMenu);
    $(".menu-close", menu).addEventListener("click", function () { closeMenu(); });
    menu.addEventListener("click", function (e) { var a = e.target.closest("a"); if (a) closeMenu(false); });
    menu.addEventListener("keydown", function (e) {
      if (e.key === "Escape") { e.preventDefault(); closeMenu(); return; }
      if (e.key !== "Tab") return;
      var f = focusables(); if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
    mqDesk.addEventListener("change", function (e) { if (e.matches) closeMenu(false); });
  }

  /* ------------------------------------------------------------------
     Hero intro (≤1.6s desktop, ≤0.9s phones) and the back-to-top replay
     ------------------------------------------------------------------ */
  if (!reduce && window.scrollY < 40) {
    doc.classList.add("intro");
    requestAnimationFrame(function () { requestAnimationFrame(function () { doc.classList.add("intro-run"); }); });
    /* The classes stay: the end state is the normal layout, and removing them would re-lay the headline.
       Once the lines have risen, unclip them so the full stop can leap out of its line. */
    setTimeout(function () { doc.classList.add("intro-done"); }, 1700);
  } else doc.classList.add("intro-done");
  var heroDot = $(".wait-dot");
  document.addEventListener("click", function (e) {
    var b = e.target.closest("[data-totop]"); if (!b) return;
    window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
    var logo = $(".nav-logo"); if (logo) setTimeout(function () { logo.focus({ preventScroll: true }); }, reduce ? 0 : 500);
    if (heroDot && !reduce) setTimeout(function () { heroDot.style.animation = "none"; void heroDot.offsetWidth; heroDot.style.animation = ""; }, 450);
  });

  /* ------------------------------------------------------------------
     Partner portraits: the red dot opens into the photo. Scrubbed to scroll:
     the dot becomes an iris that widens to the whole frame while the photo
     settles from a slight zoom. David's opens a beat after Philip's on desktop.
     ------------------------------------------------------------------ */
  /* Touch screens have no hover: a tap on a portrait shows or hides the bio */
  $$(".founder-img").forEach(function (el) {
    el.addEventListener("click", function () { if (!window.matchMedia("(hover: hover)").matches) el.classList.toggle("is-open"); });
    el.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); el.classList.toggle("is-open"); } });
  });
  var irises = $$(".founder-img");
  if (irises.length && !reduce && "IntersectionObserver" in window) {
    doc.classList.add("can-iris");
    var irisOn = new Set(), irisRaf = 0, mqTwo = window.matchMedia("(min-width: 600px)");
    irises.forEach(function (el, i) {
      el.classList.remove("clip"); el._lag = i;
      var d = document.createElement("span"); d.className = "iris-dot"; d.setAttribute("aria-hidden", "true"); el.appendChild(d);
    });
    var irisTick = function () {
      irisRaf = 0;
      var vh = window.innerHeight;
      irisOn.forEach(function (el) {
        var r = el.getBoundingClientRect();
        var lag = mqTwo.matches ? el._lag * 0.12 : 0;
        var p = Math.min(1, Math.max(0, (vh * 0.92 - r.top) / (vh * 0.62) - lag));
        var e = 1 - Math.pow(1 - p, 3);
        var cx = r.width / 2, cy = r.height * 0.42;
        var far = Math.hypot(Math.max(cx, r.width - cx), Math.max(cy, r.height - cy)) + 2;
        el.style.setProperty("--iris", (14 + e * (far - 14)).toFixed(1) + "px");
        el.style.setProperty("--iz", (1.22 - 0.22 * e).toFixed(4));
        el.style.setProperty("--ids", Math.max(0, 1 - e * 2.4).toFixed(3));
      });
    };
    var irisReq = function () { if (!irisRaf) irisRaf = requestAnimationFrame(irisTick); };
    var irisIo = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) irisOn.add(e.target); else irisOn.delete(e.target); });
      irisReq();
    }, { rootMargin: "10% 0px 10% 0px" });
    irises.forEach(function (el) { irisIo.observe(el); });
    window.addEventListener("scroll", irisReq, { passive: true });
    window.addEventListener("resize", irisReq);
  }

  /* ------------------------------------------------------------------
     Reveals: one observer for everything with data-reveal / .clip / data-words
     ------------------------------------------------------------------ */
  $$("[data-words]").forEach(function (h) {
    var i = 0;
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (n) {
        if (n.nodeType === 3 && n.nodeValue.trim()) {
          var frag = document.createDocumentFragment();
          n.nodeValue.split(/(\s+)/).forEach(function (part) {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
            var s = document.createElement("span"); s.className = "w"; s.style.setProperty("--i", i++); s.textContent = part; frag.appendChild(s);
          });
          n.parentNode.replaceChild(frag, n);
        } else if (n.nodeType === 1 && n.tagName !== "BR") {
          if (n.classList.contains("red")) { n.classList.add("w"); n.style.setProperty("--i", i++ + 2); }
          else walk(n);
        }
      });
    })(h);
  });
  if ("IntersectionObserver" in window && !reduce) {
    var rev = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { (e.target._rev || e.target).classList.add("in"); rev.unobserve(e.target); } });
    }, { rootMargin: "0px 0px -12% 0px", threshold: 0.01 });
    /* A clipped element (clip-path inset 100%) never reports as visible in Chrome, so watch its parent instead */
    $$("[data-reveal], [data-words], .clip:not([data-reveal] .clip), .problem").forEach(function (el) {
      var watch = el.classList.contains("clip") && el.parentElement ? el.parentElement : el;
      if (watch !== el) watch._rev = el;
      rev.observe(watch);
    });
  } else {
    $$("[data-reveal], [data-words], .clip, .problem").forEach(function (el) { el.classList.add("in"); });
  }

  /* ------------------------------------------------------------------
     Burning platform: accordion, one open at a time. Desktop: hover/focus
     opens, click locks. Phones: tap toggles. Arrow keys move between rows.
     The primary CTA carries the open platform to the contact form.
     ------------------------------------------------------------------ */
  var plats = $$(".plat"), burnCta = $("#burn-cta"), locked = null;
  var fine = window.matchMedia("(hover: hover) and (pointer: fine)");
  function setOpen(li) {
    plats.forEach(function (p) {
      var on = p === li;
      p.classList.toggle("is-open", on);
      p.querySelector(".plat-b").setAttribute("aria-expanded", String(on));
    });
    if (burnCta) burnCta.href = li ? "/contact?platform=" + li.dataset.platform : "/contact";
  }
  plats.forEach(function (li, i) {
    var b = li.querySelector(".plat-b");
    b.addEventListener("click", function () {
      if (fine.matches && mqDesk.matches) { locked = locked === li ? null : li; setOpen(locked || li); return; }
      setOpen(li.classList.contains("is-open") ? null : li);
    });
    li.addEventListener("mouseenter", function () { if (fine.matches && mqDesk.matches && !locked) setOpen(li); });
    b.addEventListener("focus", function () { if (fine.matches && mqDesk.matches && !locked) setOpen(li); });
    b.addEventListener("keydown", function (e) {
      var k = e.key, j = null;
      if (k === "ArrowDown") j = (i + 1) % plats.length;
      else if (k === "ArrowUp") j = (i - 1 + plats.length) % plats.length;
      else if (k === "Home") j = 0; else if (k === "End") j = plats.length - 1;
      if (j === null) return;
      e.preventDefault(); plats[j].querySelector(".plat-b").focus();
    });
  });

  /* ------------------------------------------------------------------
     Proof carousel (phones): pager follows the snapped card; hidden
     prev/next buttons for keyboard and screen-reader users
     ------------------------------------------------------------------ */
  var cases = $("#cases");
  if (cases) {
    /* Only the phone carousel is a scrollable, focusable region */
    var setTab = function () { if (mqArc.matches) cases.removeAttribute("tabindex"); else cases.setAttribute("tabindex", "0"); };
    setTab(); mqArc.addEventListener("change", setTab);
    var cards = $$(".case", cases), bars = $$(".pager-bars i"), cur = $(".pager-cur");
    var setPage = function (n) { bars.forEach(function (b, i) { b.classList.toggle("on", i === n); }); if (cur) cur.textContent = "0" + (n + 1); };
    var pageNow = function () { var x = cases.scrollLeft, best = 0, d = Infinity; cards.forEach(function (c, i) { var dd = Math.abs(c.offsetLeft - cards[0].offsetLeft - x); if (dd < d) { d = dd; best = i; } }); return best; };
    var pt; cases.addEventListener("scroll", function () { if (pt) return; pt = requestAnimationFrame(function () { pt = null; setPage(pageNow()); }); }, { passive: true });
    var go = function (dir) { var n = clamp(pageNow() + dir, 0, cards.length - 1); cases.scrollTo({ left: cards[n].offsetLeft - cards[0].offsetLeft, behavior: reduce ? "auto" : "smooth" }); setPage(n); var name = cards[n].querySelector(".case-n"); say((name ? name.textContent + " · " : "") + (n + 1) + " / " + cards.length); };
    $$("[data-case]").forEach(function (b) { b.addEventListener("click", function () { go(b.dataset.case === "next" ? 1 : -1); }); });
    cases.addEventListener("keydown", function (e) { if (e.target !== cases) return; if (e.key === "ArrowRight") { e.preventDefault(); go(1); } if (e.key === "ArrowLeft") { e.preventDefault(); go(-1); } });
  }

  /* ------------------------------------------------------------------
     House of Poland letter: inline dropdown
     ------------------------------------------------------------------ */
  var lt = $("#letter-toggle"), panel = $("#letter-panel"), lclose = $(".letter-close");
  if (lt && panel) {
    var row = $(".letter-row");
    panel.classList.add("is-closed"); lt.setAttribute("aria-expanded", "false");
    var openL = function () {
      panel.classList.remove("is-closed"); lt.setAttribute("aria-expanded", "true");
      var h = panel.scrollHeight; panel.style.height = "0px"; void panel.offsetHeight; panel.style.height = h + "px";
      var done = function () { panel.style.height = ""; panel.removeEventListener("transitionend", done); };
      panel.addEventListener("transitionend", done); setTimeout(done, 700);
      var y = row.getBoundingClientRect().top + window.scrollY - 120;
      window.scrollTo({ top: y, behavior: reduce ? "auto" : "smooth" });
    };
    var closeL = function (focus) {
      var h = panel.scrollHeight; panel.style.height = h + "px"; void panel.offsetHeight;
      panel.classList.add("is-closed"); panel.style.height = "";
      lt.setAttribute("aria-expanded", "false");
      if (focus) {
        var y = row.getBoundingClientRect().top + window.scrollY - 120;
        if (row.getBoundingClientRect().top < 0) window.scrollTo({ top: y, behavior: reduce ? "auto" : "smooth" });
        lt.focus({ preventScroll: true });
      }
    };
    lt.addEventListener("click", function () { if (lt.getAttribute("aria-expanded") === "true") closeL(false); else openL(); });
    if (lclose) lclose.addEventListener("click", function () { closeL(true); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && lt.getAttribute("aria-expanded") === "true" && !menuOpen && !document.querySelector("dialog[open]")) { closeL(true); } });
  }

  /* ------------------------------------------------------------------
     Scroll-linked pieces, one rAF loop, active only while on screen:
     hero drift, Moment background, Problem pin, the leap, model parallax
     ------------------------------------------------------------------ */
  var moment = $("#moment"), problem = $("#problem"), leap = $(".leap"), modelImg = $(".model-img"), heroBody = $(".hero-body");
  var stage = $("#stage"), dot = $(".leap-dot"), halo = $(".halo");
  var phases = $$(".phase"), steps = $$(".stepper li"), wps = $$(".wp");
  var active = new Set(), ticking = false, vh = window.innerHeight;
  function prog(el, start, end) { /* 0 when el top hits start*vh, 1 when it hits end*vh */ var r = el.getBoundingClientRect(); return clamp((start * vh - r.top) / ((start - end) * vh), 0, 1); }

  /* Leap path geometry, sampled once per resize */
  var pathD = stage && $(".stage-svg--d .leap-ghost", stage), pathM = stage && $(".stage-svg--m .leap-ghost", stage);
  var solidD = stage && $(".stage-svg--d .leap-solid", stage), solidM = stage && $(".stage-svg--m .leap-solid", stage);
  var geo = null;
  function measure() {
    vh = window.innerHeight;
    if (!stage) return;
    var arc = mqArc.matches, p = arc ? pathD : pathM, total = p.getTotalLength();
    /* Lengths at take-off, apex and landing, found by sampling */
    var tk = 0, ap = 0, ld = total, best = Infinity, bestL = Infinity;
    var target = arc ? { tk: [360, 720], ap: [720, 260], ld: [980, 530] } : { tk: [8, 200], ap: [56, 330], ld: [8, 460] };
    for (var s = 0; s <= total; s += total / 160) {
      var pt = p.getPointAtLength(s);
      if (Math.abs(pt.x - target.tk[0]) + Math.abs(pt.y - target.tk[1]) < 2 && !tk) tk = s;
      var da = Math.abs(pt.x - target.ap[0]) + Math.abs(pt.y - target.ap[1]); if (da < best) { best = da; ap = s; }
      var dl = Math.abs(pt.x - target.ld[0]) + Math.abs(pt.y - target.ld[1]); if (dl < bestL) { bestL = dl; ld = s; }
    }
    if (!tk) tk = arc ? 360 : 200;
    var w = stage.clientWidth, h = stage.clientHeight;
    geo = { arc: arc, p: p, solid: arc ? solidD : solidM, total: total, tk: tk, ap: ap, ld: ld,
      sx: arc ? w / 1200 : 1, sy: arc ? (h * 760 / 780) / 760 : h / 760 };
  }
  function easeIn(t) { return t * t * t; }
  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }
  var haloDone = false;
  function leapAt(t) {
    if (!geo) return;
    var L, phase;
    if (t < 0.30) { L = geo.tk * (t / 0.30); phase = 0; }
    else if (t < 0.65) { L = geo.tk + (geo.ap - geo.tk) * easeIn((t - 0.30) / 0.35); phase = 1; }
    else if (t < 0.90) { L = geo.ap + (geo.ld - geo.ap) * easeOut((t - 0.65) / 0.25); phase = 2; }
    else { L = geo.ld; phase = 2; }
    var pt = geo.p.getPointAtLength(L);
    dot.style.setProperty("--dx", (pt.x * geo.sx).toFixed(1) + "px");
    dot.style.setProperty("--dy", (pt.y * geo.sy).toFixed(1) + "px");
    geo.solid.style.setProperty("--draw", (1 - L / geo.total).toFixed(4));
    var atApex = t >= 0.645;
    if (atApex && !haloDone) { haloDone = true; halo.classList.add("is-pulse"); }
    if (!atApex && t < 0.5) { haloDone = false; halo.classList.remove("is-pulse"); }
    wps.forEach(function (w, i) { var at = [0, geo.tk, geo.ld][i]; w.classList.toggle("is-past", L >= at - 0.5); });
    phases.forEach(function (ph, i) { ph.dataset.state = i < phase ? "done" : i === phase ? "active" : "next"; });
    steps.forEach(function (s, i) { s.dataset.state = i < phase ? "done" : i === phase ? "active" : "next"; });
  }
  function leapProgress() {
    if (!leap) return 0;
    if (geo && geo.arc && doc.classList.contains("can-pin")) {
      var r = leap.getBoundingClientRect(), run = leap.offsetHeight - vh;
      return clamp(-r.top / run, 0, 1);
    }
    /* Phones: the dot follows a reading line 60% down the screen */
    var sr = stage.getBoundingClientRect();
    return clamp((0.6 * vh - sr.top) / sr.height, 0, 1);
  }
  function frame() {
    ticking = false;
    if (active.has(hero) && heroBody && mqDesk.matches && !reduce) heroBody.style.setProperty("--drift", (-window.scrollY * 0.2).toFixed(1) + "px");
    if (active.has(moment)) moment.style.setProperty("--mix", reduce ? 1 : (0.15 + 0.85 * easeOut(prog(moment, 1, 0.55))).toFixed(3));
    if (active.has(problem) && mqDesk.matches) {
      var pin = $(".pin", problem), r = pin.getBoundingClientRect(), t = clamp(-r.top / (pin.offsetHeight - vh), 0, 1);
      problem.dataset.step = t < 0.12 ? 0 : t < 0.45 ? 1 : t < 0.7 ? 2 : 3;
    }
    if (active.has(leap)) { if (!geo) measure(); leapAt(reduce ? 1 : leapProgress()); }
    if (active.has(modelImg) && mqArc.matches && !reduce) modelImg.style.setProperty("--par", (-12 + 12 * prog(modelImg, 1, 0)).toFixed(2) + "%");
  }
  function onScroll() { if (!ticking && active.size) { ticking = true; requestAnimationFrame(frame); } }
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) active.add(e.target); else active.delete(e.target); });
      onScroll();
    });
    [hero, moment, problem, leap, modelImg].forEach(function (el) { if (el) io.observe(el); });
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  var rt; window.addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(function () { vh = window.innerHeight; if (geo) measure(); frame(); }, 120); });
  /* The leap's geometry is measured the first time it comes near the screen */
  if (reduce || !("IntersectionObserver" in window)) { if (problem) problem.dataset.step = 3; if (halo) halo.classList.add("is-on"); window.requestIdleCallback ? requestIdleCallback(function () { measure(); leapAt(1); }) : setTimeout(function () { measure(); leapAt(1); }, 200); }
  mqArc.addEventListener("change", function () { if (geo) measure(); frame(); });

  if (!reduce) { phases.forEach(function (ph, i) { ph.dataset.state = i === 0 ? "active" : "next"; }); steps.forEach(function (st, i) { st.dataset.state = i === 0 ? "active" : "next"; }); }

  /* Stepper / phase taps jump to that part of the leap */
  $$("[data-jump]").forEach(function (b) {
    b.addEventListener("click", function () {
      if (!geo) measure();
      var i = +b.dataset.jump, target = [0.15, 0.62, 0.95][i];
      if (geo && geo.arc && doc.classList.contains("can-pin")) {
        var top = leap.getBoundingClientRect().top + window.scrollY + target * (leap.offsetHeight - vh);
        window.scrollTo({ top: top, behavior: reduce ? "auto" : "smooth" });
      } else {
        var ph = phases[i]; var y = ph.getBoundingClientRect().top + window.scrollY - 0.6 * vh + 40;
        window.scrollTo({ top: y, behavior: reduce ? "auto" : "smooth" });
      }
    });
  });

  /* 07b How we do it: tap/click opens a card (one at a time); hover and focus are handled in CSS */
  var svcs = Array.prototype.slice.call(document.querySelectorAll(".svc"));
  /* Every card gets the height of the tallest open card, so rows never jump on hover */
  var svcGrid = document.querySelector(".svc-grid");
  function sizeCards() {
    if (!svcGrid) return;
    if (!window.matchMedia("(min-width: 700px)").matches) { svcGrid.style.removeProperty("--svc-min"); return; }
    var max = 0;
    svcs.forEach(function (c) { c.classList.add("measure"); });
    svcs.forEach(function (c) { max = Math.max(max, c.offsetHeight); });
    svcs.forEach(function (c) { c.classList.remove("measure"); });
    svcGrid.style.setProperty("--svc-min", Math.ceil(max) + "px");
  }
  if (svcGrid) {
    sizeCards();
    var svcT; window.addEventListener("resize", function () { clearTimeout(svcT); svcT = setTimeout(sizeCards, 150); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(sizeCards);
  }
  svcs.forEach(function (card) {
    var btn = card.querySelector(".svc-btn");
    if (!btn) return;
    btn.addEventListener("click", function () {
      var open = !card.classList.contains("is-open");
      svcs.forEach(function (c) { c.classList.remove("is-open"); var b = c.querySelector(".svc-btn"); if (b) b.setAttribute("aria-expanded", "false"); });
      if (open) { card.classList.add("is-open"); btn.setAttribute("aria-expanded", "true"); }
    });
  });

  /* How we work: the ball advances along the leap as the page scrolls */
  var jump = document.querySelector(".jump");
  if (jump && !reduce) {
    var jPath = jump.querySelector(".jump-path"), jLand = jump.querySelector(".jump-land"), jDot = jump.querySelector(".jump-dot"),
        jCols = [].slice.call(jump.querySelectorAll(".jump-col")), jList = jump.querySelector(".jump-cols"), jRail = jump.querySelector(".jump-rail"),
        mqWide = window.matchMedia("(min-width: 1024px)"), mqPin = window.matchMedia("(min-width: 1024px) and (min-height: 820px)"),
        jLen = jPath.getTotalLength(), jTick = false;
    var clamp = function (v) { return v < 0 ? 0 : v > 1 ? 1 : v; };
    doc.classList.add("jump-live");
    var jTrack = jump.querySelector(".jump-track"), jPin = jump.querySelector(".jump-pin"), jBase = 0, jOver = -1, jPrevAcc = 0;
    var jUpdate = function () {
      jTick = false;
      var vh = window.innerHeight, p;
      var navH = (document.getElementById("nav") || {}).offsetHeight || 84, pinH = window.HOPacc && jBase ? jBase : (jBase = jPin.offsetHeight);
      /* the side quotes sit a little above the pin's box: count them so nothing tucks under the nav */
      if (jOver < 0) {
        var pt0 = jPin.getBoundingClientRect().top, mt = pt0;
        [].forEach.call(jPin.querySelectorAll(".lhl"), function (e) { var t = e.getBoundingClientRect().top; if (t < mt) mt = t; });
        jOver = Math.max(0, Math.ceil(pt0 - mt));
      }
      var minTop = navH + 32 + jOver, padB = 48;
      /* sit 128px down when there is room, otherwise just under the nav, so laptops pin too */
      var topPx = Math.max(minTop, Math.min(128 + jOver, vh - pinH - padB));
      var canPin = mqWide.matches && minTop + pinH + padB <= vh;
      /* an open service row: the pinned graph slides up just enough to show it whole, with room above and
         below; if the screen is too short for that, it lets go and scrolls like the page, holding the row in place */
      var accX = window.HOPaccExtra || 0;
      if (accX && canPin) {
        if (minTop + pinH + accX + padB <= vh) topPx = Math.max(minTop, Math.min(topPx, vh - (pinH + accX) - padB));
        else canPin = false;
      }
      var was = doc.classList.contains("jump-pinned");
      var accChanged = accX !== jPrevAcc; jPrevAcc = accX;
      if (was !== canPin && accChanged) {
        var anc = jump.querySelector("[aria-expanded='true']") || document.activeElement, a0 = anc ? anc.getBoundingClientRect().top : 0;
        jPin.style.top = topPx + "px"; doc.classList.toggle("jump-pinned", canPin);
        if (anc) window.scrollBy(0, anc.getBoundingClientRect().top - a0);
      } else {
        jPin.style.top = topPx + "px";
        doc.classList.toggle("jump-pinned", canPin);
      }
      if (mqWide.matches) {
        if (canPin) { var tr = jTrack.getBoundingClientRect(); p = clamp((topPx - tr.top) / Math.max(1, tr.height - jPin.offsetHeight) * 1.08); }
        else {
          /* short screens: travel over most of a screen of scrolling */
          var sv = jump.querySelector(".jump-svg").getBoundingClientRect();
          var st = vh - sv.height - 24, en = navH + 8;
          p = clamp((st - sv.top) / Math.max(1, st - en));
        }
        var q = clamp(p / .94), pt = jPath.getPointAtLength(q * jLen);
        jDot.setAttribute("cx", pt.x.toFixed(1)); jDot.setAttribute("cy", pt.y.toFixed(1));
      } else {
        var lr = jList.getBoundingClientRect(), span = Math.max(1, jCols[2].offsetTop - 0);
        var y = clamp((vh * .6 - lr.top) / span) * span;
        jRail.style.setProperty("--rp", y.toFixed(1));
      }
    };
    var jReq = function () { if (!jTick) { jTick = true; requestAnimationFrame(jUpdate); } };
    window.addEventListener("scroll", jReq, { passive: true });
    window.addEventListener("resize", function () { jOver = -1; jReq(); });
    jUpdate();
  }
  /* Who we are: a dot on each partner opens their bio */
  var pm = document.getElementById("pmodal"), pdots = [].slice.call(document.querySelectorAll(".pdot"));
  if (pm && pdots.length && typeof pm.showModal === "function") {
    var partners = [
      { name: "Philip Jacobson", img: "/assets/img/philip-av.webp?v=1", email: "philip@hoppartners.pl", phone: "+48 571 357 205", li: "https://www.linkedin.com/in/philip-jacobson-2276556/",
        bio: "Philip was Chief Brand Officer at PE-backed Vimergy. For the last five years he has driven brand-led growth at scale-ups across categories, including Tylko, Autry and Chilly\u2019s. Before that, he spent a decade leading brand communication for Nike EMEA and was Global Head of Brand Creative at Maserati." },
      { name: "David Anson", img: "/assets/img/david-av.webp?v=1", email: "david@hoppartners.pl", phone: "+48 602 638 219", li: "https://www.linkedin.com/in/david-anson-9a08334/",
        bio: "David has led business at some of the world’s best agencies, most recently at BBH Singapore, and before that Saatchi & Saatchi London and Wieden+Kennedy Amsterdam, on brands like Samsung, Meta, Netflix and HSBC. He was also a brand creative lead at Nike UK." }
    ];
    var pmName = pm.querySelector(".pm-name"), pmBio = pm.querySelector(".pm-bio"),
        pmEm = pm.querySelector(".pm-em"), pmPh = pm.querySelector(".pm-ph"), pmLi = pm.querySelector(".pm-li"),
        pmNextN = pm.querySelector(".pm-next-n"), pmCur = 0, pmOpener = null;
    var fill = function (i) {
      var p = partners[i]; pmCur = i;
      pmName.textContent = p.name; var dot = document.createElement("span"); dot.className = "tdot"; dot.textContent = "."; pmName.appendChild(dot);
      pmBio.textContent = p.bio;
      /* full text on desktop, one-word actions on phones */
      var two = function (el, full, short) { el.textContent = ""; var f = document.createElement("span"); f.className = "pm-f"; f.textContent = full; var sh = document.createElement("span"); sh.className = "pm-s"; sh.textContent = short; el.appendChild(f); el.appendChild(sh); };
      two(pmEm, p.email, "Email"); pmEm.href = "mailto:" + p.email;
      two(pmPh, p.phone, "Call"); pmPh.href = "tel:" + p.phone.replace(/\s+/g, "");
      var av = pm.querySelector(".pm-av"); if (av && p.img) av.src = p.img;
      pmLi.href = p.li;
      pmNextN.textContent = partners[(i + 1) % partners.length].name;
      if (lang === "pl") translate(pm, "pl");
    };
    pdots.forEach(function (b) {
      b.addEventListener("click", function () {
        pmOpener = b; fill(parseInt(b.getAttribute("data-partner"), 10) || 0);
        pm.showModal(); doc.classList.add("pm-open");
        var x = pm.querySelector(".pm-x"); if (x) x.focus({ preventScroll: true });
      });
    });
    pm.querySelector(".pm-next").addEventListener("click", function () { fill((pmCur + 1) % partners.length); pmOpener = document.querySelector('.pdot[data-partner="' + pmCur + '"]') || pmOpener; });
    pm.querySelector(".pm-x").addEventListener("click", function () { pm.close(); });
    pm.addEventListener("click", function (e) { if (e.target === pm) pm.close(); });
    pm.addEventListener("close", function () { doc.classList.remove("pm-open"); if (pmOpener) pmOpener.focus({ preventScroll: true }); });
  }

  /* How we work: each service line expands in place to show its detail (one open at a time) */
  var sItems = [].slice.call(document.querySelectorAll(".jump-item"));
  if (sItems.length) {
    var leapSvcs = [
      ["Run-up", "Brand audit", "Know what you stand for.", "Find out what everyone thinks of your brand, from leadership, to entry level employees, to customers. Finding the gaps and re-defining it from the inside out first is non-negotiable. It makes everything else work."],
      ["Run-up", "Audience & segmentation research", "Know who you\u2019re for. Give them a reason.", "Anchor your brand strategy in the customer: understand their needs deeply and solve their problems better than anyone else."],
      ["Leap", "De-positioning", "Be the best solution.", "A clear customer value proposition that makes you the only choice in your market."],
      ["Leap", "Brand strategy", "Who you are. Where you\u2019re going.", "A framework that directs your effort and energy, focusing every action on what delivers competitive advantage that galvanises and inspires your team."],
      ["Leap", "Brand creative platform", "One big idea. Everything behind it.", "A single, memorable idea, expressed across every touchpoint, that becomes your identity and drives growth."],
      ["Land", "Brand identity & messaging", "An identity that matches your ambition. Words that sell it.", "Every message and experience, aligned to one consistent voice that builds coherence and trust."],
      ["Land", "The big idea made real", "Get their attention. Be remembered.", "Ideas people see, touch and taste, built to travel and proven to work."],
      ["Land", "Brand internationalisation", "Built to travel.", "A strategy for localising and globalising who you are, so you can win new markets and recruit new audiences."],
      ["Land", "Performance & optimisation", "Know what works. Spend on that.", "Brand and performance optimised in real time, cutting inefficient spend and maximising effectiveness."]
    ];
    var accCur = null, accTimer = null;
    var setOpen = function (b, open) {
      var panel = document.getElementById(b.getAttribute("aria-controls"));
      b.setAttribute("aria-expanded", open ? "true" : "false");
      b.classList.toggle("is-active", open);
      b.parentNode.classList.toggle("is-open", open);
      if (panel) { panel.classList.toggle("is-open", open); if (open) panel.removeAttribute("inert"); else panel.setAttribute("inert", ""); }
    };
    var settle = function () {
      /* the pinned graph keeps its closed height while a row is open or animating, so it never jumps */
      window.HOPacc = true; clearTimeout(accTimer);
      accTimer = setTimeout(function () { window.HOPacc = !!accCur; window.dispatchEvent(new Event("resize")); }, 650);
    };
    sItems.forEach(function (b) {
      var i = parseInt(b.getAttribute("data-svc"), 10) || 0, d = leapSvcs[i];
      if (!d) return;
      if (!b.id) b.id = "svc-b-" + i;
      var panel = document.createElement("div"); panel.className = "jump-acc"; panel.id = "svc-" + i;
      panel.setAttribute("role", "region"); panel.setAttribute("aria-labelledby", b.id); panel.setAttribute("inert", "");
      var inner = document.createElement("div"); inner.className = "jump-acc-in";
      var h = document.createElement("p"); h.className = "jump-acc-h"; h.textContent = d[2].slice(0, -1);
      var dot = document.createElement("span"); dot.className = "tdot"; dot.textContent = d[2].slice(-1); h.appendChild(dot);
      var t = document.createElement("p"); t.className = "jump-acc-p"; t.textContent = d[3];
      inner.appendChild(h); inner.appendChild(t); panel.appendChild(inner);
      b.parentNode.appendChild(panel);
      b.removeAttribute("aria-haspopup"); b.setAttribute("aria-controls", panel.id); b.setAttribute("aria-expanded", "false");
      b.addEventListener("click", function () {
        settle();
        if (accCur === b) { setOpen(b, false); accCur = null; window.HOPaccExtra = 0; window.dispatchEvent(new Event("resize")); return; }
        if (accCur) setOpen(accCur, false);
        setOpen(b, true); accCur = b;
        window.HOPaccExtra = inner.scrollHeight; window.dispatchEvent(new Event("resize"));
      });
    });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && accCur) { var b = accCur; settle(); setOpen(b, false); accCur = null; window.HOPaccExtra = 0; window.dispatchEvent(new Event("resize")); b.focus(); } });
  }

  /* Who we are title: each line fills in as you scroll */
  var whoH = document.querySelector(".who-h"), whoLines = whoH ? [].slice.call(whoH.querySelectorAll(".tl")) : [];
  if (whoLines.length && !reduce) {
    doc.classList.add("who-reveal");
    var whoTick = false;
    var whoUpd = function () {
      whoTick = false;
      var r = whoH.getBoundingClientRect(), vh = window.innerHeight;
      var p = (vh * .88 - r.top) / (vh * .88 - vh * .3 + r.height * .3);
      p = p < 0 ? 0 : p > 1 ? 1 : p;
      var n = whoLines.length;
      whoLines.forEach(function (l, k) { var t = p * n - k; t = t < 0 ? 0 : t > 1 ? 1 : t; l.style.setProperty("--wr", t.toFixed(3)); });
    };
    window.addEventListener("scroll", function () { if (!whoTick) { whoTick = true; requestAnimationFrame(whoUpd); } }, { passive: true });
    window.addEventListener("resize", whoUpd); whoUpd();
  }

  /* Headlines rise line by line from a mask when they come into view */
  var rises = [].slice.call(document.querySelectorAll("[data-rise]"));
  if (rises.length) {
    if (reduce || !("IntersectionObserver" in window)) rises.forEach(function (el) { el.classList.add("is-in"); });
    else {
      doc.classList.add("can-rise");
      var rio = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("is-in"); rio.unobserve(e.target); } }); }, { rootMargin: "0px 0px -12% 0px", threshold: .2 });
      rises.forEach(function (el) { rio.observe(el); });
    }
  }

  /* content built after the first language pass (service panels, letter) gets its Polish too */
  if (lang === "pl") { missing = 0; translate(document.body, "pl"); if (langNote) langNote.hidden = !(missing > 0); }

})();
