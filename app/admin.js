// The admin panel: every line with its stats, the course editor and
// the section editor.
//
// Who counts as an admin is decided by the server alone: everyone on the
// project's Yard team (X-Yard-Entitlement: owner). The app hides the Admin
// link from everyone else, but every route under api/admin checks again.

import { state, api, el, guard, toast, pad, plural, bullet, subjectOf, signInLink, confirmSheet } from "./ui.js";
import { renderMarkdown, typeset } from "./markdown.js";

// Matches MAX_BODY and friends in _service.js, which enforces them.
const MAX_BODY = 50000;
const MAX_COURSE_TITLE = 80;
const MAX_SUMMARY = 280;
const MAX_SECTION_TITLE = 100;

function adminsOnly(ctx) {
  const me = state.me;
  ctx.title("Admin");
  ctx.show(
    el(
      "div",
      { class: "wrap" },
      el(
        "div",
        { class: "empty", style: "margin-top:48px" },
        el("p", { class: "label", text: "Admin" }),
        el("h2", { text: "This part is for the project's team." }),
        el("p", {
          text: me.authenticated
            ? "Admins are the members of this project's Yard team. Ask the owner to invite you if you should be one."
            : "Sign in first. Admins are the members of this project's Yard team.",
        }),
        me.authenticated ? el("a", { class: "btn", href: "#/", text: "Back to the courses" }) : signInLink(),
      ),
    ),
  );
}

function crumbs(...parts) {
  const nodes = [];
  parts.forEach(([label, href], i) => {
    if (i) nodes.push(el("span", { text: "/" }));
    nodes.push(href ? el("a", { href, text: label }) : el("span", { text: label }));
  });
  return el("nav", { class: "crumbs", "aria-label": "Breadcrumb" }, nodes);
}

function subjectSelect(value) {
  return el(
    "select",
    { class: "input", name: "subject", required: true },
    state.me.subjects.map((s) => el("option", { value: s.key, selected: s.key === value, text: s.name })),
  );
}

function tierSegment(value) {
  const option = (tier, label) =>
    el(
      "label",
      {},
      el("input", { type: "radio", name: "tier", value: tier, checked: value === tier }),
      el("span", { text: label }),
    );
  return el("div", { class: "seg", role: "radiogroup", "aria-label": "Tier" }, option("free", "Free"), option("premium", state.me.premium_tier));
}

function field(label, control) {
  return el("label", { class: "field" }, el("span", { text: label }), control);
}

/* ------------------------------------------------------------- dashboard */

