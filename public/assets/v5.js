/* HOP. V5 — client design feedback (4 Nov 2026)
   Loaded after v2.js. Hero statements + the leaping dot, nav "you are here",
   signposts, leap headlines, glass overlays. CSP-safe: no inline styles in
   markup; JS only sets CSSOM properties. */
(function () {
  "use strict";
  var doc = document.documentElement;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var mqDesk = window.matchMedia("(min-width: 1024px)");
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };

  /* ---------- Nav: House of Poland is "current" on its own pages ---------- */
  if (/^\/(articles|house-of-poland)(\/|$)/.test(location.pathname)) {
    $$('[data-page-link="articles"]').forEach(function (a) { a.setAttribute("aria-current", "page"); });
  }

  /* ---------- Signposts: rule draws in, the dot drops on it ---------- */
  var signs = $$(".sign:not(.sign--d)");
  if (signs.length) {
    if (reduce || !("IntersectionObserver" in window)) signs.forEach(function (s) { s.classList.add("in"); });
    else {
      var sio = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); sio.unobserve(e.target); } }); }, { rootMargin: "0px 0px -10% 0px" });
      signs.forEach(function (s) { sio.observe(s); });
    }
  }

  /* ---------- Hero: six statements, the red full stop leaps between them ---------- */
  var hero = $(".hero5"), hs = $("#hs");
  if (hero && hs) {
    var items = $$(".hs-i", hs), segs = $$(".hs-seg", hero), dot = $(".hs-dot", hs),
        curN = $(".hs-cur", hero), pauseBtn = $(".hs-pause", hero), body = $(".hero5-body", hero);
    var cur = 0, userPaused = false, hover = false, offscreen = false, flight = null, hideT = null;
    doc.classList.add("hs-live");

    /* split each statement into words, each inside its own mask; the stop rides with the last word */
    items.forEach(function (p) {
      var i = 0;
      (function walk(node) {
        Array.prototype.slice.call(node.childNodes).forEach(function (n) {
          if (n.nodeType === 3) {
            var frag = document.createDocumentFragment();
            n.nodeValue.split(/(\s+)/).forEach(function (part) {
              if (!part) return;
              if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(" ")); return; }
              var w = document.createElement("span"); w.className = "w";
              var wi = document.createElement("span"); wi.className = "wi"; wi.style.setProperty("--i", i++); wi.textContent = part;
              w.appendChild(wi); frag.appendChild(w);
            });
            node.replaceChild(frag, n);
          } else if (n.nodeType === 1 && !n.classList.contains("hs-stop")) walk(n);
        });
      })(p);
      var stop = $(".hs-stop", p), words = $$(".w", p), last = words[words.length - 1];
      if (stop && last) last.appendChild(stop);
    });

    /* where the full stop sits, relative to the statements box */
    var at = function (i) {
      var st = $(".hs-stop", items[i]); if (!st) return { x: 0, y: 0 };
      var r = st.getBoundingClientRect(), h = hs.getBoundingClientRect();
      var fs = parseFloat(getComputedStyle(items[i]).fontSize) || 80;
      return { x: r.left - h.left + r.width * .42, y: r.top - h.top + fs * .705 };
    };
    var put = function (p) {
      var d = dot.offsetWidth / 2;
      dot.style.transform = "translate(" + (p.x - d).toFixed(1) + "px," + (p.y - d).toFixed(1) + "px)";
      dot.classList.add("is-placed");
    };
    /* a leap, not a bounce: crouch, a long arc, a squash on landing */
    var leap = function (a, b, dur, delay, done) {
      if (flight) flight.cancel();
      var d = dot.offsetWidth / 2, ax = a.x - d, ay = a.y - d, bx = b.x - d, by = b.y - d;
      var span = Math.hypot(bx - ax, by - ay);
      var cx = (ax + bx) / 2, cy = Math.min(ay, by) - clamp(span * .38, 70, 260);
      var T = function (x, y, s) { return "translate(" + x.toFixed(1) + "px," + y.toFixed(1) + "px)" + (s || ""); };
      var kf = [{ offset: 0, transform: T(ax, ay) }, { offset: .1, transform: T(ax, ay + 3, " scale(1.22,.8)") }];
      for (var k = 1; k <= 16; k++) {
        var t = k / 16, e = t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2, u = 1 - e;
        kf.push({ offset: .14 + .72 * t, transform: T(u * u * ax + 2 * u * e * cx + e * e * bx, u * u * ay + 2 * u * e * cy + e * e * by, k === 8 ? " scale(.94,1.07)" : "") });
      }
      kf.push({ offset: .92, transform: T(bx, by + 2, " scale(1.2,.82)") }, { offset: 1, transform: T(bx, by) });
      dot.classList.add("is-placed");
      flight = dot.animate(kf, { duration: dur, delay: delay || 0, easing: "linear", fill: "forwards" });
      flight.onfinish = function () { put(b); flight.cancel(); flight = null; if (done) done(); };
    };

    var arm = function () { hero.removeAttribute("data-run"); void hero.offsetWidth; hero.setAttribute("data-run", ""); };
    var syncPause = function () { hero.classList.toggle("is-paused", userPaused || hover || offscreen || document.hidden); };

    var go = function (n, user) {
      if (n === cur) { if (user) arm(); return; }
      var prev = cur, a = at(prev); cur = n;
      clearTimeout(hideT);
      items.forEach(function (p, k) { if (k !== prev && k !== n) { p.classList.remove("is-on", "is-in", "is-out"); p.setAttribute("aria-hidden", "true"); } });
      items[prev].classList.remove("is-in"); items[prev].classList.add("is-out"); items[prev].setAttribute("aria-hidden", "true");
      hideT = setTimeout(function () { items[prev].classList.remove("is-on", "is-out"); }, reduce ? 0 : 520);
      var ni = items[n]; ni.classList.remove("is-out", "is-in"); ni.classList.add("is-on"); ni.removeAttribute("aria-hidden");
      void ni.offsetWidth;
      setTimeout(function () { ni.classList.add("is-in"); }, reduce ? 0 : 300);
      var b = at(n);
      if (reduce) put(b); else leap(a, b, 1150, 80);
      segs.forEach(function (s, k) { if (k === n) s.setAttribute("aria-current", "true"); else s.removeAttribute("aria-current"); s.tabIndex = k === n ? 0 : -1; });
      if (curN) curN.textContent = (n < 9 ? "0" : "") + (n + 1);
      hs.setAttribute("aria-live", user ? "polite" : "off");
      arm();
    };

    segs.forEach(function (s, k) { s.tabIndex = k === 0 ? 0 : -1; });
    segs.forEach(function (s, k) {
      s.addEventListener("click", function () { go(k, true); });
      s.addEventListener("keydown", function (e) {
        var d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0; if (!d) return;
        e.preventDefault(); var n = (k + d + segs.length) % segs.length; segs[n].focus(); go(n, true);
      });
      s.querySelector("i").addEventListener("animationend", function (e) {
        if (e.animationName === "segfill" && s.getAttribute("aria-current") === "true") go((cur + 1) % items.length);
      });
    });
    if (pauseBtn) pauseBtn.addEventListener("click", function () {
      userPaused = !userPaused;
      pauseBtn.setAttribute("aria-pressed", String(userPaused));
      pauseBtn.setAttribute("aria-label", userPaused ? "Play the statements" : "Pause the statements");
      syncPause();
    });
    if (body && window.matchMedia("(hover: hover)").matches) {
      body.addEventListener("mouseenter", function () { hover = true; syncPause(); });
      body.addEventListener("mouseleave", function () { hover = false; syncPause(); });
    }
    if ("IntersectionObserver" in window) new IntersectionObserver(function (es) { offscreen = !es[0].isIntersecting; syncPause(); }, { threshold: .15 }).observe(hero);
    document.addEventListener("visibilitychange", syncPause);
    if (reduce) doc.style.setProperty("--hold", "5s");

    /* first statement: the dot leaps out of the logo and lands as its full stop */
    var start = function () {
      var first = items[0], b = at(0);
      first.classList.add("is-on");
      var logoDot = $(".nav-logo .logo-dot"), lr = logoDot && logoDot.getBoundingClientRect();
      var fromLogo = !reduce && window.scrollY < 40 && lr && lr.width > 0;
      requestAnimationFrame(function () {
        first.classList.add("is-in");
        if (!fromLogo) { put(b); arm(); return; }
        var h = hs.getBoundingClientRect();
        var a = { x: lr.left + lr.width / 2 - h.left, y: lr.top + lr.height / 2 - h.top };
        dot.style.width = dot.style.height = Math.max(6, lr.width) + "px";
        put(a); logoDot.style.opacity = "0";
        setTimeout(function () {
          /* grow to the statement's size mid-flight */
          dot.style.transition = "width .9s cubic-bezier(.16,1,.3,1), height .9s cubic-bezier(.16,1,.3,1)";
          dot.style.width = dot.style.height = "";
          var b2 = at(0);
          leap(a, b2, 1300, 0, function () { dot.style.transition = ""; });
          setTimeout(function () { logoDot.style.transition = "opacity .8s ease"; logoDot.style.opacity = ""; }, 1500);
          arm();
        }, 520);
      });
    };
    var ready = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
    ready.then(start, start);
    /* language switch rewrites the text: re-seat the dot on the new full stop */
    document.addEventListener("click", function (e) { if (e.target.closest && e.target.closest(".lang button")) setTimeout(function () { if (!flight) put(at(cur)); }, 80); });
    var rz; window.addEventListener("resize", function () { clearTimeout(rz); rz = setTimeout(function () { if (!flight) put(at(cur)); }, 120); });
  }

  /* ---------- How we do it: the leap headlines land as the dot passes ---------- */
  /* phones: the headlines sit above the rail, outside the wrap the rail measures */
  var lhls = $(".lhls"), jWrap = $(".jump-wrap");
  if (lhls && jWrap) {
    var seat = function () {
      if (mqDesk.matches) { if (lhls.parentNode !== jWrap) jWrap.insertBefore(lhls, jWrap.firstChild); }
      else if (lhls.parentNode === jWrap) jWrap.parentNode.insertBefore(lhls, jWrap);
    };
    seat(); mqDesk.addEventListener && mqDesk.addEventListener("change", seat);
  }
  var jDot = $(".jump-dot"), lL = $(".lhl--l"), lR = $(".lhl--r");
  if (jDot && lL && lR) {
    var lUpd = function () {
      var live = doc.classList.contains("jump-live") && mqDesk.matches;
      var x = parseFloat(jDot.getAttribute("cx")) || 0;
      lL.classList.toggle("is-on", !live || x > 470);
      lR.classList.toggle("is-on", !live || x > 1000);
    };
    if ("MutationObserver" in window) new MutationObserver(lUpd).observe(jDot, { attributes: true, attributeFilter: ["cx"] });
    mqDesk.addEventListener && mqDesk.addEventListener("change", lUpd);
    lUpd();
  }

  /* ---------- Who we are: the bio opens as glass beside the dot ---------- */
  var pm = $("#pmodal"), duo = $(".duo");
  if (pm && duo) {
    var pdots = $$(".pdot", duo), opener = null;
    var mark = function (d) {
      duo.classList.add("is-focus");
      pdots.forEach(function (p) { p.classList.toggle("is-active", p === d); p.classList.toggle("is-dim", p !== d); });
    };
    var place = function (d) {
      if (!d) return;
      mark(d);
      if (!mqDesk.matches) { pm.classList.remove("is-anchored"); pm.style.left = pm.style.top = pm.style.width = pm.style.transformOrigin = ""; return; }
      pm.classList.add("is-anchored");
      var dr = (d.querySelector(".pdot-c") || d).getBoundingClientRect(), fr = duo.getBoundingClientRect();
      var gap = 30, vw = window.innerWidth, vh = window.innerHeight, edge = Math.min(fr.right, vw) - 16, lim = Math.max(fr.left, 0) + 16;
      var availR = edge - (dr.right + gap), availL = (dr.left - gap) - lim, side, left, w;
      /* sit beside the dot inside the photo, preferring the open side; never over the other partner if avoidable */
      if (availR >= 320) { w = Math.min(380, availR); side = "left"; }
      else if (availL >= 320) { w = Math.min(380, availL); side = "right"; }
      else { w = 360; side = availR >= availL ? "left" : "right"; }
      pm.style.width = w + "px";
      var h = pm.offsetHeight;
      left = side === "left" ? dr.right + gap : dr.left - gap - w;
      left = clamp(left, 16, vw - w - 16);
      var top = dr.top + dr.height / 2 - h * .32;
      top = clamp(top, Math.max(16, fr.top + 16), Math.max(16, Math.min(vh, fr.bottom) - h - 16));
      top = clamp(top, 16, Math.max(16, vh - h - 16));
      pm.style.left = left + "px"; pm.style.top = top + "px";
      pm.style.transformOrigin = side + " " + clamp(dr.top + dr.height / 2 - top, 0, h) + "px";
    };
    var byName = function () {
      var n = (pm.querySelector(".pm-name") || {}).textContent || "";
      return /Philip/.test(n) ? duo.querySelector('.pdot[data-partner="0"]') : duo.querySelector('.pdot[data-partner="1"]');
    };
    pdots.forEach(function (d) { d.addEventListener("click", function () { opener = d; requestAnimationFrame(function () { place(d); }); }); });
    var nx = pm.querySelector(".pm-next"); if (nx) nx.addEventListener("click", function () { requestAnimationFrame(function () { place(byName()); }); });
    pm.addEventListener("close", function () {
      duo.classList.remove("is-focus"); pdots.forEach(function (p) { p.classList.remove("is-active", "is-dim"); });
      pm.classList.remove("is-anchored"); pm.style.width = "";
    });
    window.addEventListener("resize", function () { if (pm.open) place(byName()); });
  }

  /* ---------- How we do it: the open service stays marked in the graph ---------- */
  var sm = $("#smodal");
  if (sm) {
    var sItems = $$(".jump-item"), markSvc = function () {
      var name = ((sm.querySelector(".sm-svc") || {}).textContent || "").split("\u00b7").pop().trim();
      sItems.forEach(function (b) { b.classList.toggle("is-active", sm.open && b.textContent.trim() === name); });
    };
    sItems.forEach(function (b) { b.addEventListener("click", function () { requestAnimationFrame(markSvc); }); });
    var snx = sm.querySelector(".pm-next"); if (snx) snx.addEventListener("click", function () { requestAnimationFrame(markSvc); });
    sm.addEventListener("close", function () { sItems.forEach(function (b) { b.classList.remove("is-active"); }); });
  }
})();
