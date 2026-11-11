/* HOP. cookie and storage consent.
   Nothing optional runs until the visitor chooses. The choice itself and the
   language are strictly necessary and always stored.

   Categories
     preferences  keeps an unsent contact-form draft (localStorage "hop-contact-draft")
     analytics    visit statistics (Umami Cloud, cookieless): counts unless the visitor
                  has switched this off; see loadStats below.

   API (window.HOPConsent)
     allowed(category) -> boolean
     open()            -> opens the settings panel
     Event: document "hop:consent", detail = { preferences, analytics } */
(function () {
  "use strict";

  var KEY = "hop-consent";
  var VERSION = 1;
  var MAX_AGE = 365 * 24 * 60 * 60 * 1000;   /* ask again after 12 months */
  var CATS = ["preferences", "analytics"];
  var OPTIONAL_KEYS = { preferences: ["hop-contact-draft"], analytics: [] };

  function read() {
    try {
      var c = JSON.parse(localStorage.getItem(KEY) || "null");
      if (!c || c.v !== VERSION || !c.at || Date.now() - c.at > MAX_AGE) return null;
      return c;
    } catch (e) { return null; }
  }
  function write(choice) {
    var c = { v: VERSION, at: Date.now() };
    CATS.forEach(function (k) { c[k] = !!choice[k]; });
    try { localStorage.setItem(KEY, JSON.stringify(c)); } catch (e) {}
    return c;
  }

  var state = read();
  var bar = document.getElementById("consent-bar");
  var dialog = document.getElementById("consent-dialog");
  var root = document.documentElement;

  function allowed(cat) { return !!(state && state[cat]); }

  function apply() {
    /* Withdrawn consent removes what that category stored */
    CATS.forEach(function (k) {
      if (!allowed(k)) OPTIONAL_KEYS[k].forEach(function (key) { try { localStorage.removeItem(key); } catch (e) {} });
    });
    var detail = {};
    CATS.forEach(function (k) { detail[k] = allowed(k); });
    try { document.dispatchEvent(new CustomEvent("hop:consent", { detail: detail })); } catch (e) {}
  }

  function showBar(on) {
    if (!bar) return;
    bar.hidden = !on;
    root.classList.toggle("consent-pending", on);
  }

  function choose(choice) {
    var hadFocus = bar && bar.contains(document.activeElement);
    state = write(choice);
    showBar(false);
    if (dialog && dialog.open) dialog.close();
    apply();
    /* Keep keyboard users in place once the banner disappears */
    if (hadFocus) { var main = document.getElementById("main"); if (main) { main.setAttribute("tabindex", "-1"); main.focus({ preventScroll: true }); } }
  }

  function open() {
    if (!dialog) return;
    CATS.forEach(function (k) {
      var box = dialog.querySelector('input[name="' + k + '"]');
      if (box) box.checked = allowed(k);
    });
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
  }

  document.addEventListener("click", function (e) {
    var b = e.target.closest && e.target.closest("[data-consent]");
    if (!b) return;
    var act = b.getAttribute("data-consent");
    if (act === "accept") choose({ preferences: true, analytics: true });
    else if (act === "reject") choose({ preferences: false, analytics: false });
    else if (act === "settings") open();
    else if (act === "save") {
      var c = {};
      CATS.forEach(function (k) { var box = dialog.querySelector('input[name="' + k + '"]'); c[k] = !!(box && box.checked); });
      choose(c);
    }
  });

  /* A click on the dimmed backdrop closes the panel without saving */
  if (dialog) dialog.addEventListener("click", function (e) { if (e.target === dialog) dialog.close(); });

  window.HOPConsent = { allowed: allowed, open: open };

  /* Visit statistics: Umami Cloud. Cookieless and stores nothing in the browser, so it counts by
     default; anyone who switches Statistics off (or clicks Reject all) is not counted. */
  var um = document.querySelector('meta[name="hop-umami"]');
  var statsOff = function () { var s = read(); return !!(s && s.analytics === false); };
  window.hopUmamiGate = function (type, payload) { return statsOff() ? false : payload; };
  var loadStats = function () {
    if (!um || statsOff() || document.getElementById("umami-js")) return;
    var s = document.createElement("script");
    s.id = "umami-js"; s.defer = true; s.src = "https://cloud.umami.is/script.js";
    s.setAttribute("data-website-id", um.getAttribute("content"));
    s.setAttribute("data-domains", "hoppartners.pl,www.hoppartners.pl");
    s.setAttribute("data-before-send", "hopUmamiGate");
    document.head.appendChild(s);
  };
  document.addEventListener("hop:consent", loadStats);
  loadStats();

  if (!state) showBar(true);
  apply();
})();
