import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/lib/auth/auth-context'

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'App4Me - Discover Apps Made For You',
  description: 'Tell us about your lifestyle, and we\'ll show you the perfect apps. No more endless scrolling through categories. Just personalized app discoveries.',
  keywords: 'app discovery, find apps, app recommendations, personalized apps, ios apps, app store',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className={`${inter.className} font-display bg-background-light`}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}