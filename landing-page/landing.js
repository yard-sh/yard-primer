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
// visitors too; that is what fills the table below with real courses. Every
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

  var MAX_TILES = 8;
  var list = document.getElementById("courses");

  function dot(status) {
    var ns = "http://www.w3.org/2000/svg";
    var svg = document.createElementNS(ns, "svg");
    svg.setAttribute("class", "dot");
    svg.setAttribute("viewBox", "0 0 12 12");
    svg.setAttribute("aria-hidden", "true");
    var ring = document.createElementNS(ns, "circle");
    ring.setAttribute("cx", "6");
    ring.setAttribute("cy", "6");
    ring.setAttribute("r", "4.8");
    ring.setAttribute("fill", "none");
    svg.appendChild(ring);
    if (status !== "not_started") {
      var fill = document.createElementNS(ns, status === "completed" ? "circle" : "path");
      fill.setAttribute("class", "fill");
      if (status === "completed") {
        fill.setAttribute("cx", "6");
        fill.setAttribute("cy", "6");
        fill.setAttribute("r", "4.8");
      } else {
        fill.setAttribute("d", "M6 1.2a4.8 4.8 0 000 9.6z");
      }
      svg.appendChild(fill);
    }
    return svg;
  }

  function tile(course, number, subject) {
    var p = course.progress || { completed: 0, in_progress: 0 };
    var dots = el("span", { class: "tile__dots", "aria-hidden": "true" });
    for (var i = 0; i < course.sections; i++) {
      dots.appendChild(dot(i < p.completed ? "completed" : i < p.completed + p.in_progress ? "in_progress" : "not_started"));
    }
    var top = el("span", { class: "tile__top" }, [
      el("span", { text: String(number).padStart(2, "0") }),
      course.tier === "premium" ? el("span", { class: "tile__stamp", text: "Premium" }) : null,
    ]);
    return el(
      "a",
      {
        class: "tile" + (course.access === "premium" ? " is-locked" : ""),
        "data-subject": course.subject,
        href: APP + "#/course/" + encodeURIComponent(course.id),
      },
      [
        top,
        el("span", { class: "tile__sym", text: subject ? subject.symbol : course.subject.slice(0, 2), "aria-hidden": "true" }),
        el("span", { class: "tile__name", text: course.title }),
        el("span", {
          class: "tile__meta",
          text: course.sections + (course.sections === 1 ? " section" : " sections") + " · " + course.minutes + " min",
        }),
        dots,
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
        published.slice(0, MAX_TILES).map(function (c, i) {
          return el("li", {}, [tile(c, i + 1, subjects[c.subject])]);
        }),
      );
      var all = document.getElementById("table-all");
      if (all) all.textContent = "See all " + published.length + " courses →";
      if (window.yard && window.yard.refresh) window.yard.refresh();
    });
  }
})();
