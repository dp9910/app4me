'use client';

import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-white/80 dark:bg-gray-950/80 backdrop-blur-sm border-b border-gray-200/20 dark:border-gray-800/20 px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center">
            <img 
              src="/logo.png" 
              alt="app4me Logo" 
              className="h-10 w-auto"
            />
          </div>
          
          {/* Navigation */}
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
        </div>
      </header>

      {/* Hero Section */}
      <section className="px-6 pt-20 pb-20">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl md:text-7xl font-light tracking-tight text-gray-900 dark:text-white mb-6">
            Describe your problem.
            <br />
            <span className="text-4xl md:text-5xl font-light">We'll find the perfect iOS apps.</span>
          </h1>

          {/* AI Demo - Visual Flow */}
          <div className="max-w-3xl mx-auto mb-16">
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-8 shadow-lg">
              
              {/* User Input */}
              <div className="mb-6">
                <div className="bg-gray-50 dark:bg-gray-800 px-6 py-4 rounded-xl border border-gray-200 dark:border-gray-600">
                  <div className="flex items-center gap-3">
                    <p className="text-xl text-gray-900 dark:text-white font-medium italic">
                      "I can't sleep, maybe too much coffee at night or phone usage?"
                    </p>
                  </div>
                </div>
              </div>

              {/* Flow to Analysis */}
              <div className="flex items-center gap-4 mb-6">
                <div className="text-3xl text-gray-500">↓</div>
                <div className="flex-1 bg-gray-50 dark:bg-gray-800 px-6 py-4 rounded-xl border border-gray-200 dark:border-gray-600">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-lg font-semibold text-gray-900 dark:text-white">AI identifies 2 possible causes:</span>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <div className="bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-4 py-2 rounded-lg font-medium">
                      Caffeine effects
                    </div>
                    <span className="text-xl text-gray-600 dark:text-gray-400 self-center">+</span>
                    <div className="bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-4 py-2 rounded-lg font-medium">
                      Screen stimulation
                    </div>
                  </div>
                </div>
              </div>

              {/* Flow to Results */}
              <div className="flex items-center gap-4">
                <div className="text-3xl text-gray-500">↓</div>
                <div className="flex-1 bg-gray-50 dark:bg-gray-800 px-6 py-4 rounded-xl border border-gray-200 dark:border-gray-600">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-lg font-semibold text-gray-900 dark:text-white">Smart, targeted solutions:</span>
                  </div>
                  <div className="grid grid-cols-2 gap-6 mb-4">
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
                      <p className="font-semibold text-gray-800 dark:text-gray-200 mb-2">For Caffeine:</p>
                      <div className="text-gray-600 dark:text-gray-400 space-y-1">
                        <p>• Sleep trackers</p>
                        <p>• Caffeine timers</p>
                      </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
                      <p className="font-semibold text-gray-800 dark:text-gray-200 mb-2">For Screen Time:</p>
                      <div className="text-gray-600 dark:text-gray-400 space-y-1">
                        <p>• Blue light filters</p>
                        <p>• App blockers</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
                    <p className="font-semibold text-gray-800 dark:text-gray-200 mb-2">Plus Sleep Aids:</p>
                    <p className="text-gray-600 dark:text-gray-400">Meditation apps • Sleep sounds • Relaxation guides</p>
                  </div>
                </div>
              </div>

              {/* AI Strategy */}
              <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-600">
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                  <p className="text-sm font-semibold text-blue-800 dark:text-blue-200 mb-2">
                    Search Strategy:
                  </p>
                  <p className="text-sm text-blue-700 dark:text-blue-300 leading-relaxed">
                    Prioritize 'sleep' and 'insomnia' to find apps directly addressing the problem. Combine these with solution keywords like 'sleep tracker', 'sleep sounds', and 'meditation' to find apps with specific features. Use 'caffeine' and 'phone usage' to find apps that help manage these potential causes, like screen time trackers or apps that offer caffeine tracking features.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main App Image */}
        <div className="max-w-6xl mx-auto">
          <img 
            src="/caffeine.png" 
            alt="App swipe interface showing caffeine tracking apps" 
            className="w-full rounded-lg shadow-xl"
          />
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