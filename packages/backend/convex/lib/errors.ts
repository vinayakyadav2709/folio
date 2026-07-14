import { Cause, Effect, Exit, Option } from 'effect'
import { Data } from 'effect'
import { ConvexError } from 'convex/values'

export class NotFound extends Data.TaggedError('NotFound')<{ message: string }> {}
export class Forbidden extends Data.TaggedError('Forbidden')<{ message: string }> {}
export class Invalid extends Data.TaggedError('Invalid')<{ message: string }> {}

export type DomainError = NotFound | Forbidden | Invalid

// The single Effect -> Convex boundary (CLAUDE.md rule 6): run the model
// effect and rethrow domain failures as ConvexError for the client.
export async function run<A>(effect: Effect.Effect<A, DomainError>): Promise<A> {
  const exit = await Effect.runPromiseExit(effect)
  if (Exit.isSuccess(exit)) return exit.value
  const failure = Cause.failureOption(exit.cause)
  if (Option.isSome(failure)) {
    throw new ConvexError({ tag: failure.value._tag, message: failure.value.message })
  }
  throw Cause.squash(exit.cause)
}
