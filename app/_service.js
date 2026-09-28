// Primer backend.
//
// No ports, no listen(): Yard runs this as a fetch handler. Requests arrive
// with the app path rooted at "/" and, for signed-in visitors, trusted
// identity headers the edge verified:
//   X-Yard-User-Id, X-Yard-Email, X-Yard-Entitlement, X-Yard-Tier, X-Yard-Sandbox
// Clients can never spoof these: the edge strips inbound X-Yard-* first, and
// `yard dev` stamps the same headers locally from the persona you pick.
//
// The service is access=public, so anonymous visitors get in too, with no
// identity headers at all. That is what lets anyone browse the catalog. Every
// route that needs a person (reading a section, progress, the admin panel)
// checks for one here; the edge does not do it for us.
//
// There is no sign-in code and no users table. Who someone is, which tier
// they hold, and whether they are on the project's Yard team arrive with
// every request, so this file only ever reads them.

// The tier that unlocks Premium courses, matched by NAME against
// X-Yard-Tier. Renaming the tier in .yard/settings.json means renaming it here.
const PREMIUM_TIER = "Premium";

// The subjects a course can belong to. The app and the landing page read this
// list from api/me and api/courses, so it lives here and nowhere else. The
// symbol is the big two letters on a course's tile; each key also has a
// colour in styles.css (a key without one gets the ink tile).
const SUBJECTS = [
  { key: "physics", name: "Physics", symbol: "Ph" },
  { key: "math", name: "Mathematics", symbol: "Ma" },
  { key: "chemistry", name: "Chemistry", symbol: "Ch" },
  { key: "biology", name: "Biology", symbol: "Bi" },
  { key: "cs", name: "Computer Science", symbol: "Cs" },
  { key: "engineering", name: "Engineering", symbol: "En" },
  { key: "astronomy", name: "Astronomy", symbol: "As" },
];
const SUBJECT_KEYS = new Set(SUBJECTS.map((s) => s.key));
const TIERS = new Set(["free", "premium"]);

const MAX_COURSE_TITLE = 80;
const MAX_SUMMARY = 280;
const MAX_SECTION_TITLE = 100;
const MAX_BODY = 50000;
const MAX_REQUEST_BYTES = 64 * 1024;
const MAX_COURSES = 500;
const MAX_SECTIONS = 100;

// STEM reading is slow: formulas get worked through, not skimmed. This is
// only used for the "12 MIN" estimate on tiles.
const CHARS_PER_MINUTE = 250;

const ID_RE = /^[a-z0-9-]{1,48}$/;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Never serve the backend as an asset. Yard excludes it server-side; this
    // guard keeps any other host honest.
    if (url.pathname === "/_service.js") {
      return new Response("Not found", { status: 404 });
    }

    if (url.pathname.startsWith("/api/")) {
      const started = Date.now();
      try {
        const response = await handleAPI(request, env, url);
        log("request", {
          method: request.method,
          path: url.pathname,
          status: response.status,
          user: shortId(request.headers.get("X-Yard-User-Id")),
          ms: Date.now() - started,
        });
        return response;
      } catch (err) {
        console.error(`[primer] request.failed ${request.method} ${url.pathname}`, err && err.stack);
        return json({ error: "something went wrong on our end" }, 500);
      }
    }

    // Everything else: the static frontend (env.ASSETS is this directory).
    return env.ASSETS.fetch(request);
  },
};

/* ------------------------------------------------------------------- api */

async function handleAPI(request, env, url) {
  try {
    return await route(request, env, url);
  } catch (err) {
    if (err instanceof Refusal) return err.response();
    throw err;
  }
}

