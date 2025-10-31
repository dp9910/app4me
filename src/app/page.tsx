'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();
  const [demoQuery, setDemoQuery] = useState('');
  
  const handleFindApps = () => {
    if (demoQuery.trim()) {
      // Navigate to swipe page with the query as a URL parameter
      router.push(`/swipe?demo=true&query=${encodeURIComponent(demoQuery.trim())}`);
    } else {
      // Navigate to swipe page without query for manual search
      router.push('/swipe?demo=true');
    }
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col items-center overflow-x-hidden p-4 sm:p-6 md:p-8">
      {/* Subtle Background Element */}
      <div className="absolute inset-0 z-0 opacity-20">
        <div className="absolute bottom-0 left-[-20%] top-[-10%] h-[500px] w-[500px] rounded-full bg-primary/20 blur-[120px]"></div>
        <div className="absolute right-[-20%] top-[-10%] h-[500px] w-[500px] rounded-full bg-purple-500/20 blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[10%] h-[400px] w-[600px] rounded-full bg-teal-500/10 blur-[100px]"></div>
      </div>
      
      <div className="relative z-10 flex w-full max-w-6xl flex-col items-center">
        <main className="flex w-full flex-1 flex-col items-center justify-center py-12 sm:py-16 md:py-20">
          {/* Hero/Headline Section */}
          <div className="flex flex-col gap-3 text-center mb-10 max-w-3xl">
            <h1 className="text-4xl font-black leading-tight tracking-tighter text-gray-900 dark:text-white sm:text-5xl md:text-6xl">
              The Future of App Discovery
            </h1>
            <p className="text-base font-normal leading-normal text-gray-600 dark:text-gray-400 sm:text-lg">
              Our AI curates personalized app recommendations for you. Swipe to discover your next favorite app, instantly.
            </p>
          </div>
          
          {/* Interactive App Card Section */}
          <div className="flex flex-col items-center gap-6 w-full max-w-sm">
            {/* App Card */}
            <div className="w-full rounded-xl bg-gray-50 dark:bg-[#192b33] shadow-2xl shadow-black/20 backdrop-blur-sm transition-all duration-300 ease-out hover:-translate-y-2 hover:shadow-primary/30">
              <div className="w-full bg-center bg-no-repeat aspect-video bg-cover rounded-t-xl" style={{backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuBpQVcm3RZvprgUOP7bAlmw3YUdh152UG2o6iOkdxpv5KCpqQDuowbTEEzZcBpR_WsPbMhp3sxVehbnJ5jynBoUQjNoSmxhCrBEiSctLU5RHGn6jMJJUt_Ljyv-8LOYKoWwrIYis88S2SNaTaYTe50xJPXwgmuEARZ_cEZnB4F6hSLYvn7fhN6HPUgN3I4BQQhRHkPNZMW_lsqSjqpPVPVxlSqb7MDb_iBegqApe0yHApnRaCt7xRR29G7xM6yTSKE2hT_fX02wFujo")'}}></div>
              <div className="flex w-full flex-col items-stretch justify-center gap-2 p-6">
                <div className="flex items-center gap-4">
                  <img alt="SuperList App Icon" className="h-16 w-16 rounded-xl border border-gray-200/10 dark:border-white/10 shadow-md" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCDm-6KOgR0k8HOJIZlLi42CZMJ9N7L3tFctbY5CVxeYt8ZONraW5p9plpJyngq3FDbtjyO04Bjr0Kt2bSdMypc9Uaipstpi-F9Glaxhhq0BCGFBfazBNJoI5zt4stTpAAxdlHCQ85nVthIGWOBB_cAqKcB-1KWsbDgOggKgm7eDbWUvIba0jAM1zcfrGGfs4vzad3EFfqeSM0lEjicZsSpxTv_bGdycUgobGad_1CkyeoJq2Kc8lldzTPYKZRfS5bySBzAPAU-W6A8"/>
                  <div className="flex flex-col">
                    <p className="text-2xl font-bold leading-tight tracking-tight text-gray-900 dark:text-white">SuperList</p>
                    <p className="text-sm font-normal leading-normal text-gray-500 dark:text-gray-400">AI-powered task management.</p>
                  </div>
                </div>
                <div className="mt-2">
                  <p className="text-sm font-normal leading-normal text-gray-500 dark:text-gray-400">#Productivity #AI #Collaboration</p>
                </div>
              </div>
            </div>
            
            {/* Swipe Buttons */}
            <div className="flex w-full max-w-xs gap-4">
              <button className="flex grow cursor-pointer items-center justify-center overflow-hidden rounded-full h-16 bg-white/80 dark:bg-white/10 text-red-500 shadow-lg backdrop-blur-sm transition-transform hover:scale-105">
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
              <button className="flex grow cursor-pointer items-center justify-center overflow-hidden rounded-full h-16 bg-primary text-white shadow-lg shadow-primary/30 backdrop-blur-sm transition-transform hover:scale-105">
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
          
          {/* Quick Search Section */}
          <div className="mt-12 w-full max-w-2xl">
            <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-xl">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 text-center">
                🚀 Try Our AI-Powered Search
              </h3>
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="What kind of app are you looking for? (e.g., plant care, budget tracking, meditation)"
                  value={demoQuery}
                  onChange={(e) => setDemoQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleFindApps()}
                  className="w-full h-12 px-4 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
                <button
                  onClick={handleFindApps}
                  className="w-full bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 text-white font-bold py-3 px-6 rounded-lg transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                >
                  <span className="text-xl">✨</span>
                  Find My Perfect Apps
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd"/>
                  </svg>
                </button>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 text-center mt-3">
                No signup required • Try it now
              </p>
            </div>
          </div>

          {/* Primary CTA Section */}
          <div className="mt-8 text-center">
            <p className="mb-4 text-base font-medium text-gray-700 dark:text-gray-300">Want to save your preferences?</p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <a href="/auth/signup" className="flex min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-12 px-5 bg-gray-500/10 text-gray-800 dark:text-white text-base font-bold leading-normal tracking-wide transition-colors hover:bg-gray-500/20">
                <span className="truncate">Create Account</span>
              </a>
              <a href="/results" className="flex min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-12 px-5 bg-gray-500/10 text-gray-800 dark:text-white text-base font-bold leading-normal tracking-wide transition-colors hover:bg-gray-500/20">
                <span className="truncate">Learn More</span>
              </a>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}