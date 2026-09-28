// The learner's side: the course catalog, a course's page, and the reader.
// The server decides what anyone may see; these views only draw what came
// back, and explain a refusal when one does.

import {
  state,
  api,
  el,
  guard,
  plural,
  badges,
  courseCard,
  sectionList,
  progressBar,
  subjectOf,
  signInLink,
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

  ctx.title("");

  const intro = el(
    "section",
    { class: "intro" },
    el("h1", { text: "Courses" }),
    el("p", {
      text: me.authenticated
        ? "Short courses in the sciences, a few sections each. Your progress is saved as you go."
        : "Short courses in the sciences, a few sections each. Browse freely, then sign in to start one and your progress is saved as you go.",
    }),
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
          el("h2", { text: "No courses yet." }),
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
        el("h2", { id: "resume-title", class: "section-title", text: "Continue learning" }),
        el(
          "ul",
          { class: "resume__list" },
          going.map((c) => {
            const next = (c.outline || []).find((s) => s.status !== "completed");
            return el(
              "li",
              {},
              el(
                "a",
                {
                  class: "resume__card",
                  href: next ? `#/course/${c.id}/${next.id}` : `#/course/${c.id}`,
                  "data-subject": c.subject,
                },
                el(
                  "span",
                  { class: "resume__text" },
                  el("strong", { text: c.title }),
                  el("span", { class: "muted", text: next ? `Next: ${next.title}` : `${c.progress.completed} of ${c.sections} done` }),
                  progressBar(c.progress.completed, c.sections),
                ),
                el("span", { class: "resume__go", "aria-hidden": "true", text: "→" }),
              ),
            );
          }),
        ),
      )
    : null;

  const present = new Set(courses.map((c) => c.subject));
  const subjects = data.subjects.filter((s) => present.has(s.key));
  if (filter !== "all" && !present.has(filter)) filter = "all";

  const grid = el(
    "ul",
    { class: "grid", "aria-label": "Courses" },
    courses.map((c) => el("li", { "data-subject-key": c.subject }, courseCard(c))),
  );

  const filters = el(
    "div",
    { class: "filters", role: "group", "aria-label": "Filter by subject" },
    el("button", { class: "chip", type: "button", "data-filter": "all", text: "All" }),
    subjects.map((s) =>
      el(
        "button",
        { class: "chip", type: "button", "data-filter": s.key, "data-subject": s.key },
        el("span", { class: "dot", "aria-hidden": "true" }),
        s.name,
      ),
    ),
  );

  const apply = () => {
    filters.querySelectorAll("[data-filter]").forEach((chip) => {
      chip.setAttribute("aria-pressed", String(chip.dataset.filter === filter));
    });
    grid.querySelectorAll(":scope > li").forEach((li) => {
      li.hidden = filter !== "all" && li.dataset.subjectKey !== filter;
    });
  };
  filters.addEventListener("click", (event) => {
    const chip = event.target.closest("[data-filter]");
    if (!chip) return;
    filter = chip.dataset.filter === filter ? "all" : chip.dataset.filter;
    apply();
  });
  apply();

  ctx.show(
    el(
      "div",
      { class: "wrap" },
      intro,
      resume,
      el(
        "div",
        { class: "grid-head" },
        el("h2", { class: "section-title", text: "All courses" }),
        subjects.length > 1 ? filters : null,
      ),
      grid,
    ),
  );
}

/* ---------------------------------------------------------------- course */

// Where the main button goes: the first section not yet done, or the first
// section when everything is done (a review).
function nextSection(sections) {
  return sections.find((s) => s.status !== "completed") || sections[0];
}