async function route(request, env, url) {
  const method = request.method;

  // Every project under yard.sh counts as the same site, so SameSite cookies
  // alone do not stop a form on someone else's page from posting here. A
  // cross-origin request cannot carry this content type without CORS consent,
  // so requiring it on every write closes that door.
  if (method !== "GET" && method !== "HEAD") {
    const type = request.headers.get("Content-Type") || "";
    if (!type.startsWith("application/json")) {
      return json({ error: "send JSON", code: "json_required" }, 415);
    }
  }

  const me = identify(request.headers);

  // ["api", "courses", "<id>"]: the leading "api" is dropped.
  const [, ...seg] = url.pathname.split("/").filter(Boolean);

  if (seg[0] === "me" && seg.length === 1) {
    if (method === "GET") return json(meView(me));
    return methodNotAllowed();
  }

  if (seg[0] === "courses") {
    if (seg.length === 1) {
      if (method === "GET") return listCourses(env, me);
      return methodNotAllowed();
    }
    const cid = seg[1];
    if (!ID_RE.test(cid)) return notFound();
    if (seg.length === 2) {
      if (method === "GET") return courseDetail(env, me, cid);
      return methodNotAllowed();
    }
    if (seg[2] === "sections" && seg.length >= 4) {
      const sid = seg[3];
      if (!ID_RE.test(sid)) return notFound();
      if (seg.length === 4) {
        if (method === "GET") return readSection(env, me, cid, sid);
        return methodNotAllowed();
      }
      if (seg.length === 5 && seg[4] === "open") {
        if (method === "POST") return openSection(env, me, cid, sid);
        return methodNotAllowed();
      }
      if (seg.length === 5 && seg[4] === "progress") {
        if (method === "PUT") return setProgress(request, env, me, cid, sid);
        return methodNotAllowed();
      }
    }
    return notFound();
  }

  if (seg[0] === "admin") {
    // One gate for the whole branch, so no admin route can forget it.
    requireAdmin(me, url.pathname);
    return routeAdmin(request, env, me, seg.slice(1));
  }

  return notFound();
}

async function routeAdmin(request, env, me, seg) {
  const method = request.method;

  if (seg[0] === "stats" && seg.length === 1) {
    if (method === "GET") return stats(env);
    return methodNotAllowed();
  }

  if (seg[0] !== "courses") return notFound();

  if (seg.length === 1) {
    if (method === "POST") return createCourse(request, env, me);
    return methodNotAllowed();
  }

  // "order" is matched before ids. Generated ids always end in "-xxxx", so no
  // course can be called that.
  if (seg[1] === "order" && seg.length === 2) {
    if (method === "PUT") return reorderCourses(request, env);
    return methodNotAllowed();
  }

  const cid = seg[1];
  if (!ID_RE.test(cid)) return notFound();

  if (seg.length === 2) {
    if (method === "GET") return adminCourse(env, cid);
    if (method === "PATCH") return updateCourse(request, env, cid);
    if (method === "DELETE") return deleteCourse(env, cid);
    return methodNotAllowed();
  }

  if (seg[2] !== "sections") return notFound();

  if (seg.length === 3) {
    if (method === "POST") return createSection(request, env, cid);
    return methodNotAllowed();
  }

  if (seg[3] === "order" && seg.length === 4) {
    if (method === "PUT") return reorderSections(request, env, cid);
    return methodNotAllowed();
  }

  const sid = seg[3];
  if (!ID_RE.test(sid) || seg.length !== 4) return notFound();
  if (method === "PATCH") return updateSection(request, env, cid, sid);
  if (method === "DELETE") return deleteSection(env, cid, sid);
  return methodNotAllowed();
}

/* -------------------------------------------------------------- identity */

// Nothing here touches the database: every answer is in the headers.
function identify(headers) {
  const userId = headers.get("X-Yard-User-Id") || "";
  const entitlement = headers.get("X-Yard-Entitlement") || "none";
  return {
    authenticated: Boolean(userId),
    user_id: userId,
    email: userId ? headers.get("X-Yard-Email") || "" : "",
    entitlement: userId ? entitlement : "none",
    tier: userId ? headers.get("X-Yard-Tier") || "" : "",
    plan: userId ? planOf(headers) : "free",
    // The whole role system. Yard sends "owner" for every member of the team
    // that owns this project (and nobody else, since clients cannot forge the
    // header), so the Yard team is the admin list. To make someone an admin,
    // invite them to the team in the Yard dashboard.
    is_admin: Boolean(userId) && entitlement === "owner",
  };
}

