/* HOP — "Between us, we've covered the globe."
   Three orthographic globes drawn on canvas from Natural Earth land outlines (public domain,
   /assets/geo/land.json: rings of [lon*10, lat*10] pairs). Each globe sways gently around its
   region, spins in when the section appears, and can be dragged/swiped to turn (with inertia),
   then drifts back home. Animates only while on screen; still for reduced motion. */
(function () {
  "use strict";
  var root = document.querySelector(".globes");
  if (!root || !window.requestAnimationFrame) return;
  var canvases = [].slice.call(root.querySelectorAll(".globe-c"));
  if (!canvases.length || !canvases[0].getContext) return;

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var D2R = Math.PI / 180, R2D = 180 / Math.PI;
  var css = getComputedStyle(document.documentElement);
  var RED = (css.getPropertyValue("--red") || "").trim() || "#A11D33";

  /* regions: home view [lon, lat], and the places marked (approximate, from the design) */
  var REGIONS = {
    na: { home: [-97, 33], dots: [[-122.7, 45.5], [-81.4, 27.8]] },
    emea: { home: [16, 30], dots: [[-0.1, 51.5], [4.9, 52.4], [18.6, 52.3, 1], [31.5, 55.2], [-3.7, 40.4], [10.2, 45.2], [28.9, 41.0], [55.3, 25.2]] },
    apac: { home: [117, 17], dots: [[127.0, 37.6], [139.7, 35.7], [121.5, 31.2], [103.8, 1.35]] }
  };

  var land = null; /* [{lon: Float32Array (rad), sinLat, cosLat}] */
  var GRAT = (function () {
    var lines = [], lon, lat, pts;
    for (lon = -180; lon < 180; lon += 15) { pts = []; for (lat = -80; lat <= 80; lat += 4) pts.push([lon, lat]); lines.push(pts); }
    for (lat = -75; lat <= 75; lat += 15) { pts = []; for (lon = -180; lon <= 180; lon += 4) pts.push([lon, lat]); lines.push(pts); }
    return lines;
  })();

  var globes = canvases.map(function (cv, i) {
    var key = cv.closest(".globe").getAttribute("data-globe"), reg = REGIONS[key] || REGIONS.emea;
    return {
      cv: cv, ctx: cv.getContext("2d"), reg: reg, i: i,
      lon: reg.home[0] - (reduce ? 0 : 110), lat: reg.home[1], vLon: 0, vLat: 0,
      drag: null, lastTouch: -1e9, size: 0, dpr: 1, phase: i * 1.7
    };
  });

  /* ---------- sizing ---------- */
  var sizeGlobe = function (g) {
    var r = g.cv.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2);
    var s = Math.round(r.width);
    if (s < 10) return;
    if (s !== g.size || dpr !== g.dpr) {
      g.size = s; g.dpr = dpr;
      g.cv.width = Math.round(s * dpr); g.cv.height = Math.round(s * dpr);
    }
  };
  var sizeAll = function () { globes.forEach(sizeGlobe); drawAll(0, true); };

  /* ---------- drawing ---------- */
  var draw = function (g, t) {
    if (!g.size) return;
    var ctx = g.ctx, s = g.size, dpr = g.dpr, R = s / 2 - 1.5, cx = s / 2, cy = s / 2;
    var l0 = g.lon * D2R, p0 = g.lat * D2R, sp0 = Math.sin(p0), cp0 = Math.cos(p0);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, s, s);

    /* project lon/lat (rad): returns visibility cosine and writes x,y into out */
    var out = [0, 0];
    var proj = function (lon, sl, cl) {
      var dl = lon - l0, cdl = Math.cos(dl);
      var cosc = sp0 * sl + cp0 * cl * cdl;
      var x = cl * Math.sin(dl), y = cp0 * sl - sp0 * cl * cdl;
      if (cosc < 0) { var m = Math.sqrt(x * x + y * y) || 1; x /= m; y /= m; } /* behind: pin to the rim */
      out[0] = cx + x * R; out[1] = cy - y * R;
      return cosc;
    };

    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.clip();

    /* ocean: parchment, lit from the upper left */
    var og = ctx.createRadialGradient(cx - R * .35, cy - R * .4, R * .1, cx, cy, R);
    og.addColorStop(0, "#E9E3D7"); og.addColorStop(.7, "#DCD5C7"); og.addColorStop(1, "#C9C1B1");
    ctx.fillStyle = og; ctx.fillRect(0, 0, s, s);

    /* land */
    if (land) {
      ctx.beginPath();
      for (var r = 0; r < land.length; r++) {
        var ring = land[r], n = ring.lon.length, any = false;
        for (var k = 0; k < n; k++) {
          var c = proj(ring.lon[k], ring.sl[k], ring.cl[k]);
          if (c > 0) any = true;
          if (k === 0) ctx.moveTo(out[0], out[1]); else ctx.lineTo(out[0], out[1]);
        }
        ctx.closePath();
        if (!any) { /* fully behind: harmless sliver on the rim */ }
      }
      ctx.fillStyle = "#1D1C1B"; ctx.fill();
    }

    /* graticule */
    ctx.beginPath();
    for (var gi = 0; gi < GRAT.length; gi++) {
      var line = GRAT[gi], pen = false;
      for (var j = 0; j < line.length; j++) {
        var la = line[j][1] * D2R, c2 = proj(line[j][0] * D2R, Math.sin(la), Math.cos(la));
        if (c2 > 0.02) { if (pen) ctx.lineTo(out[0], out[1]); else ctx.moveTo(out[0], out[1]); pen = true; }
        else pen = false;
      }
    }
    ctx.strokeStyle = "rgba(122, 117, 108, .55)"; ctx.lineWidth = Math.max(.6, s / 520); ctx.stroke();

    /* sphere shading: soft edge darkening + highlight */
    var sg = ctx.createRadialGradient(cx - R * .3, cy - R * .35, R * .2, cx, cy, R * 1.02);
    sg.addColorStop(0, "rgba(255,255,255,.10)"); sg.addColorStop(.6, "rgba(0,0,0,0)"); sg.addColorStop(1, "rgba(0,0,0,.28)");
    ctx.fillStyle = sg; ctx.fillRect(0, 0, s, s);

    /* places */
    var dots = g.reg.dots, base = Math.max(4.5, R * .042);
    for (var d = 0; d < dots.length; d++) {
      var dl0 = dots[d][1] * D2R, vis = proj(dots[d][0] * D2R, Math.sin(dl0), Math.cos(dl0));
      if (vis <= 0.08) continue;
      var a = Math.min(1, (vis - .08) / .25), big = dots[d][2], rad = big ? base * 1.9 : base;
      var x0 = out[0], y0 = out[1];
      if (big) { /* home: a quiet halo */
        ctx.beginPath(); ctx.arc(x0, y0, rad * 1.75, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(161, 29, 51," + (.55 * a) + ")"; ctx.lineWidth = 1.2; ctx.stroke();
      }
      if (!reduce) { /* pulse */
        var ph = ((t / 2600) + d * .23 + g.phase) % 1;
        ctx.beginPath(); ctx.arc(x0, y0, rad * (1 + ph * 1.6), 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(161, 29, 51," + ((1 - ph) * .5 * a) + ")"; ctx.lineWidth = 1.4; ctx.stroke();
      }
      ctx.globalAlpha = a;
      ctx.beginPath(); ctx.arc(x0, y0, rad, 0, Math.PI * 2);
      ctx.fillStyle = RED; ctx.fill();
      ctx.lineWidth = Math.max(1.2, rad * .28); ctx.strokeStyle = "#EFEBE4"; ctx.stroke();
      ctx.globalAlpha = 1;
    }
    ctx.restore();

    /* rim */
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(239, 235, 228, .55)"; ctx.lineWidth = 1; ctx.stroke();
  };
  var drawAll = function (t, force) { var now = t || performance.now(); globes.forEach(function (g) { if (force || g.onScreen !== false) draw(g, now); }); };

  /* ---------- motion ---------- */
  var running = false, visible = false, raf = 0, last = 0, t0 = performance.now();
  var step = function (now) {
    raf = 0;
    var dt = Math.min(48, now - (last || now)); last = now;
    var k = dt / 16.67;
    globes.forEach(function (g) {
      if (g.drag) return;
      var since = now - g.lastTouch;
      if (Math.abs(g.vLon) > .01 || Math.abs(g.vLat) > .01) {
        g.lon += g.vLon * k; g.lat = clampLat(g.lat + g.vLat * k);
        g.vLon *= Math.pow(.94, k); g.vLat *= Math.pow(.9, k);
      } else if (since > 1600) {
        /* home, with a slow sway */
        var tt = (now - t0) / 1000;
        var tl = g.reg.home[0] + (reduce ? 0 : 20 * Math.sin(tt * .16 + g.phase));
        var tb = g.reg.home[1] + (reduce ? 0 : 4 * Math.sin(tt * .11 + g.phase * 1.3));
        var dl = ((tl - g.lon + 540) % 360) - 180;
        var e = 1 - Math.pow(1 - .035, k);
        g.lon += dl * e; g.lat += (tb - g.lat) * e;
      }
    });
    drawAll(now);
    if (running) raf = requestAnimationFrame(step);
  };
  var clampLat = function (v) { return v > 70 ? 70 : v < -70 ? -70 : v; };
  var start = function () { if (!running) { running = true; last = 0; raf = requestAnimationFrame(step); } };
  var stop = function () { running = false; if (raf) cancelAnimationFrame(raf); raf = 0; };
  var sync = function () { if (visible && !document.hidden && land) start(); else stop(); };

  /* ---------- interaction: drag / swipe to turn ---------- */
  globes.forEach(function (g) {
    var cv = g.cv;
    cv.addEventListener("pointerdown", function (e) {
      if (e.button !== undefined && e.button !== 0) return;
      g.drag = { x: e.clientX, y: e.clientY, id: e.pointerId, lx: e.clientX, ly: e.clientY, lt: performance.now() };
      g.vLon = g.vLat = 0;
      try { cv.setPointerCapture(e.pointerId); } catch (err) {}
      root.classList.add("is-dragging");
      start();
    });
    cv.addEventListener("pointermove", function (e) {
      var d = g.drag; if (!d || e.pointerId !== d.id) return;
      var R = g.size / 2 || 150, now = performance.now();
      var dx = e.clientX - d.lx, dy = e.clientY - d.ly;
      var dLon = -dx / R * R2D * .9, dLat = dy / R * R2D * .9;
      g.lon += dLon; g.lat = clampLat(g.lat + dLat);
      var dt = Math.max(8, now - d.lt);
      g.vLon = dLon * (16.67 / dt); g.vLat = dLat * (16.67 / dt);
      d.lx = e.clientX; d.ly = e.clientY; d.lt = now;
      if (!running) drawAll();
    });
    var end = function (e) {
      var d = g.drag; if (!d || (e && e.pointerId !== d.id)) return;
      if (performance.now() - d.lt > 80) { g.vLon = g.vLat = 0; }
      g.drag = null; g.lastTouch = performance.now();
      root.classList.remove("is-dragging");
      sync();
    };
    cv.addEventListener("pointerup", end);
    cv.addEventListener("pointercancel", end);
    cv.addEventListener("lostpointercapture", end);
    /* keyboard: arrows turn the focused globe */
    cv.addEventListener("keydown", function (e) {
      var m = { ArrowLeft: [-12, 0], ArrowRight: [12, 0], ArrowUp: [0, 8], ArrowDown: [0, -8] }[e.key];
      if (!m) return; e.preventDefault();
      g.vLon = m[0] * .12; g.vLat = m[1] * .12; g.lastTouch = performance.now(); start();
    });
  });

  /* ---------- lifecycle ---------- */
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (en) {
      visible = en.isIntersecting;
      if (visible) root.classList.add("is-in");
      sync();
    });
  }, { rootMargin: "120px 0px" });
  io.observe(root);
  /* draw only the globes on screen (phones stack them) */
  var gio = new IntersectionObserver(function (es) {
    es.forEach(function (en) { var g = globes.filter(function (x) { return x.cv === en.target; })[0]; if (g) { g.onScreen = en.isIntersecting; if (g.onScreen) draw(g, performance.now()); } });
  }, { rootMargin: "60px 0px" });
  globes.forEach(function (g) { gio.observe(g.cv); });
  document.addEventListener("visibilitychange", sync);
  if ("ResizeObserver" in window) new ResizeObserver(sizeAll).observe(root);
  else window.addEventListener("resize", sizeAll);

  sizeAll();
  fetch("/assets/geo/land.json").then(function (r) { return r.json(); }).then(function (rings) {
    land = rings.map(function (flat) {
      var n = flat.length / 2, lon = new Float32Array(n), sl = new Float32Array(n), cl = new Float32Array(n);
      for (var i = 0; i < n; i++) { var la = flat[2 * i + 1] / 10 * D2R; lon[i] = flat[2 * i] / 10 * D2R; sl[i] = Math.sin(la); cl[i] = Math.cos(la); }
      return { lon: lon, sl: sl, cl: cl };
    });
    if (reduce) globes.forEach(function (g) { g.lon = g.reg.home[0]; g.lat = g.reg.home[1]; });
    drawAll(0, true); sync();
  }).catch(function () { drawAll(0, true); });
})();