export async function renderCourse(ctx, id) {
  const { course, sections } = await api(`api/courses/${id}`);
  if (ctx.stale()) return;
  const me = state.me;
  const subject = subjectOf(course.subject);
  ctx.title(course.title);

  const done = sections.filter((s) => s.status === "completed").length;
  const started = sections.some((s) => s.status !== "not_started");
  const target = sections.length ? nextSection(sections) : null;
  const tierName = course.tier === "premium" ? me.premium_tier : "Free";

  let actions = null;
  if (!sections.length) {
    actions = el("p", { class: "muted", text: "No sections yet." });
  } else if (course.access === "open") {
    const label = done === sections.length ? "Review the course" : started ? `Continue: ${target.title}` : "Start the course";
    actions = el("a", { class: "btn btn--primary btn--lg", href: `#/course/${course.id}/${target.id}`, text: label });
  } else if (course.access === "sign_in") {
    actions = el(
      "div",
      { class: "actions" },
      signInLink("Sign in to start", "btn btn--primary btn--lg"),
      el("span", { class: "muted", text: "Free with a Yard account. Your progress is saved." }),
    );
  }

  const locked =
    course.access === "premium"
      ? el(
          "div",
          { class: "notice notice--premium" },
          el(
            "p",
            {},
            el("strong", { text: `This course is part of ${me.premium_tier}. ` }),
            "Anyone can see what it covers; the sections open with the plan.",
          ),
          el(
            "div",
            { class: "actions" },
            el("a", { class: "btn btn--primary", href: "../#pricing", text: `Get ${me.premium_tier}` }),
            me.authenticated ? null : signInLink("I already have it", "btn"),
          ),
        )
      : null;

  const draft = !course.published
    ? el(
        "div",
        { class: "notice" },
        el("p", { text: "Draft: only your team can see this course until it is published." }),
        el("a", { class: "btn btn--sm", href: `#/admin/course/${course.id}`, text: "Edit course" }),
      )
    : null;

  const progress =
    me.authenticated && sections.length && course.access === "open"
      ? el(
          "div",
          { class: "course-head__progress" },
          progressBar(done, sections.length),
          el("span", {}, el("b", { text: `${done} of ${sections.length}` }), " sections done"),
        )
      : null;

  const head = el(
    "header",
    { class: "course-head", "data-subject": course.subject },
    el(
      "p",
      { class: "course-head__meta" },
      el("span", { class: "card__subject" }, el("span", { class: "dot", "aria-hidden": "true" }), subject.name),
      el("span", { class: "label", text: `· ${tierName}` }),
      badges({ ...course, tier: "free" }),
    ),
    el("h1", { text: course.title }),
    course.summary ? el("p", { class: "course-head__summary", text: course.summary }) : null,
    el("p", { class: "label", text: `${plural(sections.length, "section")} · about ${course.minutes} min` }),
    progress,
    el(
      "div",
      { class: "actions" },
      actions,
      me.is_admin && course.published ? el("a", { class: "btn", href: `#/admin/course/${course.id}`, text: "Edit course" }) : null,
    ),
  );

  const current = me.authenticated && course.access === "open" && started && target ? target.id : null;

  ctx.show(
    el(
      "div",
      { class: "wrap" },
      el(
        "nav",
        { class: "crumbs", "aria-label": "Breadcrumb" },
        el("a", { href: "#/", text: "Courses" }),
        el("span", { text: "/" }),
        el("span", { text: subject.name }),
      ),
      el(
        "div",
        { class: "course" },
        el("div", { class: "course__side" }, head, draft, locked),
        sections.length
          ? el(
              "section",
              { class: "sections-panel", "aria-labelledby": "sections-title" },
              el("h2", { id: "sections-title", class: "section-title", text: `Sections · ${sections.length}` }),
              sectionList(course, sections, {
                current,
                locked: course.access === "premium",
                signedIn: me.authenticated,
              }),
            )
          : null,
      ),
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
      el("summary", {}, el("span", { class: "rail__title", text: course.title })),
      sectionList(course, sections, { current: sid, compact: true }),
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
    prev ? el("a", { class: "page__prev", href: `#/course/${course.id}/${prev.id}`, text: "← Previous" }) : null,
    next
      ? el(
          "a",
          { class: "page__next", href: `#/course/${course.id}/${next.id}` },
          el("span", { class: "label", text: "Next section" }),
          el("span", { text: `${next.title} →` }),
        )
      : el(
          "a",
          { class: "page__next", href: `#/course/${course.id}` },
          el("span", { class: "label", text: "Last section" }),
          el("span", { text: "Back to the course →" }),
        ),
  );

  const header = (minutes) =>
    el("p", { class: "label" }, `Section ${index + 1} of ${sections.length}`, minutes ? ` · ${minutes} min` : "");

  // Refused: say why, where the lesson would be.
  if (result instanceof ApiError) {
    ctx.title(current ? current.title : course.title);
    const premium = result.code === "premium_required";
    const panel = el(
      "article",
      { class: "page", "data-subject": course.subject },
      header(),
      el("h1", { text: current ? current.title : "Locked section" }),
      el(
        "div",
        { class: premium ? "notice notice--premium" : "notice" },
        el("p", {
          text: premium
            ? `This section is part of ${me.premium_tier}. The plan opens every Premium course.`
            : "Sign in with your Yard account to read this section. Your progress is saved as you go.",
        }),
        premium
          ? el("a", { class: "btn btn--primary", href: "../#pricing", text: `Get ${me.premium_tier}` })
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
    const icon = rail.querySelector(`[data-section="${section.id}"] .status-icon`);
    if (icon) icon.dataset.status = status;
    if (courseProgress && courseProgress.total && courseProgress.completed === courseProgress.total) {
      doneSlot.replaceChildren(
        el(
          "div",
          { class: "notice notice--done" },
          el("p", {}, el("strong", { text: "Course complete. " }), `Every section of ${course.title} is done.`),
          el("a", { class: "btn", href: "#/", text: "Browse more courses" }),
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
        if (status === "completed" && next) pageNav.querySelector(".page__next").focus();
      } finally {
        check.disabled = false;
      }
    }),
  );

  const page = el(
    "article",
    { class: "page", "data-subject": course.subject },
    header(section.minutes),
    el("h1", { text: section.title }),
    prose,
    doneSlot,
    el("footer", { class: "page__foot" }, check, pageNav),
  );

  paint(null);
  if (!ctx.show(el("div", { class: "wrap" }, crumbs, el("div", { class: "reader" }, rail, page)))) return;
  typeset(prose);

  // Opening a section starts it (and never un-completes it).
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
