import { useState, useRef, useEffect, useMemo } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
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
  DotsSixVertical,
} from '@phosphor-icons/react';
import { useStore } from '../store';
import { PROJECT_COLORS, DEFAULT_PROJECT_COLOR, TAG_COLORS, STORAGE_KEYS } from '../utils/constants';
import type { ViewType, Project, Tag as TagType, Filter } from '../types';

// Storage keys for sidebar order preferences
const ORDER_KEYS = {
  projects: 'air-todoist-project-order',
  tags: 'air-todoist-tag-order',
  filters: 'air-todoist-filter-order',
};

// Load order from localStorage
function loadOrder(key: string): string[] {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

// Save order to localStorage
function saveOrder(key: string, order: string[]) {
  localStorage.setItem(key, JSON.stringify(order));
}

// Sort items by custom order
function sortByOrder<T extends { id: string }>(items: T[], order: string[]): T[] {
  if (order.length === 0) return items;
  
  const orderMap = new Map(order.map((id, index) => [id, index]));
  return [...items].sort((a, b) => {
    const aIndex = orderMap.get(a.id) ?? Infinity;
    const bIndex = orderMap.get(b.id) ?? Infinity;
    return aIndex - bIndex;
  });
}

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
  
  // Order state
  const [projectOrder, setProjectOrder] = useState<string[]>(() => loadOrder(ORDER_KEYS.projects));
  const [tagOrder, setTagOrder] = useState<string[]>(() => loadOrder(ORDER_KEYS.tags));
  const [filterOrder, setFilterOrder] = useState<string[]>(() => loadOrder(ORDER_KEYS.filters));
  
  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );
  
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
    dragHandle: isDarkMode ? '#505050' : '#c0c0c0',
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
  
  // Sorted items
  const sortedProjects = useMemo(() => sortByOrder(projects, projectOrder), [projects, projectOrder]);
  const sortedTags = useMemo(() => sortByOrder(tags, tagOrder), [tags, tagOrder]);
  const sortedFilters = useMemo(() => sortByOrder(filters, filterOrder), [filters, filterOrder]);
  
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
  
  // Handle drag end for reordering
  const handleProjectDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = sortedProjects.findIndex(p => p.id === active.id);
      const newIndex = sortedProjects.findIndex(p => p.id === over.id);
      
      const newOrder = sortedProjects.map(p => p.id);
      newOrder.splice(oldIndex, 1);
      newOrder.splice(newIndex, 0, active.id as string);
      
      setProjectOrder(newOrder);
      saveOrder(ORDER_KEYS.projects, newOrder);
    }
  };
  
  const handleTagDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = sortedTags.findIndex(t => t.id === active.id);
      const newIndex = sortedTags.findIndex(t => t.id === over.id);
      
      const newOrder = sortedTags.map(t => t.id);
      newOrder.splice(oldIndex, 1);
      newOrder.splice(newIndex, 0, active.id as string);
      
      setTagOrder(newOrder);
      saveOrder(ORDER_KEYS.tags, newOrder);
    }
  };
  
  const handleFilterDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = sortedFilters.findIndex(f => f.id === active.id);
      const newIndex = sortedFilters.findIndex(f => f.id === over.id);
      
      const newOrder = sortedFilters.map(f => f.id);
      newOrder.splice(oldIndex, 1);
      newOrder.splice(newIndex, 0, active.id as string);
      
      setFilterOrder(newOrder);
      saveOrder(ORDER_KEYS.filters, newOrder);
    }
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
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleFilterDragEnd}
              >
                <SortableContext
                  items={sortedFilters.map(f => f.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div style={{ marginTop: 4 }}>
                    {sortedFilters.map((filter) => (
                      <SortableFilterItem
                        key={filter.id}
                        filter={filter}
                        isActive={currentView === 'filter' && selectedFilterId === filter.id}
                        colors={colors}
                        onClick={() => setSelectedFilter(filter.id)}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </div>
        )}
        
        {/* Projects Section */}
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
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleProjectDragEnd}
            >
              <SortableContext
                items={sortedProjects.map(p => p.id)}
                strategy={verticalListSortingStrategy}
              >
                <div style={{ marginTop: 4 }}>
                  {projects.length === 0 && (
                    <p style={{ padding: '8px 12px', fontSize: 12, color: colors.textMuted }}>No projects found</p>
                  )}
                  {sortedProjects.map((project) => {
                    const taskCount = tasks.filter(t => 
                      t.projectId === project.id && t.status !== '✅ Done'
                    ).length;
                    return (
                      <SortableProjectItem
                        key={project.id}
                        project={project}
                        taskCount={taskCount}
                        isActive={currentView === 'project' && selectedProjectId === project.id}
                        colors={colors}
                        projectColor={getProjectColor(project.id)}
                        onClick={() => setSelectedProject(project.id)}
                      />
                    );
                  })}
                </div>
              </SortableContext>
            </DndContext>
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
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleTagDragEnd}
            >
              <SortableContext
                items={sortedTags.map(t => t.id)}
                strategy={verticalListSortingStrategy}
              >
                <div style={{ marginTop: 4 }}>
                  {sortedTags.map((tag) => {
                    const taskCount = tasks.filter(t => 
                      t.tagIds.includes(tag.id) && t.status !== '✅ Done'
                    ).length;
                    return (
                      <SortableTagItem
                        key={tag.id}
                        tag={tag}
                        taskCount={taskCount}
                        isActive={currentView === 'tag' && selectedTagId === tag.id}
                        colors={colors}
                        onClick={() => setSelectedTag(tag.id)}
                      />
                    );
                  })}
                </div>
              </SortableContext>
            </DndContext>
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

// Sortable Project Item
interface SortableProjectItemProps {
  project: Project;
  taskCount: number;
  isActive: boolean;
  colors: Record<string, string>;
  projectColor: string;
  onClick: () => void;
}

function SortableProjectItem({ project, taskCount, isActive, colors, projectColor, onClick }: SortableProjectItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: project.id });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  
  return (
    <div ref={setNodeRef} style={{ ...style, position: 'relative' }}>
      <div
        {...attributes}
        {...listeners}
        style={{
          position: 'absolute',
          left: 0,
          top: '50%',
          transform: 'translateY(-50%)',
          width: 16,
          height: 24,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'grab',
          color: colors.dragHandle,
          opacity: 0,
          transition: 'opacity 0.2s',
          zIndex: 5,
        }}
        onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; }}
        onMouseLeave={(e) => { e.currentTarget.style.opacity = '0'; }}
      >
        <DotsSixVertical size={12} weight="bold" />
      </div>
      <button
        onClick={onClick}
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
        <Circle size={8} weight="fill" style={{ color: projectColor }} />
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {project.name}
        </span>
        {taskCount > 0 && (
          <span style={{ fontSize: 12, color: colors.textSecondary }}>{taskCount}</span>
        )}
      </button>
    </div>
  );
}

