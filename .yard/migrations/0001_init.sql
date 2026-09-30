-- Primer schema. Every statement is idempotent: migration files are not
-- transactional, so a mid-file failure leaves the earlier statements applied
-- and the file unrecorded in _yard_migrations, which re-runs it from the top
-- on the next deploy. IF NOT EXISTS makes that re-run harmless.
--
-- There is no users table. Who someone is, whether they are on the Yard team
-- (the admins) and which tier they hold all arrive on every request as
-- trusted X-Yard-* headers, so storing them would only create a copy that
-- goes stale. Progress rows are keyed by X-Yard-User-Id directly.
--
-- There are no foreign keys either: _service.js deletes a course's sections
-- and progress itself, in one batch, so nothing depends on PRAGMA settings.
--
-- Times are milliseconds since the epoch, written by the service.

-- A course is one card in the catalog. subject is a key of SUBJECTS in
-- _service.js; tier is 'free' or 'premium'. Drafts (published = 0) are only
-- visible to admins. position orders the catalog.
CREATE TABLE IF NOT EXISTS courses (
  id         TEXT PRIMARY KEY,
  title      TEXT NOT NULL,
  summary    TEXT NOT NULL DEFAULT '',
  subject    TEXT NOT NULL,
  tier       TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'premium')),
  published  INTEGER NOT NULL DEFAULT 0,
  position   INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_courses_position ON courses (position, created_at);

-- A section is one sitting: a title and a Markdown body (with $math$).
CREATE TABLE IF NOT EXISTS sections (
  id         TEXT PRIMARY KEY,
  course_id  TEXT NOT NULL,
  title      TEXT NOT NULL,
  body       TEXT NOT NULL DEFAULT '',
  position   INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sections_course ON sections (course_id, position);

-- One row per learner per section they have opened. "Not started" is the
-- absence of a row; opening a section writes 'in_progress', and the learner
-- marks it 'completed'. course_id is copied onto the row (sections never
-- move between courses) so a course's progress is one indexed scan.
CREATE TABLE IF NOT EXISTS progress (
  user_id      TEXT NOT NULL,
  section_id   TEXT NOT NULL,
  course_id    TEXT NOT NULL,
  status       TEXT NOT NULL CHECK (status IN ('in_progress', 'completed')),
  started_at   INTEGER NOT NULL,
  completed_at INTEGER,
  updated_at   INTEGER NOT NULL,
  PRIMARY KEY (user_id, section_id)
);

CREATE INDEX IF NOT EXISTS idx_progress_user_course ON progress (user_id, course_id);
CREATE INDEX IF NOT EXISTS idx_progress_course ON progress (course_id, user_id, status);
