import { useState, useEffect, useCallback, useMemo } from 'react';
import { X, Trash, Play, Pause, Stop, Clock, Plus, CheckCircle, Circle } from '@phosphor-icons/react';
import { useStore } from '../store';
import { STATUS_OPTIONS, PRIORITY_OPTIONS, SCHEDULED_TIME_OPTIONS, DURATION_OPTIONS, STORAGE_KEYS } from '../utils/constants';
import { formatDateForInput } from '../utils/dates';
import type { Task } from '../types';

interface EditTaskPanelProps {
  task: Task | null;
  onClose: () => void;
  onAddSubtask?: (parentTask: Task) => void;
}

export function EditTaskPanel({ task, onClose, onAddSubtask }: EditTaskPanelProps) {
  const { projects, tags, tasks, updateTask, deleteTask, isDarkMode, showConfirm } = useStore();
  
  const [name, setName] = useState('');
  const [projectId, setProjectId] = useState<string | null>(null);
  const [dueDate, setDueDate] = useState('');
  const [startDate, setStartDate] = useState('');
  const [priority, setPriority] = useState<string>('');
  const [status, setStatus] = useState<string>('');
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [parentTaskId, setParentTaskId] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [scheduledTime, setScheduledTime] = useState<string>('');
  const [duration, setDuration] = useState<string>('');
  const [syncToCalendar, setSyncToCalendar] = useState(false);
  const [plannedEffort, setPlannedEffort] = useState('');
  const [actualEffort, setActualEffort] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Timer state
  const [timerState, setTimerState] = useState<{
    isRunning: boolean;
    isPaused: boolean;
    startTime: number;
    accumulatedSeconds: number;
  } | null>(null);
  const [timerDisplay, setTimerDisplay] = useState(0);
  
  const colors = {
    bg: isDarkMode ? '#1f1f1f' : '#ffffff',
    surface: isDarkMode ? '#282828' : '#ffffff',
    border: isDarkMode ? '#3a3a3a' : '#e0e0e0',
    text: isDarkMode ? '#ffffff' : '#202020',
    textSecondary: isDarkMode ? '#a0a0a0' : '#808080',
    inputBg: isDarkMode ? '#333333' : '#ffffff',
    primary: '#d1453b',
    danger: '#ef4444',
  };
  
  // Get subtasks of this task
  const subtasks = useMemo(() => {
    if (!task) return [];
    return tasks.filter(t => t.parentTaskId === task.id);
  }, [task, tasks]);
  
  const completedSubtasksCount = useMemo(() => {
    return subtasks.filter(t => t.status === '✅ Done').length;
  }, [subtasks]);
  
  // Load task data when task changes
  useEffect(() => {
    if (task) {
      setName(task.name);
      setProjectId(task.projectId);
      setDueDate(formatDateForInput(task.dueDate));
      setStartDate(formatDateForInput(task.startDate));
      setPriority(task.priority || '');
      setStatus(task.status || '📥 Inbox');
      setSelectedTagIds(task.tagIds || []);
      setParentTaskId(task.parentTaskId);
      setNotes(task.notes || '');
      setScheduledTime(task.scheduledTime || '');
      setDuration(task.duration || '');
      setSyncToCalendar(task.syncToCalendar || false);
      setPlannedEffort(formatDurationForDisplay(task.plannedEffort));
      setActualEffort(formatDurationForDisplay(task.actualEffort));
      
      // Load timer state from localStorage if it's for this task
      const savedTimer = localStorage.getItem(STORAGE_KEYS.ACTIVE_TIMER);
      if (savedTimer) {
        try {
          const parsed = JSON.parse(savedTimer);
          if (parsed.taskId === task.id) {
            setTimerState({
              isRunning: !parsed.isPaused,
              isPaused: parsed.isPaused,
              startTime: parsed.startTime,
              accumulatedSeconds: parsed.accumulatedSeconds || 0,
            });
          }
        } catch (e) {
          console.error('Failed to parse saved timer:', e);
        }
      }
    }
  }, [task]);
  
  // Timer effect - update display every second when running
  useEffect(() => {
    if (!timerState || timerState.isPaused) {
      return;
    }
    
    const updateTimer = () => {
      const now = Date.now();
      const elapsed = Math.floor((now - timerState.startTime) / 1000);
      setTimerDisplay((timerState.accumulatedSeconds || 0) + elapsed);
    };
    
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [timerState]);
  
  // Format seconds to "Xh Ym" display
  const formatDurationForDisplay = (seconds: number | null): string => {
    if (!seconds || seconds <= 0) return '';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h`;
    if (minutes > 0) return `${minutes}m`;
    return '';
  };
  
  // Parse duration input like "2h 30m" to seconds
  const parseDurationInput = (input: string): number | null => {
    if (!input) return null;
    const cleanInput = input.toLowerCase().trim();
    let totalSeconds = 0;
    
    // Match hours
    const hoursMatch = cleanInput.match(/(\d+)\s*h/);
    if (hoursMatch) {
      totalSeconds += parseInt(hoursMatch[1], 10) * 3600;
    }
    
    // Match minutes
    const minutesMatch = cleanInput.match(/(\d+)\s*m/);
    if (minutesMatch) {
      totalSeconds += parseInt(minutesMatch[1], 10) * 60;
    }
    
    // If no h/m found, try plain number as minutes
    if (!hoursMatch && !minutesMatch) {
      const num = parseInt(cleanInput, 10);
      if (!isNaN(num)) {
        totalSeconds = num * 60;
      }
    }
    
    return totalSeconds > 0 ? totalSeconds : null;
  };
  
  // Format timer display as HH:MM:SS or MM:SS
  const formatTimerDisplay = (totalSeconds: number): string => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    
    if (hours > 0) {
      return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };
  
  const activeProjects = projects.filter(p => p.status === 'Active');
  const parentTasks = tasks.filter(t => !t.parentTaskId && t.status !== '✅ Done' && t.id !== task?.id);
  
  // Timer controls
  const handleStartTimer = useCallback(() => {
    if (!task) return;
    
    const newState = {
      isRunning: true,
      isPaused: false,
      startTime: Date.now(),
      accumulatedSeconds: timerState?.accumulatedSeconds || 0,
    };
    setTimerState(newState);
    
    // Save to localStorage
    localStorage.setItem(STORAGE_KEYS.ACTIVE_TIMER, JSON.stringify({
      taskId: task.id,
      taskName: task.name,
      startTime: newState.startTime,
      accumulatedSeconds: newState.accumulatedSeconds,
      isPaused: false,
    }));
  }, [task, timerState]);
  
  const handlePauseTimer = useCallback(() => {
    if (!timerState || !task) return;
    
    const now = Date.now();
    const sessionSeconds = Math.floor((now - timerState.startTime) / 1000);
    const totalAccumulated = (timerState.accumulatedSeconds || 0) + sessionSeconds;
    
    const newState = {
      isRunning: false,
      isPaused: true,
      startTime: timerState.startTime,
      accumulatedSeconds: totalAccumulated,
    };
    setTimerState(newState);
    setTimerDisplay(totalAccumulated);
    
    // Save to localStorage
    localStorage.setItem(STORAGE_KEYS.ACTIVE_TIMER, JSON.stringify({
      taskId: task.id,
      taskName: task.name,
      startTime: newState.startTime,
      accumulatedSeconds: totalAccumulated,
      isPaused: true,
    }));
  }, [timerState, task]);
  
  const handleStopTimer = useCallback(async () => {
    if (!timerState || !task) return;
    
    // Calculate total time
    let totalSeconds = timerState.accumulatedSeconds || 0;
    if (!timerState.isPaused) {
      const now = Date.now();
      const sessionSeconds = Math.floor((now - timerState.startTime) / 1000);
      totalSeconds += sessionSeconds;
    }
    
    // Round to nearest minute (minimum 1 minute)
    const roundedSeconds = Math.max(60, Math.round(totalSeconds / 60) * 60);
    
    // Add to existing actual effort
    const currentActual = parseDurationInput(actualEffort) || 0;
    const newActual = currentActual + roundedSeconds;
    
    // Update the task
    await updateTask(task.id, {
      actualEffort: newActual,
    });
    
    // Update local state
    setActualEffort(formatDurationForDisplay(newActual));
    
    // Clear timer
    setTimerState(null);
    setTimerDisplay(0);
    localStorage.removeItem(STORAGE_KEYS.ACTIVE_TIMER);
  }, [timerState, task, actualEffort, updateTask]);
  
  const handleResumeTimer = useCallback(() => {
    if (!task || !timerState) return;
    
    const newState = {
      isRunning: true,
      isPaused: false,
      startTime: Date.now(),
      accumulatedSeconds: timerState.accumulatedSeconds,
    };
    setTimerState(newState);
    
    localStorage.setItem(STORAGE_KEYS.ACTIVE_TIMER, JSON.stringify({
      taskId: task.id,
      taskName: task.name,
      startTime: newState.startTime,
      accumulatedSeconds: newState.accumulatedSeconds,
      isPaused: false,
    }));
  }, [task, timerState]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!task || !name.trim()) return;
    
    setIsSubmitting(true);
    
    try {
      await updateTask(task.id, {
        name: name.trim(),
        status,
        priority,
        projectId,
        tagIds: selectedTagIds,
        dueDate: dueDate || null,
        startDate: startDate || null,
        parentTaskId,
        notes,
        scheduledTime: scheduledTime || null,
        duration: duration || null,
        syncToCalendar,
        plannedEffort: parseDurationInput(plannedEffort),
        actualEffort: parseDurationInput(actualEffort),
      });
      
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleDelete = () => {
    if (!task) return;
    showConfirm({
      title: 'Delete Task',
      message: `Are you sure you want to delete "${task.name}"? This action cannot be undone.`,
      type: 'delete',
      onConfirm: async () => {
        await deleteTask(task.id);
        onClose();
      },
    });
  };
  
  const toggleTag = (tagId: string) => {
    setSelectedTagIds(prev => 
      prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId]
    );
  };
  
  if (!task) return null;
  
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        right: 0,
        width: 400,
        height: '100vh',
        backgroundColor: colors.surface,
        borderLeft: `1px solid ${colors.border}`,
        boxShadow: '-4px 0 12px rgba(0, 0, 0, 0.1)',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 20px',
        borderBottom: `1px solid ${colors.border}`,
        flexShrink: 0,
      }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, color: colors.text, margin: 0 }}>
          Edit Task
        </h2>
        <button
          onClick={onClose}
          style={{
            padding: 4,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: colors.textSecondary,
          }}
        >
          <X size={20} />
        </button>
      </div>
      
      {/* Form */}
      <form onSubmit={handleSubmit} style={{ flex: 1, overflow: 'auto', padding: 20 }}>
        {/* Task Name */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: colors.textSecondary, marginBottom: 6 }}>
            Task Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            style={{
              width: '100%',
              padding: '10px 12px',
              fontSize: 14,
              border: `1px solid ${colors.border}`,
              borderRadius: 6,
              backgroundColor: colors.inputBg,
              color: colors.text,
              outline: 'none',
            }}
          />
        </div>
        
        {/* Project */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: colors.textSecondary, marginBottom: 6 }}>
            Project
          </label>
          <select
            value={projectId || ''}
            onChange={(e) => setProjectId(e.target.value || null)}
            style={{
              width: '100%',
              padding: '10px 12px',
              fontSize: 14,
              border: `1px solid ${colors.border}`,
              borderRadius: 6,
              backgroundColor: colors.inputBg,
              color: colors.text,
              outline: 'none',
            }}
          >
            <option value="">No project</option>
            {activeProjects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
        
        {/* Due Date & Start Date */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: colors.textSecondary, marginBottom: 6 }}>
              Due Date
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                fontSize: 14,
                border: `1px solid ${colors.border}`,
                borderRadius: 6,
                backgroundColor: colors.inputBg,
                color: colors.text,
                outline: 'none',
              }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: colors.textSecondary, marginBottom: 6 }}>
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                fontSize: 14,
                border: `1px solid ${colors.border}`,
                borderRadius: 6,
                backgroundColor: colors.inputBg,
                color: colors.text,
                outline: 'none',
              }}
            />
          </div>
        </div>
        
        {/* Priority & Status */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: colors.textSecondary, marginBottom: 6 }}>
              Priority
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                fontSize: 14,
                border: `1px solid ${colors.border}`,
                borderRadius: 6,
                backgroundColor: colors.inputBg,
                color: colors.text,
                outline: 'none',
              }}
            >
              <option value="">No priority</option>
              {PRIORITY_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: colors.textSecondary, marginBottom: 6 }}>
              Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                fontSize: 14,
                border: `1px solid ${colors.border}`,
                borderRadius: 6,
                backgroundColor: colors.inputBg,
                color: colors.text,
                outline: 'none',
              }}
            >
              {STATUS_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>
        
        {/* Tags */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: colors.textSecondary, marginBottom: 6 }}>
            Tags
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {tags.map(tag => {
              const isSelected = selectedTagIds.includes(tag.id);
              return (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => toggleTag(tag.id)}
                  style={{
                    padding: '4px 10px',
                    fontSize: 12,
                    borderRadius: 16,
                    border: `1px solid ${isSelected ? colors.primary : colors.border}`,
                    backgroundColor: isSelected ? (isDarkMode ? 'rgba(209, 69, 59, 0.2)' : '#fee9e9') : 'transparent',
                    color: isSelected ? colors.primary : colors.text,
                    cursor: 'pointer',
                  }}
                >
                  {tag.name}
                </button>
              );
            })}
          </div>
        </div>
        
        {/* Parent Task */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: colors.textSecondary, marginBottom: 6 }}>
            Parent Task
          </label>
          <select
            value={parentTaskId || ''}
            onChange={(e) => setParentTaskId(e.target.value || null)}
            style={{
              width: '100%',
              padding: '10px 12px',
              fontSize: 14,
              border: `1px solid ${colors.border}`,
              borderRadius: 6,
              backgroundColor: colors.inputBg,
              color: colors.text,
              outline: 'none',
            }}
          >
            <option value="">None (standalone task)</option>
            {parentTasks.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
        
        {/* Calendar Scheduling */}
        <div style={{ 
          padding: 12, 
          backgroundColor: isDarkMode ? '#2a2a2a' : '#f9fafb', 
          borderRadius: 8, 
          marginBottom: 16,
          border: `1px solid ${colors.border}`,
        }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: colors.text, marginBottom: 12 }}>
            Calendar Scheduling
          </label>
          
          <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: 12, color: colors.textSecondary, marginBottom: 4 }}>
                Scheduled Time
              </label>
              <select
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  fontSize: 13,
                  border: `1px solid ${colors.border}`,
                  borderRadius: 6,
                  backgroundColor: colors.inputBg,
                  color: colors.text,
                  outline: 'none',
                }}
              >
                <option value="">Not scheduled</option>
                {SCHEDULED_TIME_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: 12, color: colors.textSecondary, marginBottom: 4 }}>
                Duration
              </label>
              <select
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  fontSize: 13,
                  border: `1px solid ${colors.border}`,
                  borderRadius: 6,
                  backgroundColor: colors.inputBg,
                  color: colors.text,
                  outline: 'none',
                }}
              >
                <option value="">Not set</option>
                {DURATION_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>
          
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={syncToCalendar}
              onChange={(e) => setSyncToCalendar(e.target.checked)}
              style={{ width: 16, height: 16, accentColor: colors.primary }}
            />
            <span style={{ fontSize: 13, color: colors.text }}>Sync to Calendar</span>
          </label>
        </div>
        
        {/* Effort Tracking Section */}
        <div style={{ 
          padding: 12, 
          backgroundColor: isDarkMode ? '#1e293b' : '#eff6ff', 
          borderRadius: 8, 
          marginBottom: 16,
          border: `1px solid ${isDarkMode ? '#334155' : '#bfdbfe'}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Clock size={16} style={{ color: isDarkMode ? '#60a5fa' : '#2563eb' }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: isDarkMode ? '#93c5fd' : '#1d4ed8' }}>
              Effort Tracking
            </span>
          </div>
          
          {/* Effort Inputs */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: 12, color: colors.textSecondary, marginBottom: 4 }}>
                Planned
              </label>
              <input
                type="text"
                value={plannedEffort}
                onChange={(e) => setPlannedEffort(e.target.value)}
                placeholder="e.g., 2h 30m"
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  fontSize: 13,
                  border: `1px solid ${isDarkMode ? '#334155' : '#bfdbfe'}`,
                  borderRadius: 6,
                  backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
                  color: colors.text,
                  outline: 'none',
                }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: 12, color: colors.textSecondary, marginBottom: 4 }}>
                Actual
              </label>
              <input
                type="text"
                value={actualEffort}
                onChange={(e) => setActualEffort(e.target.value)}
                placeholder="e.g., 1h 45m"
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  fontSize: 13,
                  border: `1px solid ${isDarkMode ? '#334155' : '#bfdbfe'}`,
                  borderRadius: 6,
                  backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
                  color: colors.text,
                  outline: 'none',
                }}
              />
            </div>
          </div>
          
          <p style={{ fontSize: 11, color: colors.textSecondary, marginBottom: 12 }}>
            Format: 2h 30m, 1h, 45m, or just minutes (45)
          </p>
          
          {/* Progress Bar (if both planned and actual have values) */}
          {(() => {
            const planned = parseDurationInput(plannedEffort) || 0;
            const actual = parseDurationInput(actualEffort) || 0;
            if (planned <= 0) return null;
            const percentage = Math.min(100, Math.round((actual / planned) * 100));
            const isOver = actual > planned;
            
            return (
              <div style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 11, color: colors.textSecondary }}>Progress</span>
                  <span style={{ 
                    fontSize: 11, 
                    fontWeight: 600, 
                    color: isOver ? '#ef4444' : (isDarkMode ? '#60a5fa' : '#2563eb') 
                  }}>
                    {percentage}%{isOver ? ' (over)' : ''}
                  </span>
                </div>
                <div style={{ 
                  height: 6, 
                  backgroundColor: isDarkMode ? '#334155' : '#dbeafe', 
                  borderRadius: 3,
                  overflow: 'hidden',
                }}>
                  <div style={{
                    height: '100%',
                    width: `${Math.min(100, percentage)}%`,
                    backgroundColor: isOver ? '#ef4444' : (isDarkMode ? '#3b82f6' : '#2563eb'),
                    borderRadius: 3,
                    transition: 'width 0.3s ease',
                  }} />
                </div>
              </div>
            );
          })()}
          
          {/* Timer Controls */}
          <div style={{ 
            paddingTop: 12, 
            borderTop: `1px solid ${isDarkMode ? '#334155' : '#bfdbfe'}`,
          }}>
            {/* Timer display when running or paused */}
            {timerState && (
              <div style={{ textAlign: 'center', marginBottom: 12 }}>
                <span style={{ 
                  fontSize: 28, 
                  fontFamily: 'monospace', 
                  fontWeight: 700, 
                  color: timerState.isPaused 
                    ? (isDarkMode ? '#fbbf24' : '#d97706')
                    : (isDarkMode ? '#60a5fa' : '#2563eb'),
                }}>
                  {formatTimerDisplay(timerDisplay)}
                </span>
                {timerState.isPaused && (
                  <span style={{ 
                    display: 'block', 
                    fontSize: 11, 
                    color: colors.textSecondary,
                    marginTop: 2,
                  }}>
                    Paused
                  </span>
                )}
              </div>
            )}
            
            {/* Timer buttons */}
            <div style={{ display: 'flex', gap: 8 }}>
              {!timerState && (
                <button
                  type="button"
                  onClick={handleStartTimer}
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
                    backgroundColor: isDarkMode ? '#3b82f6' : '#2563eb',
                    color: '#ffffff',
                    cursor: 'pointer',
                  }}
                >
                  <Play size={16} weight="fill" />
                  Start Timer
                </button>
              )}
              
              {timerState && !timerState.isPaused && (
                <>
                  <button
                    type="button"
                    onClick={handlePauseTimer}
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
                      backgroundColor: isDarkMode ? '#eab308' : '#d97706',
                      color: '#ffffff',
                      cursor: 'pointer',
                    }}
                  >
                    <Pause size={16} weight="fill" />
                    Pause
                  </button>
                  <button
                    type="button"
                    onClick={handleStopTimer}
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
                </>
              )}
              
              {timerState && timerState.isPaused && (
                <>
                  <button
                    type="button"
                    onClick={handleResumeTimer}
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
                  <button
                    type="button"
                    onClick={handleStopTimer}
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
                    Stop & Save
                  </button>
                </>
              )}
            </div>
            
            {timerState && (
              <p style={{ 
                fontSize: 11, 
                color: colors.textSecondary, 
                textAlign: 'center',
                marginTop: 8,
              }}>
                Stopping will add time to Actual Effort
              </p>
            )}
          </div>
        </div>
        
        {/* Subtasks Section */}
        {task && !task.parentTaskId && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <label style={{ fontSize: 13, fontWeight: 500, color: colors.textSecondary }}>
                Subtasks {subtasks.length > 0 && `(${completedSubtasksCount}/${subtasks.length})`}
              </label>
              {onAddSubtask && (
                <button
                  type="button"
                  onClick={() => onAddSubtask(task)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '4px 8px',
                    fontSize: 12,
                    fontWeight: 500,
                    border: 'none',
                    backgroundColor: 'transparent',
                    color: colors.primary,
                    cursor: 'pointer',
                    borderRadius: 4,
                  }}
                >
                  <Plus size={14} />
                  Add subtask
                </button>
              )}
            </div>
            {subtasks.length > 0 ? (
              <div style={{
                border: `1px solid ${colors.border}`,
                borderRadius: 8,
                overflow: 'hidden',
              }}>
                {subtasks.map((subtask, index) => {
                  const isDone = subtask.status === '✅ Done';
                  return (
                    <div
                      key={subtask.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '10px 12px',
                        borderBottom: index < subtasks.length - 1 ? `1px solid ${colors.border}` : 'none',
                        backgroundColor: isDarkMode ? '#242424' : '#fafafa',
                      }}
                    >
                      {isDone ? (
                        <CheckCircle size={18} weight="fill" style={{ color: '#22c55e', flexShrink: 0 }} />
                      ) : (
                        <Circle size={18} style={{ color: colors.textSecondary, flexShrink: 0 }} />
                      )}
                      <span style={{
                        fontSize: 13,
                        color: isDone ? colors.textSecondary : colors.text,
                        textDecoration: isDone ? 'line-through' : 'none',
                        flex: 1,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {subtask.name}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{
                padding: '16px',
                border: `1px dashed ${colors.border}`,
                borderRadius: 8,
                textAlign: 'center',
              }}>
                <p style={{ fontSize: 13, color: colors.textSecondary, margin: 0 }}>
                  No subtasks yet
                </p>
              </div>
            )}
          </div>
        )}
        
        {/* Notes */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: colors.textSecondary, marginBottom: 6 }}>
            Notes
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add any additional details..."
            rows={4}
            style={{
              width: '100%',
              padding: '10px 12px',
              fontSize: 14,
              border: `1px solid ${colors.border}`,
              borderRadius: 6,
              backgroundColor: colors.inputBg,
              color: colors.text,
              outline: 'none',
              resize: 'vertical',
              fontFamily: 'inherit',
            }}
          />
        </div>
        
        {/* Actions */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between' }}>
          <button
            type="button"
            onClick={handleDelete}
            style={{
              padding: '10px 16px',
              fontSize: 14,
              fontWeight: 500,
              borderRadius: 6,
              border: 'none',
              backgroundColor: isDarkMode ? 'rgba(239, 68, 68, 0.2)' : '#fee2e2',
              color: colors.danger,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Trash size={16} />
            Delete
          </button>
          
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '10px 16px',
                fontSize: 14,
                fontWeight: 500,
                borderRadius: 6,
                border: 'none',
                backgroundColor: isDarkMode ? '#3a3a3a' : '#f5f5f5',
                color: colors.text,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              style={{
                padding: '10px 16px',
                fontSize: 14,
                fontWeight: 500,
                borderRadius: 6,
                border: 'none',
                backgroundColor: colors.primary,
                color: '#ffffff',
                cursor: isSubmitting || !name.trim() ? 'not-allowed' : 'pointer',
                opacity: isSubmitting || !name.trim() ? 0.5 : 1,
              }}
            >
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
