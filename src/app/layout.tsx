import type { Metadata } from 'next'
import { Sarabun } from 'next/font/google'
import './globals.css'
import FirebaseProvider from '@/components/FirebaseProvider'
import { ConfirmProvider } from '@/components/ConfirmDialog'

const sarabun = Sarabun({
  subsets: ['thai', 'latin'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Active Fun Games',
  description: 'Internal school activity scoring app',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="th">
      <body className={`${sarabun.className} min-h-screen`}>
        <FirebaseProvider>
          <ConfirmProvider>
            {children}
          </ConfirmProvider>
        </FirebaseProvider>
      </body>
    </html>
  )
}
