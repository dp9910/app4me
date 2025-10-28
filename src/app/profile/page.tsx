'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth/auth-context';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface PersonalizationData {
  id?: number;
  nickname: string;
  gender: 'male' | 'female' | 'other' | 'prefer_not_to_say' | '';
  age: string;
  appInterests: string;
  created_at?: string;
  updated_at?: string;
  completed_at?: string;
}

export default function ProfilePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [userName, setUserName] = useState('');
  const [formData, setFormData] = useState<PersonalizationData>({
    nickname: '',
    gender: '',
    age: '',
    appInterests: ''
  });
  const [originalData, setOriginalData] = useState<PersonalizationData | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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
      fetchPersonalizationData();
    }
  }, [user, loading, router]);

  const fetchPersonalizationData = async () => {
    try {
      setIsLoading(true);
      
      // Get the current session for auth token
      const { data: { session } } = await (await import('@/lib/supabase/client')).supabase.auth.getSession();
      if (!session?.access_token) {
        setError('Not authenticated');
        return;
      }

      const response = await fetch('/api/personalization', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      const result = await response.json();

      if (response.ok && result.data) {
        const data = {
          id: result.data.id,
          nickname: result.data.nickname || '',
          gender: result.data.gender || '',
          age: result.data.age ? result.data.age.toString() : '',
          appInterests: result.data.app_interests_text || '',
          created_at: result.data.created_at,
          updated_at: result.data.updated_at,
          completed_at: result.data.completed_at
        };
        setFormData(data);
        setOriginalData(data);
      } else {
        // No personalization data exists yet
        setOriginalData(null);
      }
    } catch (error) {
      console.error('Error fetching personalization:', error);
      setError('Failed to load profile data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleEdit = () => {
    setIsEditing(true);
    setError(null);
    setSuccess(null);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setFormData(originalData || {
      nickname: '',
      gender: '',
      age: '',
      appInterests: ''
    });
    setError(null);
    setSuccess(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

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

      const method = originalData ? 'PUT' : 'POST';
      const response = await fetch('/api/personalization', {
        method,
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

      if (!response.ok) {
        throw new Error(result.error || 'Failed to save profile');
      }

      // Update the original data and exit editing mode
      const updatedData = {
        ...formData,
        id: result.data.id,
        created_at: result.data.created_at,
        updated_at: result.data.updated_at,
        completed_at: result.data.completed_at
      };
      setOriginalData(updatedData);
      setFormData(updatedData);
      setIsEditing(false);
      setSuccess('Profile updated successfully!');

      // Clear the cached apps so the home page re-fetches
      if (user) {
        sessionStorage.removeItem(`cachedApps_${user.id}`);
      }
    } catch (error: any) {
      console.error('Error saving profile:', error);
      setError(error.message || 'Failed to save profile');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading || isLoading) {
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
              <Link href="/profile" className="flex items-center gap-3 px-3 py-2 rounded-lg bg-primary/10 text-primary">
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
              <h2 className="text-gray-900 dark:text-white text-lg font-bold leading-tight tracking-[-0.015em]">Profile</h2>
            </div>
          </header>

          {/* Page Content */}
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-10 py-8">
            <div className="max-w-4xl mx-auto flex flex-col gap-8">
              {/* Page Heading */}
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h1 className="text-gray-900 dark:text-white text-4xl font-black leading-tight tracking-[-0.033em]">
                    Profile
                  </h1>
                  {!isEditing && originalData && (
                    <button
                      onClick={handleEdit}
                      className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg font-medium transition-colors"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/>
                      </svg>
                      Edit Profile
                    </button>
                  )}
                </div>
                <p className="text-gray-500 dark:text-gray-400 text-base font-normal leading-normal">
                  Manage your personal information and app preferences.
                </p>
              </div>

              {/* Profile Content */}
              {!originalData && !isEditing ? (
                /* No profile data - show setup prompt */
                <div className="bg-background-light dark:bg-[#111c22] rounded-xl border border-gray-200/80 dark:border-white/10 p-8 text-center">
                  <div className="bg-primary/10 rounded-full size-16 flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-primary" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"/>
                    </svg>
                  </div>
                  <h2 className="text-gray-900 dark:text-white text-xl font-bold mb-2">
                    Complete Your Profile
                  </h2>
                  <p className="text-gray-500 dark:text-gray-400 mb-6">
                    Set up your profile to get personalized app recommendations.
                  </p>
                  <button
                    onClick={() => router.push('/personalize')}
                    className="bg-primary hover:bg-primary/90 text-white font-bold py-3 px-6 rounded-lg transition-colors"
                  >
                    Set Up Profile
                  </button>
                </div>
              ) : (
                /* Profile form/display */
                <div className="bg-background-light dark:bg-[#111c22] rounded-xl border border-gray-200/80 dark:border-white/10 p-6">
                  <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Nickname */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Nickname
                      </label>
                      {isEditing ? (
                        <input
                          type="text"
                          name="nickname"
                          value={formData.nickname}
                          onChange={handleInputChange}
                          placeholder="Enter your nickname"
                          className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-[#233c48] text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                          maxLength={100}
                        />
                      ) : (
                        <div className="px-4 py-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 text-gray-900 dark:text-white">
                          {formData.nickname || 'Not set'}
                        </div>
                      )}
                    </div>

                    {/* Gender */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Gender
                      </label>
                      {isEditing ? (
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
                      ) : (
                        <div className="px-4 py-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 text-gray-900 dark:text-white">
                          {formData.gender ? formData.gender.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Not set'}
                        </div>
                      )}
                    </div>

                    {/* Age */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Age
                      </label>
                      {isEditing ? (
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
                      ) : (
                        <div className="px-4 py-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 text-gray-900 dark:text-white">
                          {formData.age || 'Not set'}
                        </div>
                      )}
                    </div>

                    {/* App Interests */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        App Interests
                      </label>
                      {isEditing ? (
                        <>
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
                        </>
                      ) : (
                        <div className="px-4 py-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 text-gray-900 dark:text-white min-h-[100px]">
                          {formData.appInterests || 'Not set'}
                        </div>
                      )}
                    </div>

                    {/* Messages */}
                    {error && (
                      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                        <p className="text-red-700 dark:text-red-400 text-sm">{error}</p>
                      </div>
                    )}

                    {success && (
                      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                        <p className="text-green-700 dark:text-green-400 text-sm">{success}</p>
                      </div>
                    )}

                    {/* Action Buttons */}
                    {isEditing && (
                      <div className="flex gap-3 pt-4">
                        <button
                          type="submit"
                          disabled={isSubmitting}
                          className="flex-1 bg-primary hover:bg-primary/90 disabled:bg-gray-400 text-white font-bold py-3 px-6 rounded-lg transition-colors disabled:cursor-not-allowed"
                        >
                          {isSubmitting ? (
                            <div className="flex items-center justify-center gap-2">
                              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                              Saving...
                            </div>
                          ) : (
                            'Save Changes'
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={handleCancel}
                          disabled={isSubmitting}
                          className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:cursor-not-allowed"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </form>

                  {/* Profile Info */}
                  {originalData && !isEditing && (
                    <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-600">
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        <p>Profile created: {originalData.created_at ? new Date(originalData.created_at).toLocaleDateString() : 'Unknown'}</p>
                        {originalData.updated_at && (
                          <p>Last updated: {new Date(originalData.updated_at).toLocaleDateString()}</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
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