// Premium is the project's own team, or a live subscription or trial of the
// tier named PREMIUM_TIER. The tier is checked for trials too, so a trial
// added to some other tier later never unlocks Premium. Anything else,
// including a signed-in visitor with no purchase at all, is Free: nobody has
// to "buy" the $0 tier to start learning.
function planOf(headers) {
  const entitlement = headers.get("X-Yard-Entitlement") || "none";
  if (entitlement === "owner") return "premium";
  if (entitlement !== "active" && entitlement !== "trial") return "free";
  return headers.get("X-Yard-Tier") === PREMIUM_TIER ? "premium" : "free";
}

function meView(me) {
  return { ...me, premium_tier: PREMIUM_TIER, subjects: SUBJECTS };
}

function requireAdmin(me, path) {
  if (!me.authenticated) {
    log("access.denied", { reason: "sign_in", path });
    throw new Refusal(401, "sign_in_required", "sign in first");
  }
  if (!me.is_admin) {
    log("access.denied", { reason: "admin", path, user: shortId(me.user_id) });
    throw new Refusal(403, "admin_only", "only the project's team can do that");
  }
}

// What a visitor may do with a course:
//   open     read it and track progress
//   sign_in  sign in first (anonymous visitors)
//   premium  needs the Premium tier
// Admins can read everything, since they are the ones writing it.
function accessOf(course, me) {
  if (course.tier === "premium" && me.plan !== "premium" && !me.is_admin) return "premium";
  if (!me.authenticated) return "sign_in";
  return "open";
}

/* --------------------------------------------------------------- courses */

async function listCourses(env, me) {
  const { results } = await env.DB.prepare(
    "SELECT c.id, c.title, c.summary, c.subject, c.tier, c.published, c.position," +
      " COUNT(s.id) AS sections, COALESCE(SUM(LENGTH(s.body)), 0) AS chars" +
      " FROM courses c LEFT JOIN sections s ON s.course_id = c.id" +
      " WHERE c.published = 1 OR ?1 = 1" +
      " GROUP BY c.id ORDER BY c.position, c.created_at",
  )
    .bind(me.is_admin ? 1 : 0)
    .all();

  const mine = new Map();
  if (me.authenticated) {
    const rows = await env.DB.prepare(
      "SELECT course_id, SUM(status = 'completed') AS completed, SUM(status = 'in_progress') AS in_progress," +
        " MAX(updated_at) AS last_at FROM progress WHERE user_id = ?1 GROUP BY course_id",
    )
      .bind(me.user_id)
      .all();
    for (const row of rows.results) mine.set(row.course_id, row);
  }

  return json({
    subjects: SUBJECTS,
    courses: results.map((row) => courseView(row, me, mine.get(row.id))),
  });
}

async function courseDetail(env, me, cid) {
  const course = await visibleCourse(env, me, cid);
  const { results } = await env.DB.prepare(
    "SELECT id, title, position, LENGTH(body) AS chars FROM sections WHERE course_id = ?1 ORDER BY position, created_at",
  )
    .bind(cid)
    .all();

  const status = new Map();
  if (me.authenticated) {
    const rows = await env.DB.prepare("SELECT section_id, status FROM progress WHERE user_id = ?1 AND course_id = ?2")
      .bind(me.user_id, cid)
      .all();
    for (const row of rows.results) status.set(row.section_id, row.status);
  }

  const summary = { completed: 0, in_progress: 0, last_at: null };
  for (const value of status.values()) summary[value] += 1;
  course.sections = results.length;
  course.chars = results.reduce((sum, s) => sum + s.chars, 0);

  // Titles only, never bodies: the syllabus is public, the lessons are not.
  return json({
    course: courseView(course, me, me.authenticated ? summary : undefined),
    sections: results.map((s) => ({
      id: s.id,
      title: s.title,
      position: s.position,
      minutes: minutesFor(s.chars),
      status: status.get(s.id) || "not_started",
    })),
  });
}

