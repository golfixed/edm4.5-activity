'use client'

import { useFirebaseSync } from '@/lib/useFirebaseSync'

function FirebaseSyncInner({ children }: { children: React.ReactNode }) {
  useFirebaseSync()
  return <>{children}</>
}

export default function FirebaseProvider({ children }: { children: React.ReactNode }) {
  return <FirebaseSyncInner>{children}</FirebaseSyncInner>
}
