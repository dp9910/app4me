'use client';

import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      {/* Header */}
      <header className="fixed top-0 right-0 z-50 p-6">
        <div className="flex gap-3">
          <a 
            href="/auth/signin" 
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
          >
            Sign In
          </a>
          <a 
            href="/auth/signup" 
            className="px-4 py-2 text-sm font-medium bg-black text-white hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200 rounded-md transition-colors"
          >
            Sign Up
          </a>
        </div>
      </header>

      {/* Hero Section */}
      <section className="px-6 pt-32 pb-20">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl md:text-7xl font-light tracking-tight text-gray-900 dark:text-white mb-6">
            Discover apps
            <br />
            <span className="font-normal">naturally</span>
          </h1>
          
          <p className="text-xl text-gray-600 dark:text-gray-400 mb-12 max-w-2xl mx-auto">
            AI-powered app discovery that understands what you really need
          </p>

          {/* Search Example */}
          <div className="max-w-xl mx-auto mb-16">
            <div className="text-gray-400 text-sm mb-2 line-through">budgeting apps</div>
            <div className="text-2xl font-medium text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-800 pb-2">
              apps to help me stop overspending
            </div>
          </div>

          {/* Main App Image */}
          <div className="max-w-4xl mx-auto">
            <img 
              src="/ui_image.png" 
              alt="App discovery interface" 
              className="w-full rounded-lg shadow-2xl"
            />
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-6 py-20 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-6xl mx-auto">
          {/* Dashboard Feature */}
          <div className="mb-32">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-light text-gray-900 dark:text-white mb-4">
                Personal dashboard
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                Curated recommendations based on your interests. No personal data collected.
              </p>
            </div>
            <img 
              src="/dashboard.png" 
              alt="Personal app dashboard" 
              className="w-full rounded-lg shadow-xl"
            />
          </div>

          {/* Personalization Feature */}
          <div className="mb-32">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-light text-gray-900 dark:text-white mb-4">
                Track preferences
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                Remember what you like and discover similar apps
              </p>
            </div>
            <img 
              src="/app_like.png" 
              alt="App preference tracking" 
              className="w-full rounded-lg shadow-xl"
            />
          </div>

          {/* Spotlight Feature */}
          <div>
            <div className="text-center mb-12">
              <h2 className="text-3xl font-light text-gray-900 dark:text-white mb-4">
                App insights
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                Detailed breakdown of every app
              </p>
            </div>
            <img 
              src="/app_spotlight.png" 
              alt="App detailed insights" 
              className="w-full rounded-lg shadow-xl"
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-20">
        <div className="max-w-4xl mx-auto text-center">
          <h3 className="text-2xl font-light text-gray-900 dark:text-white mb-4">
            Ready to discover?
          </h3>
          <a 
            href="/auth/signup" 
            className="inline-block px-8 py-3 bg-black text-white hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200 rounded-md font-medium transition-colors"
          >
            Get Started
          </a>
        </div>
      </footer>
    </div>
  )
}