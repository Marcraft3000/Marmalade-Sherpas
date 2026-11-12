import React, { useRef } from 'react';

// Adapted from React Bits' Spotlight Card by David Haz; see THIRD_PARTY_NOTICES.md.
export default function SpotlightCard({ children, className = '', spotlightColor = 'rgba(184, 219, 217, 0.12)' }) {
  const cardRef = useRef(null);

  const handlePointerMove = (event) => {
    if (!cardRef.current || event.pointerType === 'touch') return;
    const bounds = cardRef.current.getBoundingClientRect();
    cardRef.current.style.setProperty('--mouse-x', `${event.clientX - bounds.left}px`);
    cardRef.current.style.setProperty('--mouse-y', `${event.clientY - bounds.top}px`);
    cardRef.current.style.setProperty('--spotlight-color', spotlightColor);
  };

  return <div ref={cardRef} onPointerMove={handlePointerMove} className={`card-spotlight ${className}`}>{children}</div>;
}
