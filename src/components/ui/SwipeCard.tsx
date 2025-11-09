'use client';

import { useDrag } from '@use-gesture/react';
import { animated, useSpring, to } from '@react-spring/web';
import { useState } from 'react'; // Import useState

interface App {
  id: string;
  app_id: string;
  name: string;
  artist?: string;
  category?: string;
  primary_category?: string;
  icon: string;
  icon_url?: string;
  url?: string;
  rating: number;
  description: string;
  price?: string;
  similarity_score?: number;
  match_quality?: string;
  relevance_score?: number;
  personalized_one_liner?: string;
  match_reason?: string;
  // Add fields for the back of the card
  primary_use_case?: string;
  target_user?: string;
  key_benefit?: string;
  matched_keywords?: string[];
}

interface SwipeCardProps {
  app: App;
  onLike?: () => void;
  onPass?: () => void;
  isActive?: boolean;
  zIndex?: number;
}

export default function SwipeCard({ app, onLike, onPass, isActive = true, zIndex = 10 }: SwipeCardProps) {
  const [{ x, y, rotateZ, scale }, api] = useSpring(() => ({
    rotateZ: 0,
    scale: 1,
    x: 0,
    y: 0,
  }));

  const [isFlipped, setIsFlipped] = useState(false); // State to manage card flip

  const bind = useDrag(
    ({ down, movement: [mx], direction: [xDir], velocity: [vx], event }) => {
      // Check if the event originated from an element with the 'no-drag' class
      let targetElement = event.target as HTMLElement;
      while (targetElement && targetElement !== event.currentTarget) {
        if (targetElement.classList.contains('no-drag')) {
          return; // Ignore drag if clicking an element with 'no-drag' class
        }
        targetElement = targetElement.parentElement as HTMLElement;
      }

      if (isFlipped) return; // Disable drag when flipped

      const trigger = vx > 0.2;
      const dir = xDir < 0 ? -1 : 1;

      if (!down && trigger) {
        if (dir === 1 && onLike) onLike();
        if (dir === -1 && onPass) onPass();
      }

      api.start({
        x: down ? mx : 0,
        rotateZ: down ? mx / 10 : 0,
        scale: down ? 1.05 : 1,
      });
    },
    { preventDefault: false } // Add this option
  );

  const formatDescription = (desc: string) => {
    if (!desc || desc === 'app_name_match' || desc === 'No description available') {
      return '';
    }
    // Remove the first line of description
    const lines = desc.split('\n');
    if (lines.length > 1) {
      return lines.slice(1).join('\n').trim();
    }
    return desc.trim();
  };

  const displayRating = app.rating_average || app.rating || 0;

  return (
    <animated.div
      {...bind()}
      style={{
        x,
        y,
        rotateZ,
        scale,
        zIndex,
        transform: to([rotateZ, x, y], (rz, tx, ty) => `translate3d(${tx}px,${ty}px,0) rotateZ(${rz}deg)`),
        transformStyle: 'preserve-3d', // Required for 3D flip
        rotateY: isFlipped ? 180 : 0, // Apply rotateY for flip
      }}
      className="absolute inset-4 cursor-grab active:cursor-grabbing"
    >
      <div className="relative w-full h-full max-w-md mx-auto bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border-2 border-gray-200 dark:border-gray-700 overflow-hidden"
           style={{ transformStyle: 'preserve-3d' }}>
        
        {/* Front of the Card */}
        <div className="absolute w-full h-full backface-hidden" style={{ backfaceVisibility: 'hidden' }}>
          {/* App Icon */}
          <div className="flex justify-center pt-12 pb-6">
            <div 
              className="w-36 h-36 rounded-3xl bg-cover bg-center shadow-lg"
              style={{ backgroundImage: `url(${app.icon})` }}
            />
          </div>

          {/* App Info */}
          <div className="px-8 text-center">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 line-clamp-2">
              {app.name}
            </h2>
            
            {/* Price */}
            {app.price && (
              <div className="mb-3">
                <span className="inline-block px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-sm font-medium rounded-full">
                  {app.price}
                </span>
              </div>
            )}

            {/* Rating */}
            {displayRating > 0 && (
              <div className="flex items-center justify-center gap-1 mb-4">
                <span className="text-2xl font-bold text-orange-500">{displayRating.toFixed(1)}</span>
                <span className="text-orange-400 text-xl">⭐</span>
              </div>
            )}

            {/* Description */}
            <div className="px-4 mb-16">
              <p className="text-gray-600 dark:text-gray-400 text-base leading-relaxed line-clamp-2">
                {app.personalized_one_liner || (formatDescription(app.description).length > 100 ? formatDescription(app.description).substring(0, 100) + '...' : formatDescription(app.description)) || 'No description available.'}
              </p>
            </div>

            {/* View More Button */}
            <button 
              id="view-more-button" // Added ID
              onClick={(e) => { e.stopPropagation(); setIsFlipped(true); }} // Added e.stopPropagation()
              className="no-drag absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-full text-sm font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              View More
            </button>
          </div>
        </div>

        {/* Back of the Card */}
        <div className="absolute w-full h-full bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border-2 border-gray-200 dark:border-gray-700 p-8 text-center flex flex-col justify-between" 
             style={{ transform: 'rotateY(180deg)', backfaceVisibility: 'hidden' }}>
          <div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">App Details</h3>
            
            {app.primary_use_case && (
              <div className="mb-4 text-left">
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Primary Use Case:</p>
                <p className="text-base text-gray-600 dark:text-gray-400">{app.primary_use_case}</p>
              </div>
            )}
            
            {app.target_user && (
              <div className="mb-4 text-left">
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Target Users:</p>
                <p className="text-base text-gray-600 dark:text-gray-400">{app.target_user}</p>
              </div>
            )}

            {app.key_benefit && (
              <div className="mb-4 text-left">
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Key Benefit:</p>
                <p className="text-base text-gray-600 dark:text-gray-400">{app.key_benefit}</p>
              </div>
            )}

            {app.matched_keywords && app.matched_keywords.length > 0 && (
              <div className="mb-4 text-left">
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Matched Keywords:</p>
                <div className="flex flex-wrap gap-2 mt-1">
                  {app.matched_keywords.map((keyword, index) => (
                    <span key={index} className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs rounded-full">
                      {keyword}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          {/* View Less Button */}
          <button 
            onClick={() => setIsFlipped(false)}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-full text-sm font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors mt-auto"
          >
            View Less
          </button>
        </div>

        {/* Swipe Feedback Overlays */}
        <animated.div
          className="absolute inset-0 flex items-center justify-center bg-red-500/20 rounded-2xl"
          style={{
            opacity: to(x, (x) => (x < -50 ? Math.min(1, Math.abs(x) / 100) : 0)),
          }}
        >
          <div className="text-6xl font-bold text-red-500 border-4 border-red-500 rounded-xl px-6 py-3 transform -rotate-12 bg-white/90">
            ✕
          </div>
        </animated.div>
        
        <animated.div
          className="absolute inset-0 flex items-center justify-center bg-green-500/20 rounded-2xl"
          style={{
            opacity: to(x, (x) => (x > 50 ? Math.min(1, x / 100) : 0)),
          }}
        >
          <div className="text-6xl font-bold text-green-500 border-4 border-green-500 rounded-xl px-6 py-3 transform rotate-12 bg-white/90">
            ♥
          </div>
        </animated.div>
      </div>
    </animated.div>
  );
}

