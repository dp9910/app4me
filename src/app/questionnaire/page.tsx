'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface UserPreferences {
  lifestyle: string[]
  goals: string[]
  interests: string[]
  budget: 'free' | 'paid' | 'mixed'
  device: 'ios' | 'android' | 'both'
}

const lifestyleOptions = [
  { id: 'active', label: 'Active & Outdoorsy', desc: 'I love sports, fitness, and outdoor activities' },
  { id: 'busy', label: 'Busy Professional', desc: 'I need tools to stay organized and productive' },
  { id: 'creative', label: 'Creative & Artistic', desc: 'I enjoy design, music, and creative pursuits' },
  { id: 'social', label: 'Social & Connected', desc: 'I like staying connected with friends and community' },
  { id: 'homebody', label: 'Homebody', desc: 'I prefer staying in and enjoying home activities' },
  { id: 'learner', label: 'Lifelong Learner', desc: 'I love learning new skills and knowledge' }
]

const goalOptions = [
  { id: 'productivity', label: 'Boost Productivity', desc: 'Get more done and stay organized' },
  { id: 'health', label: 'Improve Health', desc: 'Track fitness, nutrition, and wellness' },
  { id: 'creativity', label: 'Express Creativity', desc: 'Create art, music, or content' },
  { id: 'finance', label: 'Manage Finances', desc: 'Budget, save, and invest better' },
  { id: 'learning', label: 'Learn & Grow', desc: 'Develop new skills and knowledge' },
  { id: 'entertainment', label: 'Entertainment', desc: 'Have fun and relax' },
  { id: 'social', label: 'Stay Connected', desc: 'Connect with friends and family' },
  { id: 'travel', label: 'Travel & Explore', desc: 'Plan trips and discover new places' }
]

const interestOptions = [
  { id: 'fitness', label: 'Fitness & Sports' },
  { id: 'cooking', label: 'Cooking & Food' },
  { id: 'music', label: 'Music & Audio' },
  { id: 'photography', label: 'Photography' },
  { id: 'reading', label: 'Reading & Books' },
  { id: 'gaming', label: 'Gaming' },
  { id: 'technology', label: 'Technology' },
  { id: 'fashion', label: 'Fashion & Style' },
  { id: 'travel', label: 'Travel' },
  { id: 'meditation', label: 'Meditation & Mindfulness' },
  { id: 'business', label: 'Business & Entrepreneurship' },
  { id: 'education', label: 'Education & Learning' }
]

