'use client';

import { useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import AppSwipeCard from './AppSwipeCard';

interface AppData {
  app_id: string;
  app_data: {
    name: string;
    category: string;
    rating: number;
    icon_url: string;
    description: string;
  };
  final_score: number;
  personalized_oneliner: string;
  match_explanation: string;
  llm_confidence: number;
  matched_concepts: string[];
  rank: number;
}

interface AppSwipeInterfaceProps {
  apps: AppData[];
  onSwipeComplete: (likedApps: AppData[], rejectedApps: AppData[]) => void;
  userQuery: string;
}

export default function AppSwipeInterface({ apps, onSwipeComplete, userQuery }: AppSwipeInterfaceProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [likedApps, setLikedApps] = useState<AppData[]>([]);
  const [rejectedApps, setRejectedApps] = useState<AppData[]>([]);
  const [isComplete, setIsComplete] = useState(false);

  const handleSwipe = (direction: 'left' | 'right', app: AppData) => {
    if (direction === 'right') {
      setLikedApps(prev => [...prev, app]);
    } else {
      setRejectedApps(prev => [...prev, app]);
    }

    // Move to next card after a short delay
    setTimeout(() => {
      if (currentIndex < apps.length - 1) {
        setCurrentIndex(prev => prev + 1);
      } else {
        setIsComplete(true);
        onSwipeComplete(
          direction === 'right' ? [...likedApps, app] : likedApps,
          direction === 'left' ? [...rejectedApps, app] : rejectedApps
        );
      }
    }, 300);
  };

  const handleUndo = () => {
    if (currentIndex > 0) {
      const prevIndex = currentIndex - 1;
      const prevApp = apps[prevIndex];
      
      // Remove from liked/rejected arrays
      setLikedApps(prev => prev.filter(app => app.app_id !== prevApp.app_id));
      setRejectedApps(prev => prev.filter(app => app.app_id !== prevApp.app_id));
      
      setCurrentIndex(prevIndex);
      setIsComplete(false);
    }
  };

  const progress = ((currentIndex + 1) / apps.length) * 100;

  if (isComplete && likedApps.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">😔</div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            No matches found
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            You didn't like any of the apps we suggested. Let's try a different search!
          </p>
          <button
            onClick={() => window.location.href = '/'}
            className="px-6 py-3 bg-primary text-white rounded-full font-medium hover:bg-primary/90 transition-colors"
          >
            Search Again
          </button>
        </div>
      </div>
    );
  }

  if (isComplete && likedApps.length > 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Great choices!
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              You liked {likedApps.length} app{likedApps.length === 1 ? '' : 's'}. Here are your matches:
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
            {likedApps.map((app, index) => (
              <div key={app.app_id} className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg">
                <div className="flex items-center gap-4 mb-4">
                  {app.app_data.icon_url ? (
                    <img 
                      src={app.app_data.icon_url} 
                      alt={app.app_data.name}
                      className="w-16 h-16 rounded-2xl"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center">
                      <span className="text-white text-xl font-bold">
                        {app.app_data.name.charAt(0)}
                      </span>
                    </div>
                  )}
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-white">
                      {app.app_data.name}
                    </h3>
                    <div className="flex items-center gap-2">
                      <span className="text-yellow-500">⭐</span>
                      <span className="text-gray-600 dark:text-gray-400">
                        {app.app_data.rating.toFixed(1)}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button className="flex-1 bg-primary text-white py-2 px-4 rounded-lg font-medium hover:bg-primary/90 transition-colors">
                    View in Store
                  </button>
                  <button className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    ♥
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center">
            <button
              onClick={() => window.location.href = '/'}
              className="px-6 py-3 bg-gray-600 text-white rounded-full font-medium hover:bg-gray-700 transition-colors"
            >
              Search for More Apps
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <div className="p-4">
        <div className="max-w-md mx-auto">
          {/* Progress Bar */}
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {currentIndex + 1} of {apps.length}
            </span>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {Math.round(progress)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-6">
            <div 
              className="bg-gradient-to-r from-primary to-purple-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>

          {/* Query Display */}
          <div className="text-center mb-4">
            <p className="text-gray-600 dark:text-gray-400">
              Finding apps for: <span className="font-medium">"{userQuery}"</span>
            </p>
          </div>
        </div>
      </div>

      {/* Swipe Cards Container with Side Controls */}
      <div className="relative px-20">
        {/* Left Arrow - Reject */}
        <button
          onClick={() => {
            if (currentIndex < apps.length) {
              handleSwipe('left', apps[currentIndex]);
            }
          }}
          className="absolute left-2 top-1/2 transform -translate-y-1/2 z-20 w-14 h-14 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all"
          disabled={currentIndex >= apps.length}
        >
          ✕
        </button>

        {/* Cards Container */}
        <div className="relative h-[600px] max-w-md mx-auto">
          <AnimatePresence>
            {apps.slice(currentIndex, currentIndex + 3).map((app, index) => (
              <AppSwipeCard
                key={app.app_id}
                app={app}
                onSwipe={handleSwipe}
                isActive={index === 0}
                zIndex={3 - index}
              />
            ))}
          </AnimatePresence>
        </div>

        {/* Right Arrow - Like */}
        <button
          onClick={() => {
            if (currentIndex < apps.length) {
              handleSwipe('right', apps[currentIndex]);
            }
          }}
          className="absolute right-2 top-1/2 transform -translate-y-1/2 z-20 w-14 h-14 bg-green-500 hover:bg-green-600 text-white rounded-full flex items-center justify-center text-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all"
          disabled={currentIndex >= apps.length}
        >
          →
        </button>
      </div>

      {/* Footer Controls */}
      <div className="p-4">
        <div className="max-w-md mx-auto flex justify-center gap-4">
          {currentIndex > 0 && (
            <button
              onClick={handleUndo}
              className="px-4 py-2 bg-gray-500 text-white rounded-full font-medium hover:bg-gray-600 transition-colors"
            >
              ↶ Undo
            </button>
          )}
          <div className="text-center text-sm text-gray-500 dark:text-gray-400 px-4 py-2">
            Swipe or use arrows • → Like • ✕ Pass
          </div>
        </div>
      </div>
    </div>
  );
}