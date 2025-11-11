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
          <div className="flex items-center gap-3">
            <img 
              src="/logo.png" 
              alt="app4me Logo" 
              className="h-10 w-auto"
            />
            <span className="text-xl font-semibold text-gray-900 dark:text-white">app4me</span>
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950 dark:to-emerald-900 p-6 rounded-2xl border border-emerald-200 dark:border-emerald-800 shadow-sm">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                        <p className="font-semibold text-emerald-900 dark:text-emerald-100">Caffeine Management</p>
                      </div>
                      <div className="space-y-3">
                        <div className="bg-white/80 dark:bg-emerald-800/30 px-4 py-3 rounded-xl border border-emerald-200/50 dark:border-emerald-700/50">
                          <span className="text-emerald-800 dark:text-emerald-200 font-medium">Caffeine Clock: Track Caffeine</span>
                        </div>
                        <div className="bg-white/80 dark:bg-emerald-800/30 px-4 py-3 rounded-xl border border-emerald-200/50 dark:border-emerald-700/50">
                          <span className="text-emerald-800 dark:text-emerald-200 font-medium">Caffeine Dose</span>
                        </div>
                        <div className="bg-white/80 dark:bg-emerald-800/30 px-4 py-3 rounded-xl border border-emerald-200/50 dark:border-emerald-700/50">
                          <span className="text-emerald-800 dark:text-emerald-200 font-medium">Decaf AI: Caffeine Tracker</span>
                        </div>
                      </div>
                    </div>
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 p-6 rounded-2xl border border-blue-200 dark:border-blue-800 shadow-sm">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                        <p className="font-semibold text-blue-900 dark:text-blue-100">Screen Time Control</p>
                      </div>
                      <div className="space-y-3">
                        <div className="bg-white/80 dark:bg-blue-800/30 px-4 py-3 rounded-xl border border-blue-200/50 dark:border-blue-700/50">
                          <span className="text-blue-800 dark:text-blue-200 font-medium">Free Time: Mindful Screen Time</span>
                        </div>
                        <div className="bg-white/80 dark:bg-blue-800/30 px-4 py-3 rounded-xl border border-blue-200/50 dark:border-blue-700/50">
                          <span className="text-blue-800 dark:text-blue-200 font-medium">FlowIn - Screen Time Control</span>
                        </div>
                        <div className="bg-white/80 dark:bg-blue-800/30 px-4 py-3 rounded-xl border border-blue-200/50 dark:border-blue-700/50">
                          <span className="text-blue-800 dark:text-blue-200 font-medium">Steptime - Screen Time Control</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-violet-50 to-violet-100 dark:from-violet-950 dark:to-violet-900 p-6 rounded-2xl border border-violet-200 dark:border-violet-800 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-3 h-3 bg-violet-500 rounded-full"></div>
                      <p className="font-semibold text-violet-900 dark:text-violet-100">Direct Sleep Solutions</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="bg-white/80 dark:bg-violet-800/30 px-4 py-3 rounded-xl border border-violet-200/50 dark:border-violet-700/50">
                        <span className="text-violet-800 dark:text-violet-200 font-medium">Yoga Nidra: Sleep Soundly</span>
                      </div>
                      <div className="bg-white/80 dark:bg-violet-800/30 px-4 py-3 rounded-xl border border-violet-200/50 dark:border-violet-700/50">
                        <span className="text-violet-800 dark:text-violet-200 font-medium">Sleep Sounds by Sleep Pillow</span>
                      </div>
                      <div className="bg-white/80 dark:bg-violet-800/30 px-4 py-3 rounded-xl border border-violet-200/50 dark:border-violet-700/50">
                        <span className="text-violet-800 dark:text-violet-200 font-medium">Simple Habit Sleep, Meditation</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* AI Strategy */}
              <div className="mt-8 pt-6 border-t border-gray-200/30 dark:border-gray-600/30">
                <div className="bg-gradient-to-r from-slate-50 to-gray-50 dark:from-slate-900 dark:to-gray-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-2 h-2 bg-slate-400 rounded-full"></div>
                    <p className="font-semibold text-slate-800 dark:text-slate-200">
                      Search Strategy
                    </p>
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                    Prioritize 'sleep' and 'insomnia' to find apps directly addressing the problem. Combine these with solution keywords like 'sleep tracker', 'sleep sounds', and 'meditation' to find apps with specific features. Use 'caffeine' and 'phone usage' to find apps that help manage these potential causes.
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