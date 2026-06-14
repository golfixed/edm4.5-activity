import type { Metadata } from 'next'
import './globals.css'
import FirebaseProvider from '@/components/FirebaseProvider'

export const metadata: Metadata = {
  title: 'EDM 4.5 Active Fun Games',
  description: 'Internal school activity scoring app',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="th">
      <body className="min-h-screen bg-gradient-to-br from-school-bg to-white">
        <FirebaseProvider>
          {children}
        </FirebaseProvider>
      </body>
    </html>
  )
}