function courseView(row, me, progress) {
  return {
    id: row.id,
    title: row.title,
    summary: row.summary,
    subject: row.subject,
    tier: row.tier,
    published: Boolean(row.published),
    position: row.position,
    sections: row.sections,
    minutes: minutesFor(row.chars),
    access: accessOf(row, me),
    progress: me.authenticated
      ? {
          completed: (progress && progress.completed) || 0,
          in_progress: (progress && progress.in_progress) || 0,
          total: row.sections,
          last_at: (progress && progress.last_at) || null,
        }
      : null,
  };
}

// Drafts are invisible to everyone but admins, and invisible means 404, the
// same answer as a course that does not exist.
async function visibleCourse(env, me, cid) {
  const course = await env.DB.prepare(
    "SELECT id, title, summary, subject, tier, published, position FROM courses WHERE id = ?1",
  )
    .bind(cid)
    .first();
  if (!course || (!course.published && !me.is_admin)) throw new Refusal(404, "not_found", "not found");
  return course;
}

/* -------------------------------------------------------------- progress */

// The one place that decides whether this person may read this section. The
// section must belong to the course in the path, so an id from another
// course is a 404 rather than a way around the paywall.
async function readableSection(env, me, cid, sid) {
  const row = await env.DB.prepare(
    "SELECT s.id, s.course_id, s.title, s.body, s.position, s.updated_at, c.tier, c.published" +
      " FROM sections s JOIN courses c ON c.id = s.course_id WHERE s.id = ?1 AND s.course_id = ?2",
  )
    .bind(sid, cid)
    .first();
  if (!row || (!row.published && !me.is_admin)) throw new Refusal(404, "not_found", "not found");

  const access = accessOf(row, me);
  if (access === "sign_in") {
    log("access.denied", { reason: "sign_in", course: cid });
    throw new Refusal(401, "sign_in_required", "sign in to read this section");
  }
  if (access === "premium") {
    log("access.denied", { reason: "premium", course: cid, user: shortId(me.user_id) });
    throw new Refusal(403, "premium_required", "this course is part of " + PREMIUM_TIER);
  }
  return row;
}

async function readSection(env, me, cid, sid) {
  const row = await readableSection(env, me, cid, sid);
  const progress = await env.DB.prepare("SELECT status FROM progress WHERE user_id = ?1 AND section_id = ?2")
    .bind(me.user_id, sid)
    .first();
  return json({
    section: {
      id: row.id,
      course_id: row.course_id,
      title: row.title,
      body: row.body,
      position: row.position,
      minutes: minutesFor(row.body.length),
      updated_at: row.updated_at,
    },
    status: progress ? progress.status : "not_started",
  });
}

// Opening a section starts it. It never downgrades one: reopening a finished
// section only touches updated_at, which is what "pick up where you left
// off" sorts by.
async function openSection(env, me, cid, sid) {
  await readableSection(env, me, cid, sid);
  const row = await env.DB.prepare(
    "INSERT INTO progress (user_id, section_id, course_id, status) VALUES (?1, ?2, ?3, 'in_progress')" +
      " ON CONFLICT (user_id, section_id) DO UPDATE SET updated_at = datetime('now')" +
      " RETURNING status",
  )
    .bind(me.user_id, sid, cid)
    .first();
  log("progress.open", { course: cid, user: shortId(me.user_id), status: row.status });
  return json({ section_id: sid, status: row.status, course: await courseProgress(env, me.user_id, cid) });
}

