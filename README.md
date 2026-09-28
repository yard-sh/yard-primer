# Primer

<p align="center">
<a href="https://dash.yard.sh/projects?action=create&repo=https%3A%2F%2Fgithub.com%2Fyard-sh%2Fyard-primer"><img src="https://yard.sh/create-in-yard.png" width="200" alt="Create in Yard" /></a>
</p>

A small online course site for STEM subjects, hosted end to end on Yard.
Courses are listed as a grid of cards, and each course has sections.
Learners sign in, start a course, and work through its sections. Each section
is *not started*, *in progress* or *done*, and that progress is saved to their
account. Some courses are Free and some need **Premium**, a $20 a month
subscription. The project's
team edits everything from a built-in admin panel.

It has three parts:

- a static frontend with no dependencies
- a fetch-handler backend with a SQLite database
- Yard Auth for sign-in

There is no login code and no users table.

It serves two URLs:

- `https://<team>.yard.sh/<slug>/`: the landing page, with a live catalog and pricing
- `https://<team>.yard.sh/<slug>/app/`: the course site and the admin panel

Use the button above, or paste this repository's URL into the "Create from
GitHub URL" field of the Yard dashboard's Create Project dialog.

Plan requirements:

- The custom landing page needs Yard Pro.
- Sign-in uses Yard Auth, which is included with Basic and Pro.

## Layout

    .yard/
      settings.json         the service, the landing page, and the Free and Premium tiers
      migrations/
        0001_init.sql       courses, sections, progress
        0002_seed.sql       five sample courses, so the catalog isn't empty
    app/                    the deployable bundle (the services[] entry with dir: app)
      _service.js           the whole backend: routes, access rules, admin API
      index.html            app shell
      app.js                boot, hash router, header, refresh on focus
      ui.js                 API helper, course cards, section lists, status icons, sheets
      learn.js              catalog, course page, reader
      admin.js              dashboard, course editor, section editor
      markdown.js           the safe Markdown renderer, plus KaTeX for math
      styles.css            design tokens (light and dark), full-width layout, cards
    landing-page/           the public page: live catalog, how it works, pricing

## How it fits together

**The catalog is public.** The service is `"access": "public"`, so anyone
can browse the courses and read their syllabi. Signing in is only needed to
read a section, save progress, or use the admin panel, and `_service.js`
checks that on each of those routes.

The edge sends trusted `X-Yard-*` headers whenever someone is signed in, and
strips any a client tries to send. The landing page uses the same public
endpoint (`app/api/courses`) to show the real courses.

**Admins are the Yard team.** Yard sends `X-Yard-Entitlement: owner` for every
member of the team that owns the project, and nobody else can fake it. That
header is the whole role system:

```js
is_admin: Boolean(userId) && entitlement === "owner",
```

- There is nothing to claim and no roles table.
- Whoever creates the project is an admin from their first visit.
- To add another admin, such as an instructor, invite them to the team in
  the Yard dashboard.
- Every route under `api/admin/` checks this behind one gate at the top of
  that branch.

**The server is the paywall.** A course's `tier` is `free` or `premium`.

- `planOf()` decides who counts as Premium: the team, or an `active` or
  `trial` entitlement whose `X-Yard-Tier` is `PREMIUM_TIER`.
- Anyone who is signed in counts as Free. Nobody has to "buy" the $0 tier.
- A locked course still shows its syllabus, but its section bodies are never
  sent. The reader gets `403 premium_required`, and the app explains why.
- Renaming the tier in `settings.json` means renaming `PREMIUM_TIER` too.

**Progress is one row per learner per section.**

- **Not started** means there is no row.
- **Opening** a section writes `in_progress`. Opening it again never undoes
  `completed`.
- **Mark complete** stores `completed`. The client only sends a boolean;
  the server decides the stored status.

Course progress, "pick up where you left off" and the admin stats are all
derived from these rows.

**Where state lives.** The database has three tables: `courses`, `sections`
and `progress`. Identity and plan are read fresh from the request headers
every time, so there is no copy to go stale. Deleting a course or section
also deletes its progress rows, in one batch.

**Sections are Markdown with math.** `markdown.js` is a small renderer that
treats every body as untrusted:

- Code and math are set aside first.
- Everything else is HTML-escaped.
- Links and images must use `http`, `https`, `mailto` or a relative URL.

`$inline$` and `$$display$$` math is typeset by KaTeX, loaded from jsDelivr
with a pinned version and a subresource-integrity hash. If KaTeX can't load,
the formulas show as monospace TeX.

