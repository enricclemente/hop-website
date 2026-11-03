/* Articles hub + article template: nav state, share, contents rail and reading progress */
(function () {
  "use strict";
  var main = document.querySelector("main[data-page='articles']");
  if (!main) return;
  var pill = document.querySelector(".nav-art"); if (pill) pill.setAttribute("aria-current", "page");

  /* Share: native sheet where there is one, otherwise copy the link */
  Array.prototype.forEach.call(document.querySelectorAll("[data-share]"), function (b) {
    b.addEventListener("click", function () {
      var url = location.href.split("#")[0];
      if (navigator.share) { navigator.share({ title: document.title, url: url }).catch(function () {}); return; }
      var done = function () { var t = b.firstChild.textContent; b.firstChild.textContent = "Link copied "; setTimeout(function () { b.firstChild.textContent = t; }, 1800); };
      if (navigator.clipboard) navigator.clipboard.writeText(url).then(done, function () {});
    });
  });

  /* Contents rail: highlight the section being read; progress bar */
  var col = document.querySelector(".art-col"), bar = document.querySelector(".art-prog span");
  var links = Array.prototype.slice.call(document.querySelectorAll(".art-toc a"));
  if (!col) return;
  var heads = links.map(function (a) { return document.querySelector(a.getAttribute("href")); });
  var tick = false;
  function update() {
    tick = false;
    var r = col.getBoundingClientRect(), vh = window.innerHeight;
    var p = Math.min(1, Math.max(0, (vh * 0.35 - r.top) / (r.height - vh * 0.35)));
    if (bar) bar.style.width = (p * 100).toFixed(1) + "%";
    var cur = -1;
    heads.forEach(function (h, i) { if (h && h.getBoundingClientRect().top < vh * 0.35) cur = i; });
    links.forEach(function (a, i) { if (i === cur) a.setAttribute("aria-current", "true"); else a.removeAttribute("aria-current"); });
  }
  window.addEventListener("scroll", function () { if (!tick) { tick = true; requestAnimationFrame(update); } }, { passive: true });
  window.addEventListener("resize", update);
  update();
})();
