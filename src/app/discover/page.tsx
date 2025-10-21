'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Search, Bell, ChevronLeft, ChevronRight } from 'lucide-react';
import AppCard from '@/components/ui/AppCard';
import { useAuth } from '@/lib/auth/auth-context';

interface App {
  id: string;
  name: string;
  category: string;
  icon: string;
}

export default function DiscoverPage() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [apps, setApps] = useState<App[]>([]);

  useEffect(() => {
    const fetchApps = async () => {
      // Get user profile from localStorage
      const profileData = localStorage.getItem('userProfile');
      if (profileData) {
        const profile = JSON.parse(profileData);
        setUserProfile(profile);

        // Fetch apps from API
        try {
          const response = await fetch('/api/search', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              lifestyle: profile.lifestyle,
              intent: profile.intent,
              wishText: profile.wishText,
              sessionId: generateSessionId()
            }),
          });

          const data = await response.json();
          
          if (data.success && data.apps) {
            const formattedApps: App[] = data.apps.map((app: any) => ({
              id: app.id,
              name: app.name,
              category: app.primary_category || 'General',
              icon: app.icon_url_512 || 'https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=200&h=200&fit=crop&crop=center'
            }));
            setApps(formattedApps);
          } else {
            console.error('Search failed:', data.error);
            // Fallback to empty array
            setApps([]);
          }
        } catch (error) {
          console.error('Search error:', error);
          // Fallback to empty array
          setApps([]);
        }
      } else {
        // Redirect back to home if no profile
        router.push('/');
        return;
      }
      
      setLoading(false);
    };

    fetchApps();
  }, [router]);

  const generateSessionId = () => {
    let sessionId = localStorage.getItem('sessionId');
    if (!sessionId) {
      sessionId = Math.random().toString(36).substring(7) + Date.now().toString(36);
      localStorage.setItem('sessionId', sessionId);
    }
    return sessionId;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-light">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen w-full flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 w-full bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-sm">
        <div className="container mx-auto flex items-center justify-between whitespace-nowrap px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-3 text-gray-800 dark:text-white">
              <svg className="h-8 w-8 text-primary" fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                <path d="M44 11.2727C44 14.0109 39.8386 16.3957 33.69 17.6364C39.8386 18.877 44 21.2618 44 24C44 26.7382 39.8386 29.123 33.69 30.3636C39.8386 31.6043 44 33.9891 44 36.7273C44 40.7439 35.0457 44 24 44C12.9543 44 4 40.7439 4 36.7273C4 33.9891 8.16144 31.6043 14.31 30.3636C8.16144 29.123 4 26.7382 4 24C4 21.2618 8.16144 18.877 14.31 17.6364C8.16144 16.3957 4 14.0109 4 11.2727C4 7.25611 12.9543 4 24 4C35.0457 4 44 7.25611 44 11.2727Z" fill="currentColor"></path>
              </svg>
              <h2 className="text-xl font-bold">App4Me</h2>
            </div>
            <nav className="hidden items-center gap-6 md:flex lg:gap-8">
              <a className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-primary transition-colors" href="#">For You</a>
              <a className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-primary transition-colors" href="#">Top Charts</a>
              <a className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-primary transition-colors" href="#">Categories</a>
              <a className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-primary transition-colors" href="#">Editors&apos; Choice</a>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative hidden sm:block">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Search className="text-gray-400 dark:text-gray-500" size={20} />
              </div>
              <input 
                className="form-input w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg border-gray-200 dark:border-gray-700 bg-background-light dark:bg-background-dark text-gray-800 dark:text-gray-200 focus:border-primary focus:ring-primary h-10 placeholder:text-gray-400 dark:placeholder:text-gray-500 pl-10 pr-4 text-sm font-normal" 
                placeholder="Search apps..." 
              />
            </div>
            {user ? (
              <>
                <button className="flex h-10 w-10 cursor-pointer items-center justify-center overflow-hidden rounded-lg bg-background-light dark:bg-background-dark text-gray-500 dark:text-gray-400 hover:bg-primary/10 hover:text-primary dark:hover:bg-primary/20">
                  <Bell size={20} />
                </button>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-600 hidden sm:block">
                    {user.user_metadata?.first_name || user.email}
                  </span>
                  <button 
                    onClick={() => signOut()}
                    className="text-sm text-gray-600 hover:text-primary"
                  >
                    Sign Out
                  </button>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-3">
                <Link href="/auth/signin">
                  <button className="text-sm font-medium text-gray-600 hover:text-primary">
                    Sign In
                  </button>
                </Link>
                <Link href="/auth/signup">
                  <button className="flex h-10 items-center justify-center rounded-lg px-4 bg-primary text-white text-sm font-bold hover:bg-primary/90">
                    Sign Up
                  </button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          {/* Breadcrumb */}
          <div className="mb-6 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <a className="hover:text-primary" href="#" onClick={() => router.push('/')}>App4Me</a>
            <span>/</span>
            <span className="font-medium text-gray-700 dark:text-gray-200">Results</span>
          </div>

          {/* Title and Filters */}
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
            Apps for your lifestyle
          </h1>
          
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {userProfile?.lifestyle.map((lifestyle: string) => (
              <div key={lifestyle} className="flex items-center gap-x-2 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary dark:bg-primary/20">
                Lifestyle: {lifestyle.charAt(0).toUpperCase() + lifestyle.slice(1)}
              </div>
            ))}
            {userProfile?.intent && (
              <div className="flex items-center gap-x-2 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary dark:bg-primary/20">
                Intent: {userProfile.intent}
              </div>
            )}
            <div className="flex items-center gap-x-2 rounded-full bg-gray-200 dark:bg-gray-700 px-3 py-1 text-sm font-medium text-gray-700 dark:text-gray-200">
              Sort: Relevance
            </div>
          </div>

          {/* Apps Grid */}
          <div className="mt-8 grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 xl:gap-x-8">
            {apps.map((app) => (
              <AppCard 
                key={app.id}
                name={app.name}
                category={app.category}
                icon={app.icon}
                onClick={() => {
                  // Handle app click - could open app store or show details
                  console.log('Clicked app:', app.name);
                }}
              />
            ))}
          </div>

          {/* Pagination */}
          <nav aria-label="Pagination" className="mt-12 flex items-center justify-center gap-2">
            <a className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-gray-500 dark:text-gray-400 hover:bg-primary/10 dark:hover:bg-primary/20 hover:text-primary" href="#">
              <span className="sr-only">Previous</span>
              <ChevronLeft size={20} />
            </a>
            <a aria-current="page" className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-bold text-white" href="#">1</a>
            <a className="inline-flex h-10 w-10 items-center justify-center rounded-full text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-primary/10 dark:hover:bg-primary/20 hover:text-primary" href="#">2</a>
            <a className="hidden h-10 w-10 items-center justify-center rounded-full text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-primary/10 dark:hover:bg-primary/20 hover:text-primary sm:inline-flex" href="#">3</a>
            <a className="hidden h-10 w-10 items-center justify-center rounded-full text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-primary/10 dark:hover:bg-primary/20 hover:text-primary sm:inline-flex" href="#">4</a>
            <a className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-gray-500 dark:text-gray-400 hover:bg-primary/10 dark:hover:bg-primary/20 hover:text-primary" href="#">
              <span className="sr-only">Next</span>
              <ChevronRight size={20} />
            </a>
          </nav>
        </div>
      </main>
    </div>
  );
}