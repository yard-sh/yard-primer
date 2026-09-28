// Shared pieces: app state, the API helper, DOM helpers, the map's parts
// (line bullets, stops, strips and routes), and the sheets (plan, sign in,
// confirm). Everything here builds DOM with
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

/* ------------------------------------------------------- lines and stops */
//
// The map's vocabulary. A course is a line, drawn in its subject's colour and
// identified by a numbered bullet (its place in the catalog). Its sections
// are stops. A stop is empty until opened, a bullseye while in progress and
// filled once completed. A locked Premium line is drawn dashed, like a line
// still under construction.

export function subjectOf(key) {
  const subjects = (state.me && state.me.subjects) || [];
  return subjects.find((s) => s.key === key) || { key, name: key };
}

// Where a course sits in the catalog, which is its line number.
export function numberOf(course) {
  const index = (state.catalog || []).findIndex((c) => c.id === course.id);
  return index >= 0 ? index + 1 : "";
}

export function bullet(subjectKey, number, size = "") {
  return el("span", {
    class: "bullet" + (size ? " bullet--" + size : ""),
    "data-subject": subjectKey,
    text: String(number),
    "aria-hidden": "true",
  });
}

export function badges(course) {
  return [
    !course.published ? el("span", { class: "badge badge--draft", text: "Draft" }) : null,
    course.tier === "premium" ? el("span", { class: "badge badge--premium", text: "Premium" }) : null,
  ].filter(Boolean);
}

export function stopDot(status) {
  return el("span", { class: "stop__dot", "data-status": status, "aria-hidden": "true" });
}

export const STATUS_LABEL = {
  not_started: "Not started",
  in_progress: "In progress",
  completed: "Done",
};

// A horizontal strip map: the line, its stops, and (room allowing) their
// names. Used by the catalog, where the whole row is one link.
export function strip(course) {
  const stops = course.stops || [];
  const done = stops.filter((s) => s.status === "completed").length;
  const label = course.progress
    ? `${done} of ${stops.length} stops completed`
    : `${plural(stops.length, "stop")}`;
  return el(
    "ol",
    {
      class: "strip" + (course.access === "premium" ? " is-locked" : "") + (stops.length > 8 ? " is-dense" : ""),
      style: `--n: ${Math.max(stops.length, 1)}`,
      "data-subject": course.subject,
      "aria-label": label,
    },
    stops.map((s) =>
      el("li", { class: "stop" }, stopDot(s.status), el("span", { class: "stop__name", text: s.title })),
    ),
  );
}

// One course in the catalog: bullet, name, facts, and its strip map.
export function lineRow(course, number) {
  const subject = subjectOf(course.subject);
  const stops = course.stops || [];
  const done = stops.filter((s) => s.status === "completed").length;
  const facts = [subject.name, plural(course.sections, "stop"), `${course.minutes} min`];
  return el(
    "a",
    { class: "line-row", href: `#/course/${course.id}`, "data-subject": course.subject },
    el(
      "span",
      { class: "line-row__head" },
      bullet(course.subject, number),
      el("span", { class: "line-row__title", text: course.title }),
      el("span", { class: "line-row__badges" }, badges(course)),
      el(
        "span",
        { class: "line-row__facts label" },
        facts.join(" · "),
        course.progress && course.sections ? el("b", { text: ` · ${done}/${course.sections}` }) : null,
      ),
    ),
    stops.length ? strip(course) : el("span", { class: "muted", text: "No stops yet." }),
  );
}

/* ---------------------------------------------------------------- routes */

// A vertical route: the line runs down the left and every stop is a row, as
// on the diagram above a train door. Used for a course's syllabus and the
// reader's sidebar. `current` gets a "You are here" marker.
export function route(course, sections, { current, compact = false, locked = false } = {}) {
  return el(
    "ol",
    {
      class: "route" + (compact ? " route--compact" : "") + (locked ? " is-locked" : ""),
      "data-subject": course.subject,
      "aria-label": "Stops",
    },
    sections.map((s, i) =>
      el(
        "li",
        { class: "route__stop", "data-section": s.id },
        el(
          "a",
          {
            class: "route__link",
            href: `#/course/${course.id}/${s.id}`,
            "aria-current": compact && s.id === current ? "page" : null,
          },
          stopDot(s.status),
          el(
            "span",
            { class: "route__name" },
            el("span", { text: s.title }),
            !compact && s.id === current ? el("span", { class: "here", text: "You are here" }) : null,
          ),
          compact
            ? null
            : el(
                "span",
                { class: "route__meta label" },
                el("span", { text: `${pad(i + 1)} · ${s.minutes} min` }),
                el("span", { class: "route__status", text: locked ? "Locked" : STATUS_LABEL[s.status] }),
              ),
        ),
      ),
    ),
  );
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
  const tiles = premium.slice(0, 6).map((c) => bullet(c.subject, numberOf(c)));
  const count = premium.length
    ? `all ${plural(premium.length, "Premium line")} on the map`
    : "every Premium line";
  openSheet(
    el("p", { class: "label", text: me.premium_tier || "Premium" }),
    el("h2", { text: "This line needs a Premium pass." }),
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

export function notFound(what = "That stop isn't on the map.") {
  return el(
    "div",
    { class: "wrap" },
    el(
      "div",
      { class: "empty", style: "margin-top:48px" },
      el("p", { class: "label", text: "404" }),
      el("h2", { text: what }),
      el("p", { text: "It may have been moved, closed, or never existed." }),
      el("a", { class: "btn btn--primary", href: "#/", text: "Back to the map" }),
    ),
  );
}
