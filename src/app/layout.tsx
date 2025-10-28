
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
          <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden">
            <div className="flex h-full grow flex-col">
              <header className="flex w-full items-center justify-between whitespace-nowrap border-b border-solid border-gray-200/10 dark:border-white/10 px-4 sm:px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="size-6 text-primary">
                    <svg fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                      <path clipRule="evenodd" d="M12.0799 24L4 19.2479L9.95537 8.75216L18.04 13.4961L18.0446 4H29.9554L29.96 13.4961L38.0446 8.75216L44 19.2479L35.92 24L44 28.7521L38.0446 39.2479L29.96 34.5039L29.9554 44H18.0446L18.04 34.5039L9.95537 39.2479L4 28.7521L12.0799 24Z" fill="currentColor" fillRule="evenodd"></path>
                    </svg>
                  </div>
                  <h2 className="text-xl font-bold leading-tight tracking-tight text-gray-900 dark:text-white">AppDiscovery AI</h2>
                </div>
              </header>
              {children}
            </div>
          </div>
        </AuthProvider>
      </body>
    </html>
  )
}
