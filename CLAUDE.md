# Portfolio Manager (working name)

## Delegate — don't do everything yourself

Fan work out to subagents (Agent tool) instead of doing it all in the main loop,
and pick the model per task by speed / cost / taste:

| Model | Use for |
|---|---|
| `sonnet` (Sonnet 5) | Bulk + mechanical: file scaffolding, repetitive edits, searches, boilerplate, simple CRUD functions |
| `opus` (Opus 4.8) | Solid engineering: feature implementation, refactors, test writing, code review passes |
| `fable` (Fable 5, yourself) | Judgment + taste: architecture, schema design, the snapshot DAG, tricky Effect code, UX decisions, final review |

Parallelize independent subagent tasks in one message. Keep the main loop for
orchestration, decisions, and anything touching the core invariants.

Team-based portfolio + resume manager. Core model: **a resume is a composition of
shared blocks**. Projects/experience/skills live once in a team pool; resumes hold
references + per-resume overrides. Versioning is an immutable snapshot DAG
(git-like branches = resume variants), rendered live with React Flow.

## Stack (this is the budget — adding a dep requires strong justification)

| Layer | Choice |
|---|---|
| App framework | TanStack Start (Vite) on Cloudflare Workers |
| Backend / DB / realtime / storage / cron | Convex |
| Auth | Better Auth via `@convex-dev/better-auth` (official component) |
| Logic / errors / config / validation | Effect (Schema, Config, TaggedError) |
| AI (BYOK) | `@effect/ai` + `@effect/ai-anthropic` / `-openai` / `-google` |
| UI | coss ui (Base UI + Tailwind v4), copy-paste via shadcn CLI |
| Version graph | `@xyflow/react` |
| Drag & drop | dnd-kit |
| Markdown | react-markdown + shiki |
| PDF export | `@react-pdf/renderer`, client-side only |
| Runtime / workspaces | Bun + Turborepo monorepo |

No Confect, no TanStack Query (Convex hooks are the query layer), no TanStack AI
unless a user needs a provider Effect AI lacks.

## Skills — invoke before writing code

- **ponytail** — every coding task. Laziest solution that works; ladder: delete >
  reuse > stdlib > platform > installed dep > one line > minimal code.
- **effect-ts** — whenever touching Effect code (Schema, services, errors, AI).
- **convex** — installed by Convex setup; use it for all Convex work. Until then:
  https://docs.convex.dev and https://labs.convex.dev/better-auth. Never guess APIs.

## Structure (Turborepo + bun workspaces)

```
apps/web/                    TanStack Start frontend
  src/routes/                file routes — thin, compose features; public pages:
                             u.$username, team.$slug, p.$projectId
  src/features/<name>/       editor, version-tree, projects, portfolio, teams,
                             settings — each: components/ hooks/ lib/ index.ts
                             (index.ts = public API, 3-5 exports)
  src/components/ui/         coss ui copies — don't casually hand-edit
  src/components/shared/     cross-feature components
  src/lib/                   effect config, convex client, utils
packages/backend/            Convex deployment
  convex/schema.ts           single source of truth for all tables
  convex/auth.ts, http.ts    Better Auth component setup + mounted routes (required)
  convex/<domain>.ts         public API: teams, projects, contributions, resumes,
                             snapshots, aiKeys, ai — THIN functions only
  convex/model/              ALL business logic (Effect lives here), takes ctx explicitly
  convex/ai/                 provider.ts (only file naming an AI provider; BYOK keys
                             encrypted at rest, decrypted only in actions, never logged),
                             prompts/ (one file per prompt), schemas.ts (AI response parsing)
  convex/lib/                crypto, errors, helpers
packages/exports/            pure functions: snapshot -> PDF component / .tex string
                             (LaTeX = string templating, no LaTeX lib; no hooks, no fetching)
```

## Rules

1. **Convex public functions are thin**: validate args → auth check → call
   `model/` → return. ≤ ~15 lines. Always declare `returns:` validators.
2. **Convex validators (`v.*`) at function boundaries and schema; Effect inside.**
   Effect never replaces Convex's own arg/schema validators.
3. **Features never import sibling features.** Shared code moves down to
   `components/shared` or `lib/`. Routes contain zero logic.
4. **Snapshots are immutable.** No mutation edits a snapshot — only inserts.
   Fork/cherry-pick/commit = new rows. This invariant is the product.
5. **Types flow from `convex/schema.ts`** via generated `Doc<"table">`. Never
   hand-write a duplicate domain type.
6. **Errors**: `Schema.TaggedError` defined next to the model that raises it;
   convert to `ConvexError` at the function boundary, nowhere else.
7. **No hand-rolled crypto/ids**: encryption via `better-auth/crypto`
   (`symmetricEncrypt`/`symmetricDecrypt`, already installed); generated ids
   (block ids etc.) via `uuid` package `v7()` — never hand-roll byte juggling
   or use crypto.randomUUID/Math.random for ids.
8. **UI sourcing order**: (1) devl.dev experiment — VENDORED at `design/devl/`
   (162 designs; see its README for the lift procedure; never import from it,
   always copy) → (2) coss ui component — `bunx shadcn@latest add @coss/<name>`
   → (3) build it yourself, matching coss ui conventions. Never reach for
   another component library. For any visual work, use the
   `make-interfaces-feel-better` skill (vendored from devl.dev).

## Commands (root)

```
bun install
bun run dev        # turbo dev — runs web + convex dev together
```
