# folio — Project Spec

*(working name "folio" — rename is just package names)*

## Problem

A team shares projects, but every member maintains their own resume by hand.
Keeping N resumes in sync with the team's actual work is clerical labor. We want
one dashboard: when a team member adds a project, everyone else can put it on
their resume with one click.

## Core idea (the load-bearing decision)

**A resume is not a document — it's a composition of shared blocks.**

- A **Project**, **Experience**, **Skill group**, **Education entry** is a
  standalone block with an owner and content.
- A **Resume** is an ordered list of block *references* + theme + layout config,
  with optional per-resume overrides (tweak a shared bullet locally without
  forking the block).
- Teammate adds a project to the pool → "add to my resume" = insert a reference.
- Owner improves the project description later → everyone referencing it sees
  "upstream updated — pull changes?" (like a dependency update). Killer feature.

## Versioning: immutable snapshot DAG (git-like, but not git)

Evaluated and rejected: isomorphic-git (versions text files, pure overhead for
JSON), Automerge/Yjs CRDTs (solve concurrent merging; Convex already gives
realtime and we chose cherry-pick over merge). The version tree is just Convex
documents:

- **Branches = variants**: `main` → `finance`, `frontend`, `ml-heavy`. Each
  branch = named variant with its own theme + block selection.
- **Commits = snapshots**: every meaningful save inserts an immutable snapshot
  (~10–50KB full JSON, no delta encoding). `parentId` forms the DAG. "The resume
  I sent to X on July 3" is retrievable forever.
- **Cherry-pick, not merge**: copy one improved block across snapshots. No 3-way
  merge, ever.
- **Tag = "sent"**: exporting a PDF for an application tags the snapshot with
  company/role/date. ATS scores stored per snapshot → the tree shows score
  evolution over time.
- **UI**: React Flow (`@xyflow/react`) — custom snapshot-card nodes (branch
  color, theme, ATS badge, sent-to tag), auto-layout, click to preview,
  right-click to fork. Live-reactive via Convex: teammate commits → your tree
  re-renders instantly.

## Features

### MVP

| # | Feature | Notes |
|---|---------|-------|
| 1 | Team-based portfolio | Teams → members → shared project pool |
| 2 | Resume editor | Custom block-arranger (no good OSS fit — Reactive Resume/OpenResume are one-user-one-document, incompatible with shared blocks). Sidebar of blocks (mine + team pool) → drag (dnd-kit) → live preview. Steal Reactive Resume's theme JSON structure (MIT). |
| 3 | Version tree | Snapshot DAG + React Flow as above |
| 4 | AI writing | Rewrite bullets, generate descriptions — Effect AI in Convex actions |
| 5 | Project addition page | Markdown descriptions (react-markdown + shiki), proof links (repo/demo/screenshots via Convex storage) |
| 6 | Contribution roles | Each member writes their OWN bullets on a shared project ("built auth service" vs "designed UI") — shared facts, personal claims; AI uses these for personalized resumes |
| 7 | Public pages | Path-based: `/u/username` (individual resume), `/team/slug` (group portfolio), `/p/projectId` (shareable project page). Subdomains later via Cloudflare wildcard DNS + Host-header routing if ever wanted. |
| 8 | Exports | PDF: `@react-pdf/renderer` client-side, 2 ATS-safe themes (no template treadmill). LaTeX: string-template snapshot → `.tex`. |
| 9 | BYOK AI keys | User pastes any provider key (Anthropic / OpenAI / Google — native SDKs via official `@effect/ai-*` packages, NO OpenRouter proxy, NO provider-specific app code). Encrypted at rest, decrypted only in actions. Users pay their own tokens → no rate limiter needed. |
| 10 | Admin | Team management, roles, invites (MVP-lite) |

### v2

| Feature | Notes |
|---------|-------|
| JD tailoring | Paste job description → AI scores branch heads → forks most relevant → new AI-badged (🤖) branch for that company with swapped blocks + rewritten bullets |
| ATS scoring | Rules engine (parse-safety, section headers, keyword match vs JD, length) + LLM rubric judges = several distinct scores. Stored per snapshot, shown on tree nodes. |
| Share-link analytics | View counts on public pages |
| Team skill matrix | Auto-derived from members' blocks, on group portfolio page |
| Review/comments | Teammates comment on resume drafts before sending |

### Explicitly rejected

- Application tracker (beyond the "sent" tag) — not building Huntr
- Resume import/parsing from PDF/LinkedIn — users create fresh; maybe much later
- Multiple templates at launch — 2 excellent ATS-safe themes only
- Merge between branches — cherry-pick only
- Confect — community one-maintainer layer between us and the DB; Convex
  validators at boundaries instead, Effect inside
- OpenRouter BYOK trick — native provider SDKs via Effect AI instead
- TanStack Query — Convex hooks are the query layer
- Application-managed AI keys / rate limiting — BYOK means users pay

## Schema sketch

```
teams ─< memberships >─ users (Better Auth)
teams ─< projects        { markdown desc, links, screenshots, ownerId }
projects ─< contributions { userId, bullets[] }        ← per-member roles
users ─< resumes         { name }
resumes ─< branches      { name, color, headSnapshotId }
branches ─< snapshots    { parentId, blocks[], theme, atsScores?, sentTo? }  ← immutable DAG
users ─< aiKeys          { provider, encryptedKey }
```

## Stack

See CLAUDE.md (the authoritative budget). Summary: Turborepo + bun workspaces;
apps/web = TanStack Start (Vite) on Cloudflare Workers; packages/backend =
Convex (+ `@convex-dev/better-auth`); packages/exports = pure snapshot→PDF/LaTeX;
Effect everywhere inside (Schema, Config, TaggedError, `@effect/ai`); UI = coss ui
(Base UI + Tailwind v4), sourcing order devl.dev → coss ui → hand-build.

## Build order

1. Monorepo scaffold + auth + teams
2. Projects / blocks / contributions
3. Editor + PDF export
4. Snapshot DAG + React Flow tree
5. AI (BYOK, rewrite/generate)
6. Public pages
7. v2: JD tailoring → ATS scoring → comments → skill matrix
