// The learner's side: the table of courses, a course's syllabus, and the
// reader. The server decides what anyone may see; these views only draw
// what came back, and explain a refusal when one does.

import {
  state,
  api,
  el,
  guard,
  pad,
  plural,
  tile,
  sym,
  dot,
  subjectOf,
  signInLink,
  STATUS_LABEL,
  ApiError,
} from "./ui.js";
import { renderMarkdown, typeset } from "./markdown.js";

let filter = "all";

/* --------------------------------------------------------------- catalog */

export async function renderCatalog(ctx) {
  const data = await api("api/courses");
  if (ctx.stale()) return;
  state.catalog = data.courses;
  const me = state.me;
  const courses = data.courses;
  const numbers = new Map(courses.map((c, i) => [c.id, i + 1]));

  ctx.title("");

  const intro = el(
    "section",
    { class: "intro" },
    el(
      "div",
      {},
      el("p", { class: "label", text: `The table · ${plural(courses.length, "course")}` }),
      el("h1", {}, "Learn how things ", el("em", { text: "work" }), "."),
      el("p", {
        text: me.authenticated
          ? "Short courses in the sciences, a few sections each. Your place is saved as you go."
          : "Short courses in the sciences, a few sections each. Browse freely, then sign in to start one and your place is saved as you go.",
      }),
    ),
    key(),
  );

  if (!courses.length) {
    ctx.show(
      el(
        "div",
        { class: "wrap" },
        intro,
        el(
          "div",
          { class: "empty" },
          el("h2", { text: "The table is empty." }),
          el("p", {
            text: me.is_admin ? "Create the first course from the admin panel." : "Courses are on their way. Check back soon.",
          }),
          me.is_admin ? el("a", { class: "btn btn--primary", href: "#/admin", text: "Open admin" }) : null,
        ),
      ),
    );
    return;
  }

  // Started but not finished, most recent first.
  const going = courses
    .filter((c) => c.progress && c.progress.completed + c.progress.in_progress > 0 && c.progress.completed < c.sections)
    .sort((a, b) => String(b.progress.last_at).localeCompare(String(a.progress.last_at)))
    .slice(0, 3);

  const resume = going.length
    ? el(
        "section",
        { class: "resume", "aria-labelledby": "resume-title" },
        el("h2", { id: "resume-title", text: "Pick up where you left off" }),
        el(
          "ul",
          { class: "resume__list" },
          going.map((c) =>
            el(
              "li",
              {},
              el(
                "a",
                { class: "resume__card", href: `#/course/${c.id}` },
                sym(c.subject),
                el(
                  "span",
                  { class: "resume__text" },
                  el("strong", { text: c.title }),
                  el("span", { class: "label", text: `${c.progress.completed} of ${c.sections} done` }),
                ),
                el("span", { class: "resume__go", text: "Continue →" }),
              ),
            ),
          ),
        ),
      )
    : null;

  const present = new Set(courses.map((c) => c.subject));
  const subjects = data.subjects.filter((s) => present.has(s.key));
  if (filter !== "all" && !present.has(filter)) filter = "all";

  const table = el(
    "ol",
    { class: "table", "aria-label": "Courses" },
    courses.map((c) =>
      el("li", { "data-subject-key": c.subject }, tile(c, numbers.get(c.id), { href: `#/course/${c.id}` })),
    ),
  );

  const legend = el(
    "div",
    { class: "legend", role: "group", "aria-label": "Filter by subject" },
    el("button", { class: "chip chip--all", type: "button", "data-filter": "all", text: "All" }),
    subjects.map((s) =>
      el(
        "button",
        { class: "chip", type: "button", "data-filter": s.key },
        el("span", { class: "sym", "data-subject": s.key, text: s.symbol, "aria-hidden": "true" }),
        s.name,
      ),
    ),
  );

  const apply = () => {
    legend.querySelectorAll("[data-filter]").forEach((chip) => {
      chip.setAttribute("aria-pressed", String(chip.dataset.filter === filter));
    });
    table.querySelectorAll("li").forEach((li) => {
      li.hidden = filter !== "all" && li.dataset.subjectKey !== filter;
    });
  };
  legend.addEventListener("click", (event) => {
    const chip = event.target.closest("[data-filter]");
    if (!chip) return;
    filter = chip.dataset.filter === filter ? "all" : chip.dataset.filter;
    apply();
  });
  apply();

  ctx.show(el("div", { class: "wrap" }, intro, resume, subjects.length > 1 ? legend : null, table));
}

