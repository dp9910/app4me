'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth/auth-context';
import { useRouter } from 'next/navigation';

interface PersonalizationData {
  nickname: string;
  gender: 'male' | 'female' | 'other' | 'prefer_not_to_say' | '';
  age: string;
  appInterests: string;
}

export default function PersonalizePage() {
  const { user, loading, checkPersonalizationStatus } = useAuth();
  const router = useRouter();
  const [formData, setFormData] = useState<PersonalizationData>({
    nickname: '',
    gender: '',
    age: '',
    appInterests: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/signin');
    }
  }, [user, loading, router]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      // Validate form
      if (!formData.nickname.trim()) {
        throw new Error('Please enter a nickname');
      }
      if (!formData.gender) {
        throw new Error('Please select your gender');
      }
      if (!formData.age || parseInt(formData.age) < 13 || parseInt(formData.age) > 120) {
        throw new Error('Please enter a valid age (13-120)');
      }
      if (!formData.appInterests.trim()) {
        throw new Error('Please enter your app interests');
      }

      // Get the current session for auth token
      const { data: { session } } = await (await import('@/lib/supabase/client')).supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch('/api/personalization', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          nickname: formData.nickname.trim(),
          gender: formData.gender,
          age: parseInt(formData.age),
          appInterests: formData.appInterests.trim()
        }),
      });

      const result = await response.json();
      console.log('Personalization save result:', result);

      if (!response.ok) {
        throw new Error(result.error || 'Failed to save personalization');
      }

      console.log('Personalization saved successfully, updating status...');
      
      // Update personalization status in auth context with timeout
      try {
        await Promise.race([
          checkPersonalizationStatus(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 3000))
        ]);
        console.log('Status updated successfully');
      } catch (statusError) {
        console.warn('Status update failed or timed out, proceeding with redirect:', statusError);
      }
      
      console.log('Redirecting to home...');
      
      // Redirect to home page after successful save
      router.push('/home');
      
      // Fallback redirect in case router.push doesn't work
      setTimeout(() => {
        if (typeof window !== 'undefined') {
          window.location.href = '/home';
        }
      }, 1000);
    } catch (error: any) {
      console.error('Error saving personalization:', error);
      setError(error.message || 'Failed to save personalization');
    } finally {
      setIsSubmitting(false);
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
    <div className="relative flex min-h-screen w-full flex-col bg-background-light dark:bg-background-dark">
      {/* Background decoration */}
      <div className="absolute inset-0 z-0 opacity-20">
        <div className="absolute bottom-0 left-[-20%] top-[-10%] h-[500px] w-[500px] rounded-full bg-primary/20 blur-[120px]"></div>
        <div className="absolute right-[-20%] top-[-10%] h-[500px] w-[500px] rounded-full bg-purple-500/20 blur-[120px]"></div>
      </div>

      <div className="relative z-10 flex w-full max-w-4xl mx-auto flex-col items-center px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="size-8 text-primary">
            <svg fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
              <path clipRule="evenodd" d="M12.0799 24L4 19.2479L9.95537 8.75216L18.04 13.4961L18.0446 4H29.9554L29.96 13.4961L38.0446 8.75216L44 19.2479L35.92 24L44 28.7521L38.0446 39.2479L29.96 34.5039L29.9554 44H18.0446L18.04 34.5039L9.95537 39.2479L4 28.7521L12.0799 24Z" fill="currentColor" fillRule="evenodd"></path>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">AppDiscovery AI</h1>
        </div>

        {/* Main Content */}
        <div className="w-full max-w-2xl">
          <div className="bg-white dark:bg-[#111c22] rounded-2xl shadow-xl border border-gray-200/20 dark:border-white/10 p-8">
            {/* Title */}
            <div className="text-center mb-8">
              <h2 className="text-3xl font-black text-gray-900 dark:text-white mb-3">
                Let's Personalize Your Experience
              </h2>
              <p className="text-gray-600 dark:text-gray-400 text-lg">
                Help us find the perfect apps for you by sharing a few details.
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Nickname */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  What should we call you?
                </label>
                <input
                  type="text"
                  name="nickname"
                  value={formData.nickname}
                  onChange={handleInputChange}
                  placeholder="Enter your nickname"
                  className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-[#233c48] text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  maxLength={100}
                />
              </div>

              {/* Gender */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Gender
                </label>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-[#233c48] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="">Select your gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                  <option value="prefer_not_to_say">Prefer not to say</option>
                </select>
              </div>

              {/* Age */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Age
                </label>
                <input
                  type="number"
                  name="age"
                  value={formData.age}
                  onChange={handleInputChange}
                  placeholder="Enter your age"
                  min="13"
                  max="120"
                  className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-[#233c48] text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>

              {/* App Interests */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  What types of apps interest you?
                </label>
                <textarea
                  name="appInterests"
                  value={formData.appInterests}
                  onChange={handleInputChange}
                  placeholder="e.g., productivity, budget, fitness, gaming, social media, photography, music..."
                  rows={4}
                  className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-[#233c48] text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                />
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Enter keywords separated by commas or describe your interests in your own words.
                </p>
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                  <p className="text-red-700 dark:text-red-400 text-sm">{error}</p>
                </div>
              )}

              {/* Submit Button */}
              <div className="pt-4">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-primary hover:bg-primary/90 disabled:bg-gray-400 text-white font-bold py-4 px-6 rounded-lg transition-colors disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Saving...
                    </div>
                  ) : (
                    'Save & Continue'
                  )}
                </button>
              </div>
            </form>

            {/* Skip Option */}
            <div className="text-center mt-6">
              <button
                onClick={() => router.push('/home')}
                className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 text-sm font-medium"
              >
                Skip for now
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}