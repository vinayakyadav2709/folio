import { Effect } from 'effect'
import { v, type Infer } from 'convex/values'
import { action, internalQuery } from './_generated/server'
import { internal } from './_generated/api'
import { run, Invalid } from './lib/errors'
import { requireUserId } from './lib/access'
import { decryptKey } from './lib/crypto'
import { resolveUrls } from './lib/urls'
import * as keys from './model/aiKeys'
import { generateText } from './ai/provider'
import {
  blank,
  decodeExtractedJob,
  decodeExtractedProject,
  decodeExtractedResume,
  decodeStringArray,
  decodeTailoredBlocks,
} from './ai/schemas'
import { rewriteBulletPrompt } from './ai/prompts/rewriteBullet'
import { generateDescriptionPrompt } from './ai/prompts/generateDescription'
import { extractProjectPrompt } from './ai/prompts/extractProject'
import { extractJobPrompt } from './ai/prompts/extractJob'
import { extractResumePrompt } from './ai/prompts/extractResume'
import { tailorBlocksPrompt } from './ai/prompts/tailorBlocks'

const vKey = v.union(
  v.null(),
  v.object({
    provider: vProviderLit(),
    encryptedKey: v.string(),
    model: v.optional(v.string()),
  }),
)
function vProviderLit() {
  return v.union(v.literal('anthropic'), v.literal('openai'), v.literal('google'))
}

const NO_KEY = 'No AI key configured — add one in Settings'

// The provider's own reason, surfaced instead of swallowed. AiError carries
// module/method/description; the api key lives in a Redacted header and is
// never part of it, so this is safe to log and to return to the caller.
const aiFailed = (e: unknown) => {
  const err = e as { _tag?: string; description?: string; message?: string }
  const reason = err?.description ?? err?.message ?? String(e)
  console.error('[ai] request failed', err?._tag ?? 'unknown', reason)
  return new Invalid({ message: `AI request failed: ${reason}` })
}

type LoadedKey = {
  provider: 'anthropic' | 'openai' | 'google'
  encryptedKey: string
  model?: string
} | null

// The shared shape of every AI action: no key -> Invalid, otherwise decrypt in
// the action (never in a query, never logged) and call the model.
const complete = (
  key: LoadedKey,
  opts: {
    system: string
    prompt: string
    // Raw base64 (no data: URL prefix) + its real mime type — PDF, image, text.
    file?: { data: string; mediaType: string }
    fetchUrls?: boolean
  },
) =>
  Effect.gen(function* () {
    if (!key) return yield* Effect.fail(new Invalid({ message: NO_KEY }))
    const apiKey = yield* Effect.promise(() => decryptKey(key.encryptedKey))
    return yield* generateText({ provider: key.provider, apiKey, model: key.model, ...opts }).pipe(
      Effect.mapError(aiFailed),
    )
  })

// Internal: derives the current user server-side, returns the preferred
// encrypted key doc plus (optionally) the project context for a rewrite.
// Actions can't touch ctx.db, so they fetch through this and decrypt themselves.
export const loadContext = internalQuery({
  args: { projectId: v.optional(v.id('projects')) },
  returns: v.object({
    key: vKey,
    project: v.union(
      v.null(),
      v.object({ markdown: v.string(), contributionBullets: v.array(v.string()) }),
    ),
  }),
  handler: (ctx, args) =>
    run(
      requireUserId(ctx).pipe(
        Effect.flatMap((uid) =>
          Effect.gen(function* () {
            const key = yield* keys.getPreferredKey(ctx, uid)
            if (!args.projectId) return { key, project: null }
            const project = yield* Effect.promise(() => ctx.db.get(args.projectId!))
            if (!project) return { key, project: null }
            const contribution = yield* Effect.promise(() =>
              ctx.db
                .query('contributions')
                .withIndex('by_project_user', (q) =>
                  q.eq('projectId', args.projectId!).eq('userId', uid),
                )
                .unique(),
            )
            return {
              key,
              project: { markdown: project.description, contributionBullets: contribution?.bullets ?? [] },
            }
          }),
        ),
      ),
    ),
})

export const rewriteBullet = action({
  args: { bullet: v.string(), projectId: v.optional(v.id('projects')) },
  returns: v.array(v.string()),
  handler: async (ctx, args): Promise<string[]> => {
    const { key, project } = await ctx.runQuery(internal.ai.loadContext, { projectId: args.projectId })
    return run(
      Effect.gen(function* () {
        if (!key) return yield* Effect.fail(new Invalid({ message: NO_KEY }))
        const apiKey = yield* Effect.promise(() => decryptKey(key.encryptedKey))
        const { system, prompt } = rewriteBulletPrompt({
          bullet: args.bullet,
          projectContext: project?.markdown,
          contributionBullets: project?.contributionBullets,
        })
        const text = yield* generateText({ provider: key.provider, apiKey, model: key.model, system, prompt }).pipe(
          Effect.mapError(aiFailed),
        )
        return [...(yield* decodeStringArray(text))]
      }),
    )
  },
})

