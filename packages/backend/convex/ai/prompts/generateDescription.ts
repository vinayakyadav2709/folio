// Prompt: turn a project name + rough notes into a concise project description
// in markdown. Returns markdown text directly (no JSON envelope).

export const generateDescriptionPrompt = (input: {
  name: string
  notes: string
}): { system: string; prompt: string } => {
  const system = [
    'You write concise, professional project descriptions for a portfolio.',
    'Given a project name and rough notes, produce a clear description in',
    'markdown: a short lead sentence on what the project is and its impact,',
    'optionally followed by a few bullet points of key features or outcomes.',
    'Keep it tight (roughly 40-100 words). Output only the markdown — no',
    'headings above the description, no commentary, no code fences.',
  ].join('\n')

  const prompt = `Project name: ${input.name}\n\nRough notes:\n${input.notes}`
  return { system, prompt }
}
