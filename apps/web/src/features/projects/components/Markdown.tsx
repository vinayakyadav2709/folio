import { useEffect, useState } from 'react'
import ReactMarkdown from 'react-markdown'

// --- shiki decision -------------------------------------------------------
// react-markdown renders synchronously; shiki's highlighter is async. Rather
// than wiring an async highlighter into render, each fenced code block lazily
// dynamic-imports shiki inside an effect (so shiki stays out of the initial
// bundle) and swaps in the highlighted HTML when ready. A plain, styled <pre>
// is shown while loading and kept permanently if shiki fails or the language
// is unknown. Inline code stays a plain <code>.
type CodeProps = React.ComponentPropsWithoutRef<'code'> & { node?: unknown }

function CodeBlock({ className, children, node: _node, ...rest }: CodeProps) {
  const code = String(children ?? '').replace(/\n$/, '')
  const lang = /language-(\w+)/.exec(className ?? '')?.[1]
  const isBlock = Boolean(lang) || code.includes('\n')
  const [html, setHtml] = useState<string | null>(null)

  useEffect(() => {
    if (!isBlock) return
    let alive = true
    import('shiki')
      .then(({ codeToHtml }) => codeToHtml(code, { lang: lang ?? 'text', theme: 'github-dark' }))
      .then((out) => alive && setHtml(out))
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [code, lang, isBlock])

  if (!isBlock) {
    return (
      <code className={className} {...rest}>
        {children}
      </code>
    )
  }

  if (html) {
    return (
      <span
        className="not-prose my-4 block overflow-x-auto rounded-lg border text-sm [&_pre]:p-3"
        // shiki output is trusted (generated from the user's own markdown source)
        dangerouslySetInnerHTML={{ __html: html }}
      />
    )
  }

  return (
    <pre className="not-prose my-4 overflow-x-auto rounded-lg border bg-muted p-3 text-sm">
      <code>{code}</code>
    </pre>
  )
}

export function Markdown({ children }: { children: string }) {
  return (
    <div className="prose prose-sm dark:prose-invert max-w-none">
      <ReactMarkdown
        components={{
          // Let CodeBlock own the block wrapper instead of react-markdown's <pre>.
          pre: ({ children: c }) => <>{c}</>,
          code: CodeBlock,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  )
}
