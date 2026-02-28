import { useMemo, useState, useEffect } from 'react';
import { 
  X, 
  Folder, 
  CalendarBlank, 
  Note,
  ChartBar,
  PencilSimple,
  Check,
} from '@phosphor-icons/react';
import { useStore } from '../store';
import { PROJECT_COLORS, DEFAULT_PROJECT_COLOR } from '../utils/constants';
import { parseLocalDate, formatDateForInput } from '../utils/dates';
import type { Project } from '../types';

const PROJECT_STATUS_OPTIONS = [
  { value: 'Active', label: 'Active' },
  { value: 'On Hold', label: 'On Hold' },
  { value: 'Completed', label: 'Completed' },
  { value: 'Archived', label: 'Archived' },
];

interface ProjectDetailsPanelProps {
  project: Project | null;
  onClose: () => void;
  onSelectProject: (projectId: string) => void;
}

export function ProjectDetailsPanel({ project, onClose, onSelectProject }: ProjectDetailsPanelProps) {
  const tasks = useStore(state => state.tasks);
  const isDarkMode = useStore(state => state.isDarkMode);
  const updateProject = useStore(state => state.updateProject);
  const [isEditing, setIsEditing] = useState(false);
  
  // Edit form state (notes is AI-generated and not editable)
  const [editName, setEditName] = useState('');
  const [editStatus, setEditStatus] = useState<string | null>(null);
  const [editDescription, setEditDescription] = useState('');
  const [editStartDate, setEditStartDate] = useState('');
  const [editTargetDate, setEditTargetDate] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  // Initialize form when project changes or editing starts
  useEffect(() => {
    if (project) {
      setEditName(project.name);
      setEditStatus(project.status);
      setEditDescription(typeof project.description === 'string' ? project.description : '');
      setEditStartDate(formatDateForInput(project.startDate));
      setEditTargetDate(formatDateForInput(project.targetDate));
    }
  }, [project]);
  
  // Reset editing state when panel closes
  useEffect(() => {
    if (!project) {
      setIsEditing(false);
    }
  }, [project]);
  
  const colors = {
    bg: isDarkMode ? '#1f1f1f' : '#ffffff',
    surface: isDarkMode ? '#282828' : '#ffffff',
    border: isDarkMode ? '#3a3a3a' : '#e0e0e0',
    text: isDarkMode ? '#ffffff' : '#202020',
    textSecondary: isDarkMode ? '#a0a0a0' : '#808080',
    textMuted: isDarkMode ? '#606060' : '#b0b0b0',
    primary: '#d1453b',
    inputBg: isDarkMode ? '#333333' : '#ffffff',
  };
  
  // Calculate project stats
  const stats = useMemo(() => {
    if (!project) return null;
    
    const projectTasks = tasks.filter(t => t.projectId === project.id);
    const completedTasks = projectTasks.filter(t => t.status === '✅ Done');
    const inProgressTasks = projectTasks.filter(t => t.status === '🔄 In Progress');
    const blockedTasks = projectTasks.filter(t => t.status === '🚫 Blocked' || t.status === '⏸️ Waiting');
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const overdueTasks = projectTasks.filter(t => {
      if (t.status === '✅ Done' || !t.dueDate) return false;
      const due = parseLocalDate(t.dueDate);
      if (!due) return false;
      due.setHours(0, 0, 0, 0);
      return due < today;
    });
    
    const dueTodayTasks = projectTasks.filter(t => {
      if (t.status === '✅ Done' || !t.dueDate) return false;
      const due = parseLocalDate(t.dueDate);
      if (!due) return false;
      due.setHours(0, 0, 0, 0);
      return due.getTime() === today.getTime();
    });
    
    const totalTasks = projectTasks.length;
    const completionPercent = totalTasks > 0 
      ? Math.round((completedTasks.length / totalTasks) * 100) 
      : 0;
    
    const statusBreakdown = [
      { label: 'Done', count: completedTasks.length, color: '#22c55e' },
      { label: 'In Progress', count: inProgressTasks.length, color: '#f59e0b' },
      { label: 'Blocked', count: blockedTasks.length, color: '#ef4444' },
      { label: 'To Do', count: totalTasks - completedTasks.length - inProgressTasks.length - blockedTasks.length, color: '#3b82f6' },
    ].filter(s => s.count > 0);
    
    return {
      totalTasks,
      completedTasks: completedTasks.length,
      inProgressTasks: inProgressTasks.length,
      blockedTasks: blockedTasks.length,
      overdueTasks: overdueTasks.length,
      dueTodayTasks: dueTodayTasks.length,
      completionPercent,
      statusBreakdown,
    };
  }, [project, tasks]);
  
  const handleSave = async () => {
    if (!project || !editName.trim()) return;
    
    setIsSaving(true);
    await updateProject(project.id, {
      name: editName.trim(),
      status: editStatus,
      description: editDescription,
      startDate: editStartDate || null,
      targetDate: editTargetDate || null,
    });
    setIsSaving(false);
    setIsEditing(false);
  };
  
  const handleCancel = () => {
    if (project) {
      setEditName(project.name);
      setEditStatus(project.status);
      setEditDescription(typeof project.description === 'string' ? project.description : '');
      setEditStartDate(formatDateForInput(project.startDate));
      setEditTargetDate(formatDateForInput(project.targetDate));
    }
    setIsEditing(false);
  };
  
  if (!project) return null;
  
  const projectColor = PROJECT_COLORS[project.id] || DEFAULT_PROJECT_COLOR;
  
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        right: 0,
        width: 420,
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
        padding: '16px 20px',
        borderBottom: `1px solid ${colors.border}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: projectColor,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
          <Folder size={24} weight="fill" style={{ color: '#ffffff', flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            {isEditing ? (
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '4px 8px',
                  fontSize: 16,
                  fontWeight: 600,
                  border: '1px solid rgba(255,255,255,0.3)',
                  borderRadius: 4,
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  color: '#ffffff',
                  outline: 'none',
                }}
                placeholder="Project name"
              />
            ) : (
              <h2 style={{ 
                fontSize: 18, 
                fontWeight: 600, 
                color: '#ffffff', 
                margin: 0,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {project.name}
              </h2>
            )}
            {isEditing ? (
              <select
                value={editStatus || ''}
                onChange={(e) => setEditStatus(e.target.value || null)}
                style={{
                  marginTop: 4,
                  padding: '2px 6px',
                  fontSize: 12,
                  border: '1px solid rgba(255,255,255,0.3)',
                  borderRadius: 4,
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  color: '#ffffff',
                  outline: 'none',
                }}
              >
                <option value="">No status</option>
                {PROJECT_STATUS_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            ) : (
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)' }}>
                {project.status || 'No status'}
              </span>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {isEditing ? (
            <>
              <button
                onClick={handleCancel}
                style={{
                  padding: '4px 12px',
                  background: 'rgba(255,255,255,0.2)',
                  border: 'none',
                  borderRadius: 4,
                  cursor: 'pointer',
                  color: '#ffffff',
                  fontSize: 13,
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!editName.trim() || isSaving}
                style={{
                  padding: '4px 12px',
                  background: '#ffffff',
                  border: 'none',
                  borderRadius: 4,
                  cursor: editName.trim() && !isSaving ? 'pointer' : 'not-allowed',
                  color: projectColor,
                  fontSize: 13,
                  fontWeight: 500,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  opacity: editName.trim() && !isSaving ? 1 : 0.5,
                }}
              >
                <Check size={14} weight="bold" />
                {isSaving ? 'Saving...' : 'Save'}
              </button>
            </>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              style={{
                padding: 6,
                background: 'rgba(255,255,255,0.2)',
                border: 'none',
                borderRadius: 4,
                cursor: 'pointer',
                color: '#ffffff',
              }}
              title="Edit project"
            >
              <PencilSimple size={18} />
            </button>
          )}
          <button
            onClick={onClose}
            style={{
              padding: 4,
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
              color: '#ffffff',
            }}
          >
            <X size={20} />
          </button>
        </div>
      </div>
      
      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto', padding: 20 }}>
        {isEditing ? (
          // Edit Form
          <>
            {/* Timeline */}
            <div style={{ marginBottom: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: colors.text, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                <CalendarBlank size={18} />
                Timeline
              </h3>
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: 12, color: colors.textSecondary, marginBottom: 4 }}>
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={editStartDate}
                    onChange={(e) => setEditStartDate(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
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
                  <label style={{ display: 'block', fontSize: 12, color: colors.textSecondary, marginBottom: 4 }}>
                    Target Date
                  </label>
                  <input
                    type="date"
                    value={editTargetDate}
                    onChange={(e) => setEditTargetDate(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
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
            </div>
            
            {/* Description */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: colors.text, marginBottom: 8 }}>
                Description
              </label>
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="What is this project about?"
                style={{
                  width: '100%',
                  minHeight: 80,
                  padding: '10px 12px',
                  fontSize: 14,
                  border: `1px solid ${colors.border}`,
                  borderRadius: 8,
                  backgroundColor: colors.inputBg,
                  color: colors.text,
                  outline: 'none',
                  resize: 'vertical',
                  lineHeight: 1.5,
                }}
              />
            </div>
          </>
        ) : (
          // View Mode
          <>
            {stats && (
              <>
                {/* Progress Overview */}
                <div style={{ marginBottom: 24 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 600, color: colors.text, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <ChartBar size={18} />
                    Progress Overview
                  </h3>
                  
                  {/* Progress bar */}
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: 13, color: colors.textSecondary }}>
                        {stats.completedTasks} of {stats.totalTasks} tasks complete
                      </span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: projectColor }}>
                        {stats.completionPercent}%
                      </span>
                    </div>
                    <div style={{
                      height: 8,
                      backgroundColor: isDarkMode ? '#3a3a3a' : '#e5e5e5',
                      borderRadius: 4,
                      overflow: 'hidden',
                    }}>
                      <div style={{
                        height: '100%',
                        width: `${stats.completionPercent}%`,
                        backgroundColor: projectColor,
                        borderRadius: 4,
                        transition: 'width 0.3s ease',
                      }} />
                    </div>
                  </div>
                  
                  {/* Status breakdown */}
                  {stats.statusBreakdown.length > 0 && (
                    <>
                      <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
                        {stats.statusBreakdown.map((s, i) => (
                          <div
                            key={s.label}
                            style={{
                              flex: s.count,
                              height: 24,
                              backgroundColor: s.color,
                              borderRadius: i === 0 ? '4px 0 0 4px' : i === stats.statusBreakdown.length - 1 ? '0 4px 4px 0' : 0,
                            }}
                            title={`${s.label}: ${s.count}`}
                          />
                        ))}
                      </div>
                      
                      {/* Legend */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                        {stats.statusBreakdown.map(s => (
                          <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <div style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: s.color }} />
                            <span style={{ fontSize: 12, color: colors.textSecondary }}>
                              {s.label} ({s.count})
                            </span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
                
                {/* Quick Stats */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: 12,
                  marginBottom: 24,
                }}>
                  {stats.overdueTasks > 0 && (
                    <div style={{
                      padding: 12,
                      borderRadius: 8,
                      backgroundColor: isDarkMode ? 'rgba(239, 68, 68, 0.1)' : '#fef2f2',
                      border: `1px solid ${isDarkMode ? 'rgba(239, 68, 68, 0.2)' : '#fecaca'}`,
                    }}>
                      <div style={{ fontSize: 24, fontWeight: 700, color: '#ef4444' }}>{stats.overdueTasks}</div>
                      <div style={{ fontSize: 12, color: '#ef4444' }}>Overdue</div>
                    </div>
                  )}
                  {stats.dueTodayTasks > 0 && (
                    <div style={{
                      padding: 12,
                      borderRadius: 8,
                      backgroundColor: isDarkMode ? 'rgba(34, 197, 94, 0.1)' : '#f0fdf4',
                      border: `1px solid ${isDarkMode ? 'rgba(34, 197, 94, 0.2)' : '#bbf7d0'}`,
                    }}>
                      <div style={{ fontSize: 24, fontWeight: 700, color: '#22c55e' }}>{stats.dueTodayTasks}</div>
                      <div style={{ fontSize: 12, color: '#22c55e' }}>Due Today</div>
                    </div>
                  )}
                  <div style={{
                    padding: 12,
                    borderRadius: 8,
                    backgroundColor: isDarkMode ? '#2a2a2a' : '#f9fafb',
                    border: `1px solid ${colors.border}`,
                  }}>
                    <div style={{ fontSize: 24, fontWeight: 700, color: colors.text }}>{stats.inProgressTasks}</div>
                    <div style={{ fontSize: 12, color: colors.textSecondary }}>In Progress</div>
                  </div>
                  <div style={{
                    padding: 12,
                    borderRadius: 8,
                    backgroundColor: isDarkMode ? '#2a2a2a' : '#f9fafb',
                    border: `1px solid ${colors.border}`,
                  }}>
                    <div style={{ fontSize: 24, fontWeight: 700, color: colors.text }}>{stats.totalTasks - stats.completedTasks}</div>
                    <div style={{ fontSize: 12, color: colors.textSecondary }}>Remaining</div>
                  </div>
                </div>
              </>
            )}
            
            {/* Dates */}
            {(project.startDate || project.targetDate) && (
              <div style={{ marginBottom: 24 }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, color: colors.text, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <CalendarBlank size={18} />
                  Timeline
                </h3>
                <div style={{ display: 'flex', gap: 16 }}>
                  {project.startDate && (
                    <div>
                      <div style={{ fontSize: 11, color: colors.textMuted, marginBottom: 4 }}>Start Date</div>
                      <div style={{ fontSize: 14, color: colors.text }}>
                        {new Date(project.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                    </div>
                  )}
                  {project.targetDate && (
                    <div>
                      <div style={{ fontSize: 11, color: colors.textMuted, marginBottom: 4 }}>Target Date</div>
                      <div style={{ fontSize: 14, color: colors.text }}>
                        {new Date(project.targetDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Description */}
            {project.description && (
              <div style={{ marginBottom: 24 }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, color: colors.text, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Note size={18} />
                  Description
                </h3>
                <p style={{
                  fontSize: 14,
                  color: colors.textSecondary,
                  lineHeight: 1.6,
                  whiteSpace: 'pre-wrap',
                  margin: 0,
                }}>
                  {typeof project.description === 'string' ? project.description : JSON.stringify(project.description)}
                </p>
              </div>
            )}
            
            {/* Notes - AI Generated (read-only) */}
            {project.notes && (
              <div style={{ marginBottom: 24 }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, color: colors.text, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Note size={18} />
                  AI Summary
                  <span style={{ 
                    fontSize: 10, 
                    padding: '2px 6px', 
                    backgroundColor: isDarkMode ? '#3a3a3a' : '#e5e5e5',
                    borderRadius: 4,
                    color: colors.textSecondary,
                    fontWeight: 400,
                  }}>
                    Auto-generated
                  </span>
                </h3>
                <div style={{
                  padding: 12,
                  backgroundColor: isDarkMode ? '#2a2a2a' : '#f9fafb',
                  borderRadius: 8,
                  fontSize: 14,
                  color: colors.textSecondary,
                  lineHeight: 1.6,
                  whiteSpace: 'pre-wrap',
                }}>
                  {typeof project.notes === 'string' ? project.notes : JSON.stringify(project.notes)}
                </div>
              </div>
            )}
            
            {/* Empty state for no editable content */}
            {!project.startDate && !project.targetDate && !project.description && (
              <div style={{
                padding: 24,
                textAlign: 'center',
                border: `1px dashed ${colors.border}`,
                borderRadius: 8,
                marginBottom: 24,
              }}>
                <p style={{ fontSize: 14, color: colors.textMuted, margin: 0 }}>
                  No project details yet.
                </p>
                <button
                  onClick={() => setIsEditing(true)}
                  style={{
                    marginTop: 12,
                    padding: '8px 16px',
                    fontSize: 13,
                    fontWeight: 500,
                    borderRadius: 6,
                    border: 'none',
                    backgroundColor: projectColor,
                    color: '#ffffff',
                    cursor: 'pointer',
                  }}
                >
                  Add Details
                </button>
              </div>
            )}
          </>
        )}
        
        {/* View Tasks Button */}
        {!isEditing && (
          <button
            onClick={() => { onSelectProject(project.id); onClose(); }}
            style={{
              width: '100%',
              padding: '12px 16px',
              fontSize: 14,
              fontWeight: 500,
              borderRadius: 8,
              border: 'none',
              backgroundColor: projectColor,
              color: '#ffffff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            View All Tasks
          </button>
        )}
      </div>
    </div>
  );
}