export async function renderAdmin(ctx) {
  if (!state.me.is_admin) return adminsOnly(ctx);

  const [catalog, stats] = await Promise.all([api("api/courses"), api("api/admin/stats")]);
  if (ctx.stale()) return;
  state.catalog = catalog.courses;
  ctx.title("Admin");

  const courses = catalog.courses;
  const byId = new Map(stats.courses.map((s) => [s.id, s]));
  const published = courses.filter((c) => c.published).length;
  const sectionCount = courses.reduce((n, c) => n + c.sections, 0);
  const finished = stats.courses.reduce((n, c) => n + c.finished, 0);

  const ledger = el(
    "dl",
    { class: "ledger" },
    [
      ["Learners", stats.learners],
      ["Published", `${published}/${courses.length}`],
      ["Sections", sectionCount],
      ["Courses finished", finished],
    ].map(([label, value]) => el("div", {}, el("dt", { text: label }), el("dd", { text: String(value) }))),
  );

  // New course: a draft at the end of the map, then straight to its editor.
  const title = el("input", { class: "input", name: "title", required: true, maxlength: MAX_COURSE_TITLE, placeholder: "Orbits and Gravity" });
  const form = el(
    "form",
    { class: "form-row" },
    field("Title", title),
    field("Subject", subjectSelect(state.me.subjects[0].key)),
    field(
      "Tier",
      el("select", { class: "input", name: "tier" }, el("option", { value: "free", text: "Free" }), el("option", { value: "premium", text: state.me.premium_tier })),
    ),
    el("button", { class: "btn btn--primary", type: "submit", text: "Create draft" }),
  );
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(form);
    guard(async () => {
      const res = await api("api/admin/courses", {
        method: "POST",
        body: { title: data.get("title"), subject: data.get("subject"), tier: data.get("tier") },
      });
      location.hash = `#/admin/course/${res.course.id}`;
    });
  });

  const move = (index, delta) =>
    guard(async () => {
      const ids = courses.map((c) => c.id);
      const [id] = ids.splice(index, 1);
      ids.splice(index + delta, 0, id);
      await api("api/admin/courses/order", { method: "PUT", body: { ids } });
      renderAdmin(ctx);
    });

  const rows = courses.map((c, i) => {
    const s = byId.get(c.id) || { started: 0, finished: 0 };
    return el(
      "tr",
      {},
      el("td", { class: "label", text: pad(i + 1) }),
      el(
        "td",
        {},
        el("span", { class: "title-cell" }, bullet(c.subject, i + 1, "sm"), el("a", { href: `#/admin/course/${c.id}`, text: c.title })),
      ),
      el("td", { class: "label", text: c.tier === "premium" ? state.me.premium_tier : "Free" }),
      el("td", {}, c.published ? el("span", { class: "label", text: "Live" }) : el("span", { class: "badge badge--draft", text: "Draft" })),
      el("td", { class: "num", text: String(c.sections) }),
      el("td", { class: "num", text: String(s.started) }),
      el("td", { class: "num", text: String(s.finished) }),
      el(
        "td",
        {},
        el(
          "span",
          { class: "order" },
          el("button", { type: "button", "aria-label": `Move ${c.title} up`, disabled: i === 0, onclick: () => move(i, -1), text: "↑" }),
          el("button", { type: "button", "aria-label": `Move ${c.title} down`, disabled: i === courses.length - 1, onclick: () => move(i, 1), text: "↓" }),
        ),
      ),
      el("td", {}, el("a", { class: "btn btn--sm", href: `#/admin/course/${c.id}`, text: "Edit" })),
    );
  });

  const table = courses.length
    ? el(
        "div",
        { class: "scroll-x" },
        el(
          "table",
          { class: "grid-table" },
          el(
            "thead",
            {},
            el(
              "tr",
              {},
              ["No.", "Course", "Tier", "State", "Sections", "Started", "Finished", "Order", ""].map((h, i) =>
                el("th", { class: i >= 4 && i <= 6 ? "num" : null, text: h }),
              ),
            ),
          ),
          el("tbody", {}, rows),
        ),
      )
    : el("p", { class: "muted", text: "No courses yet. Create the first one above." });

  ctx.show(
    el(
      "div",
      { class: "wrap" },
      el(
        "header",
        { class: "admin-head" },
        el(
          "div",
          {},
          el("p", { class: "label", text: "Admin" }),
          el("h1", { text: "Run the network" }),
          el("p", {
            text: "Everyone on this project's Yard team is an admin here, and nobody else is. To add an admin, invite them to the team from the Yard dashboard.",
          }),
        ),
      ),
      ledger,
      el("section", { class: "panel" }, el("h2", { text: "New course" }), form),
      el("section", { class: "panel" }, el("h2", { text: "Courses" }), table),
    ),
  );
}

/* --------------------------------------------------------- course editor */

