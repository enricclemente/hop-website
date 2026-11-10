/* HOP — brands marquee under the partners photo.
   The HTML is an accessible list of all logos (and the no-JS fallback). This script builds an
   aria-hidden visual track that streams logos endlessly: Nike once in every ten, the
   others in order, recycling items at the edge so the pattern never breaks at a seam and the DOM
   stays small. Pauses on hover, on tap (touch), off screen and in background tabs; reduced
   motion shows a still, scrollable row instead. */
(function () {
  "use strict";
  var root = document.querySelector("[data-logos]");
  if (!root || !window.requestAnimationFrame) return;
  var list = root.querySelector(".logos-list");
  var src = [].slice.call(list.querySelectorAll(".logo"));
  if (!src.length) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { root.classList.add("is-still"); return; }

  var nike = src.filter(function (li) { return li.classList.contains("lg-nike"); })[0];
  var others = src.filter(function (li) { return li !== nike; });
  var k = 0, o = 0;
  var next = function () {
    var li = (nike && k % 10 === 0) ? nike : others[o++ % others.length];
    k++;
    var c = li.cloneNode(true), img = c.querySelector("img");
    img.alt = ""; img.loading = "eager";
    return c;
  };

  var track = document.createElement("ul");
  track.className = "logos-track"; track.setAttribute("aria-hidden", "true"); track.setAttribute("role", "presentation");
  root.appendChild(track);
  root.classList.add("is-live");

  var x = 0, raf = 0, last = 0, visible = false, hover = false, tapped = false;
  var speed = function () { return window.innerWidth < 600 ? 39 : 53; }; /* px per second (15% quicker) */
  var fill = function () {
    var need = root.clientWidth * 2 + 400;
    while (track.scrollWidth < need) track.appendChild(next());
  };
  var tick = function (now) {
    raf = 0;
    var dt = Math.min(64, now - (last || now)); last = now;
    x -= speed() * dt / 1000;
    var first = track.firstElementChild;
    while (first && -x >= first.offsetWidth) {
      x += first.offsetWidth;
      track.removeChild(first);
      track.appendChild(next());
      first = track.firstElementChild;
    }
    track.style.transform = "translate3d(" + x.toFixed(2) + "px,0,0)";
    if (running()) raf = requestAnimationFrame(tick);
  };
  var running = function () { return visible && !hover && !tapped && !document.hidden; };
  var sync = function () {
    root.classList.toggle("is-paused", hover || tapped);
    if (running() && !raf) { last = 0; raf = requestAnimationFrame(tick); }
  };

  fill();
  new IntersectionObserver(function (es) { visible = es[0].isIntersecting; sync(); }, { rootMargin: "80px 0px" }).observe(root);
  document.addEventListener("visibilitychange", sync);
  window.addEventListener("resize", function () { fill(); });
  root.addEventListener("pointerenter", function (e) { if (e.pointerType === "mouse") { hover = true; sync(); } });
  root.addEventListener("pointerleave", function (e) { if (e.pointerType === "mouse") { hover = false; sync(); } });
  root.addEventListener("pointerup", function (e) { if (e.pointerType !== "mouse") { tapped = !tapped; sync(); } });
  /* images load lazily: top up once they have widths */
  [].forEach.call(track.querySelectorAll("img"), function (im) { if (!im.complete) im.addEventListener("load", fill, { once: true }); });
})();
