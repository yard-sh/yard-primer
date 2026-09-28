// Shared pieces: app state, the API helper, DOM helpers, course cards and
// section lists, and the sheets (plan, sign in, confirm). Everything here builds DOM with
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

/* ------------------------------------------------- courses and sections */

export function subjectOf(key) {
  const subjects = (state.me && state.me.subjects) || [];
  return subjects.find((s) => s.key === key) || { key, name: key };
}

export function badges(course) {
  return [
    !course.published ? el("span", { class: "badge badge--draft", text: "Draft" }) : null,
    course.tier === "premium" ? el("span", { class: "badge badge--premium", text: "Premium" }) : null,
  ].filter(Boolean);
}

export const STATUS_LABEL = {
  not_started: "Not started",
  in_progress: "In progress",
  completed: "Done",
};

// A section's status as an icon: an empty circle, a half-filled one, or a
// check. The label next to it (or the row's text) says the same in words.
export function statusIcon(status) {
  return el("span", { class: "status-icon", "data-status": status, "aria-hidden": "true" });
}

// "2 of 4 sections done" as a bar, for signed-in learners.
export function progressBar(done, total) {
  const pct = total ? Math.round((done / total) * 100) : 0;
  return el(
    "div",
    { class: "progress", role: "progressbar", "aria-valuemin": "0", "aria-valuemax": String(total), "aria-valuenow": String(done), "aria-label": "Sections done" },
    el("span", { class: "progress__bar", style: `width: ${pct}%` }),
  );
}

// One course in the catalog grid: a cover in the subject's colour (its line
// drawing comes from styles.css), then subject, title, what you'll learn
// (the first section titles), and a meta line. Signed-in learners who have
// started the course also get a progress bar.
export function courseCard(course) {
  const subject = subjectOf(course.subject);
  const p = course.progress;
  const done = p ? p.completed : 0;
  const locked = course.access === "premium";
  const learn = (course.outline || []).slice(0, 3).map((s) => s.title);
  const tier = course.tier === "premium" ? (state.me && state.me.premium_tier) || "Premium" : "Free";
  return el(
    "a",
    { class: "card" + (locked ? " is-locked" : ""), href: `#/course/${course.id}`, "data-subject": course.subject },
    el("span", { class: "cover", "aria-hidden": "true" }, el("span", { class: "cover__badges" }, badges(course))),
    el(
      "span",
      { class: "card__body" },
      el("span", { class: "card__subject" }, el("span", { class: "dot", "aria-hidden": "true" }), subject.name),
      el("span", { class: "card__title", text: course.title }),
      learn.length ? el("span", { class: "card__learn" }, el("b", { text: "You'll learn: " }), learn.join(", ")) : null,
      el(
        "span",
        { class: "card__foot" },
        el("span", { class: "label", text: `${tier} · ${plural(course.sections, "section")} · ${course.minutes} min` }),
        p && course.sections && !locked && p.completed + p.in_progress > 0
          ? el(
              "span",
              { class: "card__progress" },
              progressBar(done, course.sections),
              el("span", { class: "label", text: done === course.sections ? "Completed" : `${done} of ${course.sections} done` }),
            )
          : null,
      ),
    ),
  );
}

// A course's sections as a list with status. `current` is marked "Up next".
// Compact is the reader's sidebar.
export function sectionList(course, sections, { current, compact = false, locked = false, signedIn = true } = {}) {
  return el(
    "ol",
    { class: "sections" + (compact ? " sections--compact" : ""), "data-subject": course.subject, "aria-label": "Sections" },
    sections.map((s, i) =>
      el(
        "li",
        { "data-section": s.id },
        el(
          "a",
          {
            class: "sections__row",
            href: `#/course/${course.id}/${s.id}`,
            "aria-current": compact && s.id === current ? "page" : null,
          },
          statusIcon(s.status),
          compact ? null : el("span", { class: "sections__no", text: pad(i + 1) }),
          el(
            "span",
            { class: "sections__title" },
            el("span", { text: s.title }),
            !compact && s.id === current ? el("span", { class: "badge badge--next", text: "Up next" }) : null,
          ),
          compact ? null : el("span", { class: "sections__mins label", text: `${s.minutes} min` }),
          compact
            ? null
            : el("span", {
                class: "sections__status label",
                text: locked ? "Locked" : signedIn ? STATUS_LABEL[s.status] : "",
              }),
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
  const count = premium.length ? `all ${plural(premium.length, "Premium course")}` : "every Premium course";
  openSheet(
    el("p", { class: "label", text: me.premium_tier || "Premium" }),
    el("h2", { text: "This course is part of Premium." }),
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

export function notFound(what = "We couldn't find that.") {
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