export async function renderCourseEditor(ctx, id) {
  if (!state.me.is_admin) return adminsOnly(ctx);

  const { course, sections } = await api(`api/admin/courses/${id}`);
  if (ctx.stale()) return;
  ctx.title(`Edit ${course.title}`);

  const titleInput = el("input", { class: "input", name: "title", required: true, maxlength: MAX_COURSE_TITLE, value: course.title });
  const summaryInput = el("textarea", { class: "input", name: "summary", maxlength: MAX_SUMMARY, rows: "3" });
  summaryInput.value = course.summary;
  const saveButton = el("button", { class: "btn btn--primary", type: "submit", text: "Save details" });

  const details = el(
    "form",
    {},
    field("Title", titleInput),
    field("Summary", summaryInput),
    el(
      "div",
      { class: "form-row", style: "grid-template-columns: 1fr auto; margin-top: 14px" },
      field("Subject", subjectSelect(course.subject)),
      field("Tier", tierSegment(course.tier)),
    ),
    el("div", { class: "actions", style: "margin-top: 20px" }, saveButton),
  );
  details.addEventListener("input", () => {
    state.dirty = true;
  });
  details.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(details);
    guard(async () => {
      await api(`api/admin/courses/${id}`, {
        method: "PATCH",
        body: { title: data.get("title"), summary: data.get("summary"), subject: data.get("subject"), tier: data.get("tier") },
      });
      state.dirty = false;
      toast("Saved.");
      renderCourseEditor(ctx, id);
    });
  });

  const publish = el(
    "button",
    {
      class: course.published ? "btn" : "btn btn--hot",
      type: "button",
      onclick: () =>
        guard(async () => {
          await api(`api/admin/courses/${id}`, { method: "PATCH", body: { published: !course.published } });
          toast(course.published ? "Unpublished. Only the team can see it now." : "Published. It is on the map.");
          state.dirty = false;
          renderCourseEditor(ctx, id);
        }),
    },
    course.published ? "Unpublish" : "Publish",
  );

  const remove = el(
    "button",
    {
      class: "btn btn--danger",
      type: "button",
      onclick: async () => {
        const ok = await confirmSheet({
          label: "Delete course",
          title: `Delete ${course.title}?`,
          body: `Its ${plural(sections.length, "section")} and every learner's progress in it go too. This cannot be undone.`,
          confirm: "Delete course",
          danger: true,
        });
        if (!ok) return;
        guard(async () => {
          await api(`api/admin/courses/${id}`, { method: "DELETE" });
          state.dirty = false;
          toast("Course deleted.");
          location.hash = "#/admin";
        });
      },
    },
    "Delete course",
  );

  const moveSection = (index, delta) =>
    guard(async () => {
      const ids = sections.map((s) => s.id);
      const [sid] = ids.splice(index, 1);
      ids.splice(index + delta, 0, sid);
      await api(`api/admin/courses/${id}/sections/order`, { method: "PUT", body: { ids } });
      renderCourseEditor(ctx, id);
    });

  const deleteSection = async (section) => {
    const ok = await confirmSheet({
      label: "Delete section",
      title: `Delete "${section.title}"?`,
      body: "Learners' progress on this section goes with it. This cannot be undone.",
      confirm: "Delete section",
      danger: true,
    });
    if (!ok) return;
    guard(async () => {
      await api(`api/admin/courses/${id}/sections/${section.id}`, { method: "DELETE" });
      toast("Section deleted.");
      renderCourseEditor(ctx, id);
    });
  };

  const sectionRows = sections.map((s, i) =>
    el(
      "tr",
      {},
      el("td", { class: "label", text: pad(i + 1) }),
      el("td", {}, el("span", { class: "title-cell" }, el("a", { href: `#/admin/course/${id}/${s.id}`, text: s.title }))),
      el("td", { class: "num label", text: `${s.body.length.toLocaleString("en")} chars` }),
      el(
        "td",
        {},
        el(
          "span",
          { class: "order" },
          el("button", { type: "button", "aria-label": `Move ${s.title} up`, disabled: i === 0, onclick: () => moveSection(i, -1), text: "↑" }),
          el("button", { type: "button", "aria-label": `Move ${s.title} down`, disabled: i === sections.length - 1, onclick: () => moveSection(i, 1), text: "↓" }),
        ),
      ),
      el(
        "td",
        {},
        el(
          "span",
          { class: "actions", style: "flex-wrap: nowrap" },
          el("a", { class: "btn btn--sm", href: `#/admin/course/${id}/${s.id}`, text: "Edit" }),
          el("button", { class: "btn btn--sm btn--flat", type: "button", onclick: () => deleteSection(s), text: "Delete" }),
        ),
      ),
    ),
  );

  const newTitle = el("input", { class: "input", name: "title", required: true, maxlength: MAX_SECTION_TITLE, placeholder: "What the next sitting covers" });
  const addForm = el(
    "form",
    { class: "form-row", style: "grid-template-columns: 1fr auto; margin-top: 18px" },
    field("New section", newTitle),
    el("button", { class: "btn btn--primary", type: "submit", text: "Add section" }),
  );
  addForm.addEventListener("submit", (event) => {
    event.preventDefault();
    guard(async () => {
      const res = await api(`api/admin/courses/${id}/sections`, { method: "POST", body: { title: newTitle.value, body: "" } });
      state.dirty = false;
      location.hash = `#/admin/course/${id}/${res.section.id}`;
    });
  });

  ctx.show(
    el(
      "div",
      { class: "wrap" },
      crumbs(["Admin", "#/admin"], [course.title]),
      el(
        "header",
        { class: "admin-head" },
        el(
          "div",
          {},
          el("p", { class: "label" }, `${subjectOf(course.subject).name} · `, course.published ? "Live" : "Draft"),
          el("h1", { text: course.title }),
        ),
        el("a", { class: "btn", href: `#/course/${id}`, text: "View as a learner" }),
      ),
      el(
        "div",
        { class: "two-col" },
        el("section", { class: "panel" }, el("h2", { text: "Details" }), details),
        el(
          "div",
          {},
          el(
            "section",
            { class: "panel" },
            el("h2", { text: "Visibility" }),
            el(
              "div",
              { class: "publish-state" },
              course.published ? null : el("span", { class: "badge badge--draft", text: "Draft" }),
              el("p", {
                text: course.published
                  ? "On the map. Everyone can see its route."
                  : sections.length
                    ? "A draft. Only the team can see it."
                    : "A draft. Add a section before publishing.",
              }),
            ),
            publish,
          ),
          el(
            "section",
            { class: "panel panel--danger" },
            el("h2", { text: "Delete" }),
            el("p", { class: "muted", style: "margin-top:0", text: "Removes the course, its sections and everyone's progress in it." }),
            remove,
          ),
        ),
      ),
      el(
        "section",
        { class: "panel" },
        el("h2", { text: `Sections · ${sections.length}` }),
        sections.length
          ? el("div", { class: "scroll-x" }, el("table", { class: "grid-table" }, el("tbody", {}, sectionRows)))
          : el("p", { class: "muted", text: "No sections yet." }),
        addForm,
      ),
    ),
  );
  if (!sections.length) publish.disabled = !course.published;
}