// The client says whether the section is done; the server decides what that
// is stored as. A status string from the client is never written anywhere.
async function setProgress(request, env, me, cid, sid) {
  await readableSection(env, me, cid, sid);
  const { completed } = await readJSON(request);
  if (typeof completed !== "boolean") {
    throw new Refusal(400, "invalid_status", "completed must be true or false");
  }
  const status = completed ? "completed" : "in_progress";
  await env.DB.prepare(
    "INSERT INTO progress (user_id, section_id, course_id, status, completed_at)" +
      " VALUES (?1, ?2, ?3, ?4, CASE WHEN ?4 = 'completed' THEN datetime('now') END)" +
      " ON CONFLICT (user_id, section_id) DO UPDATE SET status = excluded.status," +
      " completed_at = excluded.completed_at, updated_at = datetime('now')",
  )
    .bind(me.user_id, sid, cid, status)
    .run();
  log(completed ? "progress.complete" : "progress.reopen", { course: cid, user: shortId(me.user_id) });
  return json({ section_id: sid, status, course: await courseProgress(env, me.user_id, cid) });
}

async function courseProgress(env, userId, cid) {
  const row = await env.DB.prepare(
    "SELECT (SELECT COUNT(*) FROM sections WHERE course_id = ?2) AS total," +
      " COALESCE(SUM(status = 'completed'), 0) AS completed," +
      " COALESCE(SUM(status = 'in_progress'), 0) AS in_progress" +
      " FROM progress WHERE user_id = ?1 AND course_id = ?2",
  )
    .bind(userId, cid)
    .first();
  return { total: row.total, completed: row.completed, in_progress: row.in_progress };
}

/* ----------------------------------------------------------------- admin */

// Learners are the people with at least one progress row: there is no user
// table to count. "Finished" means every current section completed.
async function stats(env) {
  const learners = await env.DB.prepare("SELECT COUNT(DISTINCT user_id) AS n FROM progress").first();
  const { results } = await env.DB.prepare(
    "WITH totals AS (SELECT course_id, COUNT(*) AS total FROM sections GROUP BY course_id)," +
      " per_user AS (SELECT course_id, user_id, SUM(status = 'completed') AS done FROM progress GROUP BY course_id, user_id)" +
      " SELECT c.id, COALESCE(t.total, 0) AS sections, COUNT(u.user_id) AS started," +
      " COALESCE(SUM(t.total > 0 AND u.done >= t.total), 0) AS finished" +
      " FROM courses c LEFT JOIN totals t ON t.course_id = c.id LEFT JOIN per_user u ON u.course_id = c.id" +
      " GROUP BY c.id ORDER BY c.position, c.created_at",
  ).all();
  return json({ learners: learners.n, courses: results });
}

async function adminCourse(env, cid) {
  const course = await env.DB.prepare(
    "SELECT id, title, summary, subject, tier, published, position, updated_at FROM courses WHERE id = ?1",
  )
    .bind(cid)
    .first();
  if (!course) return notFound();
  const { results } = await env.DB.prepare(
    "SELECT id, title, body, position, updated_at FROM sections WHERE course_id = ?1 ORDER BY position, created_at",
  )
    .bind(cid)
    .all();
  course.published = Boolean(course.published);
  return json({ course, sections: results });
}

async function createCourse(request, env, me) {
  const body = await readJSON(request);
  const title = field(body.title, MAX_COURSE_TITLE, "title", true);
  const summary = field(body.summary, MAX_SUMMARY, "summary");
  const subject = subjectOf(body.subject);
  const tier = tierOf(body.tier === undefined ? "free" : body.tier);

  const count = await env.DB.prepare("SELECT COUNT(*) AS n FROM courses").first();
  if (count.n >= MAX_COURSES) throw new Refusal(409, "too_many", `a table holds ${MAX_COURSES} courses at most`);

  // New courses start as drafts at the end of the table. INSERT OR IGNORE
  // plus a retry covers the (very) rare id collision without a second query.
  for (let attempt = 0; attempt < 3; attempt++) {
    const id = makeId(title);
    const result = await env.DB.prepare(
      "INSERT OR IGNORE INTO courses (id, title, summary, subject, tier, published, position)" +
        " VALUES (?1, ?2, ?3, ?4, ?5, 0, (SELECT COALESCE(MAX(position), -1) + 1 FROM courses))",
    )
      .bind(id, title, summary, subject, tier)
      .run();
    if (changed(result)) {
      log("course.create", { course: id, user: shortId(me.user_id), subject, tier, titleLen: title.length });
      return adminCourse(env, id).then((res) => withStatus(res, 201));
    }
  }
  return json({ error: "could not pick an id, try again" }, 503);
}

