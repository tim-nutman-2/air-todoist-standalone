import { useState, useRef, useEffect } from 'react';
import {
  Circle,
  CheckCircle,
  CalendarBlank,
  PencilSimple,
  DotsThree,
  CaretDown,
  CaretRight,
  Trash,
  Copy,
  TreeStructure,
  Play,
} from '@phosphor-icons/react';
import { useStore } from '../store';
import { getDueDateInfo, formatDateForInput, parseLocalDate } from '../utils/dates';
import { PROJECT_COLORS, DEFAULT_PROJECT_COLOR } from '../utils/constants';
import type { Task } from '../types';

interface TaskItemProps {
  task: Task;
  level?: number;
  showProject?: boolean;
  onEditTask?: (task: Task) => void;
}

export function TaskItem({ task, level = 0, showProject = true, onEditTask }: TaskItemProps) {
  const {
    tasks,
    projects,
    tags,
    completeTask,
    updateTask,
    deleteTask,
    createTask,
    showCompleted,
    isDarkMode,
  } = useStore();
  
  const [isHovered, setIsHovered] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(task.name);
  const [isExpanded, setIsExpanded] = useState(true);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const datePickerRef = useRef<HTMLDivElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  
  // Colors based on dark mode
  const colors = {
    bg: isDarkMode ? '#1f1f1f' : '#ffffff',
    bgHover: isDarkMode ? '#282828' : '#fafafa',
    border: isDarkMode ? '#3a3a3a' : '#e0e0e0',
    text: isDarkMode ? '#ffffff' : '#202020',
    textSecondary: isDarkMode ? '#a0a0a0' : '#808080',
    textMuted: isDarkMode ? '#606060' : '#b0b0b0',
    primary: '#d1453b',
    checkboxBorder: isDarkMode ? '#505050' : '#d0d0d0',
    menuBg: isDarkMode ? '#333333' : '#ffffff',
  };
  
  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (datePickerRef.current && !datePickerRef.current.contains(e.target as Node)) {
        setShowDatePicker(false);
      }
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setShowMoreMenu(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  // Get subtasks
  const subtasks = tasks.filter(t => t.parentTaskId === task.id);
  const visibleSubtasks = showCompleted 
    ? subtasks 
    : subtasks.filter(t => t.status !== '✅ Done');
  const hasSubtasks = subtasks.length > 0;
  
  // Get project
  const project = projects.find(p => p.id === task.projectId);
  const projectColor = task.projectId ? PROJECT_COLORS[task.projectId] || DEFAULT_PROJECT_COLOR : null;
  
  // Get tags
  const taskTags = tags.filter(t => task.tagIds.includes(t.id));
  
  // Due date info
  const dueDateInfo = getDueDateInfo(task.dueDate);
  
  // Start date info
  const getStartDateInfo = () => {
    if (!task.startDate) return null;
    const start = parseLocalDate(task.startDate);
    if (!start) return null;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    start.setHours(0, 0, 0, 0);
    
    const diffDays = Math.floor((start.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return { text: `Started ${Math.abs(diffDays)}d ago`, isPast: true, isToday: false };
    } else if (diffDays === 0) {
      return { text: 'Starts today', isPast: false, isToday: true };
    } else if (diffDays === 1) {
      return { text: 'Starts tomorrow', isPast: false, isToday: false };
    } else {
      return { text: `Starts ${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`, isPast: false, isToday: false };
    }
  };
  const startDateInfo = getStartDateInfo();
  
  const isCompleted = task.status === '✅ Done';
  const isTopPriority = task.priority === '🔥 Top 5';
  
  const handleComplete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isCompleted) {
      await completeTask(task.id);
    } else {
      await updateTask(task.id, { status: '📋 To Do', completedDate: null });
    }
  };
  
  const handleNameClick = () => {
    if (!isCompleted) {
      setIsEditing(true);
    }
  };
  
  const handleNameSave = async () => {
    if (editedName.trim() && editedName !== task.name) {
      await updateTask(task.id, { name: editedName.trim() });
    } else {
      setEditedName(task.name);
    }
    setIsEditing(false);
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleNameSave();
    } else if (e.key === 'Escape') {
      setEditedName(task.name);
      setIsEditing(false);
    }
  };
  
  const handleDateChange = async (newDate: string) => {
    await updateTask(task.id, { dueDate: newDate || null });
    setShowDatePicker(false);
  };
  
  const { showConfirm } = useStore();
  
  const handleDelete = () => {
    setShowMoreMenu(false);
    showConfirm({
      title: 'Delete Task',
      message: `Are you sure you want to delete "${task.name}"? This action cannot be undone.`,
      type: 'delete',
      onConfirm: () => deleteTask(task.id),
    });
  };
  
  const handleDuplicate = async () => {
    setShowMoreMenu(false);
    await createTask({
      name: task.name + ' (copy)',
      status: task.status || '📥 Inbox',
      priority: task.priority,
      projectId: task.projectId,
      tagIds: task.tagIds,
      dueDate: task.dueDate,
      startDate: task.startDate,
      notes: task.notes,
    });
  };
  
  const handleConvertToSubtask = () => {
    setShowMoreMenu(false);
    // TODO: Show a modal to select parent task
    alert('Select a parent task in the edit panel to convert this to a subtask');
    if (onEditTask) onEditTask(task);
  };
  
  return (
    <>
      <div
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'flex-start',
          gap: 12,
          padding: `10px 32px 10px ${16 + level * 28}px`,
          backgroundColor: isHovered ? colors.bgHover : colors.bg,
          opacity: isCompleted ? 0.6 : 1,
          cursor: 'pointer',
          borderBottom: `1px solid ${isDarkMode ? '#2a2a2a' : '#f5f5f5'}`,
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Priority indicator */}
        {isTopPriority && !isCompleted && (
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: '50%',
              transform: 'translateY(-50%)',
              width: 3,
              height: 24,
              backgroundColor: colors.primary,
              borderRadius: '0 2px 2px 0',
            }}
          />
        )}
        
        {/* Expand/collapse for subtasks */}
        {hasSubtasks ? (
          <button
            onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
            style={{
              flexShrink: 0,
              minWidth: 24,
              height: 20,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 2,
              border: 'none',
              backgroundColor: isDarkMode ? '#333' : '#f0f0f0',
              borderRadius: 4,
              color: colors.textSecondary,
              cursor: 'pointer',
              padding: '0 4px',
              fontSize: 11,
              fontWeight: 500,
            }}
            title={`${subtasks.length} subtask${subtasks.length > 1 ? 's' : ''} (${subtasks.filter(s => s.status === '✅ Done').length} done)`}
          >
            {isExpanded ? <CaretDown size={12} /> : <CaretRight size={12} />}
            <span>{subtasks.length}</span>
          </button>
        ) : level > 0 ? (
          <div style={{ width: 24 }} />
        ) : null}
        
        {/* Checkbox */}
        <button
          onClick={handleComplete}
          style={{
            flexShrink: 0,
            marginTop: 2,
            border: 'none',
            backgroundColor: 'transparent',
            padding: 0,
            cursor: 'pointer',
            color: isCompleted 
              ? '#22c55e' 
              : isTopPriority 
                ? colors.primary 
                : colors.checkboxBorder,
          }}
        >
          {isCompleted ? (
            <CheckCircle size={20} weight="fill" />
          ) : (
            <Circle 
              size={20} 
              weight={isTopPriority ? 'bold' : 'regular'}
            />
          )}
        </button>
        
        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Task name */}
          {isEditing ? (
            <input
              type="text"
              value={editedName}
              onChange={(e) => setEditedName(e.target.value)}
              onBlur={handleNameSave}
              onKeyDown={handleKeyDown}
              autoFocus
              style={{
                width: '100%',
                padding: '4px 8px',
                fontSize: 14,
                border: `1px solid ${colors.primary}`,
                borderRadius: 4,
                outline: 'none',
                backgroundColor: colors.bg,
                color: colors.text,
              }}
            />
          ) : (
            <p
              onClick={handleNameClick}
              style={{
                fontSize: 14,
                color: isCompleted ? colors.textSecondary : colors.text,
                textDecoration: isCompleted ? 'line-through' : 'none',
                cursor: 'text',
                margin: 0,
              }}
            >
              {task.name}
            </p>
          )}
          
          {/* Badges */}
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: 6,
            marginTop: 4,
          }}>
            {/* Project badge */}
            {showProject && project && (
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '2px 6px',
                fontSize: 11,
                borderRadius: 4,
                backgroundColor: isDarkMode ? '#333333' : '#f0f0f0',
                color: colors.textSecondary,
              }}>
                <Circle size={6} weight="fill" style={{ color: projectColor || undefined }} />
                {project.name}
              </span>
            )}
            
            {/* Start date badge */}
            {startDateInfo && !isCompleted && (
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '2px 6px',
                fontSize: 11,
                borderRadius: 4,
                backgroundColor: startDateInfo.isPast
                  ? isDarkMode ? 'rgba(59, 130, 246, 0.2)' : '#dbeafe'
                  : startDateInfo.isToday
                    ? isDarkMode ? 'rgba(34, 197, 94, 0.2)' : '#dcfce7'
                    : isDarkMode ? 'rgba(139, 92, 246, 0.2)' : '#ede9fe',
                color: startDateInfo.isPast
                  ? isDarkMode ? '#60a5fa' : '#2563eb'
                  : startDateInfo.isToday
                    ? isDarkMode ? '#4ade80' : '#16a34a'
                    : isDarkMode ? '#a78bfa' : '#7c3aed',
              }}>
                <Play size={10} weight="fill" />
                {startDateInfo.text}
              </span>
            )}
            
            {/* Due date badge */}
            {dueDateInfo && (
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '2px 6px',
                fontSize: 11,
                borderRadius: 4,
                backgroundColor: dueDateInfo.isOverdue
                  ? isDarkMode ? 'rgba(239, 68, 68, 0.2)' : '#fee2e2'
                  : dueDateInfo.isToday
                    ? isDarkMode ? 'rgba(34, 197, 94, 0.2)' : '#dcfce7'
                    : isDarkMode ? 'rgba(249, 115, 22, 0.2)' : '#fff7ed',
                color: dueDateInfo.isOverdue
                  ? isDarkMode ? '#f87171' : '#dc2626'
                  : dueDateInfo.isToday
                    ? isDarkMode ? '#4ade80' : '#16a34a'
                    : isDarkMode ? '#fb923c' : '#ea580c',
              }}>
                <CalendarBlank size={12} />
                {dueDateInfo.text}
              </span>
            )}
            
            {/* Tags */}
            {taskTags.slice(0, 2).map((tag) => (
              <span
                key={tag.id}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '2px 6px',
                  fontSize: 11,
                  borderRadius: 4,
                  backgroundColor: isDarkMode ? 'rgba(139, 92, 246, 0.2)' : '#ede9fe',
                  color: isDarkMode ? '#a78bfa' : '#7c3aed',
                }}
              >
                {tag.name}
              </span>
            ))}
            {taskTags.length > 2 && (
              <span style={{ fontSize: 11, color: colors.textSecondary }}>
                +{taskTags.length - 2}
              </span>
            )}
            
            {/* Status badge */}
            {task.status && !['📥 Inbox', '📋 To Do', '✅ Done'].includes(task.status) && (
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '2px 6px',
                fontSize: 11,
                borderRadius: 4,
                backgroundColor: isDarkMode ? 'rgba(59, 130, 246, 0.2)' : '#dbeafe',
                color: isDarkMode ? '#60a5fa' : '#2563eb',
              }}>
                {task.status}
              </span>
            )}
            
            {/* Subtask count */}
            {hasSubtasks && (
              <span style={{ fontSize: 11, color: colors.textSecondary }}>
                {subtasks.filter(s => s.status === '✅ Done').length}/{subtasks.length} subtasks
              </span>
            )}
          </div>
        </div>
        
        {/* Hover Actions */}
        {isHovered && !isCompleted && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, position: 'relative' }}>
            {/* Reschedule */}
            <div ref={datePickerRef} style={{ position: 'relative' }}>
              <button
                onClick={() => setShowDatePicker(!showDatePicker)}
                style={{
                  padding: 6,
                  borderRadius: 4,
                  border: 'none',
                  backgroundColor: isDarkMode ? '#3a3a3a' : '#f0f0f0',
                  color: colors.textSecondary,
                  cursor: 'pointer',
                }}
                title="Reschedule"
              >
                <CalendarBlank size={16} />
              </button>
              
              {showDatePicker && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: 4,
                  padding: 8,
                  backgroundColor: colors.menuBg,
                  borderRadius: 8,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  zIndex: 100,
                }}>
                  <input
                    type="date"
                    value={formatDateForInput(task.dueDate)}
                    onChange={(e) => handleDateChange(e.target.value)}
                    style={{
                      padding: '8px 12px',
                      fontSize: 14,
                      border: `1px solid ${colors.border}`,
                      borderRadius: 6,
                      backgroundColor: isDarkMode ? '#444' : '#fff',
                      color: colors.text,
                    }}
                  />
                  <button
                    onClick={() => handleDateChange('')}
                    style={{
                      display: 'block',
                      width: '100%',
                      marginTop: 8,
                      padding: '6px 12px',
                      fontSize: 12,
                      border: 'none',
                      backgroundColor: 'transparent',
                      color: colors.primary,
                      cursor: 'pointer',
                      textAlign: 'center',
                    }}
                  >
                    Clear date
                  </button>
                </div>
              )}
            </div>
            
            {/* Edit */}
            <button
              onClick={() => onEditTask && onEditTask(task)}
              style={{
                padding: 6,
                borderRadius: 4,
                border: 'none',
                backgroundColor: isDarkMode ? '#3a3a3a' : '#f0f0f0',
                color: colors.textSecondary,
                cursor: 'pointer',
              }}
              title="Edit"
            >
              <PencilSimple size={16} />
            </button>
            
            {/* More options */}
            <div ref={moreMenuRef} style={{ position: 'relative' }}>
              <button
                onClick={() => setShowMoreMenu(!showMoreMenu)}
                style={{
                  padding: 6,
                  borderRadius: 4,
                  border: 'none',
                  backgroundColor: isDarkMode ? '#3a3a3a' : '#f0f0f0',
                  color: colors.textSecondary,
                  cursor: 'pointer',
                }}
                title="More options"
              >
                <DotsThree size={16} weight="bold" />
              </button>
              
              {showMoreMenu && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: 4,
                  width: 180,
                  backgroundColor: colors.menuBg,
                  borderRadius: 8,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  zIndex: 100,
                  overflow: 'hidden',
                }}>
                  <button
                    onClick={handleDuplicate}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      width: '100%',
                      padding: '10px 12px',
                      fontSize: 13,
                      border: 'none',
                      backgroundColor: 'transparent',
                      color: colors.text,
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <Copy size={16} />
                    Duplicate
                  </button>
                  <button
                    onClick={handleConvertToSubtask}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      width: '100%',
                      padding: '10px 12px',
                      fontSize: 13,
                      border: 'none',
                      backgroundColor: 'transparent',
                      color: colors.text,
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <TreeStructure size={16} />
                    Convert to subtask
                  </button>
                  <div style={{ height: 1, backgroundColor: colors.border, margin: '4px 0' }} />
                  <button
                    onClick={handleDelete}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      width: '100%',
                      padding: '10px 12px',
                      fontSize: 13,
                      border: 'none',
                      backgroundColor: 'transparent',
                      color: '#ef4444',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <Trash size={16} />
                    Delete
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      
      {/* Subtasks */}
      {isExpanded && visibleSubtasks.map((subtask) => (
        <TaskItem
          key={subtask.id}
          task={subtask}
          level={level + 1}
          showProject={showProject}
          onEditTask={onEditTask}
        />
      ))}
    </>
  );
}