// How to read a tile, the way a printed periodic table explains its cells.
function key() {
  const sample = el(
    "div",
    { class: "tile", "data-subject": "physics", "aria-hidden": "true" },
    el("span", { class: "tile__top" }, el("span", { text: "01" })),
    el("span", { class: "tile__sym", text: "Ph" }),
    el("span", { class: "tile__name", text: "Course" }),
    el("span", { class: "tile__dots" }, el("span", { class: "dots" }, ["completed", "in_progress", "not_started"].map(dot))),
  );
  const row = (mark, text) => el("li", {}, mark, el("span", { text }));
  return el(
    "figure",
    { class: "key" },
    el("figcaption", { class: "label", text: "Key" }),
    sample,
    el(
      "ul",
      {},
      row(el("b", { text: "01" }), "Place on the table"),
      row(el("b", { text: "Ph" }), "Subject"),
      row(dot("not_started"), "Section not started"),
      row(dot("in_progress"), "In progress"),
      row(dot("completed"), "Done"),
    ),
  );
}

/* ---------------------------------------------------------------- course */

// Where the main button goes: the first section not yet finished, or the
// first section when everything is done (a review).
function nextSection(sections) {
  return sections.find((s) => s.status !== "completed") || sections[0];
}

function numberOf(course) {
  const index = (state.catalog || []).findIndex((c) => c.id === course.id);
  return index >= 0 ? index + 1 : 0;
}

