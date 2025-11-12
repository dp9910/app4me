'use client';

import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-green-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 relative overflow-hidden">
      {/* Background blur elements */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-gradient-to-tr from-cyan-100 to-blue-200 opacity-50 blur-[100px] animate-pulse z-0"></div>
      <div className="absolute bottom-0 right-0 translate-x-1/4 translate-y-1/4 w-[500px] h-[500px] rounded-full bg-gradient-to-bl from-green-100 to-emerald-200 opacity-60 blur-[120px] animate-pulse z-0" style={{animationDelay: '-3s'}}></div>
      
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
          <div className="w-full flex flex-col items-center gap-6 mt-6 mb-16 relative">
            <div className="w-full max-w-2xl px-8 py-5 border border-slate-200/80 rounded-xl bg-white/60 backdrop-blur-lg shadow-sm transition-all duration-300 focus-within:shadow-lg focus-within:border-blue-300">
              <p className="text-slate-600 italic text-lg text-center">
                "I am a first-time homebuyer with very little experience on this process. Any apps that could help me navigate the financial side easily?"
              </p>
            </div>
            
            <details className="w-full max-w-2xl group">
              <summary className="list-none flex items-center justify-center gap-2 cursor-pointer text-slate-500 hover:text-slate-700 transition-colors">
                <span className="text-lg">🧠</span>
                <span className="font-medium">AI Insight</span>
                <span className="transform transition-transform duration-300 group-open:rotate-180">⌄</span>
              </summary>
              <div className="mt-4 overflow-hidden">
                <div className="p-5 rounded-xl bg-white/70 backdrop-blur-lg border border-slate-200/80 shadow-sm flex flex-col gap-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
                    <div className="flex flex-col gap-3 p-4 rounded-lg bg-red-50 border border-red-200/80">
                      <h4 className="font-semibold text-red-800 text-sm">Problem:</h4>
                      <div className="flex flex-wrap gap-2">
                        <span className="text-xs font-semibold text-red-700 bg-white px-2.5 py-1.5 rounded-full border border-red-200">first time homebuyer</span>
                        <span className="text-xs font-semibold text-red-700 bg-white px-2.5 py-1.5 rounded-full border border-red-200">little experience</span>
                        <span className="text-xs font-semibold text-red-700 bg-white px-2.5 py-1.5 rounded-full border border-red-200">navigate financial side</span>
                        <span className="text-xs font-semibold text-red-700 bg-white px-2.5 py-1.5 rounded-full border border-red-200">home buying</span>
                        <span className="text-xs font-semibold text-red-700 bg-white px-2.5 py-1.5 rounded-full border border-red-200">inexperienced</span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-3 p-4 rounded-lg bg-green-50 border border-green-200/80">
                      <h4 className="font-semibold text-green-800 text-sm">Solution:</h4>
                      <div className="flex flex-wrap gap-2">
                        <span className="text-xs font-semibold text-green-700 bg-white px-2.5 py-1.5 rounded-full border border-green-200">budgeting tools</span>
                        <span className="text-xs font-semibold text-green-700 bg-white px-2.5 py-1.5 rounded-full border border-green-200">mortgage calculators</span>
                        <span className="text-xs font-semibold text-green-700 bg-white px-2.5 py-1.5 rounded-full border border-green-200">real estate guides</span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-3 p-4 rounded-lg bg-yellow-50 border border-yellow-200/80">
                      <h4 className="font-semibold text-yellow-800 text-sm">Cause:</h4>
                      <div className="flex flex-wrap gap-2">
                        <span className="text-xs font-semibold text-yellow-700 bg-white px-2.5 py-1.5 rounded-full border border-yellow-200">knowledge gap</span>
                        <span className="text-xs font-semibold text-yellow-700 bg-white px-2.5 py-1.5 rounded-full border border-yellow-200">financial literacy</span>
                        <span className="text-xs font-semibold text-yellow-700 bg-white px-2.5 py-1.5 rounded-full border border-yellow-200">real estate novice</span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-3 p-4 rounded-lg bg-blue-50 border border-blue-200/80">
                      <h4 className="font-semibold text-blue-800 text-sm">Context:</h4>
                      <div className="flex flex-wrap gap-2">
                        <span className="text-xs font-semibold text-blue-700 bg-white px-2.5 py-1.5 rounded-full border border-blue-200">personal finance</span>
                        <span className="text-xs font-semibold text-blue-700 bg-white px-2.5 py-1.5 rounded-full border border-blue-200">mortgage</span>
                        <span className="text-xs font-semibold text-blue-700 bg-white px-2.5 py-1.5 rounded-full border border-blue-200">property market</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </details>
            
            <div className="text-slate-400">
              <span>↓</span>
            </div>
            
            <div className="w-full max-w-2xl p-8 border border-slate-200/80 rounded-xl shadow-sm bg-white/60 backdrop-blur-lg">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col gap-3 items-start">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🏠</span>
                    <h3 className="text-slate-700 font-semibold">Your Situation</h3>
                  </div>
                  <p className="text-slate-600 text-sm leading-relaxed text-left">
                    First-time homebuyer with limited experience navigating the financial aspects of the home buying process.
                  </p>
                </div>
                <div className="flex flex-col gap-3 items-start">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🌿</span>
                    <h3 className="text-slate-700 font-semibold">Root Cause</h3>
                  </div>
                  <p className="text-slate-600 text-sm leading-relaxed text-left">
                    Lack of knowledge and experience in personal finance, mortgage processes, and real estate transactions.
                  </p>
                </div>
              </div>
            </div>
            
            {/* Green gradient background behind solutions */}
            <div className="absolute bottom-0 left-0 right-0 h-[400px] bg-gradient-to-t from-emerald-100/40 via-green-50/30 to-transparent rounded-b-[60px] -z-10"></div>
            
            <div className="w-full max-w-2xl p-8 border border-slate-200/80 rounded-xl shadow-sm bg-white/60 backdrop-blur-lg mt-6">
              <h3 className="text-slate-700 font-semibold mb-6 text-center">Smart, targeted solutions:</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-6 rounded-xl bg-gradient-to-br from-green-50 to-emerald-100 border border-green-200/80">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-2.5 h-2.5 rounded-full bg-green-500"></div>
                    <h4 className="font-semibold text-slate-800">Budgeting & Finance Apps</h4>
                  </div>
                  <div className="flex flex-col gap-3">
                    <div className="px-4 py-2.5 bg-white border border-slate-200 rounded-lg transition-all duration-200 ease-in-out hover:shadow-lg hover:-translate-y-1 hover:border-green-300 cursor-pointer">
                      <p className="text-center text-slate-700">Mint: Budget & Expense Tracker</p>
                    </div>
                    <div className="px-4 py-2.5 bg-white border border-slate-200 rounded-lg transition-all duration-200 ease-in-out hover:shadow-lg hover:-translate-y-1 hover:border-green-300 cursor-pointer">
                      <p className="text-center text-slate-700">NerdWallet: Finance & Credit Score</p>
                    </div>
                    <div className="px-4 py-2.5 bg-white border border-slate-200 rounded-lg transition-all duration-200 ease-in-out hover:shadow-lg hover:-translate-y-1 hover:border-green-300 cursor-pointer">
                      <p className="text-center text-slate-700">Rocket Money</p>
                    </div>
                  </div>
                </div>
                <div className="p-6 rounded-xl bg-gradient-to-br from-blue-50 to-cyan-100 border border-blue-200/80">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-2.5 h-2.5 rounded-full bg-blue-500"></div>
                    <h4 className="font-semibold text-slate-800">Real Estate & Mortgage Tools</h4>
                  </div>
                  <div className="flex flex-col gap-3">
                    <div className="px-4 py-2.5 bg-white border border-slate-200 rounded-lg transition-all duration-200 ease-in-out hover:shadow-lg hover:-translate-y-1 hover:border-blue-300 cursor-pointer">
                      <p className="text-center text-slate-700">Zillow: Homes For Sale & Rent</p>
                    </div>
                    <div className="px-4 py-2.5 bg-white border border-slate-200 rounded-lg transition-all duration-200 ease-in-out hover:shadow-lg hover:-translate-y-1 hover:border-blue-300 cursor-pointer">
                      <p className="text-center text-slate-700">Redfin Homes for Sale & Rent</p>
                    </div>
                    <div className="px-4 py-2.5 bg-white border border-slate-200 rounded-lg transition-all duration-200 ease-in-out hover:shadow-lg hover:-translate-y-1 hover:border-blue-300 cursor-pointer">
                      <p className="text-center text-slate-700">Mortgage Calculator by Quicken</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Swipe Feature Description */}
        <div className="max-w-4xl mx-auto text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-light tracking-tight text-slate-900 dark:text-white mb-4">
            Swipe through personalized recommendations
          </h2>
          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            Like or dislike apps with simple swipes. Our AI learns your preferences to surface better matches over time.
          </p>
        </div>

        {/* Main App Image */}
        <div className="max-w-6xl mx-auto">
          <img 
            src="/home_buyer.png" 
            alt="App swipe interface showing home buyer apps" 
            className="w-full rounded-lg shadow-xl"
          />
        </div>
      </section>

      {/* Features */}
      <section className="px-6 py-20 bg-gradient-to-b from-emerald-50/40 via-green-50/50 to-emerald-100/60 dark:from-slate-50/5 dark:via-blue-50/10 dark:to-green-50/15 relative">
        {/* Additional gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/30 via-green-50/20 to-emerald-100/40 pointer-events-none"></div>
        
        <div className="max-w-6xl mx-auto relative z-10">
          {/* Dashboard Feature */}
          <div className="mb-32">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-light tracking-tight text-slate-900 dark:text-white mb-4">
                Personal dashboard
              </h2>
              <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
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
              <h2 className="text-3xl md:text-4xl font-light tracking-tight text-slate-900 dark:text-white mb-4">
                Track preferences
              </h2>
              <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
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
              <h2 className="text-3xl md:text-4xl font-light tracking-tight text-slate-900 dark:text-white mb-4">
                App insights
              </h2>
              <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
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
      <footer className="px-6 py-20 bg-gradient-to-t from-emerald-100/50 via-green-50/30 to-emerald-50/20">
        <div className="max-w-4xl mx-auto text-center">
          <h3 className="text-3xl md:text-4xl font-light tracking-tight text-slate-900 dark:text-white mb-4">
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