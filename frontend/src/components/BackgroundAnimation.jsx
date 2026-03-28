import React, { useMemo } from 'react';
import './BackgroundAnimation.css';

const STRAND_COUNT = 18;
const PARTICLE_COUNT = 40;

export default function BackgroundAnimation() {
  // Generate random strands once
  const strands = useMemo(() => 
    Array.from({ length: STRAND_COUNT }).map((_, i) => {
      const startY = 400 + Math.random() * 200;
      const c1x = 200 + Math.random() * 200;
      const c1y = 100 + Math.random() * 400;
      const c2x = 800 + Math.random() * 300;
      const c2y = 400 + Math.random() * 500;
      const endX = 1600;
      const endY = 200 + Math.random() * 600;
      
      return {
        id: i,
        path: `M-100,${startY} C${c1x},${c1y} ${c2x},${c2y} ${endX},${endY}`,
        width: Math.random() * 2.5 + 0.5,
        duration: `${Math.random() * 10 + 15}s`,
        delay: `-${Math.random() * 20}s`,
        color: i % 2 === 0 ? 'var(--brand-blue)' : 'var(--brand-green)',
        opacity: Math.random() * 0.4 + 0.1,
      };
    }), []);

  // Generate random particles once
  const particles = useMemo(() => 
    Array.from({ length: PARTICLE_COUNT }).map((_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      size: `${Math.random() * 4 + 1}px`,
      duration: `${Math.random() * 15 + 10}s`,
      delay: `-${Math.random() * 20}s`,
      opacity: Math.random() * 0.5 + 0.2,
    })), []);

  return (
    <div className="background-animation-layer">
      {/* Moving Waves SVG */}
      <svg className="waves-container" width="100%" height="100%" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="energy-glow">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Dynamic Energy Strands */}
        {strands.map(s => (
          <React.Fragment key={s.id}>
            <path 
              className="energy-strand"
              d={s.path}
              fill="none"
              stroke={s.color}
              strokeWidth={s.width}
              strokeLinecap="round"
              filter="url(#energy-glow)"
              style={{
                opacity: s.opacity,
                animationDuration: s.duration,
                animationDelay: s.delay
              }}
            />
            {/* Traveling Energy Pulse */}
            <path 
              className="energy-pulse"
              d={s.path}
              fill="none"
              stroke="#ffffff"
              strokeWidth={s.width * 1.5}
              strokeLinecap="round"
              filter="url(#energy-glow)"
              style={{
                animationDuration: `${parseFloat(s.duration) * 0.4}s`,
                animationDelay: s.delay
              }}
            />
          </React.Fragment>
        ))}
      </svg>

      {/* Floating Particles */}
      <div className="particles-container">
        {particles.map(p => (
          <div 
            key={p.id}
            className="particle"
            style={{
              left: p.left,
              top: p.top,
              width: p.size,
              height: p.size,
              opacity: p.opacity,
              animationDuration: p.duration,
              animationDelay: p.delay
            }}
          />
        ))}
      </div>

      <div className="overlay-vignette"></div>
    </div>
  );
}
