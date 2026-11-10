/* HOP. V5 — client design feedback (4 Nov 2026), round 2 (5 Nov)
   Loaded after v2.js. Hero statements (kinetic type punctuated by the dot),
   signposts, leap headlines, glass overlays. Nav and footer are untouched.
   CSP-safe: no inline styles in markup; JS only sets CSSOM properties. */
(function () {
  "use strict";
  var doc = document.documentElement;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var mqDesk = window.matchMedia("(min-width: 1024px)");
  var fine = window.matchMedia("(hover: hover) and (pointer: fine)");
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };

  /* ---------- Signposts: rule draws in, the dot drops on it ---------- */
  var signs = $$(".sign:not(.sign--d)");
  if (signs.length) {
    if (reduce || !("IntersectionObserver" in window)) signs.forEach(function (s) { s.classList.add("in"); });
    else {
      var sio = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); sio.unobserve(e.target); } }); }, { rootMargin: "0px 0px -10% 0px" });
      signs.forEach(function (s) { sio.observe(s); });
    }
  }

  /* ---------- Intro: hop. → into the nav, curtain lifts ----------
     ≈2.8s, homepage, once per visit (decided in <head> by intro5.js). Click or any key skips.
     Beats: 0 the hop. letters resolve from blur while the red dot hops down onto its place ·
     1.05s the wordmark hops · 1.75s it flies into the nav while the rug curtain lifts · ~2.8s site. */
  var introDone = Promise.resolve();
  var i5 = $("#i5");
  if (i5 && doc.classList.contains("i5-on") && "animate" in Element.prototype) {
    introDone = new Promise(function (resolve) {
      var bg = $(".i5-bg", i5), stage = $(".i5-stage", i5), logo = $(".i5-logo", i5),
          idot = $(".i5-dot", i5), anims = [], timers = [], ended = false;
      var A = function (el, kf, o) { var a = el.animate(kf, Object.assign({ fill: "forwards" }, o)); anims.push(a); return a; };
      var later = function (fn, ms) { timers.push(setTimeout(fn, ms)); };
      var released = false;
      /* let the hero start writing while the curtain is still lifting, so there is no dead beat */
      var release = function () { if (released) return; released = true; resolve(); setTimeout(function () { doc.classList.remove("cb-wait"); }, 700); };
      var end = function (fast) {
        if (ended) return; ended = true;
        timers.forEach(clearTimeout);
        if (fast) release();
        var out = i5.animate([{ opacity: 1 }, { opacity: 0 }], { duration: fast ? 320 : 180, easing: "ease-out", fill: "forwards" });
        out.onfinish = function () { doc.classList.remove("i5-on"); if (i5.parentNode) i5.parentNode.removeChild(i5); release(); };
      };
      doc.classList.add("cb-wait");
      var skip = function () { end(true); };
      i5.addEventListener("pointerdown", skip);
      window.addEventListener("keydown", skip, { once: true });
      later(function () { end(true); }, 5600); /* before the CSS failsafe at 6s */

      var lw, lh;
      var run = function () {
        var cx = window.innerWidth / 2, cy = window.innerHeight / 2;
        lw = Math.min(window.innerWidth * .5, 340) * 544 / 516; lh = lw * 284 / 544;
        logo.style.width = lw + "px"; logo.style.height = lh + "px";
        logo.style.left = (-lw / 2) + "px"; logo.style.top = (-lh / 2) + "px";
        logo.style.transformOrigin = "50% 50%";
        /* the letters resolve; the dot drops onto its place with a small hop */
        A(logo, [{ opacity: 0, transform: "translate(0,10px) scale(1.035)" }, { opacity: 1, transform: "translate(0,0) scale(1)" }], { duration: 760, easing: "cubic-bezier(.16,1,.3,1)" });
        var ds = lw * 71.76 / 544, bx = -lw / 2 + lw * (512.90 - 8) / 544, by = -lh / 2 + lh * (200.47 - 10) / 284, up = Math.max(lh * 1.35, 96);
        idot.style.width = idot.style.height = ds + "px";
        var T = function (y, sx, sy) { return "translate(" + (bx - ds / 2).toFixed(1) + "px," + (y - ds / 2).toFixed(1) + "px) scale(" + sx + "," + sy + ")"; };
        A(idot, [
          { offset: 0, transform: T(by - up, .9, 1.1), opacity: 0 },
          { offset: .18, transform: T(by - up, .9, 1.1), opacity: 1 },
          { offset: .55, transform: T(by, .92, 1.08), opacity: 1, easing: "cubic-bezier(.5,0,.75,0)" },
          { offset: .64, transform: T(by + 2, 1.28, .76), opacity: 1 },
          { offset: .8, transform: T(by - up * .26, .94, 1.06), opacity: 1 },
          { offset: .92, transform: T(by + 1, 1.1, .9), opacity: 1 },
          { offset: 1, transform: T(by, 1, 1), opacity: 1 }
        ], { duration: 900, delay: 180, easing: "cubic-bezier(.33,0,.2,1)" });
        /* then the whole wordmark hops: crouch, spring up, land with a squash */
        var j = Math.max(lh * .3, 26), hop = [
          { offset: 0, transform: "translate(0,0) scale(1,1)" },
          { offset: .16, transform: "translate(0," + (lh * .03).toFixed(1) + "px) scale(1.04,.93)" },
          { offset: .5, transform: "translate(0," + (-j).toFixed(1) + "px) scale(.98,1.04)", easing: "cubic-bezier(.4,0,.8,.4)" },
          { offset: .8, transform: "translate(0," + (lh * .02).toFixed(1) + "px) scale(1.05,.92)" },
          { offset: 1, transform: "translate(0,0) scale(1,1)" }];
        var hopOpts = { duration: 640, delay: 860, easing: "cubic-bezier(.33,0,.25,1)", composite: "add" };
        try { A(logo, hop, hopOpts); A(idot, hop.map(function (k) { return { offset: k.offset, transform: k.transform.replace(/ scale\([^)]*\)/, ""), easing: k.easing }; }), hopOpts); } catch (e) {}
        later(function () { fly(lw, lh); }, 1540);
      };
      var fly = function (lw, lh) {
        var nl = $(".nav-logo svg"), cx = window.innerWidth / 2, cy = window.innerHeight / 2;
        var nr = nl ? nl.getBoundingClientRect() : { left: cx - 40, top: 20, width: 80 };
        var s = nr.width / lw, tx = nr.left - (cx - s * lw / 2), ty = nr.top - (cy - s * lh / 2);
        /* the nav's own full stop restarts its rhythm now, so it is resting when the wordmark lands on it */
        var nd = $(".nav-logo .nav-dot"); if (nd) { nd.style.animation = "none"; void nd.getBoundingClientRect(); nd.style.animation = ""; }
        /* one move: the wordmark glides into the nav while the curtain slides up (transforms only: smooth on phones) */
        A(stage, [{ transform: "translate(0px,0px) scale(1)" }, { transform: "translate(" + tx.toFixed(1) + "px," + ty.toFixed(1) + "px) scale(" + s.toFixed(4) + ")" }], { duration: 1000, easing: "cubic-bezier(.65,0,.18,1)" });
        A(bg, [{ transform: "translate3d(0,0,0)" }, { transform: "translate3d(0,-100%,0)" }], { duration: 1000, delay: 90, easing: "cubic-bezier(.7,0,.2,1)" })
          .onfinish = function () { end(false); };
        later(release, 420);
      };
      var go5 = function () { if (!ended) run(); };
      var f = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
      Promise.race([f, new Promise(function (r) { setTimeout(r, 1200); })]).then(go5, go5);
    });
  } else if (i5) { doc.classList.remove("i5-on"); }

  /* ---------- Hero: six statements — kinetic type, punctuated by the dot ---------- */
  var hero = $(".hero5"), hs = $("#hs");
  if (hero && hs && "animate" in Element.prototype) {
    var items = $$(".hs-i", hs), segs = $$(".hs-seg", hero), fx = $(".hs-fx", hs),
        dot = $(".hs-dot", hs), ring = $(".hs-ring", hs), ghosts = $$(".hs-ghost", hs),
        curN = $(".hs-cur", hero), pauseBtn = $(".hs-pause", hero), body = $(".hero5-body", hero);
    var EN = items.map(function (p) { return p.innerHTML; });
    var cur = 0, userPaused = false, offscreen = false, flight = [], hideT = null, busy = false;
    doc.classList.add("hs-live");

    /* Build a statement: an sr-only sentence for assistive tech, and a visual copy
       split into words (inline-blocks that rise) and letters (inline spans that
       resolve from blur, so kerning survives). The full stop rides with the last word. */
    var build = function (p, html) {
      var tmp = document.createElement("p"); tmp.innerHTML = html;
      if (window.HOPv2 && HOPv2.lang && HOPv2.lang() === "pl") HOPv2.translate(tmp);
      var text = tmp.textContent.replace(/\s+/g, " ").trim();
      var vis = document.createElement("span"); vis.className = "hs-v"; vis.setAttribute("aria-hidden", "true");
      var words = [], chars = [];
      (function walk(src, dest) {
        Array.prototype.slice.call(src.childNodes).forEach(function (n) {
          if (n.nodeType === 3) {
            n.nodeValue.split(/(\s+)/).forEach(function (part) {
              if (!part) return;
              if (/^\s+$/.test(part)) { dest.appendChild(document.createTextNode(" ")); return; }
              var w = document.createElement("span"); w.className = "w";
              for (var k = 0; k < part.length; k++) { var c = document.createElement("span"); c.className = "c"; c.textContent = part[k]; w.appendChild(c); chars.push(c); }
              dest.appendChild(w); words.push(w);
            });
          } else if (n.nodeType === 1) {
            if (n.classList.contains("hs-stop")) { var st = n.cloneNode(true); var b = document.createElement("span"); b.className = "hs-base"; st.appendChild(b); dest.appendChild(st); return; }
            var e = n.cloneNode(false); dest.appendChild(e); walk(n, e);
          }
        });
      })(tmp, vis);
      var stop = vis.querySelector(".hs-stop"), last = words[words.length - 1];
      if (stop && last) last.appendChild(stop);
      /* timing: the line writes itself over ~360ms; the last letter resolves as the dot lands */
      var wn = Math.max(1, words.length - 1), cn = Math.max(1, chars.length - 1);
      words.forEach(function (w, i) { w.style.setProperty("--wd", Math.round(i / wn * 300) + "ms"); w.style.setProperty("--wo", Math.round(i / wn * 120) + "ms"); });
      chars.forEach(function (c, i) { c.style.setProperty("--cd", Math.round(i / cn * 380) + "ms"); c.style.setProperty("--co", Math.round(i / cn * 160) + "ms"); });
      var sr = document.createElement("span"); sr.className = "sr-only"; sr.textContent = text;
      p.textContent = ""; p.appendChild(sr); p.appendChild(vis);
    };
    items.forEach(function (p, i) { build(p, EN[i]); });

    /* the full stop's centre, from layout (ignores transforms, so parallax and rises never skew it) */
    var at = function (i) {
      var st = $(".hs-stop", items[i]), base = st && $(".hs-base", st);
      if (!st || !base) return { x: 0, y: 0 };
      var x = 0, y = 0, n = base;
      while (n && n !== hs) { x += n.offsetLeft; y += n.offsetTop; n = n.offsetParent; }
      var sx = 0, m = st; while (m && m !== hs) { sx += m.offsetLeft; m = m.offsetParent; }
      var fs = parseFloat(getComputedStyle(hs).fontSize) || 80;
      var it = st.closest("em") || (st.parentNode && st.parentNode.closest && st.parentNode.closest("em"));
      return { x: sx + st.offsetWidth * .46 + (it ? fs * .035 : 0), y: y - fs * .078 };
    };
    var T = function (x, y, s) { return "translate(" + x.toFixed(1) + "px," + y.toFixed(1) + "px)" + (s || ""); };
    var half = function () { return dot.offsetWidth / 2; };
    var put = function (p) { var d = half(); dot.style.transform = T(p.x - d, p.y - d); dot.classList.add("is-placed"); };
    var stopAll = function () { flight.forEach(function (a) { a.cancel(); }); flight = []; };

    /* the leap: crouch → long arc (eased in time, not just in space) → squash on landing.
       Three trailing dots smear the motion; a ripple marks the landing. */
    var leap = function (a, b, dur, delay, opts) {
      stopAll(); opts = opts || {};
      var d = half(), ax = a.x - d, ay = a.y - d, bx = b.x - d, by = b.y - d;
      var span = Math.hypot(bx - ax, by - ay), fs = parseFloat(getComputedStyle(hs).fontSize) || 80;
      var cx = (ax + bx) / 2 + (bx - ax) * .08, cy = Math.min(ay, by) - clamp(span * .42, fs * .9, fs * 3.2);
      var kf = [{ offset: 0, transform: T(ax, ay), opacity: opts.fadeIn ? 0 : 1 },
                { offset: .1, transform: T(ax, ay + d * .3, " scale(1.28,.74)"), opacity: 1 }];
      for (var k = 1; k <= 20; k++) {
        var t = k / 20, e = t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2, u = 1 - e;
        var x = u * u * ax + 2 * u * e * cx + e * e * bx, y = u * u * ay + 2 * u * e * cy + e * e * by;
        var st = t < .25 ? " scale(.9,1.14)" : t > .8 ? " scale(.94,1.08)" : "";
        kf.push({ offset: .14 + .74 * t, transform: T(x, y, st), opacity: 1 });
      }
      kf.push({ offset: .93, transform: T(bx, by + d * .25, " scale(1.3,.72)"), opacity: 1 }, { offset: 1, transform: T(bx, by), opacity: 1 });
      dot.classList.add("is-placed");
      var main = dot.animate(kf, { duration: dur, delay: delay || 0, easing: "linear", fill: "both" });
      flight.push(main);
      ghosts.forEach(function (g, i) {
        var o = [.32, .2, .1][i], s = [" scale(.82)", " scale(.66)", " scale(.5)"][i];
        var gk = kf.map(function (f) { return { offset: f.offset, transform: f.transform.replace(/ scale\([^)]*\)/, "") + s, opacity: f.offset > .14 && f.offset < .88 ? o : 0 }; });
        flight.push(g.animate(gk, { duration: dur, delay: (delay || 0) + 34 * (i + 1), easing: "linear", fill: "both" }));
      });
      main.onfinish = function () {
        put(b); stopAll();
        ring.animate([{ transform: T(bx, by, " scale(.8)"), opacity: .75 }, { transform: T(bx, by, " scale(4.2)"), opacity: 0 }], { duration: 760, easing: "cubic-bezier(.16,1,.3,1)" });
        var v = $(".hs-v", items[cur]);
        if (v) v.animate([{ transform: "translateY(0)" }, { transform: "translateY(" + (fs * .028).toFixed(1) + "px)", offset: .3 }, { transform: "translateY(0)" }], { duration: 420, easing: "cubic-bezier(.3,.7,.3,1)", composite: "add" });
        if (opts.done) opts.done();
      };
    };

    var arm = function () { hero.removeAttribute("data-run"); void hero.offsetWidth; hero.setAttribute("data-run", ""); };
    /* the cover line hugs the last line of the statement on screen (2 or 3 lines), gliding as they change */
    var tag = $(".hero5-tag", hero);
    var seatTag = function () { if (!tag) return; var low = getComputedStyle(items[cur]).alignSelf === "end"; var lift = low ? 0 : Math.max(0, (hs.offsetHeight - items[cur].offsetHeight) / 2); tag.style.setProperty("--lift", lift.toFixed(1) + "px"); };
    var syncPause = function () { hero.classList.toggle("is-paused", userPaused || offscreen || document.hidden); };

    var go = function (n, user) {
      if (n === cur) { if (user) arm(); return; }
      var prev = cur, a = at(prev); cur = n;
      clearTimeout(hideT);
      items.forEach(function (p, k) { if (k !== prev && k !== n) { p.classList.remove("is-on", "is-in", "is-out"); p.setAttribute("aria-hidden", "true"); } });
      var po = items[prev]; po.classList.remove("is-in"); po.classList.add("is-out"); po.setAttribute("aria-hidden", "true");
      hideT = setTimeout(function () { po.classList.remove("is-on", "is-out"); }, reduce ? 0 : 700);
      var ni = items[n]; ni.classList.remove("is-out", "is-in"); ni.classList.add("is-on"); ni.removeAttribute("aria-hidden");
      void ni.offsetWidth;
      var b = at(n);
      if (reduce) { ni.classList.add("is-in"); put(b); }
      else { setTimeout(function () { ni.classList.add("is-in"); seatTag(); }, 240); leap(a, b, 980, 60); }
      if (reduce) seatTag();
      segs.forEach(function (s, k) { if (k === n) s.setAttribute("aria-current", "true"); else s.removeAttribute("aria-current"); s.tabIndex = k === n ? 0 : -1; });
      if (curN) curN.textContent = (n < 9 ? "0" : "") + (n + 1);
      hs.setAttribute("aria-live", user ? "polite" : "off");
      $$(".hs-pg-d i", hero).forEach(function (d, k) { d.classList.toggle("is-on", k === n); });
      if (user) hero.classList.add("is-tapped");
      arm();
    };

    segs.forEach(function (s, k) { s.tabIndex = k === 0 ? 0 : -1; });
    segs.forEach(function (s, k) {
      s.addEventListener("click", function () { go(k, true); });
      s.addEventListener("keydown", function (e) {
        var d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0; if (!d) return;
        e.preventDefault(); var n = (k + d + segs.length) % segs.length; segs[n].focus(); go(n, true);
      });
    });
    var clock = $(".hs-clock", hero);
    if (clock) clock.addEventListener("animationend", function (e) { if (e.animationName === "segfill") go((cur + 1) % items.length); });
    /* tap/click the statement: leap to the next one */
    hs.addEventListener("click", function (e) { if (e.target.closest(".hs-i.is-on")) go((cur + 1) % items.length, true); });
    if (pauseBtn) pauseBtn.addEventListener("click", function () {
      userPaused = !userPaused;
      pauseBtn.setAttribute("aria-pressed", String(userPaused));
      pauseBtn.setAttribute("aria-label", userPaused ? "Play the statements" : "Pause the statements");
      var pt = pauseBtn.querySelector(".hs-pause-t"); if (pt) pt.textContent = userPaused ? "Play" : "Pause";
      syncPause();
    });
    if ("IntersectionObserver" in window) new IntersectionObserver(function (es) { offscreen = !es[0].isIntersecting; syncPause(); }, { threshold: .15 }).observe(hero);
    document.addEventListener("visibilitychange", syncPause);
    if (reduce) doc.style.setProperty("--hold", "5s");

    /* depth: scroll focus-pull (desktop only: on touch screens a scroll-linked blur on the headline fights momentum scrolling) */
    if (!reduce && !window.matchMedia("(hover: none), (max-width: 1023px)").matches) {
      var tx = 0, ty = 0, px = 0, py = 0, raf = 0;
      var tick = function () {
        px += (tx - px) * .08; py += (ty - py) * .08;
        hero.style.setProperty("--px", px.toFixed(3)); hero.style.setProperty("--py", py.toFixed(3));
        raf = Math.abs(tx - px) + Math.abs(ty - py) > .002 ? requestAnimationFrame(tick) : 0;
      };
      /* (pointer parallax removed: the statement stays still under the cursor) */
      var sTick = false;
      var onScroll = function () { sTick = false; var h = hero.offsetHeight || 1; var sp = clamp(window.scrollY / (h * .85), 0, 1); hero.style.setProperty("--sp", sp.toFixed(3)); };
      window.addEventListener("scroll", function () { if (!sTick) { sTick = true; requestAnimationFrame(onScroll); } }, { passive: true });
      onScroll();
    }

    /* first statement: it writes itself, and the dot drops in from above to end it */
    var start = function () {
      var first = items[0], b = at(0), fs = parseFloat(getComputedStyle(hs).fontSize) || 80;
      first.classList.add("is-on"); hero.classList.add("tag-still"); seatTag(); void hero.offsetWidth; hero.classList.remove("tag-still");
      if (reduce || window.scrollY > 40) { first.classList.add("is-in"); put(b); arm(); return; }
      requestAnimationFrame(function () {
        setTimeout(function () { first.classList.add("is-in"); }, 120);
        leap({ x: b.x - fs * 1.6, y: b.y - fs * 2.4 }, b, 1000, 300, { fadeIn: true });
        arm();
      });
    };
    var ready = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
    ready.then(function () { return introDone; }).then(start, start);

    /* language switch: rebuild every statement in the new language, keep state */
    document.addEventListener("click", function (e) {
      if (!(e.target.closest && e.target.closest(".lang button"))) return;
      setTimeout(function () { items.forEach(function (p, i) { build(p, EN[i]); }); if (!flight.length) put(at(cur)); seatTag(); }, 0);
    });
    var rz; window.addEventListener("resize", function () { clearTimeout(rz); rz = setTimeout(function () { if (!flight.length) put(at(cur)); seatTag(); }, 120); });
  }

  /* ---------- How we do it: the leap headlines land as the dot passes ---------- */
  /* phones: the headlines sit above the rail, outside the wrap the rail measures */
  var lhls = $(".lhls"), jWrap = $(".jump-wrap");
  if (lhls && jWrap) {
    var lL5 = $(".lhl--l", lhls), lR5 = $(".lhl--r", lhls), col1 = $(".jump-col--1"), col2 = $(".jump-col--2");
    var seat = function () {
      if (mqDesk.matches) {
        if (lhls.parentNode !== jWrap) jWrap.insertBefore(lhls, jWrap.firstChild);
        if (lL5.parentNode !== lhls) lhls.appendChild(lL5); if (lR5.parentNode !== lhls) lhls.appendChild(lR5);
      } else {
        if (col1 && lL5.parentNode !== col1) col1.appendChild(lL5);
        if (col2 && lR5.parentNode !== col2) col2.appendChild(lR5);
      }
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

  /* ---------- How we do it: the open service stays marked in the graph; the card is always centred ---------- */
  var sm = $("#smodal");
  if (sm) {
    var sItems = $$(".jump-item"), stageEl = $(".jump-wrap");
    var current = function () {
      var name = ((sm.querySelector(".sm-svc") || {}).textContent || "").split("\u00b7").pop().trim();
      return sItems.filter(function (b) { return b.textContent.trim() === name; })[0] || null;
    };
    var placeSm = function () {
      var it = current();
      sItems.forEach(function (b) { b.classList.toggle("is-active", sm.open && b === it); });
    };
    sItems.forEach(function (b) { b.addEventListener("click", function () { requestAnimationFrame(placeSm); }); });
    var snx = sm.querySelector(".pm-next"); if (snx) snx.addEventListener("click", function () { requestAnimationFrame(placeSm); });
    sm.addEventListener("hop:svc", function () { requestAnimationFrame(placeSm); });
    window.addEventListener("resize", function () { if (sm.open) placeSm(); });
    sm.addEventListener("close", function () { sItems.forEach(function (b) { b.classList.remove("is-active"); }); });
  }

  /* ---------- Phones: How we do it mini-map (sticky arc; the dot travels; the label marks the phase) ---------- */
  /* ---------- Phones: mini run-up / leap / land, drawn by scroll ---------- */
  var jm = $(".jmini"), jmPath = jm && $(".jmini-path", jm), jmLand = jm && $(".jmini-land", jm), jmDot = jm && $(".jmini-dot", jm);
  if (jm && jmPath && jmPath.getTotalLength && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    var jmL = jmPath.getTotalLength(), jmLabs = $$(".jmini-l span", jm), jmTick = false, jmVis = false, jmLanded = false;
    var jmMq = window.matchMedia("(max-width: 1023px)");
    var jmSet = function () {
      jmTick = false;
      if (!jmMq.matches) return;
      var r = jm.getBoundingClientRect(), vh = window.innerHeight;
      var p = Math.max(0, Math.min(1, (vh * .92 - r.top) / (vh * .5)));
      var e = p < .5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
      var p1 = Math.min(1, e / .86), p2 = Math.max(0, Math.min(1, (e - .86) / .14));
      jmPath.style.strokeDashoffset = (1 - p1).toFixed(4);
      jmLand.style.strokeDashoffset = (1 - p2).toFixed(4);
      var pt = jmPath.getPointAtLength(jmL * p1);
      jmDot.setAttribute("cx", pt.x.toFixed(2)); jmDot.setAttribute("cy", (pt.y - 1).toFixed(2));
      var k = p1 < .3 ? 0 : p1 < .985 ? 1 : 2;
      jmLabs.forEach(function (l, i) { l.classList.toggle("is-on", i === k); });
      var landed = p1 >= .985;
      if (landed !== jmLanded) { jmLanded = landed; jm.classList.toggle("is-landed", landed); }
    };
    var jmReq = function () { if (jmVis && !jmTick) { jmTick = true; requestAnimationFrame(jmSet); } };
    doc.classList.add("jm-live");
    new IntersectionObserver(function (es) { jmVis = es[0].isIntersecting; jmReq(); }, { rootMargin: "120px 0px" }).observe(jm);
    window.addEventListener("scroll", jmReq, { passive: true });
    window.addEventListener("resize", jmReq);
    jmVis = true; jmSet(); jmVis = false;
  }

  var mmap = $(".mmap"), mPath = $(".mmap-path"), mDot = $(".mmap-dot"), mCols = $(".jump-cols");
  if (mmap && mPath && mDot && mCols && mPath.getTotalLength) {
    var mLen = mPath.getTotalLength(), mLinks = $$(".mmap-l a", mmap), mCol = $$(".jump-col"), mTick = false;
    var mVis = true;
    if ("IntersectionObserver" in window) new IntersectionObserver(function (es) { mVis = es[0].isIntersecting; if (mVis) mUpd(); }, { rootMargin: "20% 0px" }).observe(mCols);
    var mUpd = function () {
      mTick = false; if (mqDesk.matches || !mVis || !mmap.offsetParent) return;
      var ref = mmap.getBoundingClientRect().bottom + 24, r = mCols.getBoundingClientRect();
      var p = clamp((ref - r.top) / Math.max(1, r.height - window.innerHeight * .45), 0, 1);
      var pt = mPath.getPointAtLength(p * mLen); mDot.setAttribute("cx", pt.x.toFixed(1)); mDot.setAttribute("cy", pt.y.toFixed(1));
      var a = 0; mCol.forEach(function (c, i) { if (c.getBoundingClientRect().top <= ref + 40) a = i; });
      mLinks.forEach(function (l, i) { if (i === a) l.setAttribute("aria-current", "step"); else l.removeAttribute("aria-current"); });
    };
    window.addEventListener("scroll", function () { if (mVis && !mTick) { mTick = true; requestAnimationFrame(mUpd); } }, { passive: true });
    window.addEventListener("resize", mUpd); mUpd();
  }

  /* ---------- Phones: the sticky CTA steps aside over the footer ---------- */
  var stk = $("#sticky-cta"), foot = $("#site-foot");
  if (stk && foot && "IntersectionObserver" in window) new IntersectionObserver(function (es) { stk.classList.toggle("is-foot", es[0].isIntersecting); }, { threshold: 0 }).observe(foot);

  /* ---------- Phones: drag a sheet down to close it ---------- */
  $$("dialog.pmodal").forEach(function (dlg) {
    var y0 = null, dy = 0, inner = $(".pm-in", dlg);
    dlg.addEventListener("touchstart", function (e) {
      if (window.innerWidth >= 600) return;
      var t = e.touches[0], top = dlg.getBoundingClientRect().top;
      if (t.clientY - top > 72 && dlg.scrollTop > 0) return;
      if (t.clientY - top > 72 && !e.target.closest(".pm-handle, .pm-top")) return;
      y0 = t.clientY; dy = 0; dlg.style.transition = "none";
    }, { passive: true });
    dlg.addEventListener("touchmove", function (e) { if (y0 === null) return; dy = Math.max(0, e.touches[0].clientY - y0); dlg.style.transform = "translateY(" + dy + "px)"; }, { passive: true });
    dlg.addEventListener("touchend", function () {
      if (y0 === null) return; y0 = null;
      dlg.style.transition = "transform .3s cubic-bezier(.16,1,.3,1)";
      if (dy > 90) { dlg.style.transform = "translateY(100%)"; setTimeout(function () { dlg.close(); dlg.style.transform = dlg.style.transition = ""; }, 260); }
      else { dlg.style.transform = ""; setTimeout(function () { dlg.style.transition = ""; }, 320); }
    });
  });
})();