export const generateDescription = action({
  args: { name: v.string(), notes: v.string() },
  returns: v.string(),
  handler: async (ctx, args): Promise<string> => {
    const { key } = await ctx.runQuery(internal.ai.loadContext, {})
    return run(
      Effect.gen(function* () {
        if (!key) return yield* Effect.fail(new Invalid({ message: NO_KEY }))
        const apiKey = yield* Effect.promise(() => decryptKey(key.encryptedKey))
        const { system, prompt } = generateDescriptionPrompt({ name: args.name, notes: args.notes })
        const text = yield* generateText({ provider: key.provider, apiKey, model: key.model, system, prompt }).pipe(
          Effect.mapError(aiFailed),
        )
        return text.trim()
      }),
    )
  },
})

const vExtractedProject = v.object({
  name: v.string(),
  subtitle: v.optional(v.string()),
  brief: v.optional(v.string()),
  description: v.string(),
  demoUrl: v.optional(v.string()),
  githubUrl: v.optional(v.string()),
  startDate: v.optional(v.string()),
  endDate: v.optional(v.string()),
})

// Paste a README / notes / a chat log, get a fillable project form back.
export const extractProject = action({
  args: { text: v.string() },
  returns: vExtractedProject,
  handler: async (
    ctx,
    args,
  ): Promise<{
    name: string
    subtitle?: string
    brief?: string
    description: string
    demoUrl?: string
    githubUrl?: string
    startDate?: string
    endDate?: string
  }> => {
    const { key } = await ctx.runQuery(internal.ai.loadContext, {})
    return run(
      complete(key, extractProjectPrompt({ text: args.text })).pipe(
        Effect.flatMap(decodeExtractedProject),
        Effect.map((p) => ({
          name: p.name,
          subtitle: blank(p.subtitle),
          brief: blank(p.brief),
          description: p.description,
          demoUrl: blank(p.demoUrl),
          githubUrl: blank(p.githubUrl),
          startDate: blank(p.startDate),
          endDate: blank(p.endDate),
        })),
      ),
    )
  },
})

const vExtractedJob = v.object({
  company: v.string(),
  role: v.string(),
  location: v.optional(v.string()),
  url: v.optional(v.string()),
  salary: v.optional(v.string()),
  description: v.string(),
})

// Text and/or an attached file — PDF, screenshot, image
// (file.data = raw base64, no data: URL prefix).
export const extractJob = action({
  args: {
    text: v.optional(v.string()),
    file: v.optional(v.object({ data: v.string(), mediaType: v.string() })),
  },
  returns: vExtractedJob,
  handler: async (
    ctx,
    args,
  ): Promise<{
    company: string
    role: string
    location?: string
    url?: string
    salary?: string
    description: string
  }> => {
    const { key } = await ctx.runQuery(internal.ai.loadContext, {})
    return run(
      Effect.gen(function* () {
        if (!args.text?.trim() && !args.file)
          return yield* Effect.fail(new Invalid({ message: 'Provide job text or a file' }))
        // Follow shorteners first so the model gets the real ATS URLs, not bit.ly.
        const resolved = yield* resolveUrls(args.text ?? '')
        const urls = resolved.map((r) => r.finalUrl)
        const text = yield* complete(key, {
          ...extractJobPrompt({ text: args.text, urls }),
          file: args.file,
          fetchUrls: urls.length > 0,
        })
        const j = yield* decodeExtractedJob(text)
        return {
          company: j.company,
          role: j.role,
          location: blank(j.location),
          // The apply link is the most useful field and we already resolved one.
          url: blank(j.url) ?? urls[0],
          salary: blank(j.salary),
          description: j.description,
        }
      }),
    )
  },
})

const vExtractedResume = v.object({
  fullName: v.optional(v.string()),
  headline: v.optional(v.string()),
  email: v.optional(v.string()),
  phone: v.optional(v.string()),
  location: v.optional(v.string()),
  githubUrl: v.optional(v.string()),
  linkedinUrl: v.optional(v.string()),
  websiteUrl: v.optional(v.string()),
  skills: v.array(v.object({ category: v.string(), items: v.array(v.string()) })),
  education: v.array(
    v.object({
      school: v.string(),
      degree: v.optional(v.string()),
      location: v.optional(v.string()),
      startDate: v.optional(v.string()),
      endDate: v.optional(v.string()),
      gpa: v.optional(v.string()),
    }),
  ),
  experience: v.array(
    v.object({
      company: v.string(),
      role: v.optional(v.string()),
      location: v.optional(v.string()),
      startDate: v.optional(v.string()),
      endDate: v.optional(v.string()),
      bullets: v.array(v.string()),
    }),
  ),
  achievements: v.array(
    v.object({
      title: v.string(),
      description: v.optional(v.string()),
      date: v.optional(v.string()),
    }),
  ),
  projects: v.array(vExtractedProject),
})

