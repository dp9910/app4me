'use client';

import { useDrag } from '@use-gesture/react';
import { animated, useSpring, to } from '@react-spring/web';
import { useState, useEffect } from 'react'; // Import useState and useEffect

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
  rating_average?: number;
  rating_count?: number;
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
  const [{ x, y, rotateZ, scale, rotateY }, api] = useSpring(() => ({
    rotateZ: 0,
    scale: 1,
    x: 0,
    y: 0,
    rotateY: 0,
  }));

  const [isFlipped, setIsFlipped] = useState(false); // State to manage card flip

  // Handle flip animation
  useEffect(() => {
    api.start({
      rotateY: isFlipped ? 180 : 0,
      config: { tension: 300, friction: 30 }
    });
  }, [isFlipped, api]);

  // Reset flip state when app changes
  useEffect(() => {
    setIsFlipped(false);
  }, [app.id]);

  const bind = useDrag(
    ({ down, movement: [mx], direction: [xDir], velocity: [vx], event }) => {
      // Don't allow drag interactions when card is flipped
      if (isFlipped) {
        return;
      }

      // Check if the event originated from an element with the 'no-drag' class
      let targetElement = event.target as HTMLElement;
      while (targetElement && targetElement !== event.currentTarget) {
        if (targetElement.classList.contains('no-drag')) {
          return; // Ignore drag if clicking an element with 'no-drag' class
        }
        targetElement = targetElement.parentElement as HTMLElement;
      }

      const trigger = vx > 0.2;
      const dir = xDir < 0 ? -1 : 1;

      if (!down && trigger) {
        if (dir === 1 && onLike) onLike();
        if (dir === -1 && onPass) onPass();
      }

      // Only allow visual feedback for fast swipe gestures, not slow dragging
      const allowMovement = Math.abs(vx) > 0.1; // Only show movement for fast gestures
      
      api.start({
        x: down && allowMovement ? mx : 0,
        rotateZ: down && allowMovement ? mx / 10 : 0,
        scale: down ? 1.05 : 1,
      });
    },
    { 
      preventDefault: false,
      filterTaps: true,
      threshold: 20  // Increase threshold to require more movement before drag starts
    }
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
      {...(!isFlipped ? bind() : {})}
      style={{
        zIndex,
        transform: to([rotateZ, x, y, rotateY], (rz, tx, ty, ry) => 
          `translate3d(${tx}px,${ty}px,0) rotateZ(${rz}deg) rotateY(${ry}deg)`
        ),
        transformStyle: 'preserve-3d',
        scale,
        touchAction: isFlipped ? 'auto' : 'none'
      }}
      className={`absolute inset-4 ${isFlipped ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'}`}
    >
      <div className="relative w-full h-full max-w-md mx-auto"
           style={{ transformStyle: 'preserve-3d' }}>
        
        {/* Front of the Card */}
        <div className="absolute w-full h-full bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border-2 border-gray-200 dark:border-gray-700 overflow-hidden backface-hidden" style={{ backfaceVisibility: 'hidden' }}>
          {/* App Icon */}
          <div className="flex justify-center pt-12 pb-6">
            <div 
              className="w-36 h-36 rounded-3xl bg-cover bg-center shadow-lg"
              style={{ backgroundImage: `url(${app.icon})` }}
            />
          </div>

          {/* App Info */}
          <div className="px-8 text-center">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3 line-clamp-2">
              {app.name}
            </h2>
            
            {/* Developer */}
            {app.artist && (
              <div className="mb-4">
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-semibold mb-1">Developer</p>
                <p className="text-gray-700 dark:text-gray-300 text-sm font-medium">
                  {app.artist}
                </p>
              </div>
            )}

            {/* Price */}
            {app.price && (
              <div className="mb-4">
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-semibold mb-1">Price</p>
                <span className="inline-block px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-sm font-medium rounded-full">
                  {app.price}
                </span>
              </div>
            )}

            {/* App Rating & Reviews */}
            {(displayRating > 0 || (app.rating_count && app.rating_count > 0)) && (
              <div className="mb-16">
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-semibold mb-1">App Rating & Reviews</p>
                <div className="flex items-center justify-center gap-3">
                  {displayRating > 0 && (
                    <div className="flex items-center gap-1">
                      <span className="text-xl font-bold text-orange-500">{displayRating.toFixed(1)}</span>
                      <span className="text-orange-400 text-lg">⭐</span>
                    </div>
                  )}
                  {app.rating_count && app.rating_count > 0 && (
                    <p className="text-gray-700 dark:text-gray-300 text-sm font-medium">
                      {app.rating_count > 1000 ? `${(app.rating_count/1000).toFixed(1)}k` : app.rating_count.toLocaleString()} reviews
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* View More Button */}
            <div
              className="no-drag absolute bottom-4 left-1/2 -translate-x-1/2 w-32 h-12 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg cursor-pointer z-[100] flex items-center justify-center border-2 border-blue-600 select-none"
              style={{
                position: 'absolute',
                zIndex: 100,
                pointerEvents: 'auto'
              }}
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsFlipped(true);
              }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsFlipped(true);
              }}
              onMouseEnter={(e) => {
                e.stopPropagation();
              }}
              onMouseMove={(e) => {
                e.stopPropagation();
              }}
            >
              Details →
            </div>
          </div>
        </div>

        {/* Back of the Card */}
        <div 
          className={`absolute w-full h-full bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-800 dark:to-gray-900 rounded-2xl shadow-2xl border-2 border-blue-200 dark:border-gray-700 p-6 text-center backface-hidden ${isFlipped ? 'pointer-events-auto' : 'pointer-events-none'}`}
          style={{ transform: 'rotateY(180deg)', backfaceVisibility: 'hidden' }}
        >
          
          {/* Features Content */}
          <div className="space-y-4 text-left mb-20">
            {app.primary_use_case && (
              <div className="bg-white dark:bg-gray-700 rounded-lg p-4 shadow-sm border border-blue-200 dark:border-gray-600">
                <div className="flex items-center mb-2">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center mr-3">
                    <span className="text-white text-sm">🎯</span>
                  </div>
                  <h4 className="text-sm font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wide">Primary Use Case</h4>
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed line-clamp-3">{app.primary_use_case}</p>
              </div>
            )}
            
            {app.target_user && (
              <div className="bg-white dark:bg-gray-700 rounded-lg p-4 shadow-sm border border-green-200 dark:border-gray-600">
                <div className="flex items-center mb-2">
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center mr-3">
                    <span className="text-white text-sm">👥</span>
                  </div>
                  <h4 className="text-sm font-bold text-green-700 dark:text-green-300 uppercase tracking-wide">Target Users</h4>
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed line-clamp-3">{app.target_user}</p>
              </div>
            )}

            {app.key_benefit && (
              <div className="bg-white dark:bg-gray-700 rounded-lg p-4 shadow-sm border border-purple-200 dark:border-gray-600">
                <div className="flex items-center mb-2">
                  <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center mr-3">
                    <span className="text-white text-sm">⭐</span>
                  </div>
                  <h4 className="text-sm font-bold text-purple-700 dark:text-purple-300 uppercase tracking-wide">Key Benefit</h4>
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed line-clamp-3">{app.key_benefit}</p>
              </div>
            )}

          </div>
        </div>

        {/* View Less Button - Outside back card for better event handling */}
        {isFlipped && (
          <div
            className="no-drag absolute bottom-8 left-1/2 w-32 h-12 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg cursor-pointer z-[300] flex items-center justify-center border-2 border-blue-600 select-none"
            style={{
              zIndex: 300,
              pointerEvents: 'auto',
              transform: 'translateX(-50%) rotateY(180deg)'
            }}
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsFlipped(false);
            }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsFlipped(false);
            }}
            onMouseEnter={(e) => {
              e.stopPropagation();
            }}
            onTouchStart={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsFlipped(false);
            }}
            onMouseMove={(e) => {
              e.stopPropagation();
            }}
          >
            ← Back
          </div>
        )}

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

