import { useState } from 'react'
import { LogOutIcon } from 'lucide-react'
import { authClient } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'
import { Panel, PanelSection } from './settings-panel'

/**
 * Sign out lives here rather than in the account menu, which is now a
 * single-purpose identity surface. `expectAuth` needs a full page load after
 * sign-out (per the @convex-dev/better-auth docs), so this navigates rather
 * than routing — a client transition would leave stale authed queries mounted.
 */
export function SignOutSection() {
  const [pending, setPending] = useState(false)

  async function signOut() {
    setPending(true)
    try {
      await authClient.signOut()
      window.location.href = '/'
    } catch {
      // Landing here means the session outlived the request; a reload still
      // drops it, so send them home either way rather than stranding them.
      window.location.href = '/'
    }
  }

  return (
    <Panel>
      <PanelSection
        title="Sign out"
        hint="Ends this session on this device. Your resumes, projects and keys stay exactly as they are."
      >
        <Button
          variant="destructive-outline"
          onClick={signOut}
          loading={pending}
          className="self-start transition-transform active:scale-[0.96]"
        >
          <LogOutIcon />
          Sign out
        </Button>
      </PanelSection>
    </Panel>
  )
}
