import React, { useState, useRef, useEffect } from 'react';

interface App {
  id: string;
  name: string;
  category?: string;
  icon: string;
  rating?: number;
}

interface SwipeCardProps {
  app: App;
  onLike: () => void;
  onPass: () => void;
  isActive?: boolean;
  zIndex?: number;
}

const SwipeCard: React.FC<SwipeCardProps> = ({ app, onLike, onPass, isActive = true, zIndex = 10 }) => {
  const [swipeDirection, setSwipeDirection] = useState<'like' | 'pass' | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [rotation, setRotation] = useState(0);
  const cardRef = useRef<HTMLDivElement>(null);
  const startPos = useRef({ x: 0, y: 0 });

  const handleSwipe = (direction: 'like' | 'pass') => {
    setSwipeDirection(direction);
    setTimeout(() => {
      if (direction === 'like') {
        onLike();
      } else {
        onPass();
      }
      setSwipeDirection(null);
      setDragOffset({ x: 0, y: 0 });
      setRotation(0);
    }, 600);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isActive) return;
    setIsDragging(true);
    startPos.current = { x: e.clientX, y: e.clientY };
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!isActive) return;
    setIsDragging(true);
    const touch = e.touches[0];
    startPos.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging || !isActive) return;
    
    const deltaX = e.clientX - startPos.current.x;
    const deltaY = e.clientY - startPos.current.y;
    
    setDragOffset({ x: deltaX, y: deltaY });
    setRotation(deltaX * 0.1); // Subtle rotation based on horizontal movement
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (!isDragging || !isActive) return;
    
    const touch = e.touches[0];
    const deltaX = touch.clientX - startPos.current.x;
    const deltaY = touch.clientY - startPos.current.y;
    
    setDragOffset({ x: deltaX, y: deltaY });
    setRotation(deltaX * 0.1);
  };

  const handleMouseUp = () => {
    if (!isDragging || !isActive) return;
    
    setIsDragging(false);
    
    // Determine if swipe was significant enough (reduced threshold for easier swiping)
    if (Math.abs(dragOffset.x) > 80) {
      if (dragOffset.x > 0) {
        handleSwipe('like');
      } else {
        handleSwipe('pass');
      }
    } else {
      // Snap back to center with smooth animation
      setDragOffset({ x: 0, y: 0 });
      setRotation(0);
    }
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleTouchMove);
      document.addEventListener('touchend', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleMouseUp);
      };
    }
  }, [isDragging, dragOffset]);


  return (
    <div
      ref={cardRef}
      style={{ 
        zIndex,
        transform: swipeDirection === 'like' 
          ? 'translateX(150%) rotate(20deg)' 
          : swipeDirection === 'pass'
          ? 'translateX(-150%) rotate(-20deg)'
          : `translateX(${dragOffset.x}px) translateY(${dragOffset.y}px) rotate(${rotation}deg)`,
        opacity: swipeDirection ? 0 : Math.max(0.3, 1 - Math.abs(dragOffset.x) / 400),
        transition: isDragging ? 'none' : 'all 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
      }}
      className={`absolute inset-0 w-full h-full bg-white border-2 border-gray-900 dark:border-gray-200 dark:bg-gray-800 rounded-xl shadow-2xl flex flex-col justify-between p-8 text-center ${
        isActive ? 'cursor-grab active:cursor-grabbing' : 'pointer-events-none'
      } ${isDragging ? 'cursor-grabbing' : ''}`}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
    >
      {/* Swipe Direction Indicators */}
      {dragOffset.x > 40 && (
        <div className="absolute top-1/4 left-8 bg-green-500/95 text-white px-6 py-3 rounded-full font-bold transform rotate-12 shadow-2xl border-2 border-white text-lg">
          LIKE
        </div>
      )}
      {dragOffset.x < -40 && (
        <div className="absolute top-1/4 right-8 bg-red-500/95 text-white px-6 py-3 rounded-full font-bold transform -rotate-12 shadow-2xl border-2 border-white text-lg">
          PASS
        </div>
      )}
      
      <div className="flex-1 flex flex-col justify-center items-center">
        <div
          className="size-48 rounded-[2.5rem] bg-cover bg-center shadow-2xl mb-8"
          style={{ backgroundImage: `url('${app.icon}')` }}
        ></div>
        <div className="flex flex-col gap-2">
          <h3 className="text-gray-900 dark:text-white text-3xl font-bold">{app.name}</h3>
          <p className="text-gray-500 text-sm">{app.category}</p>
          {app.rating && (
            <div className="flex items-center justify-center gap-1 text-amber-500">
              <span className="font-bold text-sm">{app.rating.toFixed(1)}</span>
              <span className="text-lg">⭐</span>
            </div>
          )}
        </div>
      </div>
      
      {isActive && (
        <>
          <div className="absolute bottom-6 left-6">
            <button
              onClick={() => handleSwipe('pass')}
              className="flex items-center justify-center size-16 bg-red-500 rounded-full text-white shadow-lg hover:bg-red-600 transition-all duration-200 ease-in-out transform hover:scale-110"
            >
              <span className="text-4xl">✕</span>
            </button>
          </div>
          <div className="absolute bottom-6 right-6">
            <button
              onClick={() => handleSwipe('like')}
              className="flex items-center justify-center size-16 bg-green-500 rounded-full text-white shadow-lg hover:bg-green-600 transition-all duration-200 ease-in-out transform hover:scale-110"
            >
              <span className="text-4xl">✓</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default SwipeCard;