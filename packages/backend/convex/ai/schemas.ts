// Effect Schema decoding of raw model output. On parse failure we fail Invalid
// so the action boundary surfaces a clean ConvexError.
import { Effect, Schema } from 'effect'
import { Invalid } from '../lib/errors'

// Models sometimes wrap JSON in ```json fences despite instructions — strip them.
const stripFences = (text: string) =>
  text
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim()

const StringArray = Schema.parseJson(Schema.Array(Schema.String))

const decodeWith =
  <A>(schema: Schema.Schema<A, string>) =>
  (text: string): Effect.Effect<A, Invalid> =>
    Schema.decodeUnknown(schema)(stripFences(text)).pipe(
      Effect.mapError(() => new Invalid({ message: 'AI returned malformed output' })),
    )

export const decodeStringArray: (text: string) => Effect.Effect<readonly string[], Invalid> =
  decodeWith(StringArray)

// Models happily emit `null` or `""` for a field they couldn't ground; Convex
// optional validators accept neither, so optional strings collapse to undefined.
const OptStr = Schema.optional(Schema.NullOr(Schema.String))
export const blank = (s: string | null | undefined): string | undefined =>
  s && s.trim() ? s.trim() : undefined

const ExtractedProject = Schema.parseJson(
  Schema.Struct({
    name: Schema.String,
    subtitle: OptStr,
    brief: OptStr,
    description: Schema.String,
    demoUrl: OptStr,
    githubUrl: OptStr,
    startDate: OptStr,
    endDate: OptStr,
  }),
)

export const decodeExtractedProject = decodeWith(ExtractedProject)

const ExtractedJob = Schema.parseJson(
  Schema.Struct({
    company: Schema.String,
    role: Schema.String,
    location: OptStr,
    url: OptStr,
    salary: OptStr,
    description: Schema.String,
  }),
)

export const decodeExtractedJob = decodeWith(ExtractedJob)

// A pasted resume is the messiest input we take: whole sections may be missing
// and the model may drop a key it has nothing for. Everything is optional here
// and the action supplies the defaults, so a name-plus-one-job resume parses.
const OptStrArr = Schema.optional(Schema.NullOr(Schema.Array(Schema.String)))

const ExtractedResume = Schema.parseJson(
  Schema.Struct({
    fullName: OptStr,
    headline: OptStr,
    email: OptStr,
    phone: OptStr,
    location: OptStr,
    githubUrl: OptStr,
    linkedinUrl: OptStr,
    websiteUrl: OptStr,
    skills: Schema.optional(
      Schema.NullOr(Schema.Array(Schema.Struct({ category: OptStr, items: OptStrArr }))),
    ),
    education: Schema.optional(
      Schema.NullOr(
        Schema.Array(
          Schema.Struct({
            school: OptStr,
            degree: OptStr,
            location: OptStr,
            startDate: OptStr,
            endDate: OptStr,
            gpa: OptStr,
          }),
        ),
      ),
    ),
    experience: Schema.optional(
      Schema.NullOr(
        Schema.Array(
          Schema.Struct({
            company: OptStr,
            role: OptStr,
            location: OptStr,
            startDate: OptStr,
            endDate: OptStr,
            bullets: OptStrArr,
          }),
        ),
      ),
    ),
    achievements: Schema.optional(
      Schema.NullOr(
        Schema.Array(Schema.Struct({ title: OptStr, description: OptStr, date: OptStr })),
      ),
    ),
    projects: Schema.optional(
      Schema.NullOr(
        Schema.Array(
          Schema.Struct({
            name: OptStr,
            subtitle: OptStr,
            brief: OptStr,
            description: OptStr,
            demoUrl: OptStr,
            githubUrl: OptStr,
            startDate: OptStr,
            endDate: OptStr,
          }),
        ),
      ),
    ),
  }),
)

export const decodeExtractedResume = decodeWith(ExtractedResume)

const TailoredBlocks = Schema.parseJson(
  Schema.Array(Schema.Struct({ id: Schema.String, bullets: Schema.Array(Schema.String) })),
)

export const decodeTailoredBlocks = decodeWith(TailoredBlocks)
