// Prompt: turn a job posting — pasted text and/or an attached file (a PDF JD, a
// screenshot of a forwarded WhatsApp message) — into structured job fields.
// STRICT JSON.

export const extractJobPrompt = (input: {
  text?: string
  urls?: string[]
}): { system: string; prompt: string } => {
  const urls = input.urls ?? []
  const system = [
    'You extract structured job-posting data from a pasted job description, which',
    'may arrive as text, as an attached file (a PDF, or an image such as a',
    'screenshot of a message or listing), or both.',
    '',
    'Fields:',
    '- company: hiring company name.',
    '- role: the job title.',
    '- location: optional, as stated (e.g. "Remote", "Bengaluru, India").',
    '- url: optional apply/posting link, only if one literally appears.',
    '- salary: optional compensation as stated.',
    '- description: the FULL job description text, reconstructed from the input',
    '  and cleaned up — fix OCR artifacts and line-break noise, keep every',
    '  requirement, responsibility and qualification. Do not summarize, do not',
    '  invent anything that is not in the input. Plain text or light markdown.',
    '',
    'If company or role is genuinely absent, use "Unknown".',
    '',
    'Output requirements:',
    '- Respond with STRICT JSON: one object, nothing else.',
    '- No markdown fences, no commentary before or after the object.',
    'Shape: {"company":"...","role":"...","location":"...","url":"...",',
    '"salary":"...","description":"..."}',
  ].join('\n')

  const base = input.text?.trim()
    ? `Job posting text:\n${input.text.trim()}`
    : 'The job posting is in the attached file (PDF, image, or document). Read it and extract the fields.'

  // Pasted posts are usually an aggregator blurb wrapping a link to the real
  // listing. When we have resolved links, the fetched page beats the paste.
  const linkSection = urls.length
    ? [
        '',
        'Links found in the posting (already resolved through any shorteners):',
        ...urls.map((u) => `- ${u}`),
        '',
        'READ each of these URLs. The pasted text above is usually only a short',
        'aggregator/forwarded blurb; the linked page is the real posting. Prefer the',
        'linked page for every field, and build `description` from its full content —',
        'all responsibilities, requirements, qualifications and benefits.',
        'If a fetched page is itself just an aggregator post that links onward to an',
        'obvious "apply" / job-listing URL, follow that one link too and use it.',
        'Set `url` to the best apply/posting link you end up with.',
        'If a URL cannot be retrieved, silently ignore it and fall back to the pasted',
        'text — never mention the failure, and never invent content for a page you',
        'could not read.',
      ].join('\n')
    : ''

  const prompt = base + linkSection

  return { system, prompt }
}
