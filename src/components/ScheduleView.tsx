import { useState, useMemo } from 'react';
import { CaretLeft, CaretRight } from '@phosphor-icons/react';
import { useStore } from '../store';
import { parseLocalDate } from '../utils/dates';
import { PROJECT_COLORS, DEFAULT_PROJECT_COLOR } from '../utils/constants';
import type { Task } from '../types';

interface ScheduleViewProps {
  onEditTask: (task: Task) => void;
}

// Time slots from 6am to 9pm
const TIME_SLOTS = Array.from({ length: 16 }, (_, i) => {
  const hour = i + 6;
  return {
    hour,
    label: hour === 12 ? '12 PM' : hour > 12 ? `${hour - 12} PM` : `${hour} AM`,
  };
});

// Parse scheduled time to hour
function parseTimeToHour(timeStr: string | null): number | null {
  if (!timeStr) return null;
  const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) return null;
  let hour = parseInt(match[1]);
  const isPM = match[3].toUpperCase() === 'PM';
  if (isPM && hour !== 12) hour += 12;
  if (!isPM && hour === 12) hour = 0;
  return hour;
}

// Parse duration to hours
function parseDurationToHours(durationStr: string | null): number {
  if (!durationStr) return 1;
  if (durationStr.includes('30 minutes')) return 0.5;
  if (durationStr.includes('1 hour')) return 1;
  if (durationStr.includes('2 hours')) return 2;
  if (durationStr.includes('3 hours')) return 3;
  if (durationStr.includes('4 hours')) return 4;
  if (durationStr.includes('All day')) return 8;
  return 1;
}

