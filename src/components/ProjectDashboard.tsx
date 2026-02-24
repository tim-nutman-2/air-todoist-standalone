import { useMemo } from 'react';
import { 
  Folder, 
  CheckCircle, 
  Circle, 
  Clock, 
  CalendarBlank,
  ArrowRight,
} from '@phosphor-icons/react';
import { useStore } from '../store';
import { PROJECT_COLORS, DEFAULT_PROJECT_COLOR } from '../utils/constants';
import { parseLocalDate } from '../utils/dates';
import type { Project } from '../types';

interface ProjectDashboardProps {
  onSelectProject: (projectId: string) => void;
  onViewProjectDetails: (project: Project) => void;
}

export function ProjectDashboard({ onSelectProject, onViewProjectDetails }: ProjectDashboardProps) {
  const { projects, tasks, isDarkMode } = useStore();
  
  const colors = {
    bg: isDarkMode ? '#1f1f1f' : '#ffffff',
    cardBg: isDarkMode ? '#282828' : '#ffffff',
    cardBorder: isDarkMode ? '#3a3a3a' : '#e0e0e0',
    text: isDarkMode ? '#ffffff' : '#202020',
    textSecondary: isDarkMode ? '#a0a0a0' : '#808080',
    textMuted: isDarkMode ? '#606060' : '#b0b0b0',
    progressBg: isDarkMode ? '#3a3a3a' : '#e5e5e5',
  };
  
  // Calculate project stats
  const projectStats = useMemo(() => {
    return projects.map(project => {
      const projectTasks = tasks.filter(t => t.projectId === project.id);
      const completedTasks = projectTasks.filter(t => t.status === '✅ Done');
      const inProgressTasks = projectTasks.filter(t => t.status === '🔄 In Progress');
      const overdueTasks = projectTasks.filter(t => {
        if (t.status === '✅ Done' || !t.dueDate) return false;
        const due = parseLocalDate(t.dueDate);
        if (!due) return false;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        due.setHours(0, 0, 0, 0);
        return due < today;
      });
      
      const totalTasks = projectTasks.length;
      const completionPercent = totalTasks > 0 
        ? Math.round((completedTasks.length / totalTasks) * 100) 
        : 0;
      
      return {
        project,
        totalTasks,
        completedTasks: completedTasks.length,
        inProgressTasks: inProgressTasks.length,
        overdueTasks: overdueTasks.length,
        completionPercent,
      };
    });
  }, [projects, tasks]);
  
  const activeProjects = projectStats.filter(s => s.project.status === 'Active');
  const otherProjects = projectStats.filter(s => s.project.status !== 'Active');
  
  const renderProjectCard = (stats: typeof projectStats[0]) => {
    const { project, totalTasks, completedTasks, inProgressTasks, overdueTasks, completionPercent } = stats;
    const projectColor = PROJECT_COLORS[project.id] || DEFAULT_PROJECT_COLOR;
    
    return (
      <div
        key={project.id}
        style={{
          backgroundColor: colors.cardBg,
          border: `1px solid ${colors.cardBorder}`,
          borderRadius: 12,
          padding: 20,
          cursor: 'pointer',
          transition: 'all 0.2s',
          position: 'relative',
          overflow: 'hidden',
        }}
        onClick={() => onSelectProject(project.id)}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = projectColor;
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = `0 4px 12px ${projectColor}20`;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = colors.cardBorder;
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = 'none';
        }}
      >
        {/* Color accent */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 4,
          backgroundColor: projectColor,
        }} />
        
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Folder size={24} weight="fill" style={{ color: projectColor }} />
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: colors.text, margin: 0 }}>
                {project.name}
              </h3>
              <span style={{
                fontSize: 11,
                padding: '2px 8px',
                borderRadius: 12,
                backgroundColor: project.status === 'Active' 
                  ? (isDarkMode ? 'rgba(34, 197, 94, 0.2)' : '#dcfce7')
                  : (isDarkMode ? '#3a3a3a' : '#f0f0f0'),
                color: project.status === 'Active'
                  ? (isDarkMode ? '#4ade80' : '#16a34a')
                  : colors.textSecondary,
              }}>
                {project.status}
              </span>
            </div>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); onViewProjectDetails(project); }}
            style={{
              padding: 6,
              borderRadius: 6,
              border: 'none',
              backgroundColor: 'transparent',
              color: colors.textSecondary,
              cursor: 'pointer',
            }}
            title="View details"
          >
            <ArrowRight size={18} />
          </button>
        </div>
        
        {/* Progress bar */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 12, color: colors.textSecondary }}>Progress</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: colors.text }}>{completionPercent}%</span>
          </div>
          <div style={{
            height: 6,
            backgroundColor: colors.progressBg,
            borderRadius: 3,
            overflow: 'hidden',
          }}>
            <div style={{
              height: '100%',
              width: `${completionPercent}%`,
              backgroundColor: projectColor,
              borderRadius: 3,
              transition: 'width 0.3s ease',
            }} />
          </div>
        </div>
        
        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Circle size={16} style={{ color: colors.textMuted }} />
            <span style={{ fontSize: 13, color: colors.textSecondary }}>
              {totalTasks - completedTasks} remaining
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <CheckCircle size={16} weight="fill" style={{ color: '#22c55e' }} />
            <span style={{ fontSize: 13, color: colors.textSecondary }}>
              {completedTasks} done
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Clock size={16} style={{ color: '#3b82f6' }} />
            <span style={{ fontSize: 13, color: colors.textSecondary }}>
              {inProgressTasks} in progress
            </span>
          </div>
          {overdueTasks > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <CalendarBlank size={16} style={{ color: '#ef4444' }} />
              <span style={{ fontSize: 13, color: '#ef4444' }}>
                {overdueTasks} overdue
              </span>
            </div>
          )}
        </div>
        
        {/* Target date */}
        {project.targetDate && (
          <div style={{
            marginTop: 12,
            paddingTop: 12,
            borderTop: `1px solid ${colors.cardBorder}`,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 12,
            color: colors.textSecondary,
          }}>
            <CalendarBlank size={14} />
            Target: {new Date(project.targetDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </div>
        )}
      </div>
    );
  };
  
  return (
    <div style={{ padding: 24 }}>
      {/* Active Projects */}
      {activeProjects.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <h2 style={{
            fontSize: 14,
            fontWeight: 600,
            color: colors.textSecondary,
            textTransform: 'uppercase',
            letterSpacing: 0.5,
            marginBottom: 16,
          }}>
            Active Projects ({activeProjects.length})
          </h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: 16,
          }}>
            {activeProjects.map(stats => renderProjectCard(stats))}
          </div>
        </div>
      )}
      
      {/* Other Projects */}
      {otherProjects.length > 0 && (
        <div>
          <h2 style={{
            fontSize: 14,
            fontWeight: 600,
            color: colors.textSecondary,
            textTransform: 'uppercase',
            letterSpacing: 0.5,
            marginBottom: 16,
          }}>
            Other Projects ({otherProjects.length})
          </h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: 16,
          }}>
            {otherProjects.map(stats => renderProjectCard(stats))}
          </div>
        </div>
      )}
      
      {projects.length === 0 && (
        <div style={{
          textAlign: 'center',
          padding: 64,
          color: colors.textMuted,
        }}>
          <Folder size={48} style={{ marginBottom: 16, opacity: 0.5 }} />
          <p style={{ fontSize: 16 }}>No projects yet</p>
          <p style={{ fontSize: 14 }}>Projects help you organize related tasks together.</p>
        </div>
      )}
    </div>
  );
}