type ExtractedResume = Infer<typeof vExtractedResume>

const list = <T>(a: readonly T[] | null | undefined): readonly T[] => a ?? []
const strings = (a: readonly string[] | null | undefined): string[] =>
  list(a)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)

// Paste a whole resume (text and/or an attached PDF, image or document) and get
// the entire profile plus its projects back. `file.data` is raw base64, no
// data: URL prefix. Extraction only — the UI reviews, then writes.
export const extractResume = action({
  args: {
    text: v.optional(v.string()),
    file: v.optional(v.object({ data: v.string(), mediaType: v.string() })),
  },
  returns: vExtractedResume,
  handler: async (ctx, args): Promise<ExtractedResume> => {
    const { key } = await ctx.runQuery(internal.ai.loadContext, {})
    return run(
      Effect.gen(function* () {
        if (!args.text?.trim() && !args.file)
          return yield* Effect.fail(new Invalid({ message: 'Provide resume text or a file' }))
        // Resumes print shortened/tracking links; resolve before handing them over.
        const resolved = yield* resolveUrls(args.text ?? '')
        const urls = resolved.map((r) => r.finalUrl)
        const text = yield* complete(key, {
          ...extractResumePrompt({ text: args.text, urls }),
          file: args.file,
          fetchUrls: urls.length > 0,
        })
        const r = yield* decodeExtractedResume(text)
        return {
          fullName: blank(r.fullName),
          headline: blank(r.headline),
          email: blank(r.email),
          phone: blank(r.phone),
          location: blank(r.location),
          githubUrl: blank(r.githubUrl),
          linkedinUrl: blank(r.linkedinUrl),
          websiteUrl: blank(r.websiteUrl),
          // Entries whose one required field is missing are dropped, not faked.
          skills: list(r.skills).flatMap((s) => {
            const items = strings(s.items)
            return items.length ? [{ category: blank(s.category) ?? 'Skills', items }] : []
          }),
          education: list(r.education).flatMap((e) => {
            const school = blank(e.school)
            return school
              ? [
                  {
                    school,
                    degree: blank(e.degree),
                    location: blank(e.location),
                    startDate: blank(e.startDate),
                    endDate: blank(e.endDate),
                    gpa: blank(e.gpa),
                  },
                ]
              : []
          }),
          experience: list(r.experience).flatMap((x) => {
            const company = blank(x.company)
            return company
              ? [
                  {
                    company,
                    role: blank(x.role),
                    location: blank(x.location),
                    startDate: blank(x.startDate),
                    endDate: blank(x.endDate),
                    bullets: strings(x.bullets),
                  },
                ]
              : []
          }),
          achievements: list(r.achievements).flatMap((a) => {
            const title = blank(a.title)
            return title ? [{ title, description: blank(a.description), date: blank(a.date) }] : []
          }),
          projects: list(r.projects).flatMap((p) => {
            const name = blank(p.name)
            return name
              ? [
                  {
                    name,
                    subtitle: blank(p.subtitle),
                    brief: blank(p.brief),
                    description: blank(p.description) ?? blank(p.brief) ?? '',
                    demoUrl: blank(p.demoUrl),
                    githubUrl: blank(p.githubUrl),
                    startDate: blank(p.startDate),
                    endDate: blank(p.endDate),
                  },
                ]
              : []
          }),
        }
      }),
    )
  },
})

// Rewrite each block's bullets against a JD. Returns only ids it was given.
export const tailorBlocks = action({
  args: {
    jobDescription: v.string(),
    blocks: v.array(
      v.object({
        id: v.string(),
        type: v.string(),
        title: v.optional(v.string()),
        subtitle: v.optional(v.string()),
        bullets: v.array(v.string()),
      }),
    ),
  },
  returns: v.array(v.object({ id: v.string(), bullets: v.array(v.string()) })),
  handler: async (ctx, args): Promise<{ id: string; bullets: string[] }[]> => {
    const { key } = await ctx.runQuery(internal.ai.loadContext, {})
    const ids = new Set(args.blocks.map((b) => b.id))
    return run(
      complete(
        key,
        tailorBlocksPrompt({ jobDescription: args.jobDescription, blocks: args.blocks }),
      ).pipe(
        Effect.flatMap(decodeTailoredBlocks),
        Effect.map((out) =>
          out
            .filter((b) => ids.has(b.id))
            .map((b) => ({ id: b.id, bullets: [...b.bullets] })),
        ),
      ),
    )
  },
})
