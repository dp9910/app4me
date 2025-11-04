'use client';

import { useDrag } from '@use-gesture/react';
import { animated, useSpring, to } from '@react-spring/web';

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

  const bind = useDrag(({ down, movement: [mx], direction: [xDir], velocity: [vx] }) => {
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
  });

  const formatDescription = (desc: string) => {
    if (!desc || desc === 'app_name_match' || desc === 'No description available') {
      return '';
    }
    return desc.split('\n')[0].trim();
  };

  const displayRating = app.rating_average || app.rating || 0;

  return (
    <animated.div
      {...bind()}
      style={{ x, y, rotateZ, scale, zIndex }}
      className="absolute inset-4 cursor-grab active:cursor-grabbing"
    >
      <div className="relative w-full h-full max-w-md mx-auto bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border-2 border-gray-200 dark:border-gray-700 overflow-hidden">
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
          <div className="px-4 mb-8">
            <p className="text-gray-600 dark:text-gray-400 text-base leading-relaxed line-clamp-4">
              {formatDescription(app.description) || app.personalized_one_liner || 'No description available.'}
            </p>
          </div>
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
