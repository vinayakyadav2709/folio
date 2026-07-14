# devl.dev design library (vendored)

Source: https://github.com/sean-brydon/devl.dev (https://www.devl.dev/) by Sean
Brydon — 162 design experiments built on coss-ui. Vendored 2026-07-12 for easy
copying. NOTE: upstream has no LICENSE file; the site invites copying ("press c
to copy source") but treat as attribution-required and re-check before any
commercial redistribution of the designs themselves.

## Layout

- `showcase/` — one file per experiment. Categories: settings(12), auth(11),
  profile(10), modals(10), empty(10), card(10), timelines(12), table(9),
  dashboards(9), charts(9), calendars(9), layouts(8), tours/toasts/threads/
  pricing(6 each), sidebars/forms/filter(4 each), login, onboarding, waitlist.
- `demo/` — a COMPLETE dashboard app (sidebar, topbar, settings view, project
  detail view, inbox, overlays, store) — best reference for overall shell.
- `ui/` — the devl ui kit the experiments import from (components/, hooks/,
  lib/, themes/). When lifting a design, resolve its imports against our
  `apps/web/src/components/ui` (coss ui) first — most map 1:1; copy anything
  missing from here into `apps/web/src/components/shared/`.

## How to lift a design

1. Pick from `showcase/` (or `demo/` for shell patterns).
2. Copy into the feature that uses it (`apps/web/src/features/<x>/components/`).
3. Fix imports: `@workspace/ui/...` → `@/components/ui/...` (coss) or copy the
   missing piece from `design/devl/ui/` into `components/shared/`.
4. Swap demo data for real Convex data. Keep the visual structure.

This directory is NOT part of any build/typecheck (repo-root, outside all
package tsconfigs). Do not import from it directly — always copy.
