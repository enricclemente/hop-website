/* HOP. intro gate — runs in <head> before first paint. Decides once whether the
   House of Poland → hop. intro plays: homepage only, once per visit, never with
   reduced motion or a deep link. If this file fails, the intro simply never shows. */
(function () {
  try {
    var d = document.documentElement, p = location.pathname;
    if (p !== "/" && p !== "/index.html") return;
    if (location.hash || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (sessionStorage.getItem("hop-intro")) return;
    sessionStorage.setItem("hop-intro", "1");
    d.classList.add("i5-on");
  } catch (e) { /* storage blocked: skip the intro */ }
})();
