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

  /* ---------- Intro: “House of Poland.” → hop. → into the nav, curtain lifts ----------
     ≈3s, homepage, once per visit (decided in <head> by intro5.js). Click or any key skips.
     Beats: 0 “House of Poland.” writes in · 1.35s it dissolves into the hop. wordmark
     while the red full stop leaps across into the logo · 2.25s the logo flies into the
     nav while the rug curtain lifts · ~3.2s site. */
  var introDone = Promise.resolve();
  var i5 = $("#i5");
  if (i5 && doc.classList.contains("i5-on") && "animate" in Element.prototype) {
    introDone = new Promise(function (resolve) {
      var bg = $(".i5-bg", i5), stage = $(".i5-stage", i5), word = $(".i5-word", i5), logo = $(".i5-logo", i5),
          idot = $(".i5-dot", i5), stop = $(".i5-stop", i5), xs = $$(".i5-x", i5), anims = [], timers = [], ended = false;
      var A = function (el, kf, o) { var a = el.animate(kf, Object.assign({ fill: "forwards" }, o)); anims.push(a); return a; };
      var later = function (fn, ms) { timers.push(setTimeout(fn, ms)); };
      var end = function (fast) {
        if (ended) return; ended = true;
        timers.forEach(clearTimeout);
        var out = i5.animate([{ opacity: 1 }, { opacity: 0 }], { duration: fast ? 320 : 220, easing: "ease-out", fill: "forwards" });
        out.onfinish = function () { doc.classList.remove("i5-on"); if (i5.parentNode) i5.parentNode.removeChild(i5); resolve(); };
      };
      var skip = function () { end(true); };
      i5.addEventListener("pointerdown", skip);
      window.addEventListener("keydown", skip, { once: true });
      later(function () { end(true); }, 5600); /* before the CSS failsafe at 6s */

      var morph = function () {
        var cx = window.innerWidth / 2, cy = window.innerHeight / 2;
        var wr = word.getBoundingClientRect(), sr = stop.getBoundingClientRect();
        var fs = parseFloat(getComputedStyle(word).fontSize) || 120;
        var lw = Math.min(window.innerWidth * .5, 340), lh = lw * 268 / 516;
        logo.style.width = lw + "px"; logo.style.height = lh + "px";
        logo.style.left = (-lw / 2) + "px"; logo.style.top = (-lh / 2) + "px";
        logo.style.transformOrigin = "50% 50%";
        /* the full stop becomes a free dot, then leaps to the logo's dot */
        var ds = lw * 61 / 516, s0 = (fs * .16) / ds;
        var ax = sr.left + sr.width * .46 - cx, ay = sr.top + sr.height * .8 - cy;
        var bx = -lw / 2 + lw * (504.94 - 22) / 516, by = -lh / 2 + lh * (196.78 - 18) / 268;
        idot.style.width = idot.style.height = ds + "px";
        var T = function (x, y, s) { return "translate(" + (x - ds / 2).toFixed(1) + "px," + (y - ds / 2).toFixed(1) + "px) scale(" + s + ")"; };
        stop.style.color = "transparent";
        var lift = Math.max(lw * .38, 80), mx = (ax + bx) / 2, my = Math.min(ay, by) - lift, kf = [
          { offset: 0, transform: T(ax, ay, s0), opacity: 1 },
          { offset: .12, transform: T(ax, ay + 3, s0 * 1.25) + " scale(1.2,.78)", opacity: 1 }];
        for (var k = 1; k <= 16; k++) {
          var t = k / 16, e = t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2, u = 1 - e;
          kf.push({ offset: .16 + .7 * t, transform: T(u * u * ax + 2 * u * e * mx + e * e * bx, u * u * ay + 2 * u * e * my + e * e * by, (s0 + (1 - s0) * e).toFixed(3)), opacity: 1 });
        }
        kf.push({ offset: .93, transform: T(bx, by + 2, 1) + " scale(1.22,.8)", opacity: 1 }, { offset: 1, transform: T(bx, by, 1), opacity: 1 });
        A(idot, kf, { duration: 760, easing: "linear" });
        A(word, [{ opacity: 1, filter: "blur(0px)", transform: "translate(-50%,-50%) scale(1)" }, { opacity: 0, filter: "blur(12px)", transform: "translate(-50%,-50%) scale(.9)" }], { duration: 520, easing: "cubic-bezier(.4,0,.2,1)" });
        A(logo, [{ opacity: 0, filter: "blur(16px)", transform: "scale(1.18)" }, { opacity: 1, filter: "blur(0px)", transform: "scale(1)" }], { duration: 700, delay: 140, easing: "cubic-bezier(.16,1,.3,1)" });
        later(function () { fly(lw, lh); }, 900);
      };
      var fly = function (lw, lh) {
        var nl = $(".nav-logo svg"), cx = window.innerWidth / 2, cy = window.innerHeight / 2;
        var nr = nl ? nl.getBoundingClientRect() : { left: cx - 40, top: 20, width: 80 };
        var s = nr.width / lw, tx = nr.left - (cx - s * lw / 2), ty = nr.top - (cy - s * lh / 2);
        A(stage, [{ transform: "translate(0px,0px) scale(1)" }, { transform: "translate(" + tx.toFixed(1) + "px," + ty.toFixed(1) + "px) scale(" + s.toFixed(4) + ")" }], { duration: 900, easing: "cubic-bezier(.7,0,.16,1)" });
        A(bg, [{ clipPath: "inset(0 0 0% 0)" }, { clipPath: "inset(0 0 100% 0)" }], { duration: 980, delay: 140, easing: "cubic-bezier(.76,0,.24,1)" })
          .onfinish = function () { end(false); };
      };
      var run = function () {
        A(word, [{ opacity: 0, filter: "blur(14px)", transform: "translate(-50%,-42%)" }, { opacity: 1, filter: "blur(0px)", transform: "translate(-50%,-50%)" }], { duration: 900, easing: "cubic-bezier(.16,1,.3,1)" });
        later(morph, 1350);
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
    var seatTag = function () { if (!tag) return; var lift = Math.max(0, hs.offsetHeight - items[cur].offsetHeight); tag.style.setProperty("--lift", lift.toFixed(1) + "px"); };
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

    /* depth: pointer parallax (fine pointers only), eased; scroll focus-pull */
    if (!reduce) {
      var tx = 0, ty = 0, px = 0, py = 0, raf = 0;
      var tick = function () {
        px += (tx - px) * .08; py += (ty - py) * .08;
        hero.style.setProperty("--px", px.toFixed(3)); hero.style.setProperty("--py", py.toFixed(3));
        raf = Math.abs(tx - px) + Math.abs(ty - py) > .002 ? requestAnimationFrame(tick) : 0;
      };
      if (fine.matches) {
        hero.addEventListener("pointermove", function (e) { var r = hero.getBoundingClientRect(); tx = clamp((e.clientX - r.left) / r.width * 2 - 1, -1, 1); ty = clamp((e.clientY - r.top) / r.height * 2 - 1, -1, 1); if (!raf) raf = requestAnimationFrame(tick); });
        hero.addEventListener("pointerleave", function () { tx = ty = 0; if (!raf) raf = requestAnimationFrame(tick); });
      }
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
    window.addEventListener("resize", function () { if (sm.open) placeSm(); });
    sm.addEventListener("close", function () { sItems.forEach(function (b) { b.classList.remove("is-active"); }); });
  }
})();
