// Prompt: turn arbitrary pasted text about a project (README, notes, a chat
// log) into structured project fields. STRICT JSON — see ai/schemas.ts.

export const extractProjectPrompt = (input: { text: string }): { system: string; prompt: string } => {
  const system = [
    'You extract structured portfolio project data from arbitrary text: a README,',
    'rough notes, a chat log, a job of work someone described. Read it and craft',
    'the best possible entry for a developer portfolio.',
    '',
    'Fields:',
    '- name: short project name.',
    '- subtitle: optional one-line role/stack tag (e.g. "React + Convex").',
    '- brief: optional single plain-text sentence summarizing the project.',
    '- description: markdown — a lead sentence on what it is and its impact,',
    '  then a few "- " bullets of key features or outcomes. Keep it tight.',
    '- demoUrl / githubUrl: ONLY if such a URL literally appears in the text.',
    '- startDate / endDate: only if dates appear; free text like "Jan 2024".',
    '',
    'Never invent URLs or dates. Omit optional fields you cannot ground in the text.',
    '',
    'Output requirements:',
    '- Respond with STRICT JSON: one object, nothing else.',
    '- No markdown fences, no commentary before or after the object.',
    'Shape: {"name":"...","subtitle":"...","brief":"...","description":"...",',
    '"demoUrl":"...","githubUrl":"...","startDate":"...","endDate":"..."}',
  ].join('\n')

  return { system, prompt: `Source text:\n${input.text}` }
}