/* -------------------------------------------------------- section editor */

export async function renderSectionEditor(ctx, id, sid) {
  if (!state.me.is_admin) return adminsOnly(ctx);

  const { course, sections } = await api(`api/admin/courses/${id}`);
  if (ctx.stale()) return;
  const index = sections.findIndex((s) => s.id === sid);
  if (index < 0) {
    location.hash = `#/admin/course/${id}`;
    return;
  }
  const section = sections[index];
  ctx.title(`Edit ${section.title}`);

  let saved = { title: section.title, body: section.body };

  const titleInput = el("input", {
    class: "input",
    name: "title",
    maxlength: MAX_SECTION_TITLE,
    value: section.title,
    "aria-label": "Section title",
    style: "font-size: 22px; font-weight: 700",
  });
  const source = el("textarea", { class: "input", spellcheck: "true", "aria-label": "Section body, Markdown" });
  source.value = section.body;
  const prose = el("div", { class: "prose" });
  const count = el("span", { class: "count label" });
  const saveState = el("span", { class: "save-state label" });
  const saveButton = el("button", { class: "btn btn--primary", type: "button", text: "Save" });

  const editor = el(
    "div",
    { class: "editor", "data-tab": "write" },
    el("div", { class: "editor__source" }, source),
    el("div", { class: "editor__preview", "aria-label": "Preview" }, prose),
  );

  const tabs = el(
    "div",
    { class: "seg tabs", role: "tablist" },
    ["write", "preview"].map((tab) =>
      el(
        "label",
        {},
        el("input", {
          type: "radio",
          name: "tab",
          value: tab,
          checked: tab === "write",
          onchange: () => {
            editor.dataset.tab = tab;
          },
        }),
        el("span", { text: tab === "write" ? "Write" : "Preview" }),
      ),
    ),
  );

  let timer = 0;
  const preview = () => {
    prose.innerHTML = renderMarkdown(source.value);
    typeset(prose);
  };

  const refresh = () => {
    const over = source.value.length > MAX_BODY;
    count.textContent = `${source.value.length.toLocaleString("en")} / ${MAX_BODY.toLocaleString("en")}`;
    count.dataset.over = String(over);
    const dirty = titleInput.value !== saved.title || source.value !== saved.body;
    state.dirty = dirty;
    saveState.dataset.state = dirty ? "dirty" : "clean";
    saveState.textContent = dirty ? "Unsaved changes" : "All changes saved";
    saveButton.disabled = !dirty || over || !titleInput.value.trim();
  };

  const save = () =>
    guard(async () => {
      if (saveButton.disabled) return;
      saveButton.disabled = true;
      const res = await api(`api/admin/courses/${id}/sections/${sid}`, {
        method: "PATCH",
        body: { title: titleInput.value, body: source.value },
      });
      saved = { title: res.section.title, body: res.section.body };
      titleInput.value = saved.title;
      refresh();
      toast("Saved.");
    }).finally(refresh);

  titleInput.addEventListener("input", refresh);
  source.addEventListener("input", () => {
    refresh();
    clearTimeout(timer);
    timer = setTimeout(preview, 150);
  });
  saveButton.addEventListener("click", save);

  const onKey = (event) => {
    if (!document.body.contains(editor)) {
      document.removeEventListener("keydown", onKey);
      return;
    }
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
      event.preventDefault();
      save();
    }
  };
  document.addEventListener("keydown", onKey);

  const help = el(
    "div",
    { class: "editor__help" },
    ["# Heading", "**bold**", "`code`", "$x^2$", "$$display$$", "> [!TIP]", "| table |", "[link](https://…)"].map((h) =>
      el("code", { text: h }),
    ),
  );

  const prev = sections[index - 1];
  const next = sections[index + 1];

  ctx.show(
    el(
      "div",
      { class: "wrap" },
      crumbs(["Admin", "#/admin"], [course.title, `#/admin/course/${id}`], [`Section ${index + 1}`]),
      el(
        "header",
        { class: "admin-head", style: "padding-bottom: 14px" },
        el("div", { style: "flex: 1; min-width: 260px" }, el("p", { class: "label", text: `Section ${index + 1} of ${sections.length}` }), titleInput),
        el("div", { class: "actions" }, saveState, saveButton),
      ),
      el("div", { class: "editor__bar" }, help, el("div", { class: "actions" }, tabs, count)),
      editor,
      el(
        "div",
        { class: "actions", style: "justify-content: space-between; margin-top: 20px" },
        el(
          "span",
          { class: "actions" },
          prev ? el("a", { class: "linkish", href: `#/admin/course/${id}/${prev.id}`, text: "← Previous section" }) : null,
          next ? el("a", { class: "linkish", href: `#/admin/course/${id}/${next.id}`, text: "Next section →" }) : null,
        ),
        el("a", { class: "linkish", href: `#/course/${id}/${sid}`, text: "View as a learner" }),
      ),
    ),
  );
  refresh();
  preview();
}
