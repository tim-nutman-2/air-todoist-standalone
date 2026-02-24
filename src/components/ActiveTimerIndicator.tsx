import { useState, useEffect, useCallback } from 'react';
import { Play, Pause, Stop, Clock, X } from '@phosphor-icons/react';
import { useStore } from '../store';
import { STORAGE_KEYS } from '../utils/constants';

interface TimerData {
  taskId: string;
  taskName: string;
  startTime: number;
  accumulatedSeconds: number;
  isPaused: boolean;
}

export function ActiveTimerIndicator() {
  const { isDarkMode, tasks, updateTask, showToast } = useStore();
  const [timerData, setTimerData] = useState<TimerData | null>(null);
  const [displaySeconds, setDisplaySeconds] = useState(0);
  const [isMinimized, setIsMinimized] = useState(false);
  
  // Load timer from localStorage
  useEffect(() => {
    const loadTimer = () => {
      const saved = localStorage.getItem(STORAGE_KEYS.ACTIVE_TIMER);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setTimerData(parsed);
        } catch (e) {
          console.error('Failed to parse saved timer:', e);
        }
      } else {
        setTimerData(null);
      }
    };
    
    loadTimer();
    
    // Listen for storage changes (from other tabs/components)
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEYS.ACTIVE_TIMER) {
        loadTimer();
      }
    };
    
    window.addEventListener('storage', handleStorage);
    
    // Also poll for changes from same tab
    const interval = setInterval(loadTimer, 1000);
    
    return () => {
      window.removeEventListener('storage', handleStorage);
      clearInterval(interval);
    };
  }, []);
  
  // Update display every second when running
  useEffect(() => {
    if (!timerData) {
      setDisplaySeconds(0);
      return;
    }
    
    if (timerData.isPaused) {
      setDisplaySeconds(timerData.accumulatedSeconds || 0);
      return;
    }
    
    const updateTimer = () => {
      const now = Date.now();
      const elapsed = Math.floor((now - timerData.startTime) / 1000);
      setDisplaySeconds((timerData.accumulatedSeconds || 0) + elapsed);
    };
    
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [timerData]);
  
  // Format timer display
  const formatTimer = (totalSeconds: number): string => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    
    if (hours > 0) {
      return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };
  
  const handlePause = useCallback(() => {
    if (!timerData) return;
    
    const now = Date.now();
    const sessionSeconds = Math.floor((now - timerData.startTime) / 1000);
    const totalAccumulated = (timerData.accumulatedSeconds || 0) + sessionSeconds;
    
    const newData = {
      ...timerData,
      accumulatedSeconds: totalAccumulated,
      isPaused: true,
    };
    
    localStorage.setItem(STORAGE_KEYS.ACTIVE_TIMER, JSON.stringify(newData));
    setTimerData(newData);
    showToast('Timer paused', 'info');
  }, [timerData, showToast]);
  
  const handleResume = useCallback(() => {
    if (!timerData) return;
    
    const newData = {
      ...timerData,
      startTime: Date.now(),
      isPaused: false,
    };
    
    localStorage.setItem(STORAGE_KEYS.ACTIVE_TIMER, JSON.stringify(newData));
    setTimerData(newData);
    showToast('Timer resumed', 'info');
  }, [timerData, showToast]);
  
  const handleStop = useCallback(async () => {
    if (!timerData) return;
    
    // Calculate total time
    let totalSeconds = timerData.accumulatedSeconds || 0;
    if (!timerData.isPaused) {
      const now = Date.now();
      const sessionSeconds = Math.floor((now - timerData.startTime) / 1000);
      totalSeconds += sessionSeconds;
    }
    
    // Round to nearest minute (minimum 1 minute)
    const roundedSeconds = Math.max(60, Math.round(totalSeconds / 60) * 60);
    
    // Find the task
    const task = tasks.find(t => t.id === timerData.taskId);
    if (task) {
      const currentActual = task.actualEffort || 0;
      const newActual = currentActual + roundedSeconds;
      
      await updateTask(task.id, {
        actualEffort: newActual,
      });
      
      const minutes = Math.round(roundedSeconds / 60);
      showToast(`Added ${minutes}m to "${timerData.taskName}"`, 'success');
    }
    
    // Clear timer
    localStorage.removeItem(STORAGE_KEYS.ACTIVE_TIMER);
    setTimerData(null);
  }, [timerData, tasks, updateTask, showToast]);
  
  if (!timerData) return null;
  
  const colors = {
    bg: isDarkMode ? '#1e293b' : '#ffffff',
    border: isDarkMode ? '#334155' : '#e2e8f0',
    text: isDarkMode ? '#f1f5f9' : '#1e293b',
    textSecondary: isDarkMode ? '#94a3b8' : '#64748b',
    timerRunning: isDarkMode ? '#60a5fa' : '#2563eb',
    timerPaused: isDarkMode ? '#fbbf24' : '#d97706',
  };
  
  // Minimized view
  if (isMinimized) {
    return (
      <button
        onClick={() => setIsMinimized(false)}
        style={{
          position: 'fixed',
          bottom: 80,
          right: 24,
          zIndex: 999,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 12px',
          backgroundColor: timerData.isPaused ? colors.timerPaused : colors.timerRunning,
          color: '#ffffff',
          border: 'none',
          borderRadius: 24,
          fontSize: 14,
          fontFamily: 'monospace',
          fontWeight: 600,
          cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        }}
      >
        <Clock size={18} weight="fill" />
        {formatTimer(displaySeconds)}
      </button>
    );
  }
  
  // Full view
  return (
    <div
      style={{
        position: 'fixed',
        bottom: 80,
        right: 24,
        zIndex: 999,
        width: 280,
        backgroundColor: colors.bg,
        border: `1px solid ${colors.border}`,
        borderRadius: 12,
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        borderBottom: `1px solid ${colors.border}`,
        backgroundColor: isDarkMode ? '#0f172a' : '#f8fafc',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Clock size={18} style={{ color: timerData.isPaused ? colors.timerPaused : colors.timerRunning }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: colors.text }}>Timer Running</span>
        </div>
        <button
          onClick={() => setIsMinimized(true)}
          style={{
            padding: 4,
            background: 'none',
            border: 'none',
            color: colors.textSecondary,
            cursor: 'pointer',
          }}
        >
          <X size={16} />
        </button>
      </div>
      
      {/* Content */}
      <div style={{ padding: 16 }}>
        <p style={{
          fontSize: 13,
          color: colors.textSecondary,
          margin: '0 0 8px',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {timerData.taskName}
        </p>
        
        <div style={{
          fontSize: 32,
          fontFamily: 'monospace',
          fontWeight: 700,
          color: timerData.isPaused ? colors.timerPaused : colors.timerRunning,
          textAlign: 'center',
          marginBottom: 16,
        }}>
          {formatTimer(displaySeconds)}
        </div>
        
        {timerData.isPaused && (
          <p style={{ fontSize: 12, color: colors.textSecondary, textAlign: 'center', marginBottom: 12 }}>
            Paused
          </p>
        )}
        
        {/* Controls */}
        <div style={{ display: 'flex', gap: 8 }}>
          {timerData.isPaused ? (
            <button
              onClick={handleResume}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                padding: '10px 12px',
                fontSize: 13,
                fontWeight: 500,
                borderRadius: 6,
                border: 'none',
                backgroundColor: '#22c55e',
                color: '#ffffff',
                cursor: 'pointer',
              }}
            >
              <Play size={16} weight="fill" />
              Resume
            </button>
          ) : (
            <button
              onClick={handlePause}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                padding: '10px 12px',
                fontSize: 13,
                fontWeight: 500,
                borderRadius: 6,
                border: 'none',
                backgroundColor: colors.timerPaused,
                color: '#ffffff',
                cursor: 'pointer',
              }}
            >
              <Pause size={16} weight="fill" />
              Pause
            </button>
          )}
          
          <button
            onClick={handleStop}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              padding: '10px 12px',
              fontSize: 13,
              fontWeight: 500,
              borderRadius: 6,
              border: 'none',
              backgroundColor: '#ef4444',
              color: '#ffffff',
              cursor: 'pointer',
            }}
          >
            <Stop size={16} weight="fill" />
            Stop
          </button>
        </div>
      </div>
    </div>
  );
}
