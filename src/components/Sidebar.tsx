import { useState, useRef, useEffect } from 'react';
import {
  CalendarBlank,
  Tray,
  FunnelSimple,
  Folder,
  CalendarDots,
  Tag,
  Circle,
  CaretDown,
  CaretRight,
} from '@phosphor-icons/react';
import { useStore } from '../store';
import { PROJECT_COLORS, DEFAULT_PROJECT_COLOR, TAG_COLORS } from '../utils/constants';
import type { ViewType } from '../types';

interface NavItem {
  id: ViewType;
  label: string;
  icon: React.ReactNode;
  count?: number;
}

export function Sidebar() {
  const {
    currentView,
    setCurrentView,
    selectedProjectId,
    setSelectedProject,
    selectedFilterId,
    setSelectedFilter,
    selectedTagId,
    setSelectedTag,
    tasks,
    projects,
    tags,
    filters,
    sidebarWidth,
    setSidebarWidth,
    isDarkMode,
    isOnline,
    isSyncing,
    lastSyncTime,
    syncPendingChanges,
  } = useStore();
  
  const [projectsExpanded, setProjectsExpanded] = useState(true);
  const [tagsExpanded, setTagsExpanded] = useState(true);
  const [filtersExpanded, setFiltersExpanded] = useState(true);
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  
  // Colors based on dark mode
  const colors = {
    bg: isDarkMode ? '#1f1f1f' : '#ffffff',
    bgHover: isDarkMode ? '#2a2a2a' : '#f5f5f5',
    bgActive: isDarkMode ? 'rgba(209, 69, 59, 0.15)' : '#fee9e9',
    border: isDarkMode ? '#3a3a3a' : '#e0e0e0',
    text: isDarkMode ? '#ffffff' : '#202020',
    textSecondary: isDarkMode ? '#a0a0a0' : '#808080',
    textMuted: isDarkMode ? '#606060' : '#b0b0b0',
    primary: '#d1453b',
  };
  
  // Calculate counts
  const todayCount = tasks.filter(t => {
    if (t.status === '✅ Done') return false;
    if (!t.dueDate) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(t.dueDate);
    due.setHours(0, 0, 0, 0);
    return due <= today;
  }).length;
  
  const inboxCount = tasks.filter(t => 
    t.status === '📥 Inbox' || (!t.projectId && t.status !== '✅ Done')
  ).length;
  
  const upcomingCount = tasks.filter(t => {
    if (t.status === '✅ Done') return false;
    if (!t.dueDate) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);
    const due = new Date(t.dueDate);
    due.setHours(0, 0, 0, 0);
    return due >= today && due < nextWeek;
  }).length;
  
  const navItems: NavItem[] = [
    { id: 'today', label: 'Today', icon: <CalendarBlank size={18} />, count: todayCount },
    { id: 'inbox', label: 'Inbox', icon: <Tray size={18} />, count: inboxCount },
    { id: 'filters', label: 'Filters', icon: <FunnelSimple size={18} />, count: filters.length || undefined },
    { id: 'projects', label: 'By Project', icon: <Folder size={18} /> },
    { id: 'upcoming', label: 'Upcoming', icon: <CalendarDots size={18} />, count: upcomingCount },
    { id: 'schedule', label: 'Schedule', icon: <CalendarBlank size={18} weight="fill" /> },
  ];
  
  // Handle resize
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const maxWidth = window.innerWidth * 0.25;
      const newWidth = Math.min(Math.max(200, e.clientX), maxWidth);
      setSidebarWidth(newWidth);
    };
    
    const handleMouseUp = () => {
      setIsResizing(false);
    };
    
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, setSidebarWidth]);
  
  const getProjectColor = (projectId: string) => PROJECT_COLORS[projectId] || DEFAULT_PROJECT_COLOR;
  
  const formatLastSync = () => {
    if (!lastSyncTime) return 'Never';
    const diff = Date.now() - lastSyncTime;
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    return new Date(lastSyncTime).toLocaleTimeString();
  };
  
  const isViewActive = (viewId: ViewType) => {
    if (viewId === 'project' || viewId === 'tag' || viewId === 'filter') return false;
    return currentView === viewId && !selectedProjectId && !selectedTagId && !selectedFilterId;
  };
  
  return (
    <div
      ref={sidebarRef}
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        width: sidebarWidth,
        height: '100%',
        backgroundColor: colors.bg,
        borderRight: `1px solid ${colors.border}`,
      }}
    >
      {/* Header */}
      <div style={{
        padding: '16px 20px',
        borderBottom: `1px solid ${colors.border}`,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}>
        <span style={{
          fontSize: 18,
          fontWeight: 700,
          color: colors.text,
        }}>Air Todoist</span>
        <span style={{
          fontSize: 11,
          padding: '2px 8px',
          borderRadius: 12,
          backgroundColor: isDarkMode ? 'rgba(22, 163, 74, 0.2)' : '#dcfce7',
          color: isDarkMode ? '#4ade80' : '#16a34a',
          fontWeight: 500,
        }}>
          Standalone
        </span>
      </div>
      
      {/* Navigation */}
      <nav style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
        {/* Main views */}
        <div style={{ padding: '0 8px', marginBottom: 16 }}>
          {navItems.map((item) => {
            const isActive = isViewActive(item.id);
            return (
              <button
                key={item.id}
                onClick={() => {
                  setCurrentView(item.id);
                  if (item.id !== 'project') useStore.setState({ selectedProjectId: null });
                  if (item.id !== 'tag') useStore.setState({ selectedTagId: null });
                  if (item.id !== 'filter') useStore.setState({ selectedFilterId: null });
                }}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '8px 12px',
                  borderRadius: 8,
                  border: 'none',
                  backgroundColor: isActive ? colors.bgActive : 'transparent',
                  color: isActive ? colors.primary : colors.text,
                  fontWeight: isActive ? 500 : 400,
                  fontSize: 14,
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <span style={{ color: isActive ? colors.primary : colors.textSecondary }}>
                  {item.icon}
                </span>
                <span style={{ flex: 1 }}>{item.label}</span>
                {item.count !== undefined && item.count > 0 && (
                  <span style={{ fontSize: 12, color: colors.textSecondary }}>{item.count}</span>
                )}
              </button>
            );
          })}
        </div>
        
        {/* Filters Section */}
        {filters.length > 0 && (
          <div style={{ padding: '0 8px', marginBottom: 16 }}>
            <button
              onClick={() => setFiltersExpanded(!filtersExpanded)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 12px',
                border: 'none',
                backgroundColor: 'transparent',
                color: colors.textSecondary,
                fontSize: 11,
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: 0.5,
                cursor: 'pointer',
              }}
            >
              {filtersExpanded ? <CaretDown size={12} /> : <CaretRight size={12} />}
              Saved Filters
            </button>
            {filtersExpanded && (
              <div style={{ marginTop: 4 }}>
                {filters.map((filter) => {
                  const isActive = currentView === 'filter' && selectedFilterId === filter.id;
                  return (
                    <button
                      key={filter.id}
                      onClick={() => setSelectedFilter(filter.id)}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: '8px 12px',
                        borderRadius: 8,
                        border: 'none',
                        backgroundColor: isActive ? colors.bgActive : 'transparent',
                        color: isActive ? colors.primary : colors.text,
                        fontWeight: isActive ? 500 : 400,
                        fontSize: 14,
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      <Circle size={8} weight="fill" style={{ color: filter.color }} />
                      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {filter.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
        
        {/* Projects Section */}
        {(() => { console.log('[Sidebar] Projects array:', projects.length, projects); return null; })()}
        <div style={{ padding: '0 8px', marginBottom: 16 }}>
          <button
            onClick={() => setProjectsExpanded(!projectsExpanded)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 12px',
              border: 'none',
              backgroundColor: 'transparent',
              color: colors.textSecondary,
              fontSize: 11,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: 0.5,
              cursor: 'pointer',
            }}
          >
            {projectsExpanded ? <CaretDown size={12} /> : <CaretRight size={12} />}
            Projects
          </button>
          {projectsExpanded && (
            <div style={{ marginTop: 4 }}>
              {/* Show all projects for debugging - was: p.status === 'Active' */}
              {projects.length === 0 && (
                <p style={{ padding: '8px 12px', fontSize: 12, color: colors.textMuted }}>No projects found</p>
              )}
              {projects.map((project) => {
                const taskCount = tasks.filter(t => 
                  t.projectId === project.id && t.status !== '✅ Done'
                ).length;
                const isActive = currentView === 'project' && selectedProjectId === project.id;
                
                return (
                  <button
                    key={project.id}
                    onClick={() => setSelectedProject(project.id)}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '8px 12px',
                      borderRadius: 8,
                      border: 'none',
                      backgroundColor: isActive ? colors.bgActive : 'transparent',
                      color: isActive ? colors.primary : colors.text,
                      fontWeight: isActive ? 500 : 400,
                      fontSize: 14,
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <Circle size={8} weight="fill" style={{ color: getProjectColor(project.id) }} />
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {project.name}
                    </span>
                    {taskCount > 0 && (
                      <span style={{ fontSize: 12, color: colors.textSecondary }}>{taskCount}</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
        
        {/* Tags Section */}
        <div style={{ padding: '0 8px', marginBottom: 16 }}>
          <button
            onClick={() => setTagsExpanded(!tagsExpanded)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 12px',
              border: 'none',
              backgroundColor: 'transparent',
              color: colors.textSecondary,
              fontSize: 11,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: 0.5,
              cursor: 'pointer',
            }}
          >
            {tagsExpanded ? <CaretDown size={12} /> : <CaretRight size={12} />}
            Tags
          </button>
          {tagsExpanded && (
            <div style={{ marginTop: 4 }}>
              {tags.map((tag) => {
                const taskCount = tasks.filter(t => 
                  t.tagIds.includes(tag.id) && t.status !== '✅ Done'
                ).length;
                const isActive = currentView === 'tag' && selectedTagId === tag.id;
                
                return (
                  <button
                    key={tag.id}
                    onClick={() => setSelectedTag(tag.id)}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '8px 12px',
                      borderRadius: 8,
                      border: 'none',
                      backgroundColor: isActive ? colors.bgActive : 'transparent',
                      color: isActive ? colors.primary : colors.text,
                      fontWeight: isActive ? 500 : 400,
                      fontSize: 14,
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <Tag size={14} style={{ color: TAG_COLORS[tag.type || ''] || '#808080' }} />
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {tag.name}
                    </span>
                    {taskCount > 0 && (
                      <span style={{ fontSize: 12, color: colors.textSecondary }}>{taskCount}</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </nav>
      
      {/* Sync Status */}
      <div style={{
        padding: '12px 16px',
        borderTop: `1px solid ${colors.border}`,
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: 12,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: isOnline ? '#22c55e' : '#9ca3af',
            }} />
            <span style={{ color: colors.textSecondary }}>
              {isOnline ? 'Online' : 'Offline'}
            </span>
          </div>
          <span style={{ color: colors.textMuted }}>
            Synced: {formatLastSync()}
          </span>
        </div>
        {isOnline && (
          <button
            onClick={() => syncPendingChanges()}
            disabled={isSyncing}
            style={{
              marginTop: 8,
              width: '100%',
              padding: '6px 0',
              border: 'none',
              backgroundColor: 'transparent',
              color: colors.primary,
              fontSize: 12,
              cursor: isSyncing ? 'not-allowed' : 'pointer',
              opacity: isSyncing ? 0.5 : 1,
            }}
          >
            {isSyncing ? 'Syncing...' : 'Sync now'}
          </button>
        )}
      </div>
      
      {/* Resize Handle */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: 4,
          height: '100%',
          cursor: 'col-resize',
          backgroundColor: isResizing ? colors.primary : 'transparent',
        }}
        onMouseDown={() => setIsResizing(true)}
        onMouseEnter={(e) => {
          if (!isResizing) e.currentTarget.style.backgroundColor = `${colors.primary}50`;
        }}
        onMouseLeave={(e) => {
          if (!isResizing) e.currentTarget.style.backgroundColor = 'transparent';
        }}
      />
    </div>
  );
}
