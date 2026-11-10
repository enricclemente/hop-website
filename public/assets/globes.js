/* HOP — "Between us, we've covered the globe."
   Three orthographic globes. Land + ocean are rendered per pixel on the GPU (one shared WebGL
   context) from an equirectangular land mask rasterised once from Natural Earth outlines
   (public domain, /assets/geo/land.json: rings of [lon*10, lat*10]), so coastlines never flip or
   tear at any angle. Graticule, places and rim are drawn on top in 2D.
   Each globe spins in when the section appears, sways around its region, turns with drag /
   swipe / arrow keys (with inertia) and drifts home. Hover or tap a place to see its country.
   Animates only while on screen; still for reduced motion. */
(function () {
  "use strict";
  var root = document.querySelector(".globes");
  if (!root || !window.requestAnimationFrame) return;
  var canvases = [].slice.call(root.querySelectorAll(".globe-c"));
  if (!canvases.length || !canvases[0].getContext) return;

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  var D2R = Math.PI / 180, R2D = 180 / Math.PI;
  var css = getComputedStyle(document.documentElement);
  var RED = (css.getPropertyValue("--red") || "").trim() || "#E60001";

  /* country names, English / Polish */
  var C = {
    us: ["United States", "Stany Zjednoczone"], uk: ["United Kingdom", "Wielka Brytania"], nl: ["Netherlands", "Holandia"],
    pl: ["Poland", "Polska"], ru: ["Russia", "Rosja"], es: ["Spain", "Hiszpania"], it: ["Italy", "Włochy"],
    tr: ["Türkiye", "Turcja"], ae: ["United Arab Emirates", "Zjednoczone Emiraty Arabskie"],
    kr: ["South Korea", "Korea Południowa"], jp: ["Japan", "Japonia"], cn: ["China", "Chiny"], sg: ["Singapore", "Singapur"],
    th: ["Thailand", "Tajlandia"], ph: ["Philippines", "Filipiny"], za: ["South Africa", "Republika Południowej Afryki"], au: ["Australia", "Australia"]
  };
  /* regions: home view [lon, lat]; places [lon, lat, country, home?] (positions from the design) */
  var REGIONS = {
    na: { home: [-97, 33], dots: [[-122.7, 45.5, "us"], [-81.4, 27.8, "us"]] },
    emea: { home: [18, 22], dots: [[-0.1, 51.5, "uk"], [4.9, 52.4, "nl"], [18.6, 52.3, "pl", 1], [31.5, 55.2, "ru"], [-3.7, 40.4, "es"], [10.2, 45.2, "it"], [28.9, 41.0, "tr"], [55.3, 25.2, "ae"], [28.0, -26.2, "za"]] },
    apac: { home: [122, 6], dots: [[127.0, 37.6, "kr"], [139.7, 35.7, "jp"], [121.5, 31.2, "cn"], [103.8, 1.35, "sg"], [100.5, 13.75, "th"], [121.0, 14.6, "ph"], [151.2, -33.9, "au"]] }
  };
  var lang = function () { try { return window.HOPv2 && HOPv2.lang && HOPv2.lang() === "pl" ? 1 : 0; } catch (e) { return 0; } };

  var GRAT = (function () {
    var lines = [], lon, lat, pts;
    for (lon = -180; lon < 180; lon += 15) { pts = []; for (lat = -80; lat <= 80; lat += 3) pts.push([lon * D2R, lat * D2R]); lines.push(pts); }
    for (lat = -75; lat <= 75; lat += 15) { pts = []; for (lon = -180; lon <= 180; lon += 3) pts.push([lon * D2R, lat * D2R]); lines.push(pts); }
    return lines;
  })();

  var globes = canvases.map(function (cv, i) {
    var item = cv.closest(".globe"), key = item.getAttribute("data-globe"), reg = REGIONS[key] || REGIONS.emea;
    var tip = document.createElement("span"); tip.className = "globe-tip"; tip.setAttribute("aria-hidden", "true");
    cv.parentNode.appendChild(tip);
    return {
      cv: cv, ctx: cv.getContext("2d"), reg: reg, i: i, tip: tip,
      lon: reg.home[0] - (reduce ? 0 : 110), lat: reg.home[1], vLon: 0, vLat: 0,
      drag: null, lastTouch: -1e9, size: 0, dpr: 1, phase: i * 1.7, hits: [], hover: -1, onScreen: true
    };
  });

  /* ---------- the land mask + a shared WebGL sphere renderer ---------- */
  var GL = null; /* {gl, cv, prog, u} */
  var makeMask = function (rings) {
    var W = 2048, H = 1024, m = document.createElement("canvas"); m.width = W; m.height = H;
    var x = m.getContext("2d"); x.fillStyle = "#000"; x.fillRect(0, 0, W, H); x.fillStyle = "#fff";
    x.beginPath();
    rings.forEach(function (f) {
      for (var i = 0; i < f.length; i += 2) {
        var px = (f[i] / 10 + 180) / 360 * W, py = (90 - f[i + 1] / 10) / 180 * H;
        if (i === 0) x.moveTo(px, py); else x.lineTo(px, py);
      }
      x.closePath();
    });
    x.fill();
    return m;
  };
  var initGL = function (mask) {
    try {
      var cv = document.createElement("canvas");
      var gl = cv.getContext("webgl", { premultipliedAlpha: true, alpha: true, antialias: false, preserveDrawingBuffer: true });
      if (!gl) return null;
      var vs = "attribute vec2 p;varying vec2 v;void main(){v=p;gl_Position=vec4(p,0.,1.);}";
      var fs = [
        "precision highp float;varying vec2 v;uniform sampler2D t;uniform vec2 rot;uniform float aa;",
        "const float PI=3.14159265;",
        "void main(){",
        " float r2=dot(v,v); if(r2>1.0){gl_FragColor=vec4(0.);return;}",
        " float r=sqrt(r2), z=sqrt(max(0.,1.-r2)), s0=sin(rot.y), c0=cos(rot.y);",
        " float lat=asin(clamp(z*s0+v.y*c0,-1.,1.));",
        " float lon=rot.x+atan(v.x, z*c0-v.y*s0);",
        " float m=texture2D(t, vec2((lon+PI)/(2.*PI), (PI*.5-lat)/PI)).r;",
        " float lt=clamp(length(v-vec2(-.38,.42))/1.45,0.,1.);",
        " vec3 ocean=mix(vec3(.965,.961,.941), vec3(.91,.871,.808), smoothstep(0.,1.,lt));",
        " vec3 land=mix(vec3(.125,.122,.114), vec3(.082,.082,.082), lt);",
        " vec3 c=mix(ocean, land, m);",
        " float a=1.-smoothstep(1.-aa,1.,r);",
        " gl_FragColor=vec4(c*a,a);",
        "}"].join("\n");
      var sh = function (type, src) { var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
      var prog = gl.createProgram();
      gl.attachShader(prog, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error("link");
      gl.useProgram(prog);
      var buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
      var loc = gl.getAttribLocation(prog, "p"); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      var tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, mask);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      return { gl: gl, cv: cv, uRot: gl.getUniformLocation(prog, "rot"), uAA: gl.getUniformLocation(prog, "aa") };
    } catch (e) { return null; }
  };
  var renderSphere = function (g, px) {
    var gl = GL.gl;
    if (GL.cv.width !== px || GL.cv.height !== px) { GL.cv.width = px; GL.cv.height = px; }
    gl.viewport(0, 0, px, px);
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform2f(GL.uRot, g.lon * D2R, g.lat * D2R);
    gl.uniform1f(GL.uAA, 2.0 / px);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    return GL.cv;
  };

  /* ---------- sizing ---------- */
  var sizeGlobe = function (g) {
    var r = g.cv.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2);
    var s = Math.round(r.width);
    if (s < 10) return;
    if (s !== g.size || dpr !== g.dpr) { g.size = s; g.dpr = dpr; g.cv.width = Math.round(s * dpr); g.cv.height = Math.round(s * dpr); }
  };
  var sizeAll = function () { globes.forEach(sizeGlobe); drawAll(0, true); };

  /* ---------- drawing ---------- */
  var draw = function (g, t) {
    if (!g.size) return;
    var ctx = g.ctx, s = g.size, dpr = g.dpr, R = s / 2 - 1.5, cx = s / 2, cy = s / 2;
    var l0 = g.lon * D2R, p0 = g.lat * D2R, sp0 = Math.sin(p0), cp0 = Math.cos(p0);
    var out = [0, 0];
    var proj = function (lon, lat) {
      var sl = Math.sin(lat), cl = Math.cos(lat), dl = lon - l0, cdl = Math.cos(dl);
      out[0] = cx + cl * Math.sin(dl) * R; out[1] = cy - (cp0 * sl - sp0 * cl * cdl) * R;
      return sp0 * sl + cp0 * cl * cdl; /* > 0: facing us */
    };
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, g.cv.width, g.cv.height);

    /* sphere: land + ocean */
    if (GL) {
      var D = Math.round(R * 2 * dpr), off = Math.round((s / 2 - R) * dpr);
      ctx.drawImage(renderSphere(g, D), off, off, D, D);
    } else {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var og = ctx.createRadialGradient(cx - R * .35, cy - R * .4, R * .1, cx, cy, R);
      og.addColorStop(0, "#F6F5F0"); og.addColorStop(1, "#E8DECE");
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fillStyle = og; ctx.fill();
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    /* graticule (front half only) */
    ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.clip();
    ctx.beginPath();
    for (var gi = 0; gi < GRAT.length; gi++) {
      var line = GRAT[gi], pen = false;
      for (var j = 0; j < line.length; j++) {
        if (proj(line[j][0], line[j][1]) > 0.015) { if (pen) ctx.lineTo(out[0], out[1]); else ctx.moveTo(out[0], out[1]); pen = true; }
        else pen = false;
      }
    }
    ctx.strokeStyle = "rgba(10, 10, 10, .22)"; ctx.lineWidth = Math.max(.6, s / 560); ctx.stroke();

    /* places */
    var dots = g.reg.dots, base = Math.max(4.5, R * .042);
    g.hits.length = 0;
    for (var d = 0; d < dots.length; d++) {
      var vis = proj(dots[d][0] * D2R, dots[d][1] * D2R);
      if (vis <= 0.08) continue;
      var a = Math.min(1, (vis - .08) / .25), big = dots[d][3], hov = g.hover === d;
      var rad = (big ? base * 1.9 : base) * (hov ? 1.25 : 1);
      var x0 = out[0], y0 = out[1];
      g.hits.push({ d: d, x: x0, y: y0, r: rad, a: a });
      if (big) { ctx.beginPath(); ctx.arc(x0, y0, rad * 1.75, 0, Math.PI * 2); ctx.strokeStyle = "rgba(230, 0, 1," + (.55 * a) + ")"; ctx.lineWidth = 1.2; ctx.stroke(); }
      if (!reduce) {
        var ph = ((t / 2600) + d * .23 + g.phase) % 1;
        ctx.beginPath(); ctx.arc(x0, y0, rad * (1 + ph * 1.6), 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(230, 0, 1," + ((1 - ph) * .5 * a) + ")"; ctx.lineWidth = 1.4; ctx.stroke();
      }
      ctx.globalAlpha = a;
      ctx.beginPath(); ctx.arc(x0, y0, rad, 0, Math.PI * 2); ctx.fillStyle = RED; ctx.fill();
      ctx.lineWidth = Math.max(1.2, rad * .28); ctx.strokeStyle = "#E8DECE"; ctx.stroke();
      ctx.globalAlpha = 1;
    }
    ctx.restore();

    /* rim */
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.strokeStyle = "rgba(232, 222, 206, .5)"; ctx.lineWidth = 1; ctx.stroke();

    placeTip(g);
  };
  var drawAll = function (t, force) { var now = t || performance.now(); globes.forEach(function (g) { if (force || g.onScreen) draw(g, now); }); };

  /* ---------- country label ---------- */
  var placeTip = function (g) {
    var h = null;
    if (g.hover >= 0) for (var i = 0; i < g.hits.length; i++) if (g.hits[i].d === g.hover) h = g.hits[i];
    if (!h) { if (g.tip.classList.contains("is-on")) g.tip.classList.remove("is-on"); return; }
    var name = C[g.reg.dots[h.d][2]][lang()];
    if (g.tip.textContent !== name) g.tip.textContent = name;
    g.tip.style.transform = "translate3d(" + h.x.toFixed(1) + "px," + (h.y - h.r - 10).toFixed(1) + "px,0) translate(-50%,-100%)";
    if (!g.tip.classList.contains("is-on")) g.tip.classList.add("is-on");
  };
  var hitTest = function (g, e) {
    var r = g.cv.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top, best = -1, bd = 1e9;
    for (var i = 0; i < g.hits.length; i++) {
      var h = g.hits[i], dd = Math.hypot(h.x - x, h.y - y), reach = Math.max(h.r + 8, 16);
      if (h.a > .4 && dd < reach && dd < bd) { bd = dd; best = h.d; }
    }
    return best;
  };
  var setHover = function (g, d) {
    if (g.hover === d) return;
    g.hover = d; g.cv.classList.toggle("is-pointing", d >= 0);
    if (!running) draw(g, performance.now());
  };

  /* ---------- motion ---------- */
  var running = false, visible = false, raf = 0, last = 0, t0 = performance.now();
  var clampLat = function (v) { return v > 70 ? 70 : v < -70 ? -70 : v; };
  var coarse = window.matchMedia("(hover: none)").matches, scrollHold = 0;
  if (coarse) window.addEventListener("scroll", function () { scrollHold = performance.now() + 180; }, { passive: true });
  var step = function (now) {
    raf = 0;
    if (coarse && now < scrollHold && !globes.some(function (g) { return g.drag; })) { last = now; if (running) raf = requestAnimationFrame(step); return; }
    var dt = Math.min(48, now - (last || now)); last = now;
    var k = dt / 16.67;
    globes.forEach(function (g) {
      if (g.drag) return;
      var since = now - g.lastTouch;
      if (Math.abs(g.vLon) > .01 || Math.abs(g.vLat) > .01) {
        g.lon += g.vLon * k; g.lat = clampLat(g.lat + g.vLat * k);
        g.vLon *= Math.pow(.94, k); g.vLat *= Math.pow(.9, k);
      } else if (since > 1600 && g.hover < 0) {
        var tt = (now - t0) / 1000;
        var tl = g.reg.home[0] + (reduce ? 0 : 20 * Math.sin(tt * .16 + g.phase));
        var tb = g.reg.home[1] + (reduce ? 0 : 4 * Math.sin(tt * .11 + g.phase * 1.3));
        var dl = ((tl - g.lon + 540) % 360) - 180, e = 1 - Math.pow(1 - .035, k);
        g.lon += dl * e; g.lat += (tb - g.lat) * e;
      }
    });
    drawAll(now);
    if (running) raf = requestAnimationFrame(step);
  };
  var start = function () { if (!running) { running = true; last = 0; raf = requestAnimationFrame(step); } };
  var stop = function () { running = false; if (raf) cancelAnimationFrame(raf); raf = 0; };
  var sync = function () { if (visible && !document.hidden && ready) start(); else stop(); };

  /* ---------- interaction ---------- */
  globes.forEach(function (g) {
    var cv = g.cv;
    cv.addEventListener("pointerdown", function (e) {
      if (e.button !== undefined && e.button !== 0) return;
      g.drag = { id: e.pointerId, x0: e.clientX, y0: e.clientY, lx: e.clientX, ly: e.clientY, lt: performance.now(), moved: false };
      g.vLon = g.vLat = 0;
      try { cv.setPointerCapture(e.pointerId); } catch (err) {}
      start();
    });
    cv.addEventListener("pointermove", function (e) {
      var d = g.drag;
      if (!d) { if (e.pointerType === "mouse") setHover(g, hitTest(g, e)); return; }
      if (e.pointerId !== d.id) return;
      if (!d.moved && Math.hypot(e.clientX - d.x0, e.clientY - d.y0) < 4) return;
      if (!d.moved) { d.moved = true; root.classList.add("is-dragging"); setHover(g, -1); }
      var R = g.size / 2 || 150, now = performance.now();
      var dx = e.clientX - d.lx, dy = e.clientY - d.ly;
      var dLon = -dx / R * R2D * .9, dLat = dy / R * R2D * .9;
      g.lon += dLon; g.lat = clampLat(g.lat + dLat);
      var dt = Math.max(8, now - d.lt);
      g.vLon = dLon * (16.67 / dt); g.vLat = dLat * (16.67 / dt);
      d.lx = e.clientX; d.ly = e.clientY; d.lt = now;
    });
    var end = function (e) {
      var d = g.drag; if (!d || (e && e.pointerId !== d.id)) return;
      if (!d.moved) { /* a tap: show (or toggle) the country under the finger */
        g.vLon = g.vLat = 0;
        var hit = hitTest(g, e);
        setHover(g, hit === g.hover && e.pointerType !== "mouse" ? -1 : hit);
      } else if (performance.now() - d.lt > 80) { g.vLon = g.vLat = 0; }
      g.drag = null; g.lastTouch = performance.now();
      root.classList.remove("is-dragging");
      sync();
    };
    cv.addEventListener("pointerup", end);
    cv.addEventListener("pointercancel", end);
    cv.addEventListener("lostpointercapture", end);
    cv.addEventListener("pointerleave", function (e) { if (e.pointerType === "mouse" && !g.drag) setHover(g, -1); });
    cv.addEventListener("keydown", function (e) {
      var m = { ArrowLeft: [-12, 0], ArrowRight: [12, 0], ArrowUp: [0, 8], ArrowDown: [0, -8] }[e.key];
      if (!m) return; e.preventDefault();
      g.vLon = m[0] * .12; g.vLat = m[1] * .12; g.lastTouch = performance.now(); start();
    });
  });
  /* a tap anywhere else clears a country label on touch screens */
  document.addEventListener("pointerdown", function (e) {
    if (e.target.closest && e.target.closest(".globe-c")) return;
    globes.forEach(function (g) { if (g.hover >= 0) setHover(g, -1); });
  }, { passive: true });

  /* ---------- lifecycle ---------- */
  var ready = false;
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (en) { visible = en.isIntersecting; if (visible) root.classList.add("is-in"); sync(); });
  }, { rootMargin: "120px 0px" });
  io.observe(root);
  var gio = new IntersectionObserver(function (es) {
    es.forEach(function (en) {
      globes.forEach(function (g) { if (g.cv === en.target) { g.onScreen = en.isIntersecting; if (g.onScreen && ready) draw(g, performance.now()); } });
    });
  }, { rootMargin: "60px 0px" });
  globes.forEach(function (g) { gio.observe(g.cv); });
  document.addEventListener("visibilitychange", sync);
  if ("ResizeObserver" in window) new ResizeObserver(sizeAll).observe(root);
  else window.addEventListener("resize", sizeAll);

  globes.forEach(sizeGlobe);
  /* the land data and WebGL start only as the section approaches, keeping the first load light */
  var booted = false;
  var boot = function () {
    if (booted) return; booted = true;
    fetch("/assets/geo/land.json").then(function (r) { return r.json(); }).then(function (rings) {
      GL = initGL(makeMask(rings));
      if (reduce) globes.forEach(function (g) { g.lon = g.reg.home[0]; g.lat = g.reg.home[1]; });
      ready = true; drawAll(0, true); sync();
    }).catch(function () { ready = true; drawAll(0, true); });
  };
  if ("IntersectionObserver" in window) {
    var bio = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { bio.disconnect(); boot(); } }, { rootMargin: "900px 0px" });
    bio.observe(root);
  } else boot();
})();
