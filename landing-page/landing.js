// Primer landing page: the theme toggle, who is signed in, and the live
// catalog.
//
// Who is looking comes from Yard Auth, never from code in this repo. One
// session covers this page and every service of the project, so the app's
// own api/me (which reads the trusted X-Yard-* headers) answers for here too:
//   app/api/me                       always 200: { authenticated, email, plan, is_admin, ... }
//   __yard/auth/login?return=/app/   signs in and lands in the app
//   __yard/auth/logout?return=/      ends the Primer session, back here
//
// The app's service is access=public, so app/api/courses answers anonymous
// visitors too; that is what fills the course cards with real courses. Every
// URL is relative so the page works at <team>.yard.sh/<slug>/, inside a
// /@sandbox/, and on a custom domain.
(function () {
  "use strict";

  // Resolve against the directory the page is served from, even when the URL
  // arrives without its trailing slash (/primer rather than /primer/).
  var base = location.href.split(/[?#]/)[0];
  if (!/\/$/.test(base) && !/\.html?$/.test(base)) base += "/";
  var APP = new URL("app/", base).href;
  var LOGIN = new URL("__yard/auth/login?return=/app/", base).href;
  var LOGOUT = new URL("__yard/auth/logout?return=/", base).href;

  function el(tag, attrs, kids) {
    var node = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === "text") node.textContent = attrs[k];
      else if (attrs[k] != null && attrs[k] !== false) node.setAttribute(k, attrs[k]);
    });
    (kids || []).forEach(function (kid) {
      if (kid) node.appendChild(kid);
    });
    return node;
  }

  function getJSON(path) {
    return fetch(new URL(path, APP), {
      credentials: "same-origin",
      headers: { Accept: "application/json" },
      redirect: "error",
    })
      .then(function (res) {
        return res.ok ? res.json() : null;
      })
      .catch(function () {
        return null;
      });
  }

  // Every relative link to app/ should survive a missing trailing slash.
  document.querySelectorAll('a[href^="app/"]').forEach(function (a) {
    a.href = new URL(a.getAttribute("href"), base).href;
  });

  /* ------------------------------------------------------------- theme */

  var toggle = document.getElementById("theme-toggle");
  if (toggle) {
    toggle.addEventListener("click", function () {
      var root = document.documentElement;
      var current = root.dataset.theme || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
      var next = current === "dark" ? "light" : "dark";
      root.dataset.theme = next;
      try {
        localStorage.setItem("primer.theme", next);
      } catch (e) {}
    });
  }

  /* ---------------------------------------------------------- account */

  var slot = document.getElementById("auth");

  function planLabel(me) {
    if (me.is_admin) return "Team";
    return me.plan === "premium" ? me.premium_tier : "Free";
  }

  function signedOut() {
    slot.replaceChildren(el("a", { class: "btn btn--sm btn--primary", href: LOGIN, text: "Sign in" }));
    var free = document.getElementById("free-cta");
    if (free) free.href = LOGIN;
  }

  function signedIn(me, avatarUrl) {
    var initial = el("span", { class: "account__initial", "aria-hidden": "true" });
    if (avatarUrl) initial.appendChild(el("img", { src: avatarUrl, alt: "" }));
    else initial.textContent = (me.email || "?").charAt(0).toUpperCase();

    var button = el("button", { class: "account__btn", type: "button", "aria-haspopup": "true", "aria-expanded": "false" }, [
      initial,
      el("span", { class: "account__plan", text: planLabel(me) }),
    ]);
    var menu = el("div", { class: "menu", hidden: "" }, [
      el("div", { class: "menu__who" }, [
        el("strong", { text: me.email || "Signed in" }),
        el("span", { class: "label", text: me.is_admin ? "Team member · admin" : planLabel(me) + " plan" }),
      ]),
      el("a", { href: APP, text: "Open Primer" }),
      me.is_admin ? el("a", { href: APP + "#/admin", text: "Admin" }) : null,
      el("a", { href: "https://yard.sh/library/security", text: "Connected apps" }),
      el("a", { href: LOGOUT, text: "Sign out" }),
    ]);
    var account = el("div", { class: "account" }, [button, menu]);

    function close() {
      menu.hidden = true;
      button.setAttribute("aria-expanded", "false");
    }
    button.addEventListener("click", function (event) {
      event.stopPropagation();
      menu.hidden = !menu.hidden;
      button.setAttribute("aria-expanded", String(!menu.hidden));
    });
    document.addEventListener("click", function (event) {
      if (!account.contains(event.target)) close();
    });
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") close();
    });

    slot.replaceChildren(el("a", { class: "btn btn--sm btn--primary", href: APP, text: "Open Primer" }), account);
    var free = document.getElementById("free-cta");
    if (free) {
      free.href = APP;
      free.textContent = "Open Primer";
    }
  }

  function ownership() {
    if (!window.yard || !window.yard.ownership) return Promise.resolve(null);
    return window.yard.ownership().catch(function () {
      return null;
    });
  }

  getJSON("api/me").then(function (me) {
    if (!me || !me.authenticated) return signedOut();
    // The Yard avatar, when there is one, comes from the yard.sh account.
    return ownership().then(function (state) {
      signedIn(me, state && state.user && state.user.avatar_url);
    });
  });

  /* ---------------------------------------------------------- catalog */

  // The same course cards as the app's catalog (see app/ui.js).
  var MAX_CARDS = 8;
  var grid = document.getElementById("course-grid");

  function card(course, subject) {
    var locked = course.access === "premium";
    var p = course.progress;
    var foot = el("span", { class: "card__foot" }, [
      el("span", {
        class: "label",
        text: course.sections + (course.sections === 1 ? " section" : " sections") + " · " + course.minutes + " min",
      }),
    ]);
    if (p && course.sections && !locked && p.completed + p.in_progress > 0) {
      var pct = Math.round((p.completed / course.sections) * 100);
      foot.appendChild(
        el("span", { class: "card__progress" }, [
          el("span", { class: "progress" }, [el("span", { class: "progress__bar", style: "width: " + pct + "%" })]),
          el("span", { class: "label", text: p.completed + " of " + course.sections + " done" }),
        ]),
      );
    }
    return el(
      "a",
      { class: "card", "data-subject": course.subject, href: APP + "#/course/" + encodeURIComponent(course.id) },
      [
        el("span", { class: "card__top" }, [
          el("span", { class: "card__subject" }, [
            el("span", { class: "dot", "aria-hidden": "true" }),
            document.createTextNode(subject ? subject.name : course.subject),
          ]),
          course.tier === "premium" ? el("span", { class: "badge", text: "Premium" }) : null,
        ]),
        el("span", { class: "card__title", text: course.title }),
        course.summary ? el("span", { class: "card__summary", text: course.summary }) : null,
        foot,
      ],
    );
  }

  if (grid) {
    getJSON("api/courses").then(function (data) {
      if (!data || !data.courses || !data.courses.length) return;
      var subjects = {};
      (data.subjects || []).forEach(function (s) {
        subjects[s.key] = s;
      });
      var published = data.courses.filter(function (c) {
        return c.published;
      });
      if (!published.length) return;
      grid.replaceChildren.apply(
        grid,
        published.slice(0, MAX_CARDS).map(function (c) {
          return el("li", {}, [card(c, subjects[c.subject])]);
        }),
      );
      var all = document.getElementById("courses-all");
      if (all && published.length > MAX_CARDS) all.textContent = "See all " + published.length + " courses →";
      if (window.yard && window.yard.refresh) window.yard.refresh();
    });
  }
})();
