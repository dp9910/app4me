'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth/auth-context';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface App {
  id: string;
  name: string;
  artist: string;
  category: string;
  icon: string;
  url: string;
  rating: number;
  description: string;
  rank: number;
  price: string;
}

export default function HomePage() {
  const { user, loading, hasCompletedPersonalization, checkingPersonalization } = useAuth();
  const router = useRouter();
  const [userName, setUserName] = useState('');
  const [apps, setApps] = useState<{ [key: string]: App[] }>({});
  const [topWeeklyApps, setTopWeeklyApps] = useState<App[]>([]);
  const [appsLoading, setAppsLoading] = useState(true);
  const [topWeeklyAppsLoading, setTopWeeklyAppsLoading] = useState(true);
  const [appsError, setAppsError] = useState<string | null>(null);
  const [topWeeklyAppsError, setTopWeeklyAppsError] = useState<string | null>(null);
  const [categoryPages, setCategoryPages] = useState<{ [key: string]: number }>({});

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/signin');
    } else if (user) {
      // Get user name from metadata or email
      const name = user.user_metadata?.full_name || 
                   user.user_metadata?.name || 
                   user.email?.split('@')[0] || 
                   'User';
      setUserName(name);
    }
  }, [user, loading, router]);


  // Check personalization status and redirect if needed (higher priority, faster redirect)
  useEffect(() => {
    if (user && hasCompletedPersonalization === false && !checkingPersonalization) {
      console.log('Redirecting to personalization - user needs to complete setup');
      router.push('/personalize');
    }
  }, [user, hasCompletedPersonalization, checkingPersonalization, router]);

  // Fetch top apps data
  useEffect(() => {
    if (!user) {
      return;
    }

    const userCacheKey = `cachedApps_${user.id}`;

    const fetchTopApps = async () => {
      try {
        console.log('Starting fetchTopApps...');
        const cachedApps = sessionStorage.getItem(userCacheKey);
        if (cachedApps) {
          console.log('Found cached apps, using them');
          const cachedAppsData = JSON.parse(cachedApps);
          setApps(cachedAppsData);
          
          // Initialize pagination for cached data
          const initialPages: { [key: string]: number } = {};
          Object.keys(cachedAppsData).forEach(category => {
            initialPages[category] = 0;
          });
          setCategoryPages(initialPages);
          
          setAppsLoading(false);
          return;
        }

        console.log('No cached apps, fetching from API...');
        setAppsLoading(true);
        setAppsError(null);
        
        const { data: { session } } = await (await import('@/lib/supabase/client')).supabase.auth.getSession();
        console.log('Session:', session ? 'exists' : 'missing');

        if (!session) {
          console.log('No session found');
          setAppsError("You must be logged in to see personalized apps.");
          setAppsLoading(false);
          return;
        }

        console.log('Making API call to /api/personalized-apps...');
        const response = await fetch('/api/personalized-apps', {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        });
        console.log('API response status:', response.status);
        const result = await response.json();
        console.log('Full API response:', result);
        
        if (result.success) {
          console.log('API response data:', result.data);
          console.log('Is result.data an array?', Array.isArray(result.data));
          console.log('Number of apps:', result.data?.length);
          
          // Group apps by category if we have a flat array
          if (Array.isArray(result.data)) {
            const groupedApps = result.data.reduce((acc, app) => {
              const category = app.searchCategory || app.category || 'Other';
              if (!acc[category]) {
                acc[category] = [];
              }
              acc[category].push(app);
              return acc;
            }, {});
            console.log('Grouped apps by category:', groupedApps);
            setApps(groupedApps);
            
            // Initialize pagination for each category
            const initialPages: { [key: string]: number } = {};
            Object.keys(groupedApps).forEach(category => {
              initialPages[category] = 0;
            });
            setCategoryPages(initialPages);
            
            sessionStorage.setItem(userCacheKey, JSON.stringify(groupedApps));
          } else {
            setApps(result.data);
            sessionStorage.setItem(userCacheKey, JSON.stringify(result.data));
          }
        } else {
          console.log('API error:', result.error);
          setAppsError(result.error || 'Failed to load apps');
        }
      } catch (error) {
        console.error('Error fetching apps:', error);
        setAppsError('Failed to load apps');
      } finally {
        setAppsLoading(false);
      }
    };

    fetchTopApps();
  }, [user]);

  // Navigation handlers for category pagination
  const handleCategoryPrevious = (category: string) => {
    setCategoryPages(prev => ({
      ...prev,
      [category]: Math.max(0, (prev[category] || 0) - 1)
    }));
  };

  const handleCategoryNext = (category: string) => {
    const currentPage = categoryPages[category] || 0;
    const categoryApps = apps[category] || [];
    const maxPage = Math.ceil(categoryApps.length / 8) - 1;
    
    setCategoryPages(prev => ({
      ...prev,
      [category]: Math.min(maxPage, currentPage + 1)
    }));
  };

  // Fetch top weekly apps data
  useEffect(() => {
    const fetchTopWeeklyApps = async () => {
      try {
        const cachedApps = sessionStorage.getItem('cachedTopWeeklyApps');
        if (cachedApps) {
          setTopWeeklyApps(JSON.parse(cachedApps));
          setTopWeeklyAppsLoading(false);
          return;
        }

        setTopWeeklyAppsLoading(true);
        setTopWeeklyAppsError(null);
        
        const response = await fetch('/api/top-weekly-apps');
        const result = await response.json();
        
        if (result.success) {
          setTopWeeklyApps(result.data);
          sessionStorage.setItem('cachedTopWeeklyApps', JSON.stringify(result.data));
        } else {
          setTopWeeklyAppsError(result.error || 'Failed to load top weekly apps');
        }
      } catch (error) {
        console.error('Error fetching top weekly apps:', error);
        setTopWeeklyAppsError('Failed to load top weekly apps');
      } finally {
        setTopWeeklyAppsLoading(false);
      }
    };

    fetchTopWeeklyApps();
  }, []);

  if (loading || checkingPersonalization) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-primary">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect to signin
  }

  // Show loading while checking personalization to prevent flicker
  if (checkingPersonalization || hasCompletedPersonalization === null) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-primary">Loading...</div>
      </div>
    );
  }

  if (hasCompletedPersonalization === false) {
    return null; // Will redirect to personalize
  }

  return (
    <div className="relative flex h-auto min-h-screen w-full flex-col">
      <div className="flex h-full w-full">
        {/* Sidebar Navigation */}
        <aside className="w-64 flex-shrink-0 border-r border-gray-200/10 dark:border-white/10 hidden lg:flex flex-col">
          <div className="flex h-full flex-col justify-between bg-background-light dark:bg-[#111c22] p-4">
            <div className="flex flex-col gap-6">
              <div className="flex items-center gap-3 p-2 text-white">
                <div className="size-6 text-primary">
                  <svg fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                    <path clipRule="evenodd" d="M12.0799 24L4 19.2479L9.95537 8.75216L18.04 13.4961L18.0446 4H29.9554L29.96 13.4961L38.0446 8.75216L44 19.2479L35.92 24L44 28.7521L38.0446 39.2479L29.96 34.5039L29.9554 44H18.0446L18.04 34.5039L9.95537 39.2479L4 28.7521L12.0799 24Z" fill="currentColor" fillRule="evenodd"></path>
                  </svg>
                </div>
                <h2 className="text-gray-900 dark:text-white text-lg font-bold leading-tight tracking-[-0.015em]">AppDiscovery AI</h2>
              </div>
              
              {/* Navigation Links */}
              <div className="flex flex-col gap-2">
                <Link href="/home" className="flex items-center gap-3 px-3 py-2 rounded-lg bg-primary/10 text-primary">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"/>
                  </svg>
                  <p className="text-sm font-medium leading-normal">Home</p>
                </Link>
              </div>
            </div>
            
            {/* Bottom Section */}
            <div className="flex flex-col gap-1">
              <Link href="/profile" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-500/10 text-gray-600 dark:text-gray-300">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"/>
                </svg>
                <p className="text-sm font-medium leading-normal">Profile</p>
              </Link>
              
              <Link href="/settings" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-500/10 text-gray-600 dark:text-gray-300">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd"/>
                </svg>
                <p className="text-sm font-medium leading-normal">Settings</p>
              </Link>
              
              <Link href="/help" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-500/10 text-gray-600 dark:text-gray-300">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd"/>
                </svg>
                <p className="text-sm font-medium leading-normal">Help</p>
              </Link>
              
              {/* User Profile */}
              <div className="flex items-center gap-3 mt-4 p-2">
                <div className="bg-primary/20 rounded-full size-10 flex items-center justify-center">
                  <span className="text-primary font-bold text-lg">
                    {userName.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex flex-col">
                  <h1 className="text-gray-900 dark:text-white text-base font-medium leading-normal">{userName}</h1>
                  <p className="text-gray-500 dark:text-gray-400 text-sm font-normal leading-normal">{user.email}</p>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col">
          {/* Mobile Header */}
          <header className="flex items-center justify-between whitespace-nowrap border-b border-solid border-gray-200/10 dark:border-white/10 px-6 py-4 lg:hidden">
            <div className="flex items-center gap-4 text-white">
              <div className="size-6 text-primary">
                <svg fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                  <path clipRule="evenodd" d="M12.0799 24L4 19.2479L9.95537 8.75216L18.04 13.4961L18.0446 4H29.9554L29.96 13.4961L38.0446 8.75216L44 19.2479L35.92 24L44 28.7521L38.0446 39.2479L29.96 34.5039L29.9554 44H18.0446L18.04 34.5039L9.95537 39.2479L4 28.7521L12.0799 24Z" fill="currentColor" fillRule="evenodd"></path>
                </svg>
              </div>
              <h2 className="text-gray-900 dark:text-white text-lg font-bold leading-tight tracking-[-0.015em]">AppDiscovery AI</h2>
            </div>
            <button className="flex cursor-pointer items-center justify-center overflow-hidden rounded-xl h-10 bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-white gap-2 text-sm font-bold leading-normal tracking-[0.015em] min-w-0 px-2.5">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd"/>
              </svg>
            </button>
          </header>

          {/* Page Content */}
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-10 py-8">
            <div className="max-w-7xl mx-auto flex flex-col gap-8">
              {/* Page Heading & Search */}
              <div className="flex flex-col gap-6">
                <div className="flex flex-wrap justify-between gap-3">
                  <div className="flex min-w-72 flex-col gap-2">
                    <p className="text-gray-900 dark:text-white text-4xl font-black leading-tight tracking-[-0.033em]">
                      Welcome back, {userName}!
                    </p>
                    <p className="text-gray-500 dark:text-gray-400 text-base font-normal leading-normal">
                      Discover your next favorite app.
                    </p>
                  </div>
                </div>
                
                {/* Search Bar */}
                <div>
                  <label className="flex flex-col min-w-40 h-14 w-full">
                    <div className="flex w-full flex-1 items-stretch rounded-xl h-full shadow-sm">
                      <div className="text-gray-500 dark:text-gray-400 flex border-y border-l border-gray-200 dark:border-white/10 bg-background-light dark:bg-[#233c48] items-center justify-center pl-4 rounded-l-xl">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd"/>
                        </svg>
                      </div>
                      <input 
                        className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-r-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary border-y border-r border-gray-200 dark:border-white/10 bg-background-light dark:bg-[#233c48] h-full placeholder:text-gray-500 dark:placeholder:text-gray-400 px-4 text-base font-normal leading-normal" 
                        placeholder="Search for an app or describe what you need..." 
                      />
                    </div>
                  </label>
                </div>
              </div>

              {/* App Sections - Organized by Category */}
              <div className="flex flex-col gap-10">
                {appsLoading ? (
                  // Loading state
                  <section>
                    <div className="flex justify-between items-center px-4 pb-3 pt-5">
                      <h2 className="text-gray-900 dark:text-white text-[22px] font-bold leading-tight tracking-[-0.015em]">
                        Loading your personalized apps...
                      </h2>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                      {Array.from({ length: 8 }).map((_, index) => (
                        <div key={index} className="flex flex-col gap-4 rounded-xl border border-gray-200/80 dark:border-white/10 bg-background-light dark:bg-[#111c22] p-4 animate-pulse">
                          <div className="flex items-start justify-between">
                            <div className="bg-gray-300 dark:bg-gray-600 rounded-lg size-12"></div>
                            <div className="bg-gray-300 dark:bg-gray-600 rounded h-4 w-12"></div>
                          </div>
                          <div className="flex flex-col gap-2">
                            <div className="bg-gray-300 dark:bg-gray-600 rounded h-4 w-24"></div>
                            <div className="bg-gray-300 dark:bg-gray-600 rounded h-3 w-32"></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                ) : appsError ? (
                  // Error state
                  <section>
                    <div className="col-span-full flex flex-col items-center justify-center py-12 text-center">
                      <div className="text-red-500 mb-2">
                        <svg className="w-12 h-12 mx-auto" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
                        </svg>
                      </div>
                      <h3 className="text-gray-900 dark:text-white text-lg font-medium mb-1">Failed to load apps</h3>
                      <p className="text-gray-500 dark:text-gray-400 text-sm">{appsError}</p>
                    </div>
                  </section>
                ) : (
                  // Apps organized by category
                  Object.entries(apps).map(([category, categoryApps]) => {
                    const currentPage = categoryPages[category] || 0;
                    const startIndex = currentPage * 8;
                    const endIndex = startIndex + 8;
                    const totalPages = Math.ceil(categoryApps.length / 8);
                    const canGoPrevious = currentPage > 0;
                    const canGoNext = currentPage < totalPages - 1;
                    
                    return (
                      <section key={category}>
                        <div className="flex justify-between items-center px-4 pb-3 pt-5">
                          <h2 className="text-gray-900 dark:text-white text-[22px] font-bold leading-tight tracking-[-0.015em] capitalize">
                            {category.charAt(0).toUpperCase() + category.slice(1)} Apps ({currentPage + 1}/{totalPages})
                          </h2>
                          <div className="flex gap-2">
                            <button 
                              onClick={() => handleCategoryPrevious(category)}
                              disabled={!canGoPrevious}
                              className="p-2 rounded-full bg-gray-200/80 dark:bg-gray-800/80 hover:bg-gray-300 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd"/>
                              </svg>
                            </button>
                            <button 
                              onClick={() => handleCategoryNext(category)}
                              disabled={!canGoNext}
                              className="p-2 rounded-full bg-gray-200/80 dark:bg-gray-800/80 hover:bg-gray-300 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd"/>
                              </svg>
                            </button>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                          {(Array.isArray(categoryApps) ? categoryApps : []).slice(startIndex, endIndex).map((app) => (
                          <a href={app.url} target="_blank" rel="noopener noreferrer" key={app.id} className="group flex flex-col gap-4 rounded-xl border border-gray-200/80 dark:border-white/10 bg-background-light dark:bg-[#111c22] p-4 transition-all hover:shadow-lg hover:-translate-y-1">
                            <div className="flex items-start justify-between">
                              <div className="bg-center bg-no-repeat aspect-square bg-cover rounded-xl w-20 h-20" style={{backgroundImage: `url("${app.icon}")`}}></div>
                              <div className="flex items-center gap-1 text-gray-600 dark:text-gray-300">
                                <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                                </svg>
                                <span className="text-sm font-medium">{app.rating}</span>
                              </div>
                            </div>
                            <div className="flex flex-col gap-1">
                              <h3 className="text-gray-900 dark:text-white text-base font-medium leading-normal truncate">{app.name}</h3>
                              <p className="text-gray-500 dark:text-gray-400 text-sm font-normal leading-normal">{app.category}</p>
                              <p className="text-xs font-mono leading-normal text-gray-400 dark:text-gray-500 pt-1">Sourced from iTunes</p>
                            </div>
                            <div className="flex items-center justify-between mt-auto">
                              <span className="text-xs font-medium text-green-600 dark:text-green-400">{app.price}</span>
                            </div>
                          </a>
                        ))}
                      </div>
                    </section>
                    );
                  })
                )}

                {/* Top Apps This Week */}
                <section>
                  <div className="flex justify-between items-center px-4 pb-3 pt-5">
                    <h2 className="text-gray-900 dark:text-white text-[22px] font-bold leading-tight tracking-[-0.015em]">
                      Top Apps This Week
                    </h2>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {topWeeklyAppsLoading ? (
                      // Loading state
                      Array.from({ length: 8 }).map((_, index) => (
                        <div key={index} className="flex flex-col gap-4 rounded-xl border border-gray-200/80 dark:border-white/10 bg-background-light dark:bg-[#111c22] p-4 animate-pulse">
                          <div className="flex items-start justify-between">
                            <div className="bg-gray-300 dark:bg-gray-600 rounded-lg size-12"></div>
                            <div className="bg-gray-300 dark:bg-gray-600 rounded h-4 w-12"></div>
                          </div>
                          <div className="flex flex-col gap-2">
                            <div className="bg-gray-300 dark:bg-gray-600 rounded h-4 w-24"></div>
                            <div className="bg-gray-300 dark:bg-gray-600 rounded h-3 w-32"></div>
                          </div>
                        </div>
                      ))
                    ) : topWeeklyAppsError ? (
                      // Error state
                      <div className="col-span-full flex flex-col items-center justify-center py-12 text-center">
                        <div className="text-red-500 mb-2">
                          <svg className="w-12 h-12 mx-auto" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
                          </svg>
                        </div>
                        <h3 className="text-gray-900 dark:text-white text-lg font-medium mb-1">Failed to load apps</h3>
                        <p className="text-gray-500 dark:text-gray-400 text-sm">{topWeeklyAppsError}</p>
                      </div>
                    ) : (
                      // Real app data
                      topWeeklyApps.slice(0, 8).map((app) => (
                        <a href={app.url} target="_blank" rel="noopener noreferrer" key={app.id} className="group flex flex-col gap-4 rounded-xl border border-gray-200/80 dark:border-white/10 bg-background-light dark:bg-[#111c22] p-4 transition-all hover:shadow-lg hover:-translate-y-1">
                          <div className="flex items-start justify-between">
                            <div className="bg-center bg-no-repeat aspect-square bg-cover rounded-xl w-20 h-20" style={{backgroundImage: `url("${app.icon}")`}}></div>
                            <div className="flex items-center gap-1 text-gray-600 dark:text-gray-300">
                              <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                              </svg>
                              <span className="text-sm font-medium">{app.rating}</span>
                            </div>
                          </div>
                          <div className="flex flex-col gap-1">
                            <h3 className="text-gray-900 dark:text-white text-base font-medium leading-normal truncate">{app.name}</h3>
                            <p className="text-gray-500 dark:text-gray-400 text-sm font-normal leading-normal">{app.category}</p>
                          </div>
                          <div className="flex items-center justify-between mt-auto">
                            <span className="text-xs font-medium text-green-600 dark:text-green-400">{app.price}</span>
                          </div>
                        </a>
                      ))
                    )}
                  </div>
                </section>
              </div>
            </div>
          </div>

          {/* Footer */}
          <footer className="border-t border-gray-200/10 dark:border-white/10 px-4 sm:px-6 lg:px-10 py-6">
            <div className="max-w-7xl mx-auto flex justify-between items-center text-sm text-gray-500 dark:text-gray-400">
              <p>© 2024 AppDiscovery AI. All rights reserved.</p>
              <div className="flex gap-6">
                <Link href="/about" className="hover:text-primary">About Us</Link>
                <Link href="/help" className="hover:text-primary">Help Center</Link>
                <Link href="/terms" className="hover:text-primary">Terms of Service</Link>
              </div>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
}