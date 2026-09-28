// Primer frontend.
//
// Zero dependencies, plain ES modules. Every URL is RELATIVE ("api/courses",
// not "/api/courses"): the app is mounted at /<slug>/app/, so a root-absolute
// URL would resolve against the domain root. Routes live in the hash for the
// same reason:
//
//   #/                        the map of lines (catalog)
//   #/course/<id>             a course and its syllabus
//   #/course/<id>/<section>   the reader
//   #/admin                   courses, stats, new course
//   #/admin/course/<id>       course editor
//   #/admin/course/<id>/<s>   section editor
//
// This file boots, routes and runs the header. learn.js and admin.js draw
// the views; ui.js holds what they share.

import { $, state, api, guard, toast, bindSheet, rememberPlace, notFound, ApiError, el } from "./ui.js";
import { renderCatalog, renderCourse, renderReader } from "./learn.js";
import { renderAdmin, renderCourseEditor, renderSectionEditor } from "./admin.js";

const view = $("view");
let token = 0;
let currentHash = location.hash;

const ROUTES = [
  [/^#?\/?$/, "catalog", renderCatalog],
  [/^#\/course\/([a-z0-9-]+)$/, "catalog", renderCourse],
  [/^#\/course\/([a-z0-9-]+)\/([a-z0-9-]+)$/, "catalog", renderReader],
  [/^#\/admin$/, "admin", renderAdmin],
  [/^#\/admin\/course\/([a-z0-9-]+)$/, "admin", renderCourseEditor],
  [/^#\/admin\/course\/([a-z0-9-]+)\/([a-z0-9-]+)$/, "admin", renderSectionEditor],
];

/* ---------------------------------------------------------------- router */

// Each render gets a token. A view that finishes loading after the visitor
// has moved on sees ctx.stale() and draws nothing.
async function render({ navigated = true } = {}) {
  const mine = ++token;
  const hash = location.hash || "#/";
  const match = ROUTES.map(([re, nav, fn]) => ({ m: re.exec(hash), nav, fn })).find((r) => r.m);

  document.querySelectorAll("[data-nav]").forEach((link) => {
    if (match && link.dataset.nav === match.nav) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });

  const ctx = {
    view,
    params: match ? match.m.slice(1) : [],
    stale: () => mine !== token,
    show(...nodes) {
      if (mine !== token) return false;
      view.replaceChildren(...nodes);
      if (navigated) {
        window.scrollTo(0, 0);
        view.focus({ preventScroll: true });
      }
      return true;
    },
    title(text) {
      document.title = text ? `${text} · Primer` : "Primer";
    },
  };

  if (!match) {
    ctx.title("Not found");
    ctx.show(notFound());
    return;
  }

  try {
    await match.fn(ctx, ...ctx.params);
  } catch (err) {
    if (ctx.stale()) return;
    if (err instanceof ApiError && err.status === 404) {
      ctx.title("Not found");
      ctx.show(notFound());
      return;
    }
    console.error(err);
    ctx.show(
      el(
        "div",
        { class: "wrap" },
        el(
          "div",
          { class: "empty", style: "margin-top:48px" },
          el("p", { class: "label", text: "Something broke" }),
          el("h2", { text: "That page didn't load." }),
          el("p", { text: err.message || "Try again in a moment." }),
          el("button", { class: "btn btn--primary", type: "button", onclick: () => render(), text: "Try again" }),
        ),
      ),
    );
  }
}

window.addEventListener("hashchange", () => {
  if (state.dirty && location.hash !== currentHash) {
    if (!window.confirm("You have unsaved changes. Leave without saving?")) {
      history.replaceState(null, "", currentHash || "#/");
      return;
    }
    state.dirty = false;
  }
  currentHash = location.hash;
  closeMenu();
  render();
});

window.addEventListener("beforeunload", (event) => {
  if (!state.dirty) return;
  event.preventDefault();
  event.returnValue = "";
});

/* ------------------------------------------------------------ identity */

async function loadMe() {
  state.me = await api("api/me");
  state.meCheckedAt = Date.now();
  return state.me;
}

function planLabel(me) {
  if (me.is_admin) return "Team";
  return me.plan === "premium" ? me.premium_tier : "Free";
}

function renderHeader() {
  const me = state.me;
  $("sign-in").hidden = me.authenticated;
  $("account").hidden = !me.authenticated;
  $("nav-admin").hidden = !me.is_admin;
  if (!me.authenticated) return;

  $("account-initial").textContent = (me.email || "?").charAt(0).toUpperCase();
  $("account-plan").textContent = planLabel(me);
  $("account-email").textContent = me.email || "Signed in";
  $("account-role").textContent = me.is_admin
    ? "Team member · admin"
    : me.plan === "premium"
      ? `${me.premium_tier} plan`
      : "Free plan";
  $("menu-upgrade").hidden = me.plan === "premium";
  $("menu-plan").hidden = me.plan !== "premium" || me.is_admin;
  $("menu-admin").hidden = !me.is_admin;
}

// After a purchase the edge may report the old plan for up to a minute, so
// the app re-reads api/me whenever the window comes back into focus.
async function refreshMe() {
  if (!state.me || Date.now() - state.meCheckedAt < 10000) return;
  const before = state.me;
  try {
    await loadMe();
  } catch {
    return;
  }
  const now = state.me;
  const changed =
    before.plan !== now.plan || before.is_admin !== now.is_admin || before.authenticated !== now.authenticated;
  if (!changed) return;
  if (now.plan === "premium" && before.plan !== "premium") toast(`${now.premium_tier} is on. Every course is open.`);
  else toast("Your access changed.");
  renderHeader();
  if (!state.dirty) render({ navigated: false });
}

window.addEventListener("focus", refreshMe);
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") refreshMe();
});

/* ---------------------------------------------------------------- chrome */

function closeMenu() {
  $("account-menu").hidden = true;
  $("account-button").setAttribute("aria-expanded", "false");
}

function bindChrome() {
  bindSheet();

  $("sign-in").addEventListener("click", rememberPlace);

  $("account-button").addEventListener("click", (event) => {
    event.stopPropagation();
    const menu = $("account-menu");
    menu.hidden = !menu.hidden;
    $("account-button").setAttribute("aria-expanded", String(!menu.hidden));
  });
  document.addEventListener("click", (event) => {
    if (!$("account").contains(event.target)) closeMenu();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeMenu();
  });

  $("theme-toggle").addEventListener("click", () => {
    const root = document.documentElement;
    const current = root.dataset.theme || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    const next = current === "dark" ? "light" : "dark";
    root.dataset.theme = next;
    try {
      localStorage.setItem("primer.theme", next);
    } catch {}
  });
}

/* ------------------------------------------------------------------ boot */

async function main() {
  bindChrome();
  try {
    await loadMe();
  } catch (err) {
    view.replaceChildren(
      el("div", { class: "wrap" }, el("div", { class: "empty", style: "margin-top:48px" }, el("h2", { text: "Primer could not load." }), el("p", { text: err.message }))),
    );
    return;
  }
  renderHeader();

  // Back from Yard Auth: return to the page the visitor signed in from.
  let after = null;
  try {
    after = sessionStorage.getItem("primer.after");
    sessionStorage.removeItem("primer.after");
  } catch {}
  if (state.me.authenticated && after && /^#\/[a-z0-9/-]*$/.test(after) && !location.hash) {
    history.replaceState(null, "", after);
    currentHash = after;
  }

  await guard(() => render());
}

main();
