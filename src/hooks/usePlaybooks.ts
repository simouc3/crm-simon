import { useEffect } from 'react'
import { checkStaleProposals } from '../lib/playbooks/FollowUpPlaybook'

const PLAYBOOK_SESSION_KEY = 'crm_playbook_last_run'
const INTERVAL_MS = 60 * 60 * 1000 // 1 hora

export function usePlaybooks() {
  useEffect(() => {
    const lastRun = sessionStorage.getItem(PLAYBOOK_SESSION_KEY)
    const now = Date.now()

    if (!lastRun || now - parseInt(lastRun) > INTERVAL_MS) {
      sessionStorage.setItem(PLAYBOOK_SESSION_KEY, String(now))
      checkStaleProposals().catch(console.warn)
    }
  }, [])
}
