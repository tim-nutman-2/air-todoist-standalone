import { FunnelSimple, PencilSimple, Circle, Plus } from '@phosphor-icons/react';
import { useStore } from '../store';
import type { Filter } from '../types';

interface FiltersManagementViewProps {
  onSelectFilter: (filterId: string) => void;
  onEditFilter: (filter: Filter) => void;
  onCreateFilter: () => void;
}

export function FiltersManagementView({ onSelectFilter, onEditFilter, onCreateFilter }: FiltersManagementViewProps) {
  const { filters, tasks, isDarkMode, showCompleted } = useStore();
  
  const colors = {
    bg: isDarkMode ? '#1f1f1f' : '#ffffff',
    cardBg: isDarkMode ? '#282828' : '#f9fafb',
    cardBorder: isDarkMode ? '#3a3a3a' : '#e5e7eb',
    cardHover: isDarkMode ? '#333333' : '#f3f4f6',
    text: isDarkMode ? '#ffffff' : '#111827',
    textSecondary: isDarkMode ? '#a0a0a0' : '#6b7280',
    textMuted: isDarkMode ? '#606060' : '#9ca3af',
    primary: '#d1453b',
  };
  
  // Calculate task count for each filter
  const getFilterTaskCount = (filter: Filter) => {
    return tasks.filter(t => {
      if (t.status === '✅ Done' && !showCompleted) return false;
      if (t.parentTaskId) return false;
      
      const c = filter.criteria;
      if (!c) return true;
      
      if (c.status?.length && !c.status.includes(t.status || '')) return false;
      if (c.priority?.length && !c.priority.includes(t.priority || '')) return false;
      if (c.projectIds?.length && !c.projectIds.includes(t.projectId || '')) return false;
      if (c.tagIds?.length && !t.tagIds.some(id => c.tagIds?.includes(id))) return false;
      
      return true;
    }).length;
  };
  
  if (filters.length === 0) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 64,
        textAlign: 'center',
      }}>
        <div style={{
          width: 64,
          height: 64,
          borderRadius: '50%',
          backgroundColor: isDarkMode ? '#333' : '#f3f4f6',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 16,
        }}>
          <FunnelSimple size={32} style={{ color: colors.textMuted }} />
        </div>
        <h3 style={{ fontSize: 18, fontWeight: 600, color: colors.text, margin: '0 0 8px' }}>
          No saved filters
        </h3>
        <p style={{ fontSize: 14, color: colors.textSecondary, margin: '0 0 24px', maxWidth: 300 }}>
          Create custom filters to quickly find tasks matching specific criteria.
        </p>
        <button
          onClick={onCreateFilter}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '12px 20px',
            fontSize: 14,
            fontWeight: 500,
            borderRadius: 8,
            border: 'none',
            backgroundColor: colors.primary,
            color: '#ffffff',
            cursor: 'pointer',
          }}
        >
          <Plus size={18} />
          Create Your First Filter
        </button>
      </div>
    );
  }
  
  return (
    <div style={{ padding: 24 }}>
      <p style={{ fontSize: 14, color: colors.textSecondary, marginBottom: 20 }}>
        Select a filter from the sidebar to view matching tasks, or create a new filter.
      </p>
      
      <div style={{ display: 'grid', gap: 12 }}>
        {filters.map(filter => {
          const taskCount = getFilterTaskCount(filter);
          
          return (
            <div
              key={filter.id}
              onClick={() => onSelectFilter(filter.id)}
              style={{
                padding: 16,
                backgroundColor: colors.cardBg,
                border: `1px solid ${colors.cardBorder}`,
                borderRadius: 8,
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = colors.cardHover;
                e.currentTarget.style.borderColor = isDarkMode ? '#4a4a4a' : '#d1d5db';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = colors.cardBg;
                e.currentTarget.style.borderColor = colors.cardBorder;
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Circle size={16} weight="fill" style={{ color: filter.color, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: 15, fontWeight: 500, color: colors.text, margin: 0 }}>
                    {filter.name}
                  </h3>
                  <p style={{ fontSize: 13, color: colors.textSecondary, margin: '4px 0 0' }}>
                    {taskCount} matching task{taskCount !== 1 ? 's' : ''}
                  </p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); onEditFilter(filter); }}
                  style={{
                    padding: 8,
                    borderRadius: 6,
                    border: 'none',
                    backgroundColor: 'transparent',
                    color: colors.textSecondary,
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = isDarkMode ? '#3a3a3a' : '#e5e7eb'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <PencilSimple size={16} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
      
      <button
        onClick={onCreateFilter}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          width: '100%',
          marginTop: 16,
          padding: '12px 16px',
          fontSize: 14,
          fontWeight: 500,
          borderRadius: 8,
          border: `1px dashed ${colors.cardBorder}`,
          backgroundColor: 'transparent',
          color: colors.textSecondary,
          cursor: 'pointer',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = colors.primary;
          e.currentTarget.style.color = colors.primary;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = colors.cardBorder;
          e.currentTarget.style.color = colors.textSecondary;
        }}
      >
        <Plus size={18} />
        Create New Filter
      </button>
    </div>
  );
}
