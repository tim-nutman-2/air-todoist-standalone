import { useMemo, useState } from 'react';
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
      
      // Sort sections by order
      const sortedSections = [...sections].sort((a, b) => a.order - b.order);
      
      const groups: { key: string; title: string | null; tasks: Task[]; color: string | null; icon: React.ReactNode | null }[] = [];
      
      // Add "No Section" first if it has tasks
      if (grouped['no-section']?.length > 0) {
        groups.push({ key: 'no-section', title: 'No Section', tasks: grouped['no-section'], color: null, icon: null });
      }
      
      // Add other sections
      sortedSections.forEach(section => {
        if (grouped[section.id]?.length > 0) {
          groups.push({
            key: section.id,
            title: section.name,
            tasks: grouped[section.id],
            color: section.color || null,
            icon: null,
          });
        }
      });
      
      return groups;
    }
    
    return [{ key: 'all', title: null, tasks: visibleTasks, color: null, icon: null }];
  }, [visibleTasks, groupBy, projects, sections]);
  
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
    
    if (over && active.id !== over.id) {
      const activeTask = visibleTasks.find(t => t.id === active.id);
      const overTask = visibleTasks.find(t => t.id === over.id);
      
      if (activeTask && overTask) {
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
  
  if (visibleTasks.length === 0) {
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
                }}>
                  {group.title}
                </span>
              </button>
            )}
            {!isCollapsed && (
              enableDragDrop ? (
                <SortableContext
                  items={group.tasks.map(t => t.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {group.tasks.map((task) => renderTaskItem(task, showProjectBadge))}
                </SortableContext>
              ) : (
                group.tasks.map((task) => renderTaskItem(task, showProjectBadge))
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