export async function renderCourse(ctx, id) {
  // The catalog gives the tile its number; fetch it too on a direct visit.
  const [{ course, sections }, catalog] = await Promise.all([
    api(`api/courses/${id}`),
    state.catalog ? null : api("api/courses"),
  ]);
  if (ctx.stale()) return;
  if (catalog) state.catalog = catalog.courses;
  const me = state.me;
  const subject = subjectOf(course.subject);
  ctx.title(course.title);

  const done = sections.filter((s) => s.status === "completed").length;
  const started = sections.some((s) => s.status !== "not_started");
  const target = nextSection(sections);
  const tierName = course.tier === "premium" ? me.premium_tier : "Free";

  let actions;
  if (!sections.length) {
    actions = el("p", { class: "muted", text: "No sections yet." });
  } else if (course.access === "open") {
    const verb = done === sections.length ? "Review" : started ? "Continue" : "Start";
    actions = el(
      "a",
      { class: "btn btn--primary", href: `#/course/${course.id}/${target.id}` },
      verb === "Continue" ? `Continue: ${target.title}` : verb === "Review" ? "Review from the start" : "Start the course",
    );
  } else if (course.access === "sign_in") {
    actions = el(
      "div",
      { class: "actions" },
      signInLink("Sign in to start"),
      el("span", { class: "muted", text: "Free with a Yard account. Your progress is saved." }),
    );
  } else {
    actions = null;
  }

  const locked =
    course.access === "premium"
      ? el(
          "div",
          { class: "notice notice--premium" },
          el("p", {}, el("strong", { text: `This course is part of ${me.premium_tier}. ` }), "The syllabus is open to everyone; the lessons unlock with the plan."),
          el(
            "div",
            { class: "actions" },
            el("a", { class: "btn btn--primary", href: "../#pricing", text: `Unlock with ${me.premium_tier}` }),
            me.authenticated ? null : signInLink("I already have it", "btn"),
          ),
        )
      : null;

  const draft = !course.published
    ? el("div", { class: "notice" }, el("p", { text: "Draft: only your team can see this course until it is published." }), el("a", { class: "btn btn--sm", href: `#/admin/course/${course.id}`, text: "Edit course" }))
    : null;

  const meter =
    me.authenticated && sections.length && course.access === "open"
      ? [
          el(
            "div",
            { class: "meter", role: "img", "aria-label": `${done} of ${sections.length} sections done` },
            sections.map((s) => el("i", { "data-status": s.status })),
          ),
          el("p", { class: "label meter__label", text: `${done} of ${sections.length} done` }),
        ]
      : null;

  const head = el(
    "header",
    { class: "course-head" },
    tile(course, numberOf(course), { large: true }),
    el(
      "div",
      {},
      el("p", { class: "label", text: `${subject.name} · ${tierName}` }),
      el("h1", { text: course.title }),
      course.summary ? el("p", { class: "course-head__summary", text: course.summary }) : null,
      el(
        "p",
        { class: "course-head__facts label" },
        el("span", { text: plural(sections.length, "section") }),
        el("span", { text: `About ${course.minutes} min` }),
      ),
      meter,
      el(
        "div",
        { class: "actions" },
        actions,
        me.is_admin && course.published ? el("a", { class: "btn", href: `#/admin/course/${course.id}`, text: "Edit course" }) : null,
      ),
    ),
  );

  const syllabus = sections.length
    ? el(
        "ol",
        { class: "syllabus", "aria-label": "Sections" },
        sections.map((s, i) =>
          el(
            "li",
            {},
            el(
              "a",
              { class: "syllabus__row", href: `#/course/${course.id}/${s.id}` },
              dot(s.status),
              el("span", { class: "no", text: pad(i + 1) }),
              el("span", { class: "title", text: s.title }),
              el("span", { class: "mins label", text: `${s.minutes} min` }),
              el("span", {
                class: "status label",
                text: course.access === "premium" ? "Locked" : me.authenticated ? STATUS_LABEL[s.status] : "",
              }),
            ),
          ),
        ),
      )
    : null;

  ctx.show(
    el(
      "div",
      { class: "wrap" },
      el("nav", { class: "crumbs", "aria-label": "Breadcrumb" }, el("a", { href: "#/", text: "Courses" }), el("span", { text: "/" }), el("span", { text: subject.name })),
      head,
      draft,
      locked,
      el("h2", { class: "section-title", text: "Syllabus" }),
      syllabus,
    ),
  );
}

/* ---------------------------------------------------------------- reader */