export default function QuestionnairePage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [preferences, setPreferences] = useState<UserPreferences>({
    lifestyle: [],
    goals: [],
    interests: [],
    budget: 'mixed',
    device: 'ios'
  })

  const handleArraySelection = (field: keyof UserPreferences, value: string) => {
    setPreferences(prev => {
      const currentArray = prev[field] as string[]
      const newArray = currentArray.includes(value)
        ? currentArray.filter(item => item !== value)
        : [...currentArray, value]
      
      return { ...prev, [field]: newArray }
    })
  }

  const handleSingleSelection = (field: keyof UserPreferences, value: string) => {
    setPreferences(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async () => {
    try {
      // Generate a session ID for anonymous users
      const sessionId = Date.now().toString()
      
      // Save preferences and redirect to results
      const queryParams = new URLSearchParams({
        lifestyle: preferences.lifestyle.join(','),
        goals: preferences.goals.join(','),
        interests: preferences.interests.join(','),
        budget: preferences.budget,
        device: preferences.device,
        sessionId
      })
      
      router.push(`/recommendations?${queryParams.toString()}`)
    } catch (error) {
      console.error('Error submitting preferences:', error)
    }
  }

  const canProceed = () => {
    switch (step) {
      case 1: return preferences.lifestyle.length > 0
      case 2: return preferences.goals.length > 0
      case 3: return preferences.interests.length > 0
      case 4: return true // Budget and device have defaults
      default: return false
    }
  }

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Step {step} of 4
            </span>
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
              {Math.round((step / 4) * 100)}% Complete
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div 
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${(step / 4) * 100}%` }}
            />
          </div>
        </div>

        {/* Step 1: Lifestyle */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="text-center">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                What describes your lifestyle?
              </h1>
              <p className="text-lg text-gray-600 dark:text-gray-300">
                Select all that apply to help us understand you better
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {lifestyleOptions.map((option) => (
                <div
                  key={option.id}
                  onClick={() => handleArraySelection('lifestyle', option.id)}
                  className={`p-6 rounded-xl border-2 cursor-pointer transition-all ${
                    preferences.lifestyle.includes(option.id)
                      ? 'border-primary bg-primary/10'
                      : 'border-gray-200 dark:border-gray-700 hover:border-primary/50'
                  }`}
                >
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                    {option.label}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {option.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Goals */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="text-center">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                What are your main goals?
              </h1>
              <p className="text-lg text-gray-600 dark:text-gray-300">
                Choose what you want to achieve with apps
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {goalOptions.map((option) => (
                <div
                  key={option.id}
                  onClick={() => handleArraySelection('goals', option.id)}
                  className={`p-6 rounded-xl border-2 cursor-pointer transition-all ${
                    preferences.goals.includes(option.id)
                      ? 'border-primary bg-primary/10'
                      : 'border-gray-200 dark:border-gray-700 hover:border-primary/50'
                  }`}
                >
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                    {option.label}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {option.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Interests */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="text-center">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                What interests you?
              </h1>
              <p className="text-lg text-gray-600 dark:text-gray-300">
                Select your hobbies and interests
              </p>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {interestOptions.map((option) => (
                <div
                  key={option.id}
                  onClick={() => handleArraySelection('interests', option.id)}
                  className={`p-4 rounded-lg border-2 cursor-pointer text-center transition-all ${
                    preferences.interests.includes(option.id)
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-gray-200 dark:border-gray-700 hover:border-primary/50'
                  }`}
                >
                  <span className="text-sm font-medium">{option.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 4: Budget & Device */}
        {step === 4 && (
          <div className="space-y-8">
            <div className="text-center">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                Final preferences
              </h1>
              <p className="text-lg text-gray-600 dark:text-gray-300">
                Tell us about your budget and device
              </p>
            </div>
            
            {/* Budget Preference */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Budget Preference
              </h3>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { id: 'free', label: 'Free Only', desc: 'I prefer free apps' },
                  { id: 'mixed', label: 'Mixed', desc: 'Free and paid apps' },
                  { id: 'paid', label: 'Premium', desc: 'Quality paid apps' }
                ].map((option) => (
                  <div
                    key={option.id}
                    onClick={() => handleSingleSelection('budget', option.id)}
                    className={`p-4 rounded-lg border-2 cursor-pointer text-center transition-all ${
                      preferences.budget === option.id
                        ? 'border-primary bg-primary/10'
                        : 'border-gray-200 dark:border-gray-700 hover:border-primary/50'
                    }`}
                  >
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                      {option.label}
                    </h4>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {option.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Device Preference */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Device Preference
              </h3>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { id: 'ios', label: 'iOS', desc: 'iPhone/iPad' },
                  { id: 'android', label: 'Android', desc: 'Android devices' },
                  { id: 'both', label: 'Both', desc: 'Cross-platform' }
                ].map((option) => (
                  <div
                    key={option.id}
                    onClick={() => handleSingleSelection('device', option.id)}
                    className={`p-4 rounded-lg border-2 cursor-pointer text-center transition-all ${
                      preferences.device === option.id
                        ? 'border-primary bg-primary/10'
                        : 'border-gray-200 dark:border-gray-700 hover:border-primary/50'
                    }`}
                  >
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                      {option.label}
                    </h4>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {option.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-8">
          <button
            onClick={() => setStep(Math.max(1, step - 1))}
            disabled={step === 1}
            className="px-6 py-3 text-gray-600 dark:text-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ← Back
          </button>
          
          {step < 4 ? (
            <button
              onClick={() => setStep(step + 1)}
              disabled={!canProceed()}
              className="px-8 py-3 bg-primary text-white rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors"
            >
              Next →
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={!canProceed()}
              className="px-8 py-3 bg-primary text-white rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors"
            >
              Get My Apps! 🚀
            </button>
          )}
        </div>
      </div>
    </div>
  )
}