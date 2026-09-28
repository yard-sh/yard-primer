// Shared pieces: app state, the API helper, DOM helpers, tiles and dots,
// and the sheets (plan, sign in, confirm). Everything here builds DOM with
// textContent; the only HTML string the app ever inserts is the Markdown
// renderer's output, which escapes its input first.

export const $ = (id) => document.getElementById(id);

export const state = {
  me: null,
  meCheckedAt: 0,
  catalog: null,
  // An editor with unsaved changes. The router asks before leaving.
  dirty: false,
};

/* ------------------------------------------------------------------- api */

export class ApiError extends Error {
  constructor(message, status, code) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

// Relative paths only ("api/courses"): the app is mounted at /<slug>/app/.
// Every write carries a JSON body, even an empty one: the service refuses
// writes that are not application/json.
export async function api(path, { method = "GET", body } = {}) {
  const write = method !== "GET";
  const res = await fetch(path, {
    method,
    headers: write ? { "Content-Type": "application/json" } : undefined,
    body: write ? JSON.stringify(body || {}) : undefined,
    credentials: "same-origin",
  });
  let payload = null;
  try {
    payload = await res.json();
  } catch {
    payload = null;
  }
  if (!res.ok) {
    throw new ApiError((payload && payload.error) || "that didn't work", res.status, payload && payload.code);
  }
  return payload;
}

/* ------------------------------------------------------------------- dom */

// el("a", { class: "btn", href: "#/", text: "Home", onclick: fn }, child, ...)
export function el(tag, props, ...kids) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props || {})) {
    if (value === undefined || value === null || value === false) continue;
    if (key === "text") node.textContent = value;
    else if (key === "class") node.className = value;
    else if (key.startsWith("on") && typeof value === "function") node.addEventListener(key.slice(2), value);
    else if (value === true) node.setAttribute(key, "");
    else node.setAttribute(key, value);
  }
  for (const kid of kids.flat()) {
    if (kid === undefined || kid === null || kid === false) continue;
    node.append(kid instanceof Node ? kid : document.createTextNode(String(kid)));
  }
  return node;
}

const SVG_NS = "http://www.w3.org/2000/svg";

function svg(tag, attrs, ...kids) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [key, value] of Object.entries(attrs || {})) node.setAttribute(key, value);
  node.append(...kids);
  return node;
}

export function toast(message) {
  const node = $("toast");
  node.textContent = message;
  node.hidden = false;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => {
    node.hidden = true;
  }, 3600);
}

export function pad(n) {
  return String(n).padStart(2, "0");
}

export function plural(n, word, many = word + "s") {
  return `${n} ${n === 1 ? word : many}`;
}

export function capitalize(text) {
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : text;
}

/* ---------------------------------------------------------------- guard */

// Every user action runs through here. The server is the paywall and the
// role check; these branches only explain its refusals.
export async function guard(fn) {
  try {
    return await fn();
  } catch (err) {
    if (!(err instanceof ApiError)) {
      console.error(err);
      toast("Something went wrong. Try that again.");
      return undefined;
    }
    if (err.status === 401) return showSignIn();
    if (err.code === "premium_required") return showPlan();
    if (err.code === "admin_only") {
      toast("Only the project's team can do that.");
      location.hash = "#/";
      return undefined;
    }
    toast(capitalize(err.message) + ".");
    return undefined;
  }
}

/* -------------------------------------------------------- subjects, tiles */

export function subjectOf(key) {
  const subjects = (state.me && state.me.subjects) || [];
  return subjects.find((s) => s.key === key) || { key, name: key, symbol: key.slice(0, 2) };
}

const LOCK = () =>
  svg(
    "svg",
    { viewBox: "0 0 12 12", "aria-hidden": "true" },
    svg("rect", { x: "2", y: "5.5", width: "8", height: "5.5" }),
    svg("path", { d: "M4 5.5V4a2 2 0 014 0v1.5" }),
  );

export function stamps(course) {
  return [
    !course.published ? el("span", { class: "stamp stamp--draft", text: "Draft" }) : null,
    course.tier === "premium"
      ? el("span", { class: "stamp" }, course.access === "premium" ? LOCK() : null, "Premium")
      : null,
  ].filter(Boolean);
}

// One course as an element tile: number, stamps, symbol, name, facts, dots.
export function tile(course, number, { href, large = false } = {}) {
  const subject = subjectOf(course.subject);
  const locked = course.access === "premium";
  const cls = "tile" + (large ? " tile--lg" : "") + (locked ? " is-locked" : "");
  const facts = `${plural(course.sections, "section")} · ${course.minutes} min`;

  const top = el(
    "span",
    { class: "tile__top" },
    el("span", { text: pad(number), "aria-hidden": "true" }),
    el("span", { class: "tile__stamps" }, stamps(course)),
  );

  if (large) {
    return el(
      "div",
      { class: cls, "data-subject": course.subject },
      top,
      el("span", { class: "tile__sym", text: subject.symbol, "aria-hidden": "true" }),
      el("span", { class: "tile__name", text: subject.name }),
    );
  }

  return el(
    href ? "a" : "div",
    { class: cls, "data-subject": course.subject, href },
    top,
    el("span", { class: "tile__sym", text: subject.symbol, "aria-hidden": "true" }),
    el("span", { class: "tile__name", text: course.title }),
    el("span", { class: "tile__meta", text: facts }),
    el("span", { class: "tile__dots" }, dotsFromProgress(course)),
  );
}

// A small square in a subject's colour with its symbol.
export function sym(subjectKey) {
  const subject = subjectOf(subjectKey);
  return el("span", { class: "sym", "data-subject": subjectKey, text: subject.symbol, "aria-hidden": "true" });
}

