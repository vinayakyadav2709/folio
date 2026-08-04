// Prompt: rewrite the bullets of a set of resume blocks to target one job
// description. STRICT JSON array of {id, bullets} — see ai/schemas.ts.

type TailorBlock = {
  id: string
  type: string
  title?: string
  subtitle?: string
  bullets: string[]
}

export const tailorBlocksPrompt = (input: {
  jobDescription: string
  blocks: TailorBlock[]
}): { system: string; prompt: string } => {
  const system = [
    'You tailor resume content to a specific job description. For each block you',
    'are given, rewrite its bullets so they emphasize what the JD actually asks',
    'for: its keywords and technologies, the impact it cares about, quantified',
    'outcomes where the original bullet supports a number.',
    '',
    'Hard rules:',
    '- NEVER invent experience, tools, employers or metrics that are not already',
    '  implied by the original bullets. Reframe only.',
    '- Return the SAME number of bullets or fewer — drop the ones least relevant',
    '  to this JD rather than padding.',
    '- Keep every block: return one entry per input block, with its exact id.',
    '- ATS-friendly: strong action verb, concrete result, no first-person pronouns.',
    '',
    'Output requirements:',
    '- Respond with STRICT JSON: an array of {"id": string, "bullets": string[]}.',
    '- No markdown, no code fences, no commentary before or after the array.',
    'Example: [{"id":"abc","bullets":["Rewrote ...","Cut ..."]}]',
  ].join('\n')

  const blocks = input.blocks
    .map((b) =>
      [
        `id: ${b.id}`,
        `type: ${b.type}`,
        b.title ? `title: ${b.title}` : null,
        b.subtitle ? `subtitle: ${b.subtitle}` : null,
        `bullets:\n${b.bullets.map((x) => `- ${x}`).join('\n')}`,
      ]
        .filter(Boolean)
        .join('\n'),
    )
    .join('\n\n---\n\n')

  const prompt = `Job description:\n${input.jobDescription}\n\nBlocks to tailor:\n\n${blocks}`
  return { system, prompt }
}
