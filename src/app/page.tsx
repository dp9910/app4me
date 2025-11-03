'use client';

import { useRouter } from 'next/navigation';
import SwipeCard from '../components/ui/SwipeCard';

export default function HomePage() {
  const router = useRouter();

  return (
    <div className="relative flex min-h-screen w-full flex-col items-center overflow-x-hidden p-4 sm:p-6 md:p-8">
      <div className="absolute top-4 right-4 z-20 flex gap-4">
        <a href="/auth/signin" className="flex min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-12 px-5 bg-gray-500/10 text-gray-800 dark:text-white text-base font-bold leading-normal tracking-wide transition-colors hover:bg-gray-500/20">
          <span className="truncate">Sign In</span>
        </a>
        <a href="/auth/signup" className="flex min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-12 px-5 bg-primary text-white text-base font-bold leading-normal tracking-wide transition-colors hover:bg-primary/80">
          <span className="truncate">Sign Up</span>
        </a>
      </div>
      {/* Subtle Background Element */}
      <div className="absolute inset-0 z-0 opacity-20">
        <div className="absolute bottom-0 left-[-20%] top-[-10%] h-[500px] w-[500px] rounded-full bg-primary/20 blur-[120px]"></div>
        <div className="absolute right-[-20%] top-[-10%] h-[500px] w-[500px] rounded-full bg-purple-500/20 blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[10%] h-[400px] w-[600px] rounded-full bg-teal-500/10 blur-[100px]"></div>
      </div>
      
      <div className="relative z-10 flex w-full max-w-6xl flex-col items-center">
        <main className="flex w-full flex-1 flex-col items-center justify-center py-12 sm:py-16 md:py-20">
          <div className="w-full max-w-6xl">
            {/* Hero/Headline Section */}
            <div className="flex flex-col gap-3 text-center mb-10">
              <h1 className="text-4xl font-black leading-tight tracking-tighter text-gray-900 dark:text-white sm:text-5xl md:text-6xl">
                The new way of app discovery
              </h1>
              <p className="text-base font-normal leading-normal text-gray-600 dark:text-gray-400 sm:text-lg">
                Search apps in plain english powered by AI.
              </p>
            </div>

            {/* Search Query Example */}
            <div className="flex flex-col items-center gap-2 mb-10">
              <p className="text-lg font-medium text-gray-600 dark:text-gray-400 line-through">
                budgeting apps
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                apps to help me stop overspending
              </p>
            </div>
            
            {/* Image Section */}
            <div className="flex flex-col items-center gap-6 w-full">
              <img src="/ui_image.png" alt="App Screenshot" className="w-full h-auto rounded-xl shadow-2xl shadow-black/20" />
            </div>

            {/* Dashboard Customization Section */}
            <div className="flex flex-col items-center gap-10 w-full mt-20">
              <div className="text-center">
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Your Personal App Dashboard</h2>
                <p className="text-lg text-gray-600 dark:text-gray-400 mt-2">Your personal app dashboard. Curated iOS apps based on your interests. No personal data collected. Interact with apps by liking or marking them as downloaded.</p>
              </div>
              <img src="/dashboard.png" alt="Dashboard Screenshot" className="w-full h-[600px] rounded-xl shadow-2xl shadow-black/20" />
            </div>

            {/* App Personalization Section */}
            <div className="flex flex-col items-center gap-10 w-full mt-20">
              <div className="text-center">
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Personalize Your App Search</h2>
                <p className="text-lg text-gray-600 dark:text-gray-400 mt-2">Keep track of your searches, discovered apps, and your likes and dislikes.</p>
              </div>
              <img src="/app_like.png" alt="App Personalization Screenshot" className="w-full rounded-xl shadow-2xl shadow-black/20" />
            </div>

            {/* App Spotlight Section */}
            <div className="flex flex-col items-center gap-10 w-full mt-20">
              <div className="text-center">
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white">App Spotlight</h2>
                <p className="text-lg text-gray-600 dark:text-gray-400 mt-2">See a detailed breakdown of any app.</p>
              </div>
              <img src="/app_spotlight.png" alt="App Spotlight Screenshot" className="w-full rounded-xl shadow-2xl shadow-black/20" />
            </div>
          </div>

          
        </main>
      </div>
    </div>
  )
}