// Prompt: rewrite one resume bullet into 3 impact-focused, quantified,
// ATS-friendly alternatives. The model must return a STRICT JSON array of
// exactly 3 strings (see ai/schemas.ts for decoding).

export const rewriteBulletPrompt = (input: {
  bullet: string
  projectContext?: string
  contributionBullets?: string[]
}): { system: string; prompt: string } => {
  const system = [
    'You are a resume-writing expert. Rewrite a single resume bullet point into',
    'three stronger alternatives. Each rewrite must be impact-focused, quantified',
    'where plausible, and ATS-friendly (strong action verb, concrete result, no',
    'first-person pronouns, no fluff).',
    '',
    'Output requirements:',
    '- Respond with STRICT JSON: an array of exactly 3 strings, nothing else.',
    '- No markdown, no code fences, no commentary before or after the array.',
    'Example: ["Rewrite one", "Rewrite two", "Rewrite three"]',
  ].join('\n')

  const parts = [`Bullet to rewrite:\n${input.bullet}`]
  if (input.projectContext?.trim()) {
    parts.push(`Project context (markdown):\n${input.projectContext.trim()}`)
  }
  if (input.contributionBullets?.length) {
    parts.push(`This person's contributions:\n${input.contributionBullets.map((b) => `- ${b}`).join('\n')}`)
  }

  return { system, prompt: parts.join('\n\n') }
}