It also supports:

- `> [!NOTE]`, `[!TIP]`, `[!WARNING]` and `[!EXAMPLE]` callouts
- tables, lists and fenced code

**Subjects.** `SUBJECTS` in `_service.js` lists each subject's key and name,
and the app and the landing page read that list from the API. Each subject's
accent colour (the stripe on its cards, its progress bars and status icons)
is a `[data-subject="…"]` rule in both stylesheets, with a lighter variant
for dark mode.

**Layout.** The app spans the whole window, with side padding that grows with
it (`--gutter`). The course grid adds columns as the window widens, and on
wide screens a course page puts the course on the left and its sections on
the right. Only running text keeps a reading width (`--measure`), so lessons
stay comfortable to read. The landing page sits in a wide centred column
(`--wrap` in its stylesheet), with the pricing section centred within it.

**Relative URLs only.** The app is mounted at `/<slug>/app/`, so it calls
`fetch("api/courses")`, never `/api/courses`, and routes live in the hash
(`#/course/motion`). `yard service check` lints for this.

## Free and Premium

| | Free | Premium |
| --- | --- | --- |
| Browse the catalog and syllabi | yes | yes |
| Read free courses, progress saved | yes | yes |
| Read Premium courses | no | yes |
| Price | $0 | $20 a month |

The landing page fills the pricing cards from `window.yard.project.tiers`, so
it never hard-codes a tier id. The Premium button carries that tier's id, and
a Premium holder sees "This is your plan" instead.

After a purchase, the edge can report the old plan for up to a minute. The
app re-reads `api/me` whenever its window regains focus.

A trial or a yearly discount is one field on the Premium tier in
`settings.json`, for example `"free_trial": { "enabled": true, "days": 7 }`.
`planOf()` already counts trials.

## Local development

    yard dev

- The landing page is at `http://localhost:9875/primer/`.
- The app is at `http://localhost:9875/primer/app/`.
- Both migrations are applied to a local database in `.yard/dev/`.

There is no real sign-in locally. A persona stands in for it:

| Persona | Who they are |
| --- | --- |
| `anonymous` | a visitor: browses, can't read sections |
| `signed-in` | signed in, no purchase: Free |
| `user:free` | holds the Free tier |
| `user:premium` | holds Premium: every course |
| `member` | on the project's team: Premium plus the admin panel |

- Pick one at `/primer/app/__yard/auth/login`, or start with
  `yard dev --as member`.
- A private window gets its own persona, so you can be a learner and an
  admin side by side.
- `yard dev --reset-db` puts the sample courses back.

Offline, `yard dev` makes up tier data without prices. The landing page then
keeps the prices written in its HTML.

## Logging

Every line starts with `[primer]` and records one event:

    [primer] progress.complete course=motion user=dev-pers
    [primer] course.publish course=orbits-and-gravity-k3x9
    [primer] access.denied reason=premium course=moles user=05c444a7
    [primer] request method=PUT path=/api/courses/motion/sections/motion-velocity/progress status=200 user=05c444a7 ms=3

The events are:

- `request` and `request.failed`
- `access.denied`
- `progress.open`, `progress.complete`, `progress.reopen`
- `course.create`, `course.update`, `course.publish`, `course.unpublish`,
  `course.delete`, `course.reorder`
- `section.create`, `section.update`, `section.delete`, `section.reorder`

Emails and section text are never logged. User ids are cut to 8 characters.
Read the logs with `yard service logs --since 2h`.

## Shipping

    yard service check                  validate the bundle offline
    yard push                           upload service, page and settings into a draft
    yard releases publish v1.0.0        publish the draft, which makes it live

Nothing serves a draft release, and migrations apply themselves on deploy.

To try a release before learners see it:

    yard sandbox create preview
    yard sandbox pin                              hold the live site where it is
    yard releases publish v1.1.0
    yard sandbox pin v1.1.0 --sandbox preview
    yard service open --sandbox preview           team-only URL
    yard sandbox unpin                            go live

A sandbox has its own database and its own simulated checkout. That makes it
the place to buy Premium end to end without any money moving.

## Data lifecycle

- `0002_seed.sql` runs once per database. A sample course you delete stays
  deleted.
- Deleting a course removes its sections and everyone's progress in it.
  Deleting a section removes the progress on that section.
- Never edit an applied migration. Add a new numbered file instead.