/* ------------------------------------------------------------------ dots */

// Not started is an empty ring, in progress is half filled, completed is
// solid. Drawn as SVG because a font may not have the half-circle glyph.
export function dot(status) {
  const kids = [svg("circle", { cx: "6", cy: "6", r: "4.8", fill: "none" })];
  if (status === "completed") kids.push(svg("circle", { class: "fill", cx: "6", cy: "6", r: "4.8" }));
  if (status === "in_progress") kids.push(svg("path", { class: "fill", d: "M6 1.2a4.8 4.8 0 000 9.6z" }));
  return svg("svg", { class: "dot", viewBox: "0 0 12 12", "aria-hidden": "true", "data-status": status }, ...kids);
}

export function dots(statuses, label) {
  return el("span", { class: "dots", role: "img", "aria-label": label }, statuses.map(dot));
}

export const STATUS_LABEL = {
  not_started: "Not started",
  in_progress: "In progress",
  completed: "Done",
};

// The catalog knows counts, not which section is which, so its dots are a
// summary: finished first, then started, then the rest.
export function dotsFromProgress(course) {
  const p = course.progress || { completed: 0, in_progress: 0 };
  const statuses = [];
  for (let i = 0; i < course.sections; i++) {
    if (i < p.completed) statuses.push("completed");
    else if (i < p.completed + p.in_progress) statuses.push("in_progress");
    else statuses.push("not_started");
  }
  const label = course.progress
    ? `${p.completed} of ${course.sections} sections done`
    : plural(course.sections, "section");
  return dots(statuses, label);
}

/* ---------------------------------------------------------------- sign in */

// Yard Auth brings the visitor back to the app's root, so the page they were
// on is kept for the trip and restored by app.js after boot.
export function rememberPlace() {
  try {
    sessionStorage.setItem("primer.after", location.hash);
  } catch {}
}

export function signInLink(label = "Sign in", cls = "btn btn--primary") {
  return el("a", { class: cls, href: "__yard/auth/login?return=/", onclick: rememberPlace, text: label });
}

/* ---------------------------------------------------------------- sheets */

const sheet = () => $("sheet");

function openSheet(...kids) {
  const dialog = sheet();
  dialog.replaceChildren(el("div", { class: "sheet__body" }, kids));
  if (!dialog.open) dialog.showModal();
  const first = dialog.querySelector("a, button");
  if (first) first.focus();
}

export function closeSheet() {
  const dialog = sheet();
  if (dialog.open) dialog.close();
}

export function bindSheet() {
  // A click on the backdrop lands on the dialog element itself.
  sheet().addEventListener("click", (event) => {
    if (event.target === sheet()) closeSheet();
  });
}

export function showSignIn(message) {
  openSheet(
    el("p", { class: "label", text: "Sign in" }),
    el("h2", { text: "Your progress lives in your account." }),
    el("p", {
      text:
        message ||
        "Sign in with your Yard account to read sections and pick up where you left off, on any device.",
    }),
    el("div", { class: "actions" }, signInLink("Sign in"), el("button", { class: "btn", type: "button", onclick: closeSheet, text: "Not now" })),
  );
}

export function showPlan() {
  const me = state.me || {};
  const premium = (state.catalog || []).filter((c) => c.tier === "premium" && c.published);
  const tiles = premium.slice(0, 6).map((c) => sym(c.subject));
  const count = premium.length
    ? `all ${plural(premium.length, "Premium course")} on the table`
    : "every Premium course";
  openSheet(
    el("p", { class: "label", text: me.premium_tier || "Premium" }),
    el("h2", { text: "This one is on the Premium shelf." }),
    tiles.length ? el("div", { class: "sheet__tiles" }, tiles) : null,
    el("p", { text: `${me.premium_tier || "Premium"} opens ${count}, plus each new one the day it is published.` }),
    el(
      "div",
      { class: "actions" },
      el("a", { class: "btn btn--primary", href: "../#pricing", text: `See ${me.premium_tier || "Premium"}` }),
      me.authenticated ? null : signInLink("I already have it", "btn"),
      el("button", { class: "btn btn--flat", type: "button", onclick: closeSheet, text: "Not now" }),
    ),
  );
}

export function confirmSheet({ label, title, body, confirm, danger = false }) {
  return new Promise((resolve) => {
    const dialog = sheet();
    const done = (value) => {
      dialog.removeEventListener("close", onClose);
      closeSheet();
      resolve(value);
    };
    const onClose = () => done(false);
    openSheet(
      el("p", { class: "label", text: label || "Are you sure?" }),
      el("h2", { text: title }),
      body ? el("p", { text: body }) : null,
      el(
        "div",
        { class: "actions" },
        el("button", { class: "btn", type: "button", onclick: () => done(false), text: "Cancel" }),
        el("button", {
          class: danger ? "btn btn--danger" : "btn btn--primary",
          type: "button",
          onclick: () => done(true),
          text: confirm,
        }),
      ),
    );
    dialog.addEventListener("close", onClose);
  });
}

/* ------------------------------------------------------------- fallbacks */

export function notFound(what = "That isn't on the table.") {
  return el(
    "div",
    { class: "wrap" },
    el(
      "div",
      { class: "empty", style: "margin-top:48px" },
      el("p", { class: "label", text: "404" }),
      el("h2", { text: what }),
      el("p", { text: "It may have been moved, unpublished, or never existed." }),
      el("a", { class: "btn btn--primary", href: "#/", text: "Back to the courses" }),
    ),
  );
}
