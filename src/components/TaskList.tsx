import { useMemo, useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CaretDown, CaretRight, Circle, Folder } from '@phosphor-icons/react';
import { useStore } from '../store';
import { TaskItem } from './TaskItem';
import { DraggableTaskItem } from './DraggableTaskItem';
import { EmptyState } from './EmptyState';
import type { EmptyStateType } from './EmptyState';
import { parseLocalDate } from '../utils/dates';
import { PROJECT_COLORS, DEFAULT_PROJECT_COLOR } from '../utils/constants';
import type { Task } from '../types';

interface TaskListProps {
  tasks: Task[];
  showProject?: boolean;
  groupBy?: 'none' | 'date' | 'project' | 'section';
  emptyMessage?: string;
  emptyStateType?: EmptyStateType;
  onEditTask?: (task: Task) => void;
  onAddTask?: () => void;
  onAddSubtask?: (parentTask: Task) => void;
  enableDragDrop?: boolean;
  projectId?: string | null;
}

export function TaskList({
  tasks,
  showProject = true,
  groupBy = 'none',
  emptyStateType = 'inbox',
  onEditTask,
  onAddTask,
  onAddSubtask,
  enableDragDrop = true,
  projectId,
}: TaskListProps) {
  const { showCompleted, projects, sections, isDarkMode, updateTask } = useStore();
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  
  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );
  
  // Colors
  const colors = {
    bg: isDarkMode ? '#1f1f1f' : '#ffffff',
    text: isDarkMode ? '#ffffff' : '#202020',
    textSecondary: isDarkMode ? '#a0a0a0' : '#808080',
    textMuted: isDarkMode ? '#606060' : '#b0b0b0',
    border: isDarkMode ? '#3a3a3a' : '#e0e0e0',
    groupBg: isDarkMode ? '#242424' : '#fafafa',
  };
  
  // Filter out subtasks (they're rendered within their parents)
  const rootTasks = useMemo(() => {
    return tasks.filter(t => !t.parentTaskId);
  }, [tasks]);
  
  // Filter completed if needed
  const visibleTasks = useMemo(() => {
    if (showCompleted) return rootTasks;
    return rootTasks.filter(t => t.status !== '✅ Done');
  }, [rootTasks, showCompleted]);
  
  // Group tasks
  const groupedTasks = useMemo(() => {
    if (groupBy === 'none') {
      return [{ key: 'all', title: null, tasks: visibleTasks, color: null, icon: null }];
    }
    
    if (groupBy === 'date') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const overdue: Task[] = [];
      const todayTasks: Task[] = [];
      const tomorrowTasks: Task[] = [];
      const thisWeekTasks: Task[] = [];
      const laterTasks: Task[] = [];
      const noDate: Task[] = [];
      
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const weekEnd = new Date(today);
      weekEnd.setDate(weekEnd.getDate() + 7);
      
      visibleTasks.forEach(task => {
        if (!task.dueDate) {
          noDate.push(task);
          return;
        }
        
        const due = parseLocalDate(task.dueDate);
        if (!due) {
          noDate.push(task);
          return;
        }
        due.setHours(0, 0, 0, 0);
        
        if (due < today) {
          overdue.push(task);
        } else if (due.getTime() === today.getTime()) {
          todayTasks.push(task);
        } else if (due.getTime() === tomorrow.getTime()) {
          tomorrowTasks.push(task);
        } else if (due < weekEnd) {
          thisWeekTasks.push(task);
        } else {
          laterTasks.push(task);
        }
      });
      
      const groups: { key: string; title: string | null; tasks: Task[]; color: string | null; icon: React.ReactNode | null }[] = [];
      if (overdue.length > 0) groups.push({ key: 'overdue', title: `Overdue (${overdue.length})`, tasks: overdue, color: '#dc2626', icon: null });
      if (todayTasks.length > 0) groups.push({ key: 'today', title: `Today (${todayTasks.length})`, tasks: todayTasks, color: '#16a34a', icon: null });
      if (tomorrowTasks.length > 0) groups.push({ key: 'tomorrow', title: `Tomorrow (${tomorrowTasks.length})`, tasks: tomorrowTasks, color: '#f59e0b', icon: null });
      if (thisWeekTasks.length > 0) groups.push({ key: 'this-week', title: `This Week (${thisWeekTasks.length})`, tasks: thisWeekTasks, color: '#3b82f6', icon: null });
      if (laterTasks.length > 0) groups.push({ key: 'later', title: `Later (${laterTasks.length})`, tasks: laterTasks, color: null, icon: null });
      if (noDate.length > 0) groups.push({ key: 'no-date', title: `No Date (${noDate.length})`, tasks: noDate, color: null, icon: null });
      
      return groups;
    }
    
    if (groupBy === 'project') {
      const grouped: Record<string, Task[]> = {};
      
      // Group tasks by project
      visibleTasks.forEach(task => {
        const key = task.projectId || 'no-project';
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(task);
      });
      
      // Sort by project order, put "no project" last
      const sortedKeys = Object.keys(grouped).sort((a, b) => {
        if (a === 'no-project') return 1;
        if (b === 'no-project') return -1;
        return 0;
      });
      
      return sortedKeys.map(projectId => {
        const project = projects.find(p => p.id === projectId);
        const projectColor = PROJECT_COLORS[projectId] || DEFAULT_PROJECT_COLOR;
        return {
          key: projectId,
          title: project?.name || 'No Project',
          tasks: grouped[projectId],
          color: projectColor,
          icon: <Folder size={16} weight="fill" style={{ color: projectColor }} />,
        };
      });
    }
    
    if (groupBy === 'section') {
      const grouped: Record<string, Task[]> = { 'no-section': [] };
      
      visibleTasks.forEach(task => {
        const key = task.sectionId || 'no-section';
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(task);
      });
      
      // Filter sections to only those in the current project, then sort by order
      const projectSections = sections
        .filter(s => s.projectId === projectId)
        .sort((a, b) => a.order - b.order);
      
      const groups: { key: string; title: string | null; tasks: Task[]; color: string | null; icon: React.ReactNode | null }[] = [];
      
      // Add "No Section" first (always show if there are unsectioned tasks OR no sections exist)
      if (grouped['no-section']?.length > 0 || projectSections.length === 0) {
        groups.push({ 
          key: 'no-section', 
          title: projectSections.length > 0 ? 'No Section' : null, 
          tasks: grouped['no-section'] || [], 
          color: null, 
          icon: null 
        });
      }
      
      // Add all project sections (even empty ones so they're visible)
      projectSections.forEach(section => {
        groups.push({
          key: section.id,
          title: section.name,
          tasks: grouped[section.id] || [],
          color: section.color || null,
          icon: null,
        });
      });
      
      return groups;
    }
    
    return [{ key: 'all', title: null, tasks: visibleTasks, color: null, icon: null }];
  }, [visibleTasks, groupBy, projects, sections, projectId]);
  
  const toggleGroup = (key: string) => {
    setCollapsedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  };
  
  // Handle drag end
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over) return;
    
    const activeTask = visibleTasks.find(t => t.id === active.id);
    if (!activeTask) return;
    
    // Check if dropped on a section header (droppable zone)
    const overId = over.id as string;
    if (overId.startsWith('section-drop-')) {
      const targetSectionId = overId.replace('section-drop-', '');
      const newSectionId = targetSectionId === 'no-section' ? null : targetSectionId;
      
      if (activeTask.sectionId !== newSectionId) {
        await updateTask(activeTask.id, { sectionId: newSectionId });
      }
      return;
    }
    
    // Dropped on another task
    if (active.id !== over.id) {
      const overTask = visibleTasks.find(t => t.id === over.id);
      
      if (overTask) {
        // If dragging to a different section, update the section
        if (groupBy === 'section' && activeTask.sectionId !== overTask.sectionId) {
          await updateTask(activeTask.id, { sectionId: overTask.sectionId });
        }
        
        // If dragging to a different project group, update the project
        if (groupBy === 'project' && activeTask.projectId !== overTask.projectId) {
          await updateTask(activeTask.id, { projectId: overTask.projectId });
        }
        
        // If dragging to a different date group in upcoming view, update the due date
        if (groupBy === 'date') {
          const overDue = overTask.dueDate;
          if (overDue && activeTask.dueDate !== overDue) {
            await updateTask(activeTask.id, { dueDate: overDue });
          }
        }
      }
    }
  };
  
  // Only show empty state if there are no tasks AND we're not in section view with sections
  // (we want to show empty sections in project view)
  const hasProjectSections = groupBy === 'section' && sections.some(s => s.projectId === projectId);
  
  if (visibleTasks.length === 0 && !hasProjectSections) {
    return (
      <EmptyState
        type={emptyStateType}
        onAddTask={onAddTask}
      />
    );
  }
  
  const renderTaskItem = (task: Task, showProjectBadge: boolean) => {
    if (enableDragDrop) {
      return (
        <DraggableTaskItem
          key={task.id}
          task={task}
          showProject={showProjectBadge}
          onEditTask={onEditTask}
          onAddSubtask={onAddSubtask}
        />
      );
    }
    return (
      <TaskItem
        key={task.id}
        task={task}
        showProject={showProjectBadge}
        onEditTask={onEditTask}
        onAddSubtask={onAddSubtask}
      />
    );
  };
  
  const content = (
    <div>
      {groupedTasks.map((group) => {
        const isCollapsed = collapsedGroups.has(group.key);
        const showProjectBadge = showProject && groupBy !== 'project';
        
        return (
          <div key={group.key}>
            {group.title && (
              <button
                onClick={() => toggleGroup(group.key)}
                style={{
                  width: '100%',
                  position: 'sticky',
                  top: 0,
                  zIndex: 10,
                  backgroundColor: colors.groupBg,
                  padding: '10px 32px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  border: 'none',
                  borderBottom: `1px solid ${colors.border}`,
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                {isCollapsed ? (
                  <CaretRight size={14} style={{ color: colors.textSecondary }} />
                ) : (
                  <CaretDown size={14} style={{ color: colors.textSecondary }} />
                )}
                {group.icon}
                {group.color && !group.icon && (
                  <Circle size={10} weight="fill" style={{ color: group.color }} />
                )}
                <span style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: group.color || colors.text,
                  flex: 1,
                }}>
                  {group.title}
                </span>
                <span style={{
                  fontSize: 12,
                  padding: '2px 8px',
                  borderRadius: 12,
                  backgroundColor: isDarkMode ? '#3a3a3a' : '#e5e5e5',
                  color: colors.textSecondary,
                }}>
                  {group.tasks.length}
                </span>
              </button>
            )}
            {!isCollapsed && (
              enableDragDrop ? (
                groupBy === 'section' ? (
                  <DroppableSectionZone sectionId={group.key} isDarkMode={isDarkMode}>
                    <SortableContext
                      items={group.tasks.map(t => t.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      {group.tasks.length > 0 ? (
                        group.tasks.map((task) => renderTaskItem(task, showProjectBadge))
                      ) : group.title ? (
                        <div style={{
                          padding: '16px 32px',
                          color: colors.textMuted,
                          fontSize: 13,
                          fontStyle: 'italic',
                          borderBottom: `1px solid ${isDarkMode ? '#2a2a2a' : '#f5f5f5'}`,
                          minHeight: 48,
                        }}>
                          Drop tasks here
                        </div>
                      ) : null}
                    </SortableContext>
                  </DroppableSectionZone>
                ) : (
                  <SortableContext
                    items={group.tasks.map(t => t.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {group.tasks.map((task) => renderTaskItem(task, showProjectBadge))}
                  </SortableContext>
                )
              ) : (
                group.tasks.length > 0 ? (
                  group.tasks.map((task) => renderTaskItem(task, showProjectBadge))
                ) : groupBy === 'section' && group.title ? (
                  <div style={{
                    padding: '16px 32px',
                    color: colors.textMuted,
                    fontSize: 13,
                    fontStyle: 'italic',
                    borderBottom: `1px solid ${isDarkMode ? '#2a2a2a' : '#f5f5f5'}`,
                  }}>
                    No tasks in this section
                  </div>
                ) : null
              )
            )}
          </div>
        );
      })}
    </div>
  );
  
  if (enableDragDrop) {
    return (
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        {content}
      </DndContext>
    );
  }
  
  return content;
}

// Droppable zone for sections (allows dropping tasks into empty sections)
interface DroppableSectionZoneProps {
  sectionId: string;
  children: React.ReactNode;
  isDarkMode: boolean;
}

function DroppableSectionZone({ sectionId, children, isDarkMode }: DroppableSectionZoneProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `section-drop-${sectionId}`,
  });
  
  return (
    <div
      ref={setNodeRef}
      style={{
        backgroundColor: isOver ? (isDarkMode ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.05)') : 'transparent',
        borderRadius: isOver ? 4 : 0,
        transition: 'background-color 0.2s',
      }}
    >
      {children}
    </div>
  );
}
