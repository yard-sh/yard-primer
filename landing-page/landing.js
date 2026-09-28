// Primer landing page: the theme toggle, who is signed in, search, and the
// live catalog (stats, course cards, subjects) from a single fetch.
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

  // Both go through Yard Auth, which signs in existing accounts and creates
  // new ones; "Join for free" is the same door with a friendlier label.
  function signedOut() {
    slot.replaceChildren(
      el("a", { class: "auth__link", href: LOGIN, text: "Sign in" }),
      el("a", { class: "btn btn--sm btn--primary", href: LOGIN, text: "Join for free" }),
    );
    ["free-cta", "hero-cta", "foot-account-link"].forEach(function (id) {
      var link = document.getElementById(id);
      if (link) link.href = LOGIN;
    });
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
    [
      ["free-cta", "Open Primer"],
      ["hero-cta", "Continue learning"],
      ["foot-account-link", "Open Primer"],
    ].forEach(function (pair) {
      var link = document.getElementById(pair[0]);
      if (!link) return;
      link.href = APP;
      link.textContent = pair[1];
    });
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

  /* ----------------------------------------------------------- search */

  // The forms work without JavaScript (a GET to app/?q=…, which the app moves
  // into its hash). With it, go straight to the filtered catalog.
  document.querySelectorAll("[data-search]").forEach(function (form) {
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      var q = form.querySelector("input").value.trim().slice(0, 100);
      location.href = APP + (q ? "#/?q=" + encodeURIComponent(q) : "#/");
    });
  });

  /* ---------------------------------------------------------- catalog */

  // The same course cards as the app's catalog (see courseCard in app/ui.js).
  // Two rows of four on wide screens; four cards at a time on phones.
  var PAGE = window.matchMedia("(max-width: 720px)").matches ? 4 : 8;
  var grid = document.getElementById("course-grid");
  var tabs = document.getElementById("course-tabs");
  var more = document.getElementById("show-more");

  function plural(n, word) {
    return n + " " + word + (n === 1 ? "" : "s");
  }

  function card(course, subject, premiumName) {
    var locked = course.access === "premium";
    var p = course.progress;
    var learn = (course.outline || []).slice(0, 3).map(function (s) {
      return s.title;
    });
    var tier = course.tier === "premium" ? premiumName : "Free";
    var foot = el("span", { class: "card__foot" }, [
      el("span", { class: "label", text: tier + " · " + plural(course.sections, "section") + " · " + course.minutes + " min" }),
    ]);
    if (p && course.sections && !locked && p.completed + p.in_progress > 0) {
      var pct = Math.round((p.completed / course.sections) * 100);
      foot.appendChild(
        el("span", { class: "card__progress" }, [
          el("span", { class: "progress" }, [el("span", { class: "progress__bar", style: "width: " + pct + "%" })]),
          el("span", { class: "label", text: p.completed === course.sections ? "Completed" : p.completed + " of " + course.sections + " done" }),
        ]),
      );
    }
    return el("a", { class: "card", "data-subject": course.subject, href: APP + "#/course/" + encodeURIComponent(course.id) }, [
      el("span", { class: "cover", "aria-hidden": "true" }, [
        el("span", { class: "cover__badges" }, [course.tier === "premium" ? el("span", { class: "badge", text: premiumName }) : null]),
      ]),
      el("span", { class: "card__body" }, [
        el("span", { class: "card__subject" }, [
          el("span", { class: "dot", "aria-hidden": "true" }),
          document.createTextNode(subject ? subject.name : course.subject),
        ]),
        el("span", { class: "card__title", text: course.title }),
        learn.length
          ? el("span", { class: "card__learn" }, [el("b", { text: "You'll learn: " }), document.createTextNode(learn.join(", "))])
          : null,
        foot,
      ]),
    ]);
  }

  function setStat(key, value) {
    var node = document.querySelector('[data-stat="' + key + '"]');
    if (node) node.textContent = value;
  }

  function fill(data) {
    var subjects = {};
    (data.subjects || []).forEach(function (s) {
      subjects[s.key] = s;
    });
    var courses = data.courses.filter(function (c) {
      return c.published;
    });
    if (!courses.length) return;
    var premiumName = "Premium";
    var tiers = window.yard && window.yard.project && window.yard.project.tiers;
    if (tiers) {
      tiers.forEach(function (t) {
        if (!t.is_default) premiumName = t.name;
      });
    }

    // Stats: every number here is counted from the catalog itself.
    var sections = 0;
    var minutes = 0;
    var bySubject = {};
    courses.forEach(function (c) {
      sections += c.sections;
      minutes += c.minutes;
      bySubject[c.subject] = (bySubject[c.subject] || 0) + 1;
    });
    var free = courses.filter(function (c) {
      return c.tier === "free";
    }).length;
    setStat("courses", String(courses.length));
    setStat("sections", String(sections));
    setStat("subjects", String(Object.keys(bySubject).length));
    setStat("hours", minutes < 60 ? minutes + " min" : String(Math.round(minutes / 6) / 10));
    setStat("free", String(free));
    document.getElementById("stats").hidden = false;

    // Course grid: tabs pick the set, "Show more" reveals it a page at a time.
    var tab = "all";
    var shown = PAGE;
    var cards = courses.map(function (c) {
      return { course: c, li: el("li", {}, [card(c, subjects[c.subject], premiumName)]) };
    });
    grid.replaceChildren.apply(
      grid,
      cards.map(function (item) {
        return item.li;
      }),
    );

    function render() {
      var matching = cards.filter(function (item) {
        return tab === "all" || item.course.tier === tab;
      });
      cards.forEach(function (item) {
        item.li.hidden = true;
      });
      matching.slice(0, shown).forEach(function (item) {
        item.li.hidden = false;
      });
      var left = matching.length - shown;
      more.hidden = left <= 0;
      more.textContent = "Show " + Math.min(left, PAGE) + " more";
      tabs.querySelectorAll("[data-tab]").forEach(function (button) {
        button.setAttribute("aria-selected", String(button.dataset.tab === tab));
      });
    }

    tabs.hidden = !(free > 0 && free < courses.length);
    tabs.addEventListener("click", function (event) {
      var button = event.target.closest("[data-tab]");
      if (!button) return;
      tab = button.dataset.tab;
      shown = PAGE;
      render();
    });
    more.addEventListener("click", function () {
      shown += PAGE;
      render();
    });
    render();

    // Subjects: real counts, in the order the server lists them.
    var list = document.getElementById("subject-list");
    var footList = document.getElementById("foot-subject-list");
    var present = (data.subjects || []).filter(function (s) {
      return bySubject[s.key];
    });
    list.replaceChildren.apply(
      list,
      present.map(function (s) {
        var href = APP + "#/?subject=" + encodeURIComponent(s.key);
        return el("li", {}, [
          el("a", { class: "subject", "data-subject": s.key, href: href }, [
            el("span", { class: "dot", "aria-hidden": "true" }),
            el("span", { class: "subject__name", text: s.name }),
            el("span", { class: "subject__count label", text: plural(bySubject[s.key], "course") }),
          ]),
        ]);
      }),
    );
    footList.replaceChildren.apply(
      footList,
      present.map(function (s) {
        return el("li", {}, [el("a", { href: APP + "#/?subject=" + encodeURIComponent(s.key), text: s.name })]);
      }),
    );

    if (window.yard && window.yard.refresh) window.yard.refresh();
  }

  getJSON("api/courses").then(function (data) {
    if (data && data.courses) fill(data);
  });
})();