async function updateCourse(request, env, cid) {
  const body = await readJSON(request);
  const course = await env.DB.prepare("SELECT id, published FROM courses WHERE id = ?1").bind(cid).first();
  if (!course) return notFound();

  const sets = [];
  const values = [];
  if (body.title !== undefined) {
    sets.push("title");
    values.push(field(body.title, MAX_COURSE_TITLE, "title", true));
  }
  if (body.summary !== undefined) {
    sets.push("summary");
    values.push(field(body.summary, MAX_SUMMARY, "summary"));
  }
  if (body.subject !== undefined) {
    sets.push("subject");
    values.push(subjectOf(body.subject));
  }
  if (body.tier !== undefined) {
    sets.push("tier");
    values.push(tierOf(body.tier));
  }
  if (body.published !== undefined) {
    if (typeof body.published !== "boolean") throw new Refusal(400, "invalid_published", "published must be true or false");
    if (body.published) {
      const count = await env.DB.prepare("SELECT COUNT(*) AS n FROM sections WHERE course_id = ?1").bind(cid).first();
      if (count.n === 0) throw new Refusal(400, "empty_course", "add a section before publishing");
    }
    sets.push("published");
    values.push(body.published ? 1 : 0);
  }
  if (!sets.length) throw new Refusal(400, "nothing_to_change", "nothing to change");

  // Column names come from the fixed list above, never from the request.
  const assignments = sets.map((col, i) => `${col} = ?${i + 2}`).join(", ");
  await env.DB.prepare(`UPDATE courses SET ${assignments}, updated_at = datetime('now') WHERE id = ?1`)
    .bind(cid, ...values)
    .run();

  if (body.published !== undefined && Boolean(course.published) !== body.published) {
    log(body.published ? "course.publish" : "course.unpublish", { course: cid });
  } else {
    log("course.update", { course: cid, fields: sets.join(",") });
  }
  return adminCourse(env, cid);
}

// No foreign keys, so the cascade is spelled out: progress, sections, course.
async function deleteCourse(env, cid) {
  const course = await env.DB.prepare("SELECT id FROM courses WHERE id = ?1").bind(cid).first();
  if (!course) return notFound();
  await env.DB.batch([
    env.DB.prepare("DELETE FROM progress WHERE course_id = ?1").bind(cid),
    env.DB.prepare("DELETE FROM sections WHERE course_id = ?1").bind(cid),
    env.DB.prepare("DELETE FROM courses WHERE id = ?1").bind(cid),
  ]);
  log("course.delete", { course: cid });
  return json({ ok: true });
}

async function reorderCourses(request, env) {
  const { results } = await env.DB.prepare("SELECT id FROM courses").all();
  const ids = orderFrom(await readJSON(request), results);
  await env.DB.batch(ids.map((id, i) => env.DB.prepare("UPDATE courses SET position = ?1 WHERE id = ?2").bind(i, id)));
  log("course.reorder", { count: ids.length });
  return json({ ok: true });
}

