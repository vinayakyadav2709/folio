// The ONLY file that names AI providers. Everything else stays provider-agnostic
// and goes through generateText(). Uses Effect AI (@effect/ai-*) over the default
// Convex runtime's fetch (FetchHttpClient).
import { Effect, Layer, Redacted } from 'effect'
import { FetchHttpClient, type HttpClient } from '@effect/platform'
import { AiError, LanguageModel } from '@effect/ai'
import { AnthropicClient, AnthropicLanguageModel } from '@effect/ai-anthropic'
import { OpenAiClient, OpenAiLanguageModel } from '@effect/ai-openai'
import { GoogleClient, GoogleLanguageModel } from '@effect/ai-google'
import type { Provider } from '../model/aiKeys'

// Sensible current flagships per provider.
const DEFAULT_MODEL: Record<Provider, string> = {
  anthropic: 'claude-sonnet-5',
  openai: 'gpt-5',
  google: 'gemini-2.5-pro',
}

const modelLayer = (
  provider: Provider,
  apiKey: string,
): Layer.Layer<LanguageModel.LanguageModel, never, HttpClient.HttpClient> => {
  const key = Redacted.make(apiKey)
  switch (provider) {
    case 'anthropic':
      return AnthropicLanguageModel.layer({ model: DEFAULT_MODEL.anthropic }).pipe(
        Layer.provide(AnthropicClient.layer({ apiKey: key })),
      )
    case 'openai':
      return OpenAiLanguageModel.layer({ model: DEFAULT_MODEL.openai }).pipe(
        Layer.provide(OpenAiClient.layer({ apiKey: key })),
      )
    case 'google':
      return GoogleLanguageModel.layer({ model: DEFAULT_MODEL.google }).pipe(
        Layer.provide(GoogleClient.layer({ apiKey: key })),
      )
  }
}

// Provider-agnostic entry point. Returns the model's text, or fails with AiError.
export const generateText = (opts: {
  provider: Provider
  apiKey: string
  system: string
  prompt: string
}): Effect.Effect<string, AiError.AiError> =>
  LanguageModel.generateText({
    prompt: [
      { role: 'system', content: opts.system },
      { role: 'user', content: [{ type: 'text', text: opts.prompt }] },
    ],
  }).pipe(
    Effect.map((response) => response.text),
    Effect.provide(modelLayer(opts.provider, opts.apiKey).pipe(Layer.provide(FetchHttpClient.layer))),
  )
