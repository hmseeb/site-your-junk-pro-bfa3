/* =========================================================
   Your Junk Pro — site scripts
   Progressive enhancement only: every form works without JS.
   ========================================================= */
(function () {
  "use strict";

  var FORM_ENDPOINT =
    "https://vision.leadrai.com/api/forms/2293cd96c42260ae8669adf683ddcb2d";

  /* ---------------------------------------------------------
     1. Mobile navigation
     --------------------------------------------------------- */
  function initNav() {
    var toggle = document.querySelector(".nav-toggle");
    var nav = document.getElementById("site-nav");
    if (!toggle || !nav) return;

    toggle.addEventListener("click", function () {
      var open = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", open ? "false" : "true");
      nav.classList.toggle("is-open", !open);
    });

    // Close the menu when a link is tapped (mobile).
    nav.addEventListener("click", function (e) {
      if (e.target.closest("a") && window.innerWidth < 960) {
        toggle.setAttribute("aria-expanded", "false");
        nav.classList.remove("is-open");
      }
    });

    // Close on Escape.
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && nav.classList.contains("is-open")) {
        toggle.setAttribute("aria-expanded", "false");
        nav.classList.remove("is-open");
        toggle.focus();
      }
    });

    // Reset state when resizing up to desktop.
    window.addEventListener("resize", function () {
      if (window.innerWidth >= 960) {
        nav.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
      }
    });
  }

  /* ---------------------------------------------------------
     2. Header shadow on scroll
     --------------------------------------------------------- */
  function initHeaderScroll() {
    var header = document.querySelector(".site-header");
    if (!header) return;
    var onScroll = function () {
      header.classList.toggle("is-scrolled", window.scrollY > 8);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* ---------------------------------------------------------
     3. FAQ accordion
     --------------------------------------------------------- */
  function initFaq() {
    var buttons = document.querySelectorAll(".faq-q");
    Array.prototype.forEach.call(buttons, function (btn) {
      btn.addEventListener("click", function () {
        var item = btn.closest(".faq-item");
        var panel = document.getElementById(btn.getAttribute("aria-controls"));
        var isOpen = btn.getAttribute("aria-expanded") === "true";
        btn.setAttribute("aria-expanded", isOpen ? "false" : "true");
        if (item) item.classList.toggle("is-open", !isOpen);
        if (panel) panel.hidden = isOpen;
      });
    });
  }

  /* ---------------------------------------------------------
     4. Footer year
     --------------------------------------------------------- */
  function initYear() {
    var nodes = document.querySelectorAll("[data-year]");
    var year = String(new Date().getFullYear());
    Array.prototype.forEach.call(nodes, function (n) {
      n.textContent = year;
    });
  }

  /* ---------------------------------------------------------
     5. Forms -> LeadrVision
     --------------------------------------------------------- */

  // Stamp the hidden _page field with the current URL on page load so the
  // visitor is returned to the right page after a plain (no-JS) submission.
  function stampPageFields() {
    var fields = document.querySelectorAll('input[name="_page"]');
    Array.prototype.forEach.call(fields, function (f) {
      f.value = window.location.href;
    });
  }

  // GoHighLevel expects a first/last name pair and a single message field.
  // Derive them from the visitor-facing fields so the contact in the
  // sub-account is created with everything filled in. Purely additive: the
  // original fields are still submitted untouched.
  function syncCrmFields(form) {
    var nameField = form.querySelector('[name="name"]');
    var first = form.querySelector('input[name="first_name"]');
    var last = form.querySelector('input[name="last_name"]');

    if (nameField && (first || last)) {
      var parts = String(nameField.value || "").trim().split(/\s+/);
      var firstName = parts.shift() || "";
      var lastName = parts.join(" ");
      if (first) first.value = firstName;
      if (last) last.value = lastName;
    }

    var message = form.querySelector('input[name="message"]');
    if (message) {
      var source = form.querySelector("textarea");
      message.value = source ? source.value : "";
    }

    // Keep "Website Form" in step with the form name.
    var formName = form.querySelector('input[name="_form"]');
    var websiteForm = form.querySelector('input[name="Website Form"]');
    if (formName && websiteForm && !websiteForm.value) {
      websiteForm.value = formName.value;
    }
  }

  function showStatus(form, type, message) {
    var box = form.querySelector(".form-status");
    if (!box) return;
    box.className = "form-status is-visible form-status--" + type;
    var text = box.querySelector(".form-status-text");
    if (text) text.innerHTML = message;
    box.setAttribute("role", type === "error" ? "alert" : "status");
  }

  var OK_MESSAGE =
    "<strong>Thanks, your message was sent.</strong>" +
    "We have received your request and will get back to you shortly. " +
    'Need junk gone today? Call us at <a href="tel:+18137310155">(813) 731-0155</a>.';

  function initForms() {
    var forms = document.querySelectorAll("form[data-leadr-form]");

    Array.prototype.forEach.call(forms, function (form) {
      // Keep the GoHighLevel fields in sync as the visitor types, so a plain
      // (non-fetch) POST carries them too.
      form.addEventListener("input", function () {
        syncCrmFields(form);
      });
      form.addEventListener("change", function () {
        syncCrmFields(form);
      });

      form.addEventListener("submit", function (e) {
        // The form carries `novalidate` so that it still posts normally without
        // JavaScript. With JS on we drive validation ourselves and must block
        // the submission, otherwise an invalid form would post as a full page.
        if (typeof form.checkValidity === "function" && !form.checkValidity()) {
          e.preventDefault();
          if (typeof form.reportValidity === "function") form.reportValidity();
          return;
        }

        e.preventDefault();

        var btn = form.querySelector('[type="submit"]');
        var originalLabel = btn ? btn.innerHTML : "";
        if (btn) {
          btn.disabled = true;
          btn.innerHTML = "Sending…";
        }

        // Keep _page fresh at submit time too.
        var pageField = form.querySelector('input[name="_page"]');
        if (pageField) pageField.value = window.location.href;

        // Refresh the derived GoHighLevel fields right before we serialise.
        syncCrmFields(form);

        // Build a JSON body from the form fields (includes _form, _page,
        // _gotcha and every human-readable field name).
        var payload = {};
        var fd = new FormData(form);
        fd.forEach(function (value, key) {
          if (Object.prototype.hasOwnProperty.call(payload, key)) {
            // Preserve multi-value fields (e.g. checkbox groups).
            if (Array.isArray(payload[key])) {
              payload[key].push(value);
            } else {
              payload[key] = [payload[key], value];
            }
          } else {
            payload[key] = value;
          }
        });
        payload._page = window.location.href;

        fetch(FORM_ENDPOINT, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json"
          },
          body: JSON.stringify(payload)
        })
          .then(function (res) {
            return res
              .json()
              .catch(function () {
                return { ok: res.ok };
              })
              .then(function (data) {
                if (!res.ok || !data || data.ok !== true) {
                  throw new Error("Submission failed");
                }
                return data;
              });
          })
          .then(function () {
            showStatus(form, "ok", OK_MESSAGE);
            form.reset();
            stampPageFields();
            var box = form.querySelector(".form-status");
            if (box && typeof box.scrollIntoView === "function") {
              box.scrollIntoView({ behavior: "smooth", block: "center" });
            }
          })
          .catch(function () {
            showStatus(
              form,
              "error",
              "<strong>Sorry, that didn’t go through.</strong>" +
                'Please try again, or call us directly at <a href="tel:+18137310155">(813) 731-0155</a> ' +
                'or email <a href="mailto:bookyourjunkpro@gmail.com">bookyourjunkpro@gmail.com</a>.'
            );
          })
          .then(function () {
            if (btn) {
              btn.disabled = false;
              btn.innerHTML = originalLabel;
            }
          });
      });
    });
  }

  // Show the confirmation after a plain HTML (no-JS) submission, which
  // returns the visitor to this page with ?submitted=1 in the URL.
  function initSubmittedNotice() {
    var params = new URLSearchParams(window.location.search);
    if (params.get("submitted") !== "1") return;

    var form = document.querySelector("form[data-leadr-form]");
    if (form) {
      showStatus(form, "ok", OK_MESSAGE);
      var box = form.querySelector(".form-status");
      if (box && typeof box.scrollIntoView === "function") {
        box.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }

  /* ---------------------------------------------------------
     Boot
     --------------------------------------------------------- */
  function boot() {
    initNav();
    initHeaderScroll();
    initFaq();
    initYear();
    stampPageFields();
    initForms();
    initSubmittedNotice();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
