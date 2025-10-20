import { ReactNode } from 'react';

interface AppCardProps {
  name: string;
  category: string;
  icon: string;
  rating?: number;
  ratingCount?: number;
  description?: string;
  onLike?: () => void;
  onSkip?: () => void;
  onClick?: () => void;
  children?: ReactNode;
}

export default function AppCard({
  name,
  category,
  icon,
  rating,
  ratingCount,
  description,
  onLike,
  onSkip,
  onClick,
  children
}: AppCardProps) {
  return (
    <div 
      className="group cursor-pointer"
      onClick={onClick}
    >
      <div className="aspect-square w-full overflow-hidden rounded-lg bg-gray-200 dark:bg-gray-800">
        <div 
          className="h-full w-full bg-cover bg-center bg-no-repeat transition-transform duration-300 group-hover:scale-105" 
          style={{ backgroundImage: `url("${icon}")` }}
        />
      </div>
      
      <div className="mt-4">
        <h3 className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2">
          {name}
        </h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {category}
        </p>
        
        {description && (
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
            {description}
          </p>
        )}
        
        {(rating !== undefined && ratingCount !== undefined) && (
          <div className="mt-2 flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
            <span className="text-yellow-400">★</span>
            <span>{rating.toFixed(1)}</span>
            <span className="text-gray-400">•</span>
            <span>{ratingCount.toLocaleString()}</span>
          </div>
        )}
        
        {(onLike || onSkip) && (
          <div className="mt-3 flex gap-2">
            {onSkip && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onSkip();
                }}
                className="flex-1 py-2 px-3 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors text-sm"
              >
                Not for me
              </button>
            )}
            {onLike && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onLike();
                }}
                className="flex-1 py-2 px-3 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors text-sm"
              >
                I like this
              </button>
            )}
          </div>
        )}
        
        {children}
      </div>
    </div>
  );
}