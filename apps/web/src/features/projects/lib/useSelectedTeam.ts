import { useEffect, useState } from 'react'

const KEY = 'folio.selectedTeamId'

// Remembers the last-picked team across visits. Returns null until the
// browser storage has been read (SSR-safe: no localStorage during render).
export function useSelectedTeam(): [string | null, (id: string) => void] {
  const [id, setId] = useState<string | null>(null)

  useEffect(() => {
    setId(localStorage.getItem(KEY))
  }, [])

  function select(next: string) {
    localStorage.setItem(KEY, next)
    setId(next)
  }

  return [id, select]
}
