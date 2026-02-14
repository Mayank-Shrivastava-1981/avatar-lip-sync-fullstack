import { useEffect, useRef, useState } from 'react';
import type { Viseme } from '../utils/lipSync';

interface TeacherAvatarProps {
  currentViseme: Viseme;
  avatarState: 'idle' | 'speaking';
}

function MouthShape({ viseme }: { viseme: Viseme }) {
  switch (viseme) {
    case 'aa':
      return <ellipse cx="100" cy="215" rx="12" ry="10" fill="#c0392b" />;
    case 'ee':
      return (
        <g>
          <path d="M88 213 Q100 220 112 213" stroke="#c0392b" strokeWidth="2.5" fill="none" />
          <rect x="91" y="210" width="18" height="4" rx="1" fill="#fff" />
        </g>
      );
    case 'oh':
      return <ellipse cx="100" cy="215" rx="8" ry="10" fill="#c0392b" />;
    case 'oo':
      return <ellipse cx="100" cy="215" rx="5" ry="6" fill="#c0392b" />;
    case 'pp':
      return <line x1="92" y1="215" x2="108" y2="215" stroke="#c0392b" strokeWidth="3" strokeLinecap="round" />;
    case 'sil':
    default:
      return <path d="M90 213 Q100 219 110 213" stroke="#c0392b" strokeWidth="2" fill="none" />;
  }
}

export default function TeacherAvatar({ currentViseme, avatarState }: TeacherAvatarProps) {
  const [blinkOpen, setBlinkOpen] = useState(true);
  const blinkTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const [gestureActive, setGestureActive] = useState(false);
  const gestureTimerRef = useRef<ReturnType<typeof setInterval>>();

  // Blinking
  useEffect(() => {
    function scheduleBlink() {
      const delay = 3000 + Math.random() * 2000;
      blinkTimerRef.current = setTimeout(() => {
        setBlinkOpen(false);
        setTimeout(() => {
          setBlinkOpen(true);
          scheduleBlink();
        }, 150);
      }, delay);
    }
    scheduleBlink();
    return () => clearTimeout(blinkTimerRef.current);
  }, []);

  // Arm gesture during speech
  useEffect(() => {
    if (avatarState === 'speaking') {
      gestureTimerRef.current = setInterval(() => {
        setGestureActive(true);
        setTimeout(() => setGestureActive(false), 600);
      }, 4000);
      // Initial gesture after short delay
      setTimeout(() => {
        setGestureActive(true);
        setTimeout(() => setGestureActive(false), 600);
      }, 500);
    } else {
      setGestureActive(false);
      clearInterval(gestureTimerRef.current);
    }
    return () => clearInterval(gestureTimerRef.current);
  }, [avatarState]);

  const isSpeaking = avatarState === 'speaking';

  return (
    <div className="avatar-area">
      <svg
        viewBox="0 0 200 300"
        width="180"
        height="270"
        className={`teacher-svg ${isSpeaking ? 'speaking' : 'idle'}`}
      >
        {/* Body group with breathing animation */}
        <g className="avatar-body">
          {/* Blazer */}
          <path
            d="M50 240 Q50 200 70 190 L100 180 L130 190 Q150 200 150 240 L150 300 L50 300 Z"
            fill="#1a1a5e"
          />
          {/* Collar / shirt */}
          <path d="M85 190 L100 210 L115 190" fill="#fff" stroke="#ddd" strokeWidth="0.5" />
          {/* Lapels */}
          <line x1="85" y1="190" x2="78" y2="240" stroke="#141450" strokeWidth="2" />
          <line x1="115" y1="190" x2="122" y2="240" stroke="#141450" strokeWidth="2" />

          {/* Left arm (resting) */}
          <path
            d="M50 240 Q40 260 45 290"
            stroke="#1a1a5e"
            strokeWidth="16"
            strokeLinecap="round"
            fill="none"
          />

          {/* Right arm (gesturing when speaking) */}
          <path
            d={gestureActive
              ? "M150 240 Q165 220 160 195"
              : "M150 240 Q160 260 155 290"
            }
            stroke="#1a1a5e"
            strokeWidth="16"
            strokeLinecap="round"
            fill="none"
            style={{ transition: 'd 0.3s ease-in-out' }}
          />
          {/* Hand for gesture */}
          {gestureActive && (
            <circle cx="160" cy="192" r="8" fill="#e8b88a" />
          )}
        </g>

        {/* Neck */}
        <rect x="93" y="175" width="14" height="18" rx="4" fill="#e8b88a" />

        {/* Head group with nod animation */}
        <g className={isSpeaking ? 'avatar-head-nod' : ''}>
          {/* Hair (back) */}
          <ellipse cx="100" cy="140" rx="48" ry="52" fill="#5a3825" />

          {/* Face */}
          <ellipse cx="100" cy="150" rx="42" ry="45" fill="#f0c8a0" />

          {/* Hair (front/top) */}
          <path
            d="M58 135 Q60 100 100 95 Q140 100 142 135"
            fill="#5a3825"
          />
          {/* Side hair */}
          <ellipse cx="60" cy="150" rx="8" ry="20" fill="#5a3825" />
          <ellipse cx="140" cy="150" rx="8" ry="20" fill="#5a3825" />

          {/* Eyebrows */}
          <path
            d={isSpeaking ? "M78 138 Q85 134 92 137" : "M78 140 Q85 136 92 139"}
            stroke="#4a2a15"
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
            style={{ transition: 'all 0.3s' }}
          />
          <path
            d={isSpeaking ? "M108 137 Q115 134 122 138" : "M108 139 Q115 136 122 140"}
            stroke="#4a2a15"
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
            style={{ transition: 'all 0.3s' }}
          />

          {/* Eyes */}
          {blinkOpen ? (
            <>
              <ellipse cx="85" cy="152" rx="7" ry="8" fill="#fff" />
              <ellipse cx="115" cy="152" rx="7" ry="8" fill="#fff" />
              <circle cx="86" cy="153" r="4" fill="#2c3e50" />
              <circle cx="116" cy="153" r="4" fill="#2c3e50" />
              <circle cx="87" cy="151" r="1.5" fill="#fff" />
              <circle cx="117" cy="151" r="1.5" fill="#fff" />
            </>
          ) : (
            <>
              <line x1="78" y1="152" x2="92" y2="152" stroke="#2c3e50" strokeWidth="2" strokeLinecap="round" />
              <line x1="108" y1="152" x2="122" y2="152" stroke="#2c3e50" strokeWidth="2" strokeLinecap="round" />
            </>
          )}

          {/* Nose */}
          <path d="M100 160 L97 170 L103 170" fill="none" stroke="#d4a574" strokeWidth="1.5" />

          {/* Mouth */}
          <MouthShape viseme={currentViseme} />
        </g>
      </svg>
    </div>
  );
}
