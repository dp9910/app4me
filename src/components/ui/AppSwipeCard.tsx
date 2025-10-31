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
        className="w-full h-full bg-white dark:bg-gray-900 rounded-2xl shadow-2xl cursor-grab active:cursor-grabbing overflow-hidden border border-gray-100 dark:border-gray-700"
        drag={isActive ? "x" : false}
        dragConstraints={{ left: 0, right: 0 }}
        style={{ x, rotate, opacity }}
        onDragEnd={handleDragEnd}
        whileTap={{ scale: 0.98 }}
      >
        {/* Dating App Style Swipe Indicators */}
        <motion.div 
          className="absolute top-8 left-8 bg-red-500/90 backdrop-blur-sm text-white px-6 py-3 rounded-full font-bold transform -rotate-12 z-20 border-2 border-white shadow-xl"
          style={{ opacity: useTransform(x, [0, -50, -100], [0, 0.7, 1]) }}
        >
          NOPE
        </motion.div>
        <motion.div 
          className="absolute top-8 right-8 bg-gradient-to-r from-pink-500/90 to-red-500/90 backdrop-blur-sm text-white px-6 py-3 rounded-full font-bold transform rotate-12 z-20 border-2 border-white shadow-xl"
          style={{ opacity: useTransform(x, [0, 50, 100], [0, 0.7, 1]) }}
        >
          LIKE
        </motion.div>

        {/* Reference Design Card */}
        <div className="h-full w-full flex flex-col justify-center items-center p-8 text-center">
          <div className="flex-1 flex flex-col justify-center items-center">
            {/* Large App Logo - Exactly like reference */}
            <div className="w-48 h-48 rounded-[2.5rem] bg-cover bg-center shadow-2xl mb-8">
              {app.app_data.icon_url ? (
                <img 
                  src={app.app_data.icon_url} 
                  alt={app.app_data.name}
                  className="w-48 h-48 rounded-[2.5rem] shadow-2xl object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.nextElementSibling?.classList.remove('hidden');
                  }}
                />
              ) : (
                <div className="w-48 h-48 rounded-[2.5rem] bg-gradient-to-br from-primary via-purple-500 to-pink-500 flex items-center justify-center shadow-2xl">
                  <span className="text-white text-6xl font-bold">
                    {app.app_data.name.charAt(0)}
                  </span>
                </div>
              )}
            </div>
            
            {/* App Name - Large like reference */}
            <h3 className="text-gray-900 dark:text-white text-3xl font-bold mb-2">
              {app.app_data.name}
            </h3>
          </div>
          
          {/* Bottom section - Price and Rating like reference */}
          <div className="flex items-center justify-center gap-6 w-full pt-6 border-t border-gray-200 dark:border-gray-700">
            <div className="flex flex-col items-center">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 dark:bg-green-900/20 px-3 py-1 text-sm font-bold text-green-700 dark:text-green-400">
                {app.app_data.category}
              </span>
            </div>
            {app.app_data.rating > 0 && (
              <>
                <div className="w-px h-6 bg-gray-200 dark:bg-gray-700"></div>
                <div className="flex flex-col items-center">
                  <div className="flex items-center gap-1 text-amber-500">
                    <span className="font-bold text-sm">{app.app_data.rating.toFixed(1)}</span>
                    <span className="text-amber-400 text-lg">⭐</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}