
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
  title: 'app4me - Discover Apps Made For You',
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
      <head>
        <meta charSet="utf-8"/>
        <link rel="preconnect" href="https://fonts.gstatic.com/" crossOrigin=""/>
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?display=swap&family=Inter%3Awght%40400%3B500%3B700%3B900"/>
        <title>Stitch Design</title>
        <link rel="icon" type="image/x-icon" href="data:image/x-icon;base64,"/>
        <script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
        <script dangerouslySetInnerHTML={{ __html: `tailwind.config = {darkMode: "class", theme: {extend: {colors: {primary: "#13a4ec", "background-light": "#f6f7f8", "background-dark": "#101c22"}, fontFamily: {display: "Inter"}, borderRadius: {DEFAULT: "0.25rem", lg: "0.5rem", xl: "0.75rem", full: "9999px"}}}}` }}/>
      </head>
      <body className="bg-background-light dark:bg-background-dark font-display">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}
