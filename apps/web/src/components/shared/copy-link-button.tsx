import { useState } from 'react'
import { CheckIcon, LinkIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'

// Copies an app-relative path (e.g. /u/ada) as an absolute URL.
export function CopyLinkButton({
  path,
  label = 'Copy link',
  size = 'sm',
  variant = 'outline',
  className,
}: {
  path: string
  label?: string
  size?: 'xs' | 'sm'
  variant?: 'outline' | 'ghost'
  className?: string
}) {
  const [copied, setCopied] = useState(false)
  return (
    <Button
      size={size}
      variant={variant}
      className={className}
      onClick={(e) => {
        // Rows/cards are often wrapped in Links — copying must not navigate.
        e.preventDefault()
        e.stopPropagation()
        navigator.clipboard.writeText(`${window.location.origin}${path}`).then(() => {
          setCopied(true)
          setTimeout(() => setCopied(false), 2000)
        })
      }}
    >
      {copied ? <CheckIcon /> : <LinkIcon />}
      {copied ? 'Copied!' : label}
    </Button>
  )
}
