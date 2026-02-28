import { useState, useEffect } from 'react';
import { X } from '@phosphor-icons/react';
import { useStore } from '../store';
import { STATUS_OPTIONS, PRIORITY_OPTIONS } from '../utils/constants';
import type { Task } from '../types';

interface AddTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultProjectId?: string | null;
  defaultParentTaskId?: string | null;
  parentTask?: Task | null;
}

export function AddTaskModal({ isOpen, onClose, defaultProjectId, defaultParentTaskId, parentTask }: AddTaskModalProps) {
  const { projects, tags, tasks, createTask, isDarkMode } = useStore();
  
  // Determine if this is a subtask modal
  const isSubtaskMode = !!parentTask;
  const effectiveParentTaskId = parentTask?.id || defaultParentTaskId || null;
  
  const [name, setName] = useState('');
  const [projectId, setProjectId] = useState<string | null>(defaultProjectId || null);
  const [dueDate, setDueDate] = useState('');
  const [startDate, setStartDate] = useState('');
  const [priority, setPriority] = useState<string>('');
  const [status, setStatus] = useState<string>('📥 Inbox');
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [parentTaskId, setParentTaskId] = useState<string | null>(effectiveParentTaskId);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Update parentTaskId when parentTask prop changes
  useEffect(() => {
    if (parentTask) {
      setParentTaskId(parentTask.id);
      // Also inherit project from parent task if not already set
      if (parentTask.projectId && !projectId) {
        setProjectId(parentTask.projectId);
      }
    }
  }, [parentTask]);
  
  const colors = {
    bg: isDarkMode ? '#1f1f1f' : '#ffffff',
    surface: isDarkMode ? '#282828' : '#ffffff',
    border: isDarkMode ? '#3a3a3a' : '#e0e0e0',
    text: isDarkMode ? '#ffffff' : '#202020',
    textSecondary: isDarkMode ? '#a0a0a0' : '#808080',
    inputBg: isDarkMode ? '#333333' : '#ffffff',
    primary: '#d1453b',
  };
  
  const activeProjects = projects.filter(p => p.status === 'Active');
  const parentTasks = tasks.filter(t => !t.parentTaskId && t.status !== '✅ Done');
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    setIsSubmitting(true);
    
    try {
      await createTask({
        name: name.trim(),
        status,
        priority,
        projectId,
        tagIds: selectedTagIds,
        dueDate: dueDate || null,
        startDate: startDate || null,
        parentTaskId,
        notes,
      });
      
      // Reset form
      setName('');
      setProjectId(defaultProjectId || null);
      setDueDate('');
      setStartDate('');
      setPriority('');
      setStatus('📥 Inbox');
      setSelectedTagIds([]);
      setParentTaskId(null);
      setNotes('');
      
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const toggleTag = (tagId: string) => {
    setSelectedTagIds(prev => 
      prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId]
    );
  };
  
  if (!isOpen) return null;
  
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          backgroundColor: colors.surface,
          borderRadius: 12,
          width: 500,
          maxWidth: '90vw',
          maxHeight: '90vh',
          overflow: 'auto',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          borderBottom: `1px solid ${colors.border}`,
        }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: colors.text, margin: 0 }}>
              {isSubtaskMode ? 'Add Subtask' : 'Add Task'}
            </h2>
            {isSubtaskMode && parentTask && (
              <p style={{ fontSize: 12, color: colors.textSecondary, margin: '4px 0 0 0' }}>
                Under: {parentTask.name}
              </p>
            )}
          </div>
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
        <form onSubmit={handleSubmit} style={{ padding: 20 }}>
          {/* Task Name */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: colors.textSecondary, marginBottom: 6 }}>
              Task Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="What needs to be done?"
              required
              autoFocus
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
                {STATUS_OPTIONS.filter(opt => opt.value !== '✅ Done').map(opt => (
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
          
          {/* Parent Task (for subtasks) */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: colors.textSecondary, marginBottom: 6 }}>
              Parent Task (optional - makes this a subtask)
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
          
          {/* Notes */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: colors.textSecondary, marginBottom: 6 }}>
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any additional details..."
              rows={3}
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
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
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
              {isSubmitting ? 'Adding...' : (isSubtaskMode ? 'Add Subtask' : 'Add Task')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
