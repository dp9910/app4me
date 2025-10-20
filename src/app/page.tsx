'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Input';

export default function HomePage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    lifestyle: [] as string[],
    intent: '',
    wishText: ''
  });

  const lifestyleOptions = [
    { id: 'active', label: 'Active', emoji: '🏃‍♂️' },
    { id: 'creative', label: 'Creative', emoji: '🎨' },
    { id: 'student', label: 'Student', emoji: '📚' },
    { id: 'professional', label: 'Professional', emoji: '💼' },
    { id: 'foodie', label: 'Foodie', emoji: '🍔' },
    { id: 'traveler', label: 'Traveler', emoji: '✈️' },
  ];

  const intentOptions = [
    'Productivity',
    'Health & Fitness',
    'Entertainment',
    'Learning',
    'Finance',
    'Social'
  ];

  const handleLifestyleToggle = (lifestyle: string) => {
    setFormData(prev => ({
      ...prev,
      lifestyle: prev.lifestyle.includes(lifestyle)
        ? prev.lifestyle.filter(l => l !== lifestyle)
        : [...prev.lifestyle, lifestyle]
    }));
  };

  const handleTakeQuiz = () => {
    // Store form data in localStorage for now
    localStorage.setItem('userProfile', JSON.stringify(formData));
    router.push('/discover');
  };

  const isFormValid = formData.lifestyle.length > 0 || formData.intent || formData.wishText;

  return (
    <div className="bg-background-light dark:bg-background-dark font-display">
      <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden">
        <div className="flex h-full grow flex-col">
          {/* Header */}
          <header className="flex items-center justify-between whitespace-nowrap border-b border-primary/20 dark:border-primary/30 px-10 py-4">
            <div className="flex items-center gap-3 text-gray-800 dark:text-white">
              <div className="size-6 text-primary">
                <svg fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                  <path d="M44 11.2727C44 14.0109 39.8386 16.3957 33.69 17.6364C39.8386 18.877 44 21.2618 44 24C44 26.7382 39.8386 29.123 33.69 30.3636C39.8386 31.6043 44 33.9891 44 36.7273C44 40.7439 35.0457 44 24 44C12.9543 44 4 40.7439 4 36.7273C4 33.9891 8.16144 31.6043 14.31 30.3636C8.16144 29.123 4 26.7382 4 24C4 21.2618 8.16144 18.877 14.31 17.6364C8.16144 16.3957 4 14.0109 4 11.2727C4 7.25611 12.9543 4 24 4C35.0457 4 44 7.25611 44 11.2727Z" fill="currentColor"></path>
                </svg>
              </div>
              <h2 className="text-xl font-bold">App4Me</h2>
            </div>
            <div className="flex flex-1 items-center justify-end gap-6">
              <nav className="hidden md:flex items-center gap-6">
                <a className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-primary dark:hover:text-primary transition-colors" href="#">For Business</a>
                <a className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-primary dark:hover:text-primary transition-colors" href="#">For Developers</a>
                <a className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-primary dark:hover:text-primary transition-colors" href="#">Resources</a>
              </nav>
              <button className="flex items-center justify-center rounded-lg h-10 px-5 bg-primary text-white text-sm font-bold shadow-sm hover:bg-primary/90 transition-colors">
                Get Started
              </button>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex flex-1 flex-col items-center">
            <div className="w-full max-w-7xl flex-1 px-4 sm:px-6 lg:px-8">
              <div className="py-20 sm:py-28">
                {/* Hero Section */}
                <div className="flex min-h-[520px] flex-col items-center justify-center gap-8 rounded-xl bg-cover bg-center p-6 text-center" 
                     style={{
                       backgroundImage: 'linear-gradient(rgba(0, 0, 0, 0.3) 0%, rgba(0, 0, 0, 0.6) 100%), url("https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?q=80&w=2070")'
                     }}>
                  <div className="flex flex-col gap-4 max-w-3xl">
                    <h1 className="text-white text-4xl sm:text-5xl md:text-6xl font-black tracking-tighter">
                      Find the perfect apps for your life
                    </h1>
                    <p className="text-gray-200 text-base sm:text-lg max-w-2xl mx-auto">
                      Discover apps tailored to your unique lifestyle and goals. Whether you're looking to boost productivity, enhance your well-being, or simply have fun, we've got you covered.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-4 justify-center">
                    <button 
                      onClick={() => document.getElementById('quiz-section')?.scrollIntoView({ behavior: 'smooth' })}
                      className="flex h-12 items-center justify-center rounded-lg bg-primary px-6 text-base font-bold text-white shadow-lg hover:bg-primary/90 transition-colors"
                    >
                      Take the Quiz
                    </button>
                    <button className="flex h-12 items-center justify-center rounded-lg bg-white/10 px-6 text-base font-bold text-white backdrop-blur-sm hover:bg-white/20 transition-colors">
                      Browse Apps
                    </button>
                  </div>
                </div>
              </div>

              {/* Quiz Section */}
              <div id="quiz-section" className="py-16 sm:py-24 px-4">
                <div className="mx-auto max-w-4xl">
                  <div className="text-center mb-12">
                    <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
                      Tell us about yourself
                    </h2>
                    <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">
                      Answer a few questions to get personalized app recommendations
                    </p>
                  </div>

                  <div className="space-y-8">
                    {/* Lifestyle Question */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-primary/20 dark:border-primary/30 p-8">
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
                        What describes your lifestyle?
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {lifestyleOptions.map(option => (
                          <button
                            key={option.id}
                            onClick={() => handleLifestyleToggle(option.id)}
                            className={`p-4 rounded-lg border-2 transition-all text-left ${
                              formData.lifestyle.includes(option.id)
                                ? 'border-primary bg-primary/10 text-primary'
                                : 'border-gray-200 dark:border-gray-600 hover:border-primary/50 text-gray-700 dark:text-gray-300'
                            }`}
                          >
                            <span className="text-2xl mr-3">{option.emoji}</span>
                            <span className="font-medium">{option.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Intent Question */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-primary/20 dark:border-primary/30 p-8">
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
                        What are you looking to improve?
                      </h3>
                      <select
                        value={formData.intent}
                        onChange={(e) => setFormData(prev => ({ ...prev, intent: e.target.value }))}
                        className="w-full p-4 rounded-lg border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-primary focus:outline-none"
                      >
                        <option value="">Select an area...</option>
                        {intentOptions.map(option => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    </div>

                    {/* Wish Text */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-primary/20 dark:border-primary/30 p-8">
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
                        Tell us what you're looking for
                      </h3>
                      <Textarea
                        value={formData.wishText}
                        onChange={(e) => setFormData(prev => ({ ...prev, wishText: e.target.value }))}
                        placeholder="I wish there was an app that helps me..."
                        rows={4}
                      />
                    </div>

                    {/* Submit Button */}
                    <div className="text-center">
                      <Button
                        onClick={handleTakeQuiz}
                        disabled={!isFormValid}
                        size="lg"
                        className="px-8"
                      >
                        Find My Apps ✨
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </main>

          {/* Footer */}
          <footer className="w-full border-t border-primary/20 dark:border-primary/30">
            <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
              <div className="flex items-center justify-center space-x-6">
                <a className="text-sm leading-6 text-gray-600 dark:text-gray-400 hover:text-primary dark:hover:text-primary" href="#">About</a>
                <a className="text-sm leading-6 text-gray-600 dark:text-gray-400 hover:text-primary dark:hover:text-primary" href="#">Contact</a>
                <a className="text-sm leading-6 text-gray-600 dark:text-gray-400 hover:text-primary dark:hover:text-primary" href="#">Privacy Policy</a>
                <a className="text-sm leading-6 text-gray-600 dark:text-gray-400 hover:text-primary dark:hover:text-primary" href="#">Terms of Service</a>
              </div>
              <p className="mt-8 text-center text-sm leading-5 text-gray-500 dark:text-gray-400">© 2024 App4Me. All rights reserved.</p>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}