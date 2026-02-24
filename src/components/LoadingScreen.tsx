import { useState, useEffect } from 'react';
import { Check } from '@phosphor-icons/react';
import { useStore } from '../store';

const LOADING_MESSAGES = [
  "Organizing your priorities...",
  "Getting things ready...",
  "Preparing your workspace...",
  "Loading your tasks...",
  "Setting up productivity mode...",
];

const TIPS = [
  "Use the Dashboard view for a quick overview of all your projects",
  "Click on a task name to quickly edit it inline",
  "Drag tasks between sections in the Kanban board view",
  "Create filters to quickly find tasks matching specific criteria",
  "The Schedule view shows your tasks in a calendar layout",
];

export function LoadingScreen() {
  const { isDarkMode } = useStore();
  const [messageIndex, setMessageIndex] = useState(0);
  const [dots, setDots] = useState('');
  const [tipIndex] = useState(() => Math.floor(Math.random() * TIPS.length));
  
  // Cycle through loading messages
  useEffect(() => {
    const messageInterval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
    }, 2500);
    return () => clearInterval(messageInterval);
  }, []);
  
  // Animate dots
  useEffect(() => {
    const dotsInterval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? '' : prev + '.'));
    }, 400);
    return () => clearInterval(dotsInterval);
  }, []);
  
  return (
    <div
      style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: isDarkMode
          ? 'linear-gradient(to bottom right, #111827, #1f2937)'
          : 'linear-gradient(to bottom right, #f9fafb, #f3f4f6)',
      }}
    >
      {/* Logo/Brand with animated rings */}
      <div style={{ position: 'relative', marginBottom: 32 }}>
        {/* Outer animated ring */}
        <div
          style={{
            position: 'absolute',
            inset: -10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              border: `2px solid ${isDarkMode ? 'rgba(127, 29, 29, 0.5)' : '#fecaca'}`,
              animation: 'ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite',
              opacity: 0.2,
            }}
          />
        </div>
        
        {/* Inner pulsing ring */}
        <div
          style={{
            position: 'absolute',
            inset: -2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              width: 68,
              height: 68,
              borderRadius: '50%',
              border: `2px solid ${isDarkMode ? 'rgba(153, 27, 27, 0.5)' : '#fca5a5'}`,
              animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
            }}
          />
        </div>
        
        {/* Center icon */}
        <div
          style={{
            position: 'relative',
            width: 64,
            height: 64,
            borderRadius: '50%',
            background: 'linear-gradient(to bottom right, #ef4444, #dc2626)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 10px 15px -3px rgba(239, 68, 68, 0.3)',
          }}
        >
          <Check size={32} weight="bold" style={{ color: '#ffffff' }} />
        </div>
      </div>
      
      {/* Brand name */}
      <h1
        style={{
          fontSize: 24,
          fontWeight: 700,
          color: isDarkMode ? '#ffffff' : '#111827',
          margin: '0 0 8px',
        }}
      >
        Air Todoist
      </h1>
      
      {/* Standalone badge */}
      <span
        style={{
          fontSize: 11,
          padding: '2px 10px',
          borderRadius: 12,
          backgroundColor: isDarkMode ? 'rgba(22, 163, 74, 0.2)' : '#dcfce7',
          color: isDarkMode ? '#4ade80' : '#16a34a',
          fontWeight: 500,
          marginBottom: 16,
        }}
      >
        Standalone
      </span>
      
      {/* Loading message */}
      <div style={{ height: 24, display: 'flex', alignItems: 'center' }}>
        <p
          style={{
            fontSize: 14,
            color: isDarkMode ? '#9ca3af' : '#6b7280',
            margin: 0,
          }}
        >
          {LOADING_MESSAGES[messageIndex]}
          <span style={{ display: 'inline-block', width: 24, textAlign: 'left' }}>{dots}</span>
        </p>
      </div>
      
      {/* Progress bar */}
      <div
        style={{
          marginTop: 24,
          width: 192,
          height: 4,
          backgroundColor: isDarkMode ? '#374151' : '#e5e7eb',
          borderRadius: 9999,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            background: 'linear-gradient(to right, #ef4444, #f87171)',
            borderRadius: 9999,
            animation: 'loadingBar 1.5s ease-in-out infinite',
          }}
        />
      </div>
      
      {/* Tip */}
      <p
        style={{
          marginTop: 32,
          fontSize: 12,
          color: isDarkMode ? '#6b7280' : '#9ca3af',
          maxWidth: 280,
          textAlign: 'center',
        }}
      >
        Tip: {TIPS[tipIndex]}
      </p>
      
      {/* CSS Animations */}
      <style>{`
        @keyframes ping {
          75%, 100% {
            transform: scale(1.5);
            opacity: 0;
          }
        }
        
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
        
        @keyframes loadingBar {
          0% {
            width: 0%;
            margin-left: 0%;
          }
          50% {
            width: 70%;
            margin-left: 15%;
          }
          100% {
            width: 0%;
            margin-left: 100%;
          }
        }
      `}</style>
    </div>
  );
}
