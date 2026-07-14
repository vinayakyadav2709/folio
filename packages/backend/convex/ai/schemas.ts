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

export const decodeStringArray = (text: string): Effect.Effect<readonly string[], Invalid> =>
  Schema.decodeUnknown(StringArray)(stripFences(text)).pipe(
    Effect.mapError(() => new Invalid({ message: 'AI returned malformed output' })),
  )
