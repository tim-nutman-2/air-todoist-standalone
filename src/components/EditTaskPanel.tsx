import { useState, useEffect } from 'react';
import { X, Trash } from '@phosphor-icons/react';
import { useStore } from '../store';
import { STATUS_OPTIONS, PRIORITY_OPTIONS, SCHEDULED_TIME_OPTIONS, DURATION_OPTIONS } from '../utils/constants';
import type { Task } from '../types';

interface EditTaskPanelProps {
  task: Task | null;
  onClose: () => void;
}

export function EditTaskPanel({ task, onClose }: EditTaskPanelProps) {
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  
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
  
  // Load task data when task changes
  useEffect(() => {
    if (task) {
      setName(task.name);
      setProjectId(task.projectId);
      setDueDate(task.dueDate || '');
      setStartDate(task.startDate || '');
      setPriority(task.priority || '📌 Everything Else');
      setStatus(task.status || '📥 Inbox');
      setSelectedTagIds(task.tagIds || []);
      setParentTaskId(task.parentTaskId);
      setNotes(task.notes || '');
      setScheduledTime(task.scheduledTime || '');
      setDuration(task.duration || '');
      setSyncToCalendar(task.syncToCalendar || false);
    }
  }, [task]);
  
  const activeProjects = projects.filter(p => p.status === 'Active');
  const parentTasks = tasks.filter(t => !t.parentTaskId && t.status !== '✅ Done' && t.id !== task?.id);
  
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
