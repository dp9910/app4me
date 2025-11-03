'use client';

import { useDrag } from '@use-gesture/react';
import { animated, useSpring, to } from '@react-spring/web';

interface CardProps {
  name: string;
  category: string;
  icon: string;
  onLike?: () => void;
  onSkip?: () => void;
}

export default function Card({ name, category, icon, onLike, onSkip }: CardProps) {
  const [{ x, y, rotateX, rotateY, rotateZ, scale }, api] = useSpring(() => ({
    rotateX: 0,
    rotateY: 0,
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
      if (dir === -1 && onSkip) onSkip();
    }

    api.start({
      x: down ? mx : 0,
      rotateZ: down ? mx / 10 : 0,
      scale: down ? 1.1 : 1,
    });
  });

  return (
    <animated.div
      {...bind()}
      style={{ x, y, rotateX, rotateY, rotateZ, scale }}
      className="w-full max-w-md rounded-xl bg-gray-50 dark:bg-[#192b33] shadow-2xl shadow-black/20 backdrop-blur-sm transition-all duration-300 ease-out cursor-grab active:cursor-grabbing"
    >
      <div className="relative w-full h-full">
        <div
          className="w-full h-full bg-center bg-no-repeat bg-contain rounded-xl"
          style={{ backgroundImage: `url("${icon}")` }}
        ></div>
        <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent rounded-b-xl">
          <h3 className="text-2xl font-bold text-white">{name}</h3>
          <p className="text-lg text-gray-300">{category}</p>
        </div>
        <animated.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-4xl font-bold text-red-500 border-4 border-red-500 rounded-lg px-4 py-2 transform -rotate-12 opacity-0"
          style={{
            opacity: to(x, (x) => (x < -50 ? 1 : 0)),
          }}
        >
          NOPE
        </animated.div>
        <animated.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-4xl font-bold text-green-500 border-4 border-green-500 rounded-lg px-4 py-2 transform rotate-12 opacity-0"
          style={{
            opacity: to(x, (x) => (x > 50 ? 1 : 0)),
          }}
        >
          LIKE
        </animated.div>
      </div>
    </animated.div>
  );
}
