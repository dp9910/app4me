'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth/auth-context';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function SettingsPage() {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const [userName, setUserName] = useState('');

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

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-primary">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect to signin
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
                <Link href="/home" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-500/10 text-gray-600 dark:text-gray-300">
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
              
              <Link href="/settings" className="flex items-center gap-3 px-3 py-2 rounded-lg bg-primary/10 text-primary">
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
              <h2 className="text-gray-900 dark:text-white text-lg font-bold leading-tight tracking-[-0.015em]">Settings</h2>
            </div>
            <button className="flex cursor-pointer items-center justify-center overflow-hidden rounded-xl h-10 bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-white gap-2 text-sm font-bold leading-normal tracking-[0.015em] min-w-0 px-2.5">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd"/>
              </svg>
            </button>
          </header>

          {/* Page Content */}
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-10 py-8">
            <div className="max-w-4xl mx-auto flex flex-col gap-8">
              {/* Page Heading */}
              <div className="flex flex-col gap-4">
                <h1 className="text-gray-900 dark:text-white text-4xl font-black leading-tight tracking-[-0.033em]">
                  Settings
                </h1>
                <p className="text-gray-500 dark:text-gray-400 text-base font-normal leading-normal">
                  Manage your account and preferences.
                </p>
              </div>

              {/* Settings Sections */}
              <div className="flex flex-col gap-6">
                {/* Account Section */}
                <section className="bg-background-light dark:bg-[#111c22] rounded-xl border border-gray-200/80 dark:border-white/10 p-6">
                  <h2 className="text-gray-900 dark:text-white text-xl font-bold leading-tight mb-4">
                    Account
                  </h2>
                  
                  <div className="flex flex-col gap-4">
                    {/* User Info */}
                    <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                      <div className="bg-primary/20 rounded-full size-12 flex items-center justify-center">
                        <span className="text-primary font-bold text-xl">
                          {userName.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <h3 className="text-gray-900 dark:text-white text-lg font-medium">{userName}</h3>
                        <p className="text-gray-500 dark:text-gray-400 text-sm">{user.email}</p>
                      </div>
                    </div>

                    {/* Logout Button */}
                    <div className="flex justify-start">
                      <button 
                        onClick={handleSignOut}
                        className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd"/>
                        </svg>
                        Sign Out
                      </button>
                    </div>
                  </div>
                </section>

                {/* Placeholder for Future Settings */}
                <section className="bg-background-light dark:bg-[#111c22] rounded-xl border border-gray-200/80 dark:border-white/10 p-6">
                  <h2 className="text-gray-900 dark:text-white text-xl font-bold leading-tight mb-4">
                    More Settings Coming Soon
                  </h2>
                  <p className="text-gray-500 dark:text-gray-400 text-base">
                    We're working on adding more customization options. Stay tuned!
                  </p>
                </section>
              </div>
            </div>
          </div>

          {/* Footer */}
          <footer className="border-t border-gray-200/10 dark:border-white/10 px-4 sm:px-6 lg:px-10 py-6">
            <div className="max-w-4xl mx-auto flex justify-between items-center text-sm text-gray-500 dark:text-gray-400">
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