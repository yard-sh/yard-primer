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
// visitors too; that is what fills the lines below with real courses. Every
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

  // Each course is a line: a numbered bullet in its subject's colour, then a
  // strip map of its stops. Same shapes as the app (see app/ui.js).
  var MAX_LINES = 6;
  var list = document.getElementById("courses");

  function strip(course) {
    var stops = course.stops || [];
    var cls = "strip" + (course.access === "premium" ? " is-locked" : "") + (stops.length > 8 ? " is-dense" : "");
    var ol = el("ol", { class: cls, style: "--n: " + Math.max(stops.length, 1), "aria-hidden": "true" });
    stops.forEach(function (s) {
      ol.appendChild(
        el("li", { class: "stop" }, [
          el("span", { class: "stop__dot", "data-status": s.status }),
          el("span", { class: "stop__name", text: s.title }),
        ]),
      );
    });
    return ol;
  }

  function lineRow(course, number, subject) {
    var facts = [subject ? subject.name : course.subject, course.sections + (course.sections === 1 ? " stop" : " stops"), course.minutes + " min"];
    return el(
      "a",
      { class: "line-row", "data-subject": course.subject, href: APP + "#/course/" + encodeURIComponent(course.id) },
      [
        el("span", { class: "line-row__head" }, [
          el("span", { class: "bullet", text: String(number), "aria-hidden": "true" }),
          el("span", { class: "line-row__title", text: course.title }),
          course.tier === "premium" ? el("span", { class: "badge", text: "Premium" }) : null,
          el("span", { class: "line-row__facts label", text: facts.join(" · ") }),
        ]),
        (course.stops || []).length ? strip(course) : null,
      ],
    );
  }

  if (list) {
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
      list.replaceChildren.apply(
        list,
        published.slice(0, MAX_LINES).map(function (c, i) {
          return el("li", {}, [lineRow(c, i + 1, subjects[c.subject])]);
        }),
      );
      var all = document.getElementById("lines-all");
      if (all && published.length > MAX_LINES) all.textContent = "See all " + published.length + " lines →";
      if (window.yard && window.yard.refresh) window.yard.refresh();
    });
  }
})();
