import { useEffect, useRef } from 'react'

import { resetDevLogin, runSyncNow, subscribeSyncOnNetwork } from '../services/syncManager'

export const useSyncManager = ({ userId, role, enabled = true }) => {
  const prevRoleRef = useRef(role)

  useEffect(() => {
    if (!enabled || !userId || !role) return undefined

    // Khi user đổi role → reset token để login lại với credentials mới
    if (prevRoleRef.current !== role) {
      resetDevLogin()
      prevRoleRef.current = role
    }

    const unsubscribe = subscribeSyncOnNetwork({ userId, role })
    runSyncNow({ userId, role })

    return unsubscribe
  }, [enabled, role, userId])
}