export async function renderReader(ctx, id, sid) {
  const [detail, result] = await Promise.all([
    api(`api/courses/${id}`),
    api(`api/courses/${id}/sections/${sid}`).catch((err) => err),
  ]);
  if (ctx.stale()) return;
  if (result instanceof ApiError && result.status === 404) throw result;
  if (result instanceof Error && !(result instanceof ApiError)) throw result;

  const me = state.me;
  const { course, sections } = detail;
  const index = sections.findIndex((s) => s.id === sid);
  const prev = sections[index - 1];
  const next = sections[index + 1];
  const current = sections[index];

  const rail = el(
    "aside",
    { class: "rail" },
    el(
      "details",
      { open: window.innerWidth > 900 },
      el("summary", {}, sym(course.subject), el("span", { text: course.title })),
      el(
        "ol",
        {},
        sections.map((s) =>
          el(
            "li",
            {},
            el(
              "a",
              { href: `#/course/${course.id}/${s.id}`, "aria-current": s.id === sid ? "page" : null, "data-section": s.id },
              dot(s.status),
              el("span", { text: s.title }),
            ),
          ),
        ),
      ),
    ),
  );

  const crumbs = el(
    "nav",
    { class: "crumbs", "aria-label": "Breadcrumb" },
    el("a", { href: "#/", text: "Courses" }),
    el("span", { text: "/" }),
    el("a", { href: `#/course/${course.id}`, text: course.title }),
    el("span", { text: "/" }),
    el("span", { text: `Section ${index + 1}` }),
  );

  const pageNav = el(
    "nav",
    { class: "page__nav", "aria-label": "Sections" },
    prev ? el("a", { class: "linkish", href: `#/course/${course.id}/${prev.id}`, text: "← Previous" }) : null,
    next
      ? el("a", { class: "linkish", href: `#/course/${course.id}/${next.id}`, text: "Next →" })
      : el("a", { class: "linkish", href: `#/course/${course.id}`, text: "Syllabus" }),
  );

  // Refused: say why, where the lesson would be.
  if (result instanceof ApiError) {
    ctx.title(current ? current.title : course.title);
    const premium = result.code === "premium_required";
    const panel = el(
      "article",
      { class: "page" },
      el("p", { class: "label", text: `Section ${index + 1} of ${sections.length}` }),
      el("h1", { text: current ? current.title : "Locked section" }),
      el(
        "div",
        { class: premium ? "notice notice--premium" : "notice" },
        el("p", {
          text: premium
            ? `This section is part of ${me.premium_tier}. The plan opens every Premium course on the table.`
            : "Sign in with your Yard account to read this section. Your progress is saved as you go.",
        }),
        premium
          ? el("a", { class: "btn btn--primary", href: "../#pricing", text: `Unlock with ${me.premium_tier}` })
          : signInLink("Sign in to read"),
      ),
      el("footer", { class: "page__foot" }, el("span"), pageNav),
    );
    ctx.show(el("div", { class: "wrap" }, crumbs, el("div", { class: "reader" }, rail, panel)));
    return;
  }

  const { section } = result;
  let status = result.status;
  ctx.title(section.title);

  const prose = el("div", { class: "prose" });
  prose.innerHTML = renderMarkdown(section.body);

  const check = el(
    "button",
    { class: "btn check", type: "button", "aria-pressed": String(status === "completed") },
    el("span", { class: "check__box", "aria-hidden": "true" }, checkMark()),
    el("span", { class: "check__text" }),
  );
  const doneSlot = el("div");

  const paint = (courseProgress) => {
    check.setAttribute("aria-pressed", String(status === "completed"));
    check.querySelector(".check__text").textContent = status === "completed" ? "Completed" : "Mark complete";
    const link = rail.querySelector(`[data-section="${section.id}"] .dot`);
    if (link) link.replaceWith(dot(status));
    if (courseProgress && courseProgress.total && courseProgress.completed === courseProgress.total) {
      doneSlot.replaceChildren(
        el(
          "div",
          { class: "notice notice--done" },
          el("p", {}, el("strong", { text: "Course complete. " }), `Every section of ${course.title} is done.`),
          el("a", { class: "btn", href: "#/", text: "Back to the table" }),
        ),
      );
    } else {
      doneSlot.replaceChildren();
    }
  };

  check.addEventListener("click", () =>
    guard(async () => {
      check.disabled = true;
      try {
        const res = await api(`api/courses/${course.id}/sections/${section.id}/progress`, {
          method: "PUT",
          body: { completed: status !== "completed" },
        });
        status = res.status;
        paint(res.course);
        if (status === "completed" && next) pageNav.querySelector('a[href$="' + next.id + '"]').focus();
      } finally {
        check.disabled = false;
      }
    }),
  );

  const page = el(
    "article",
    { class: "page" },
    el("p", { class: "label", text: `Section ${index + 1} of ${sections.length} · ${section.minutes} min` }),
    el("h1", { text: section.title }),
    prose,
    doneSlot,
    el("footer", { class: "page__foot" }, check, pageNav),
  );

  paint(null);
  if (!ctx.show(el("div", { class: "wrap" }, crumbs, el("div", { class: "reader" }, rail, page)))) return;
  typeset(prose);

  // Opening a section starts it (and never un-finishes it).
  guard(async () => {
    const res = await api(`api/courses/${course.id}/sections/${section.id}/open`, { method: "POST" });
    if (ctx.stale()) return;
    status = res.status;
    paint(res.course);
  });
}

function checkMark() {
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", "0 0 14 14");
  const path = document.createElementNS(ns, "path");
  path.setAttribute("d", "M2 7.5l3.2 3L12 3.5");
  svg.append(path);
  return svg;
}
