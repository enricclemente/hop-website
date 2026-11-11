/* HOP. contact form on the V2 contact page. Same behaviour as before:
   inline validation, an error summary, drafts kept only with Preferences consent,
   the burning platform pre-selected from ?platform=, and JSON to /api/contact.
   Needs v2.js (window.HOPv2) and consent.js. */
(function () {
  "use strict";
  var H = window.HOPv2 || { lang: function () { return "en"; }, translate: function () {}, store: function () { return null; }, reduce: false };
  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  var form = document.getElementById("contact-form");
  if (form) {
    var sent = document.getElementById("form-sent");
    var alertBox = document.getElementById("form-alert");
    var submitBtn = document.getElementById("c-submit");
    var msg = document.getElementById("c-message");
    var counter = document.getElementById("c-message-count");
    var startedAt = Date.now();
    var DRAFT = "hop-contact-draft";
    var M = {
      en: {
        name: "Please enter your name.",
        email: "Please enter your email address.",
        emailBad: "This doesn’t look like an email address. Check for typos.",
        phone: "Use digits, spaces and + only.",
        message: "Tell us a little about the leap you’re planning.",
        messageShort: "A little more, please: at least 20 characters.",
        consent: "Please tick the box so we can store your details and reply.",
        summary: "Please fix the following:",
        fail: "Your message wasn’t sent. Please try again, or email us directly at ",
        offline: "You seem to be offline. Your message is saved here; send it again when you’re back online."
      },
      pl: {
        name: "Podaj imię i nazwisko.",
        email: "Podaj adres e-mail.",
        emailBad: "To nie wygląda na adres e-mail. Sprawdź, czy nie ma literówki.",
        phone: "Użyj tylko cyfr, spacji i znaku +.",
        message: "Napisz kilka słów o skoku, który planujesz.",
        messageShort: "Jeszcze trochę: co najmniej 20 znaków.",
        consent: "Zaznacz zgodę, abyśmy mogli zapisać dane i odpowiedzieć.",
        summary: "Popraw następujące pola:",
        fail: "Wiadomość nie została wysłana. Spróbuj ponownie lub napisz bezpośrednio na ",
        offline: "Brak połączenia. Wiadomość jest zapisana; wyślij ją ponownie, gdy wrócisz online."
      }
    };
    function m(k) { return (M[H.lang()] || M.en)[k]; }
    var fieldOrder = ["name", "email", "phone", "message", "consent"];
    function input(name) { return form.elements[name]; }
    function box(name) { return form.querySelector('[data-field="' + name + '"]'); }

    function check(name) {
      var v = input(name);
      var val = v.type === "checkbox" ? v.checked : String(v.value || "").trim();
      switch (name) {
        case "name": return val ? "" : m("name");
        case "email": return !val ? m("email") : (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(val) ? "" : m("emailBad"));
        case "phone": return !val || /^[+()\d\s.\-]{6,}$/.test(val) ? "" : m("phone");
        case "message": return !val ? m("message") : (val.length < 20 ? m("messageShort") : "");
        case "consent": return val ? "" : m("consent");
      }
      return "";
    }
    function show(name, error) {
      var b = box(name);
      if (!b) return;
      var errEl = b.querySelector(".err");
      var inp = input(name);
      b.classList.toggle("invalid", !!error);
      var filled = inp.type === "checkbox" ? inp.checked : String(inp.value || "").trim();
      b.classList.toggle("valid", !error && !!filled && inp.type !== "checkbox" && name !== "message");
      inp.setAttribute("aria-invalid", error ? "true" : "false");
      if (errEl) { errEl.textContent = error; errEl.setAttribute("data-notr", ""); }
    }
    var touched = {};
    fieldOrder.forEach(function (name) {
      var inp = input(name);
      inp.addEventListener("blur", function () { touched[name] = true; show(name, check(name)); });
      inp.addEventListener(inp.type === "checkbox" ? "change" : "input", function () {
        if (touched[name] || box(name).classList.contains("invalid")) show(name, check(name));
      });
    });

    /* Message: grows with the text, counts characters */
    function grow() {
      msg.style.height = "auto";
      msg.style.height = Math.min(msg.scrollHeight + 2, 640) + "px";
      var n = msg.value.length;
      counter.textContent = n + " / 2000";
      counter.classList.toggle("near", n > 1800);
    }
    msg.addEventListener("input", grow);

    /* Drafts: kept in this browser only, until the message is sent */
    function data() {
      var interests = Array.prototype.slice.call(form.querySelectorAll('input[name="interests"]:checked')).map(function (c) { return c.value; });
      var partner = (form.querySelector('input[name="partner"]:checked') || {}).value || "Either";
      var platform = (form.querySelector('input[name="platform"]:checked') || {}).value || "";
      return {
        name: input("name").value.trim(), email: input("email").value.trim(),
        company: input("company").value.trim(), phone: input("phone").value.trim(),
        interests: interests, message: msg.value.trim(), partner: partner, platform: platform,
        consent: input("consent").checked, website: input("website").value,
        lang: H.lang(), page: location.pathname, elapsed: Date.now() - startedAt
      };
    }
    function saveDraft() {
      /* Drafts are optional storage: only with "Preferences" consent */
      if (!(window.HOPConsent && window.HOPConsent.allowed("preferences"))) return;
      var d = data();
      delete d.website; delete d.elapsed; delete d.consent;
      H.store(DRAFT, JSON.stringify(d));
    }
    var dt;
    form.addEventListener("input", function () { clearTimeout(dt); dt = setTimeout(saveDraft, 300); });
    form.addEventListener("change", saveDraft);
    function restoreDraft() {
      if (!(window.HOPConsent && window.HOPConsent.allowed("preferences"))) return;
      var raw = H.store(DRAFT);
      if (!raw) return;
      try {
        var d = JSON.parse(raw);
        var any = false;
        ["name", "email", "company", "phone"].forEach(function (k) { if (d[k]) { input(k).value = d[k]; any = true; } });
        if (d.message) { msg.value = d.message; any = true; }
        (d.interests || []).forEach(function (v) {
          var c = form.querySelector('input[name="interests"][value="' + v.replace(/"/g, "") + '"]');
          if (c) { c.checked = true; any = true; }
        });
        var r = form.querySelector('input[name="partner"][value="' + String(d.partner || "Either").replace(/"/g, "") + '"]');
        if (r) r.checked = true;
        var pf = d.platform && form.querySelector('input[name="platform"][value="' + String(d.platform).replace(/"/g, "") + '"]');
        if (pf) pf.checked = true;
        if (any) document.getElementById("draft-note").hidden = false;
      } catch (e) {}
      grow();
    }
    /* Arriving from "Let's make the leap" in the burning-platform list: preselect it */
    function platformFromUrl() {
      try {
        var slug = new URLSearchParams(location.search).get("platform");
        if (!slug || !/^[a-z-]{2,40}$/.test(slug)) return;
        var pf = form.querySelector('input[name="platform"][data-slug="' + slug + '"]');
        if (pf) pf.checked = true;
      } catch (e) {}
    }
    function clearDraft() { try { localStorage.removeItem(DRAFT); } catch (e) {} }
    document.getElementById("draft-clear").addEventListener("click", function () {
      form.reset(); clearDraft(); grow();
      fieldOrder.forEach(function (n) { show(n, ""); box(n) && box(n).classList.remove("valid"); });
      document.getElementById("draft-note").hidden = true;
      input("name").focus();
    });

    function showAlert(nodes) {
      alertBox.textContent = "";
      nodes.forEach(function (n) { alertBox.appendChild(n); });
      alertBox.setAttribute("data-notr", "");
      alertBox.hidden = false;
      alertBox.focus();
      alertBox.scrollIntoView({ behavior: H.reduce ? "auto" : "smooth", block: "center" });
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      alertBox.hidden = true;
      var errors = [];
      fieldOrder.forEach(function (name) {
        touched[name] = true;
        var err = check(name);
        show(name, err);
        if (err) errors.push({ name: name, err: err });
      });
      if (errors.length) {
        if (errors.length === 1) { input(errors[0].name).focus(); return; }
        var ul = el("ul");
        errors.forEach(function (x) {
          var li = el("li");
          var a = el("a", null, x.err);
          a.href = "#" + input(x.name).id;
          a.addEventListener("click", function (ev) { ev.preventDefault(); input(x.name).focus(); });
          li.appendChild(a); ul.appendChild(li);
        });
        showAlert([el("strong", null, m("summary")), ul]);
        return;
      }

      var payload = data();
      submitBtn.classList.add("busy");
      submitBtn.setAttribute("aria-busy", "true");
      submitBtn.querySelector(".btn-txt").textContent = H.lang() === "pl" ? "Wysyłanie…" : "Sending…";

      var send = window.HOP_FORM_DEMO
        ? new Promise(function (res) { setTimeout(function () { res({ ok: true, demo: true }); }, 900); })
        : fetch("/api/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
            .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { j.ok = r.ok && j.ok !== false; return j; }); });

      send.then(function (res) {
        if (!res.ok) throw new Error(res.error || "failed");
        clearDraft();
        if (!res.demo && window.umami && typeof window.umami.track === "function") window.umami.track("Contact form sent", { to: payload.who || payload.partner || "", lang: H.lang() });
        sent.querySelector('[data-sent="name"]').textContent = payload.name ? ", " + payload.name.split(" ")[0] : "";
        sent.querySelector('[data-sent="name"]').setAttribute("data-notr", "");
        sent.querySelector('[data-sent="email"]').textContent = payload.email;
        sent.querySelector(".sent-demo").hidden = !res.demo;
        form.hidden = true;
        sent.hidden = false;
        H.translate(sent);
        sent.focus();
        sent.scrollIntoView({ behavior: H.reduce ? "auto" : "smooth", block: "start" });
      }).catch(function () {
        var p = el("p");
        if (!navigator.onLine) { p.textContent = m("offline"); }
        else {
          p.appendChild(document.createTextNode(m("fail")));
          var who = payload.partner === "David" ? "david@hoppartners.pl" : "philip@hoppartners.pl";
          var a = el("a", null, who); a.href = "mailto:" + who;
          p.appendChild(a); p.appendChild(document.createTextNode("."));
        }
        showAlert([p]);
      }).then(function () {
        submitBtn.classList.remove("busy");
        submitBtn.removeAttribute("aria-busy");
        submitBtn.querySelector(".btn-txt").textContent = H.lang() === "pl" ? "Wyślij wiadomość" : "Send message";
      });
    });

    document.getElementById("send-another").addEventListener("click", function () {
      form.reset(); grow();
      fieldOrder.forEach(function (n) { touched[n] = false; show(n, ""); });
      document.getElementById("draft-note").hidden = true;
      startedAt = Date.now();
      sent.hidden = true; form.hidden = false;
      input("name").focus();
    });

    restoreDraft();
    platformFromUrl();
    grow();
  }

})();
