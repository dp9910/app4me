'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth/auth-context';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navigation from '@/components/ui/Navigation';

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
      // Force redirect to landing page
      window.location.href = '/';
    } catch (error) {
      console.error('Error signing out:', error);
      // Even on error, redirect to landing page
      window.location.href = '/';
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
      {/* Navigation */}
      <Navigation />

      {/* Main Content */}
      <main className="flex-1 flex flex-col">

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
              <p>© 2024 All rights reserved.</p>
              <div className="flex gap-6">
                <Link href="/about" className="hover:text-primary">About Us</Link>
                <Link href="/help" className="hover:text-primary">Help Center</Link>
                <Link href="/terms" className="hover:text-primary">Terms of Service</Link>
              </div>
            </div>
          </footer>
      </main>
    </div>
  );
}