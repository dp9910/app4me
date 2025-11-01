'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth/auth-context';
import { useRouter } from 'next/navigation';
import Navigation from '@/components/ui/Navigation';

export default function ProfilePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/signin');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-primary">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="relative flex h-auto min-h-screen w-full flex-col">
      <Navigation />
      <main className="flex-1 flex flex-col">
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-10 py-8">
          <div className="max-w-4xl mx-auto flex flex-col gap-8">
            <h1 className="text-gray-900 dark:text-white text-4xl font-black leading-tight tracking-[-0.033em]">
              Profile
            </h1>
            <p>Profile content will be here</p>
          </div>
        </div>
      </main>
    </div>
  );
}