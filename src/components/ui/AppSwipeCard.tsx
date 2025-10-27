'use client';

import { useState } from 'react';
import { motion, PanInfo, useMotionValue, useTransform } from 'framer-motion';

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

interface AppSwipeCardProps {
  app: AppData;
  onSwipe: (direction: 'left' | 'right', app: AppData) => void;
  isActive: boolean;
  zIndex: number;
}

export default function AppSwipeCard({ app, onSwipe, isActive, zIndex }: AppSwipeCardProps) {
  const [exitDirection, setExitDirection] = useState<'left' | 'right' | null>(null);
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-150, 0, 150], [-30, 0, 30]);
  const opacity = useTransform(x, [-150, 0, 150], [0.5, 1, 0.5]);

  const handleDragEnd = (event: any, info: PanInfo) => {
    const threshold = 100;
    
    if (info.offset.x > threshold) {
      setExitDirection('right');
      onSwipe('right', app);
    } else if (info.offset.x < -threshold) {
      setExitDirection('left');
      onSwipe('left', app);
    }
  };

  const handleButtonSwipe = (direction: 'left' | 'right') => {
    setExitDirection(direction);
    onSwipe(direction, app);
  };

  return (
    <motion.div
      className="absolute inset-4"
      style={{ zIndex }}
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ 
        scale: isActive ? 1 : 0.95, 
        opacity: isActive ? 1 : 0.8,
        x: exitDirection === 'left' ? -300 : exitDirection === 'right' ? 300 : 0,
        rotate: exitDirection === 'left' ? -30 : exitDirection === 'right' ? 30 : 0
      }}
      exit={{ 
        x: exitDirection === 'left' ? -300 : 300,
        rotate: exitDirection === 'left' ? -30 : 30,
        opacity: 0
      }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
    >
      <motion.div
        className="w-full h-full bg-white dark:bg-gray-800 rounded-3xl shadow-2xl cursor-grab active:cursor-grabbing overflow-hidden"
        drag={isActive ? "x" : false}
        dragConstraints={{ left: 0, right: 0 }}
        style={{ x, rotate, opacity }}
        onDragEnd={handleDragEnd}
        whileTap={{ scale: 0.95 }}
      >
        {/* Swipe Indicators */}
        <motion.div 
          className="absolute top-8 left-8 bg-red-500 text-white px-4 py-2 rounded-full font-bold transform -rotate-12 z-10"
          style={{ opacity: useTransform(x, [0, -50, -100], [0, 0.5, 1]) }}
        >
          PASS
        </motion.div>
        <motion.div 
          className="absolute top-8 right-8 bg-green-500 text-white px-4 py-2 rounded-full font-bold transform rotate-12 z-10"
          style={{ opacity: useTransform(x, [0, 50, 100], [0, 0.5, 1]) }}
        >
          INTERESTED
        </motion.div>

        {/* Card Content */}
        <div className="p-8 h-full flex flex-col">
          {/* App Icon */}
          <div className="flex justify-center mb-6">
            {app.app_data.icon_url ? (
              <img 
                src={app.app_data.icon_url} 
                alt={app.app_data.name}
                className="w-24 h-24 rounded-3xl shadow-lg object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.nextElementSibling?.classList.remove('hidden');
                }}
              />
            ) : (
              <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center shadow-lg">
                <span className="text-white text-3xl font-bold">
                  {app.app_data.name.charAt(0)}
                </span>
              </div>
            )}
            {!app.app_data.icon_url && (
              <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center shadow-lg">
                <span className="text-white text-3xl font-bold">
                  {app.app_data.name.charAt(0)}
                </span>
              </div>
            )}
          </div>

          {/* App Name */}
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white text-center mb-2">
            {app.app_data.name}
          </h2>

          {/* App Rating & Category */}
          <div className="flex items-center justify-center gap-4 mb-4">
            {app.app_data.rating > 0 && (
              <div className="flex items-center gap-1">
                <span className="text-yellow-500 text-lg">⭐</span>
                <span className="text-gray-600 dark:text-gray-400 font-medium">
                  {app.app_data.rating.toFixed(1)}
                </span>
              </div>
            )}
            <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-medium">
              {app.app_data.category}
            </span>
          </div>

          {/* App Description */}
          <div className="flex-1 flex flex-col justify-center">
            <p className="text-gray-600 dark:text-gray-300 text-center text-lg leading-relaxed mb-6">
              {app.app_data.description.length > 150 
                ? app.app_data.description.substring(0, 150) + '...'
                : app.app_data.description
              }
            </p>

            {/* Why Selected */}
            <div className="bg-gradient-to-r from-primary/10 to-purple-500/10 rounded-2xl p-4 mb-6">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                <span className="text-primary">✨</span>
                Why this app is perfect for you
              </h3>
              <p className="text-gray-700 dark:text-gray-300">
                {app.personalized_oneliner}
              </p>
            </div>

            {/* Match Score */}
            <div className="text-center mb-4">
              <div className="inline-flex items-center gap-2 bg-gray-100 dark:bg-gray-700 rounded-full px-3 py-1.5">
                <span className="text-green-500">🎯</span>
                <span className="text-gray-700 dark:text-gray-300 font-medium text-sm">
                  {Math.round(app.llm_confidence * 100)}% match
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-center gap-8 mt-4 pb-2">
            <button
              onClick={() => handleButtonSwipe('left')}
              className="w-14 h-14 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-xl transition-colors shadow-lg hover:shadow-xl transform hover:scale-105"
              disabled={!isActive}
            >
              ✕
            </button>
            <button
              onClick={() => handleButtonSwipe('right')}
              className="w-14 h-14 bg-green-500 hover:bg-green-600 text-white rounded-full flex items-center justify-center text-xl transition-colors shadow-lg hover:shadow-xl transform hover:scale-105"
              disabled={!isActive}
            >
              ♥
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}