export function ScheduleView({ onEditTask }: ScheduleViewProps) {
  const { tasks, showCompleted, isDarkMode } = useStore();
  
  const [viewMode, setViewMode] = useState<'day' | 'week'>('day');
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  const colors = {
    bg: isDarkMode ? '#1f1f1f' : '#ffffff',
    surface: isDarkMode ? '#282828' : '#ffffff',
    border: isDarkMode ? '#3a3a3a' : '#e0e0e0',
    text: isDarkMode ? '#ffffff' : '#202020',
    textSecondary: isDarkMode ? '#a0a0a0' : '#808080',
    textMuted: isDarkMode ? '#606060' : '#b0b0b0',
    primary: '#d1453b',
    timelineBg: isDarkMode ? '#242424' : '#fafafa',
  };
  
  // Get dates for the view
  const viewDates = useMemo(() => {
    if (viewMode === 'day') {
      return [selectedDate];
    }
    // Week view - start from Sunday
    const startOfWeek = new Date(selectedDate);
    startOfWeek.setDate(selectedDate.getDate() - selectedDate.getDay());
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      return date;
    });
  }, [selectedDate, viewMode]);
  
  // Get tasks for each date
  const tasksByDate = useMemo(() => {
    const result: Record<string, { scheduled: Task[]; unscheduled: Task[] }> = {};
    
    viewDates.forEach(date => {
      const dateKey = date.toISOString().split('T')[0];
      result[dateKey] = { scheduled: [], unscheduled: [] };
    });
    
    tasks.forEach(task => {
      if (task.status === '✅ Done' && !showCompleted) return;
      
      const startDate = task.startDate ? parseLocalDate(task.startDate) : null;
      const dueDate = task.dueDate ? parseLocalDate(task.dueDate) : null;
      const taskDate = startDate || dueDate;
      
      if (!taskDate) return;
      
      const dateKey = taskDate.toISOString().split('T')[0];
      if (!result[dateKey]) return;
      
      if (task.scheduledTime) {
        result[dateKey].scheduled.push(task);
      } else {
        result[dateKey].unscheduled.push(task);
      }
    });
    
    return result;
  }, [tasks, viewDates, showCompleted]);
  
  const navigateDate = (direction: number) => {
    const newDate = new Date(selectedDate);
    if (viewMode === 'day') {
      newDate.setDate(newDate.getDate() + direction);
    } else {
      newDate.setDate(newDate.getDate() + direction * 7);
    }
    setSelectedDate(newDate);
  };
  
  const goToToday = () => {
    setSelectedDate(new Date());
  };
  
  const formatDateHeader = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);
    
    const isToday = checkDate.getTime() === today.getTime();
    const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
    const dayNum = date.getDate();
    
    return { dayName, dayNum, isToday };
  };
  
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 24px',
        borderBottom: `1px solid ${colors.border}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={() => navigateDate(-1)}
            style={{
              padding: 6,
              border: 'none',
              backgroundColor: 'transparent',
              color: colors.textSecondary,
              cursor: 'pointer',
            }}
          >
            <CaretLeft size={20} />
          </button>
          <button
            onClick={() => navigateDate(1)}
            style={{
              padding: 6,
              border: 'none',
              backgroundColor: 'transparent',
              color: colors.textSecondary,
              cursor: 'pointer',
            }}
          >
            <CaretRight size={20} />
          </button>
          <span style={{ fontWeight: 600, color: colors.text }}>
            {viewMode === 'day'
              ? selectedDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
              : `${viewDates[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${viewDates[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
            }
          </span>
          <button
            onClick={goToToday}
            style={{
              padding: '4px 12px',
              fontSize: 13,
              border: `1px solid ${colors.border}`,
              borderRadius: 4,
              backgroundColor: 'transparent',
              color: colors.text,
              cursor: 'pointer',
            }}
          >
            Today
          </button>
        </div>
        
        {/* View toggle */}
        <div style={{ display: 'flex', gap: 4, backgroundColor: isDarkMode ? '#333' : '#f0f0f0', borderRadius: 6, padding: 2 }}>
          <button
            onClick={() => setViewMode('day')}
            style={{
              padding: '6px 12px',
              fontSize: 13,
              border: 'none',
              borderRadius: 4,
              backgroundColor: viewMode === 'day' ? colors.primary : 'transparent',
              color: viewMode === 'day' ? '#fff' : colors.text,
              cursor: 'pointer',
            }}
          >
            Day
          </button>
          <button
            onClick={() => setViewMode('week')}
            style={{
              padding: '6px 12px',
              fontSize: 13,
              border: 'none',
              borderRadius: 4,
              backgroundColor: viewMode === 'week' ? colors.primary : 'transparent',
              color: viewMode === 'week' ? '#fff' : colors.text,
              cursor: 'pointer',
            }}
          >
            Week
          </button>
        </div>
      </div>
      
      {/* Calendar Grid */}
      <div style={{ flex: 1, overflow: 'auto', display: 'flex' }}>
        {/* Time labels */}
        <div style={{ width: 60, flexShrink: 0, borderRight: `1px solid ${colors.border}` }}>
          <div style={{ height: 80 }} /> {/* Header spacer */}
          {TIME_SLOTS.map(slot => (
            <div
              key={slot.hour}
              style={{
                height: 48,
                padding: '0 8px',
                fontSize: 11,
                color: colors.textSecondary,
                textAlign: 'right',
                marginTop: -6,
              }}
            >
              {slot.label}
            </div>
          ))}
        </div>
        
        {/* Day columns */}
        <div style={{ flex: 1, display: 'flex', minWidth: 0 }}>
          {viewDates.map(date => {
            const dateKey = date.toISOString().split('T')[0];
            const { dayName, dayNum, isToday } = formatDateHeader(date);
            const dayTasks = tasksByDate[dateKey] || { scheduled: [], unscheduled: [] };
            
            return (
              <div
                key={dateKey}
                style={{
                  flex: 1,
                  minWidth: 120,
                  borderRight: `1px solid ${colors.border}`,
                }}
              >
                {/* Date header */}
                <div style={{
                  height: 40,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderBottom: `1px solid ${colors.border}`,
                  backgroundColor: isToday ? (isDarkMode ? 'rgba(209, 69, 59, 0.1)' : '#fee9e9') : 'transparent',
                }}>
                  <span style={{ fontSize: 11, color: colors.textSecondary }}>{dayName}</span>
                  <span style={{
                    fontSize: 16,
                    fontWeight: 600,
                    color: isToday ? colors.primary : colors.text,
                  }}>{dayNum}</span>
                </div>
                
                {/* Unscheduled tasks */}
                {dayTasks.unscheduled.length > 0 && (
                  <div style={{
                    padding: 4,
                    backgroundColor: colors.timelineBg,
                    borderBottom: `1px solid ${colors.border}`,
                    minHeight: 40,
                  }}>
                    {dayTasks.unscheduled.slice(0, 3).map(task => (
                      <ScheduleTaskCard
                        key={task.id}
                        task={task}
                        colors={colors}
                        isDarkMode={isDarkMode}
                        onClick={() => onEditTask(task)}
                        compact
                      />
                    ))}
                    {dayTasks.unscheduled.length > 3 && (
                      <div style={{ fontSize: 11, color: colors.textSecondary, padding: 4, textAlign: 'center' }}>
                        +{dayTasks.unscheduled.length - 3} more
                      </div>
                    )}
                  </div>
                )}
                
                {/* Time grid */}
                <div style={{ position: 'relative' }}>
                  {TIME_SLOTS.map(slot => (
                    <div
                      key={slot.hour}
                      style={{
                        height: 48,
                        borderBottom: `1px solid ${isDarkMode ? '#2a2a2a' : '#f0f0f0'}`,
                      }}
                    />
                  ))}
                  
                  {/* Scheduled tasks */}
                  {dayTasks.scheduled.map(task => {
                    const startHour = parseTimeToHour(task.scheduledTime);
                    if (startHour === null || startHour < 6) return null;
                    
                    const duration = parseDurationToHours(task.duration);
                    const top = (startHour - 6) * 48;
                    const height = Math.max(duration * 48 - 4, 24);
                    
                    return (
                      <div
                        key={task.id}
                        style={{
                          position: 'absolute',
                          top: top + 2,
                          left: 2,
                          right: 2,
                          height,
                          zIndex: 10,
                        }}
                      >
                        <ScheduleTaskCard
                          task={task}
                          colors={colors}
                          isDarkMode={isDarkMode}
                          onClick={() => onEditTask(task)}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

interface ScheduleTaskCardProps {
  task: Task;
  colors: Record<string, string>;
  isDarkMode: boolean;
  onClick: () => void;
  compact?: boolean;
}

function ScheduleTaskCard({ task, colors, isDarkMode, onClick, compact }: ScheduleTaskCardProps) {
  const projectColor = task.projectId ? PROJECT_COLORS[task.projectId] || DEFAULT_PROJECT_COLOR : null;
  const isCompleted = task.status === '✅ Done';
  
  return (
    <div
      onClick={onClick}
      style={{
        padding: compact ? '4px 6px' : '6px 8px',
        marginBottom: compact ? 2 : 0,
        borderRadius: 4,
        backgroundColor: projectColor 
          ? (isDarkMode ? `${projectColor}30` : `${projectColor}20`)
          : (isDarkMode ? '#3a3a3a' : '#f0f0f0'),
        borderLeft: `3px solid ${projectColor || colors.textSecondary}`,
        cursor: 'pointer',
        height: compact ? 'auto' : '100%',
        overflow: 'hidden',
        opacity: isCompleted ? 0.5 : 1,
      }}
    >
      <div style={{
        fontSize: compact ? 11 : 12,
        fontWeight: 500,
        color: colors.text,
        textDecoration: isCompleted ? 'line-through' : 'none',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: compact ? 'nowrap' : 'normal',
      }}>
        {task.name}
      </div>
      {!compact && task.scheduledTime && (
        <div style={{ fontSize: 10, color: colors.textSecondary, marginTop: 2 }}>
          {task.scheduledTime} {task.duration && `• ${task.duration}`}
        </div>
      )}
    </div>
  );
}
