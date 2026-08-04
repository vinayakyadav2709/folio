// Prompt: turn a resume — pasted text and/or an attached file (PDF, screenshot,
// photo, document) — into the user's whole profile plus their projects.
// STRICT JSON — see ai/schemas.ts.

export const extractResumePrompt = (input: {
  text?: string
  urls?: string[]
}): { system: string; prompt: string } => {
  const urls = input.urls ?? []
  const system = [
    'You extract a complete structured profile from a resume/CV, which may arrive',
    'as pasted text, as an attached file (a PDF, an image such as a screenshot or',
    'photo, or a document), or both.',
    '',
    'Fields:',
    '- fullName: the person\'s name as printed.',
    '- headline: the one-line title/tagline under the name (e.g. "Backend',
    '  Engineer" or "CS undergrad · distributed systems"). Omit if absent.',
    '- email / phone / location: as printed.',
    '- githubUrl / linkedinUrl / websiteUrl: FULL absolute URLs. Resumes often',
    '  print a bare handle or an icon next to text — expand it: "github.com/foo"',
    '  and "foo" next to a GitHub icon both become "https://github.com/foo";',
    '  "linkedin.com/in/foo" becomes "https://www.linkedin.com/in/foo". Only',
    '  expand a handle when the resume makes the platform clear.',
    '- skills: [{category, items[]}] grouped as the resume groups them',
    '  (e.g. Languages / Frameworks / Tools / Databases). If the resume has one',
    '  flat list with no groups, emit a single category named "Skills".',
    '- education: [{school, degree, location, startDate, endDate, gpa}].',
    '- experience: [{company, role, location, startDate, endDate, bullets[]}].',
    '  Keep each bullet essentially verbatim — fix OCR artifacts and line-break',
    '  noise only. Do NOT summarize, merge or drop detail, numbers or tech names.',
    '- achievements: [{title, description, date}] — awards, honours,',
    '  certifications, competition/hackathon wins, publications, scholarships,',
    '  leadership positions and similar one-line entries.',
    '- projects: [{name, subtitle, brief, description, demoUrl, githubUrl,',
    '  startDate, endDate}]. `subtitle` is an optional one-line role/stack tag',
    '  (e.g. "React + Convex"). `description` is markdown and as complete as the',
    '  source allows: a lead sentence on what it is and its impact, then "- "',
    '  bullets for features/outcomes, keeping the resume\'s own bullets.',
    '  `brief` is a one-paragraph plain-text summary.',
    '',
    'Rules:',
    '- NEVER invent anything that is not in the input. No guessed emails, URLs,',
    '  dates, employers, degrees or metrics.',
    '- Omit a field entirely rather than guessing or emitting a placeholder.',
    '- Dates stay free text exactly as written ("Jan 2024", "2023", "Present").',
    '- Emit [] for a section the resume does not have.',
    '',
    'Output requirements:',
    '- Respond with STRICT JSON: one object, nothing else.',
    '- No markdown fences, no commentary before or after the object.',
    'Shape: {"fullName":"...","headline":"...","email":"...","phone":"...",',
    '"location":"...","githubUrl":"...","linkedinUrl":"...","websiteUrl":"...",',
    '"skills":[{"category":"...","items":["..."]}],',
    '"education":[{"school":"...","degree":"...","location":"...",',
    '"startDate":"...","endDate":"...","gpa":"..."}],',
    '"experience":[{"company":"...","role":"...","location":"...",',
    '"startDate":"...","endDate":"...","bullets":["..."]}],',
    '"achievements":[{"title":"...","description":"...","date":"..."}],',
    '"projects":[{"name":"...","subtitle":"...","brief":"...","description":"...",',
    '"demoUrl":"...","githubUrl":"...","startDate":"...","endDate":"..."}]}',
  ].join('\n')

  const base = input.text?.trim()
    ? `Resume text:\n${input.text.trim()}`
    : 'The resume is in the attached file (PDF, image, or document). Read it and extract every field.'

  // A resume's links (GitHub, a live demo, a personal site) are usually where
  // the real project detail lives — the resume itself only has room for bullets.
  const linkSection = urls.length
    ? [
        '',
        'Links found in the resume (already resolved through any shorteners):',
        ...urls.map((u) => `- ${u}`),
        '',
        'READ these URLs and use what they contain to enrich the entries you',
        'already extracted — especially project `description` and `brief`, and to',
        'confirm the full form of githubUrl/websiteUrl. They ADD detail; they never',
        'replace or contradict the resume, and they never introduce a project,',
        'employer or skill the resume does not list.',
        'If a URL cannot be retrieved, silently ignore it — never mention the',
        'failure, and never invent content for a page you could not read.',
      ].join('\n')
    : ''

  return { system, prompt: base + linkSection }
}
