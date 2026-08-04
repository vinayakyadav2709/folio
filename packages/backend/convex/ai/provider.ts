// The ONLY file that names AI providers. Everything else stays provider-agnostic
// and goes through generateText(). Uses Effect AI (@effect/ai-*) over the default
// Convex runtime's fetch (FetchHttpClient).
import { Effect, Layer, Redacted } from 'effect'
import { FetchHttpClient, type HttpClient } from '@effect/platform'
import { AiError, LanguageModel, Toolkit } from '@effect/ai'
import { AnthropicClient, AnthropicLanguageModel } from '@effect/ai-anthropic'
import { OpenAiClient, OpenAiLanguageModel } from '@effect/ai-openai'
import { GoogleClient, GoogleLanguageModel, GoogleTool } from '@effect/ai-google'
import type { Provider } from '../model/aiKeys'

// Cheap-but-current tier per provider — these are extraction/tailoring tasks,
// not frontier reasoning. google: 3.5-flash-lite is the newest model still on
// Gemini's free tier ($0.30/$2.50 paid), and it's multimodal for image input.
const DEFAULT_MODEL: Record<Provider, string> = {
  anthropic: 'claude-sonnet-5',
  openai: 'gpt-5',
  google: 'gemini-3.5-flash-lite',
}

// Forced model for fetchUrls calls. @effect/ai-google@0.15.0 gates the
// provider-defined url_context tool behind a literal `model.includes("gemini-2")`
// check (GoogleLanguageModel prepareTools) and throws MalformedInput otherwise,
// so the user's model can't be honoured when we need Gemini to read a page.
// DELETE this override once the SDK recognises gemini-3.
const URL_FETCH_MODEL = 'gemini-2.5-flash'

// Server-side Google tools: url_context makes Gemini fetch the URLs in the
// prompt; google_search grounds anything it can't retrieve. Both are
// Tool.providerDefined with requiresHandler: false, so no handler layer.
const googleFetchTools = Toolkit.make(GoogleTool.UrlContext({}), GoogleTool.GoogleSearch({}))

// `model` is already resolved (user's choice, or the provider default).
const modelLayer = (
  provider: Provider,
  apiKey: string,
  model: string,
): Layer.Layer<LanguageModel.LanguageModel, never, HttpClient.HttpClient> => {
  const key = Redacted.make(apiKey)
  switch (provider) {
    case 'anthropic':
      return AnthropicLanguageModel.layer({ model }).pipe(
        Layer.provide(AnthropicClient.layer({ apiKey: key })),
      )
    case 'openai':
      return OpenAiLanguageModel.layer({ model }).pipe(
        Layer.provide(OpenAiClient.layer({ apiKey: key })),
      )
    case 'google':
      return GoogleLanguageModel.layer({ model }).pipe(
        Layer.provide(GoogleClient.layer({ apiKey: key })),
      )
  }
}

// Provider-agnostic entry point. Returns the model's text, or fails with AiError.
// `file.data` is raw base64 (no data: URL prefix) of ANY inline file the model
// accepts — PDF, image, plain text — identified by `file.mediaType`, which is
// passed straight through (Gemini reads application/pdf natively, no library).
// Every provider client here accepts a Prompt "file" part with a base64 string.
export const generateText = (opts: {
  provider: Provider
  apiKey: string
  system: string
  prompt: string
  file?: { data: string; mediaType: string }
  model?: string
  // Let the model fetch the URLs in the prompt itself. Google only — anthropic
  // and openai have no URL-fetch tool in these SDK versions, so it's a no-op.
  fetchUrls?: boolean
}): Effect.Effect<string, AiError.AiError> => {
  const fetching = opts.fetchUrls === true && opts.provider === 'google'
  const model = fetching ? URL_FETCH_MODEL : (opts.model ?? DEFAULT_MODEL[opts.provider])
  const prompt = [
    { role: 'system' as const, content: opts.system },
    {
      role: 'user' as const,
      content: [
        { type: 'text' as const, text: opts.prompt },
        ...(opts.file
          ? [{ type: 'file' as const, mediaType: opts.file.mediaType, data: opts.file.data }]
          : []),
      ],
    },
  ]
  const text = fetching
    ? LanguageModel.generateText({ prompt, toolkit: googleFetchTools }).pipe(
        Effect.map((r) => r.text),
      )
    : LanguageModel.generateText({ prompt }).pipe(Effect.map((r) => r.text))
  return text.pipe(
    Effect.provide(
      modelLayer(opts.provider, opts.apiKey, model).pipe(Layer.provide(FetchHttpClient.layer)),
    ),
  )
}