async function createSection(request, env, cid) {
  const body = await readJSON(request);
  const title = field(body.title, MAX_SECTION_TITLE, "title", true);
  const text = bodyOf(body.body === undefined ? "" : body.body);

  const course = await env.DB.prepare(
    "SELECT c.id, (SELECT COUNT(*) FROM sections WHERE course_id = c.id) AS n FROM courses c WHERE c.id = ?1",
  )
    .bind(cid)
    .first();
  if (!course) return notFound();
  if (course.n >= MAX_SECTIONS) throw new Refusal(409, "too_many", `a course holds ${MAX_SECTIONS} sections at most`);

  for (let attempt = 0; attempt < 3; attempt++) {
    const id = makeId(title);
    const result = await env.DB.prepare(
      "INSERT OR IGNORE INTO sections (id, course_id, title, body, position)" +
        " VALUES (?1, ?2, ?3, ?4, (SELECT COALESCE(MAX(position), -1) + 1 FROM sections WHERE course_id = ?2))",
    )
      .bind(id, cid, title, text)
      .run();
    if (changed(result)) {
      await touchCourse(env, cid);
      log("section.create", { course: cid, section: id, bodyLen: text.length });
      const section = await env.DB.prepare(
        "SELECT id, title, body, position, updated_at FROM sections WHERE id = ?1",
      )
        .bind(id)
        .first();
      return json({ section }, 201);
    }
  }
  return json({ error: "could not pick an id, try again" }, 503);
}

async function updateSection(request, env, cid, sid) {
  const body = await readJSON(request);
  const sets = [];
  const values = [];
  if (body.title !== undefined) {
    sets.push("title");
    values.push(field(body.title, MAX_SECTION_TITLE, "title", true));
  }
  if (body.body !== undefined) {
    sets.push("body");
    values.push(bodyOf(body.body));
  }
  if (!sets.length) throw new Refusal(400, "nothing_to_change", "nothing to change");

  const assignments = sets.map((col, i) => `${col} = ?${i + 3}`).join(", ");
  const result = await env.DB.prepare(
    `UPDATE sections SET ${assignments}, updated_at = datetime('now') WHERE id = ?1 AND course_id = ?2`,
  )
    .bind(sid, cid, ...values)
    .run();
  if (!changed(result)) return notFound();

  await touchCourse(env, cid);
  log("section.update", { course: cid, section: sid, fields: sets.join(",") });
  const section = await env.DB.prepare("SELECT id, title, body, position, updated_at FROM sections WHERE id = ?1")
    .bind(sid)
    .first();
  return json({ section });
}

async function deleteSection(env, cid, sid) {
  const section = await env.DB.prepare("SELECT id FROM sections WHERE id = ?1 AND course_id = ?2").bind(sid, cid).first();
  if (!section) return notFound();
  await env.DB.batch([
    env.DB.prepare("DELETE FROM progress WHERE section_id = ?1").bind(sid),
    env.DB.prepare("DELETE FROM sections WHERE id = ?1").bind(sid),
  ]);
  await touchCourse(env, cid);
  log("section.delete", { course: cid, section: sid });
  return json({ ok: true });
}

async function reorderSections(request, env, cid) {
  const { results } = await env.DB.prepare("SELECT id FROM sections WHERE course_id = ?1").bind(cid).all();
  const ids = orderFrom(await readJSON(request), results);
  await env.DB.batch(
    ids.map((id, i) => env.DB.prepare("UPDATE sections SET position = ?1 WHERE id = ?2").bind(i, id)),
  );
  await touchCourse(env, cid);
  log("section.reorder", { course: cid, count: ids.length });
  return json({ ok: true });
}

function touchCourse(env, cid) {
  return env.DB.prepare("UPDATE courses SET updated_at = datetime('now') WHERE id = ?1").bind(cid).run();
}

/* ------------------------------------------------------------ validation */

// A thrown Refusal becomes an ordinary {error, code} response in handleAPI,
// so validation can stop a request from any depth without a 500.
class Refusal extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
  response() {
    return json({ error: this.message, code: this.code }, this.status);
  }
}

