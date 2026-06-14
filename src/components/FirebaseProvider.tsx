'use client'

import { useFirebaseSync } from '@/lib/useFirebaseSync'

export default function FirebaseProvider({ children }: { children: React.ReactNode }) {
  useFirebaseSync()
  return <>{children}</>
}