// Sortable Tag Item
interface SortableTagItemProps {
  tag: TagType;
  taskCount: number;
  isActive: boolean;
  colors: Record<string, string>;
  onClick: () => void;
}

function SortableTagItem({ tag, taskCount, isActive, colors, onClick }: SortableTagItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: tag.id });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  
  return (
    <div ref={setNodeRef} style={{ ...style, position: 'relative' }}>
      <div
        {...attributes}
        {...listeners}
        style={{
          position: 'absolute',
          left: 0,
          top: '50%',
          transform: 'translateY(-50%)',
          width: 16,
          height: 24,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'grab',
          color: colors.dragHandle,
          opacity: 0,
          transition: 'opacity 0.2s',
          zIndex: 5,
        }}
        onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; }}
        onMouseLeave={(e) => { e.currentTarget.style.opacity = '0'; }}
      >
        <DotsSixVertical size={12} weight="bold" />
      </div>
      <button
        onClick={onClick}
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
    </div>
  );
}

// Sortable Filter Item
interface SortableFilterItemProps {
  filter: Filter;
  isActive: boolean;
  colors: Record<string, string>;
  onClick: () => void;
}

function SortableFilterItem({ filter, isActive, colors, onClick }: SortableFilterItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: filter.id });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  
  return (
    <div ref={setNodeRef} style={{ ...style, position: 'relative' }}>
      <div
        {...attributes}
        {...listeners}
        style={{
          position: 'absolute',
          left: 0,
          top: '50%',
          transform: 'translateY(-50%)',
          width: 16,
          height: 24,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'grab',
          color: colors.dragHandle,
          opacity: 0,
          transition: 'opacity 0.2s',
          zIndex: 5,
        }}
        onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; }}
        onMouseLeave={(e) => { e.currentTarget.style.opacity = '0'; }}
      >
        <DotsSixVertical size={12} weight="bold" />
      </div>
      <button
        onClick={onClick}
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
    </div>
  );
}