// Too long is refused rather than cut: the editor shows the limit, so a
// longer value means something went wrong and silently losing text is worse.
function field(value, max, name, required = false) {
  if (value === undefined || value === null) value = "";
  if (typeof value !== "string") throw new Refusal(400, "invalid_" + name, `${name} must be text`);
  const clean = value.replace(/\s+/g, " ").trim();
  if (required && !clean) throw new Refusal(400, name + "_required", `give it a ${name}`);
  if (clean.length > max) throw new Refusal(400, name + "_too_long", `${name} is limited to ${max} characters`);
  return clean;
}

function bodyOf(value) {
  if (typeof value !== "string") throw new Refusal(400, "invalid_body", "body must be text");
  const clean = value.replace(/\r\n?/g, "\n");
  if (clean.length > MAX_BODY) {
    throw new Refusal(413, "body_too_long", `a section is limited to ${MAX_BODY.toLocaleString("en")} characters`);
  }
  return clean;
}

function subjectOf(value) {
  if (!SUBJECT_KEYS.has(value)) throw new Refusal(400, "unknown_subject", "pick one of the subjects");
  return value;
}

function tierOf(value) {
  if (!TIERS.has(value)) throw new Refusal(400, "invalid_tier", "tier is free or premium");
  return value;
}

// A reorder names every row exactly once. Anything else (a stale list after
// someone added a section in another tab, say) is refused so positions never
// drift into duplicates.
function orderFrom(body, rows) {
  const ids = body.ids;
  const known = new Set(rows.map((r) => r.id));
  if (
    !Array.isArray(ids) ||
    ids.length !== known.size ||
    new Set(ids).size !== ids.length ||
    !ids.every((id) => known.has(id))
  ) {
    throw new Refusal(409, "order_mismatch", "the list changed, reload and try again");
  }
  return ids;
}

/* ----------------------------------------------------------------- utils */

// Readable ids ("newtons-laws-k3x9") make shareable URLs. The random suffix
// keeps them unique, and keeps any id from being the word "order".
function makeId(title) {
  const slug =
    title
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 36)
      .replace(/-+$/, "") || "untitled";
  const bytes = crypto.getRandomValues(new Uint8Array(4));
  const suffix = Array.from(bytes, (b) => (b % 36).toString(36)).join("");
  return slug + "-" + suffix;
}

function minutesFor(chars) {
  if (!chars) return 0;
  return Math.max(1, Math.round(chars / CHARS_PER_MINUTE));
}

async function readJSON(request) {
  const declared = Number(request.headers.get("Content-Length") || 0);
  if (declared > MAX_REQUEST_BYTES) throw new Refusal(413, "too_large", "that request is too large");
  const raw = await request.text();
  if (raw.length > MAX_REQUEST_BYTES) throw new Refusal(413, "too_large", "that request is too large");
  if (!raw) return {};
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Refusal(400, "bad_json", "that was not valid JSON");
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Refusal(400, "bad_json", "send a JSON object");
  }
  return parsed;
}

function notFound() {
  return json({ error: "not found", code: "not_found" }, 404);
}

function methodNotAllowed() {
  return json({ error: "method not allowed" }, 405);
}

function withStatus(response, status) {
  return new Response(response.body, { status, headers: response.headers });
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

function changed(result) {
  return (result && result.meta && result.meta.changes) || 0;
}

/* --------------------------------------------------------------- logging */
//
// Read these back with `yard service logs` (add --since 2h). Every line
// starts with [primer] and is one event, so it greps cleanly:
//   yard service logs | grep 'progress.complete'
//
// Not logged: emails, titles, section text (their lengths are, where useful).
// User ids are cut to 8 characters: enough to follow one person through a
// session, not a lasting identifier sitting in a log store. Course and
// section ids are logged whole; they are public, they are in every URL.

function log(event, fields) {
  const parts = ["[primer] " + event];
  for (const key in fields) {
    const value = fields[key];
    if (value === undefined || value === null || value === "") continue;
    parts.push(key + "=" + value);
  }
  console.log(parts.join(" "));
}

function shortId(id) {
  return typeof id === "string" && id ? id.slice(0, 8) : "-";
}
