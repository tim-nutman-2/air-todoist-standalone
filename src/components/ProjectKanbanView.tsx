import { useMemo, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useDroppable } from '@dnd-kit/core';
import { Circle, CheckCircle, CalendarBlank, Plus } from '@phosphor-icons/react';
import { useStore } from '../store';
import { getDueDateInfo } from '../utils/dates';
import type { Task } from '../types';

interface ProjectKanbanViewProps {
  projectId: string;
  onEditTask: (task: Task) => void;
  onAddSection: () => void;
}

export function ProjectKanbanView({ projectId, onEditTask, onAddSection }: ProjectKanbanViewProps) {
  const { tasks, sections, updateTask, showCompleted, isDarkMode } = useStore();
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  
  const colors = {
    bg: isDarkMode ? '#1f1f1f' : '#f5f5f5',
    columnBg: isDarkMode ? '#282828' : '#ffffff',
    cardBg: isDarkMode ? '#333333' : '#ffffff',
    cardBorder: isDarkMode ? '#3a3a3a' : '#e0e0e0',
    text: isDarkMode ? '#ffffff' : '#202020',
    textSecondary: isDarkMode ? '#a0a0a0' : '#808080',
    textMuted: isDarkMode ? '#606060' : '#b0b0b0',
  };
  
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor)
  );
  
  // Get sections for this project
  const projectSections = useMemo(() => {
    return sections
      .filter(s => s.projectId === projectId)
      .sort((a, b) => a.order - b.order);
  }, [sections, projectId]);
  
  // Get tasks for this project
  const projectTasks = useMemo(() => {
    return tasks.filter(t => {
      if (t.projectId !== projectId) return false;
      if (t.parentTaskId) return false; // Skip subtasks
      if (t.status === '✅ Done' && !showCompleted) return false;
      return true;
    });
  }, [tasks, projectId, showCompleted]);
  
  // Group tasks by section
  const tasksBySection = useMemo(() => {
    const grouped: Record<string, Task[]> = {
      'no-section': [],
    };
    
    projectSections.forEach(section => {
      grouped[section.id] = [];
    });
    
    projectTasks.forEach(task => {
      const sectionId = task.sectionId || 'no-section';
      if (grouped[sectionId]) {
        grouped[sectionId].push(task);
      } else {
        grouped['no-section'].push(task);
      }
    });
    
    return grouped;
  }, [projectTasks, projectSections]);
  
  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks.find(t => t.id === event.active.id);
    setActiveTask(task || null);
  };
  
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);
    
    if (!over) return;
    
    const taskId = active.id as string;
    const overId = over.id as string;
    
    // Check if dropped on a section column
    if (overId.startsWith('section-')) {
      const targetSectionId = overId.replace('section-', '');
      const newSectionId = targetSectionId === 'no-section' ? null : targetSectionId;
      
      const task = tasks.find(t => t.id === taskId);
      if (task && task.sectionId !== newSectionId) {
        await updateTask(taskId, { sectionId: newSectionId });
      }
    }
  };
  
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div style={{
        display: 'flex',
        gap: 16,
        padding: 24,
        height: '100%',
        overflowX: 'auto',
        backgroundColor: colors.bg,
      }}>
        {/* No Section column */}
        <KanbanColumn
          sectionId="no-section"
          sectionName="No Section"
          sectionColor={null}
          tasks={tasksBySection['no-section'] || []}
          colors={colors}
          isDarkMode={isDarkMode}
          onEditTask={onEditTask}
        />
        
        {/* Section columns */}
        {projectSections.map(section => (
          <KanbanColumn
            key={section.id}
            sectionId={section.id}
            sectionName={section.name}
            sectionColor={section.color}
            tasks={tasksBySection[section.id] || []}
            colors={colors}
            isDarkMode={isDarkMode}
            onEditTask={onEditTask}
          />
        ))}
        
        {/* Add Section column */}
        <div style={{
          flexShrink: 0,
          width: 280,
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'center',
          paddingTop: 16,
        }}>
          <button
            onClick={onAddSection}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '12px 20px',
              fontSize: 14,
              fontWeight: 500,
              borderRadius: 8,
              border: `1px dashed ${colors.cardBorder}`,
              backgroundColor: 'transparent',
              color: colors.textSecondary,
              cursor: 'pointer',
            }}
          >
            <Plus size={18} />
            Add Section
          </button>
        </div>
      </div>
      
      <DragOverlay>
        {activeTask && (
          <KanbanCard
            task={activeTask}
            colors={colors}
            isDarkMode={isDarkMode}
            isDragging
          />
        )}
      </DragOverlay>
    </DndContext>
  );
}

interface KanbanColumnProps {
  sectionId: string;
  sectionName: string;
  sectionColor: string | null;
  tasks: Task[];
  colors: Record<string, string>;
  isDarkMode: boolean;
  onEditTask: (task: Task) => void;
}

function KanbanColumn({ sectionId, sectionName, sectionColor, tasks, colors, isDarkMode, onEditTask }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `section-${sectionId}`,
    data: { sectionId },
  });
  
  return (
    <div
      ref={setNodeRef}
      style={{
        width: 280,
        minWidth: 280,
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: colors.columnBg,
        borderRadius: 12,
        overflow: 'hidden',
        border: isOver ? '2px solid #3b82f6' : 'none',
        maxHeight: 'calc(100vh - 200px)',
      }}
    >
      {/* Column Header */}
      <div style={{
        padding: '12px 16px',
        borderBottom: `1px solid ${colors.cardBorder}`,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}>
        {sectionColor && (
          <div style={{
            width: 12,
            height: 12,
            borderRadius: '50%',
            backgroundColor: sectionColor,
            flexShrink: 0,
          }} />
        )}
        <span style={{ fontWeight: 600, fontSize: 14, color: colors.text, flex: 1 }}>
          {sectionName}
        </span>
        <span style={{
          fontSize: 12,
          padding: '2px 8px',
          borderRadius: 12,
          backgroundColor: isDarkMode ? '#3a3a3a' : '#f0f0f0',
          color: colors.textSecondary,
        }}>
          {tasks.length}
        </span>
      </div>
      
      {/* Tasks */}
      <div style={{
        flex: 1,
        padding: 12,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}>
        <SortableContext
          items={tasks.map(t => t.id)}
          strategy={verticalListSortingStrategy}
        >
          {tasks.map(task => (
            <SortableKanbanCard
              key={task.id}
              task={task}
              colors={colors}
              isDarkMode={isDarkMode}
              onEditTask={onEditTask}
            />
          ))}
        </SortableContext>
        
        {tasks.length === 0 && (
          <div style={{
            padding: 24,
            textAlign: 'center',
            color: colors.textMuted,
            fontSize: 13,
            fontStyle: 'italic',
          }}>
            Drop tasks here
          </div>
        )}
      </div>
    </div>
  );
}

interface SortableKanbanCardProps {
  task: Task;
  colors: Record<string, string>;
  isDarkMode: boolean;
  onEditTask: (task: Task) => void;
}

function SortableKanbanCard({ task, colors, isDarkMode, onEditTask }: SortableKanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <KanbanCard
        task={task}
        colors={colors}
        isDarkMode={isDarkMode}
        onClick={() => onEditTask(task)}
      />
    </div>
  );
}

interface KanbanCardProps {
  task: Task;
  colors: Record<string, string>;
  isDarkMode: boolean;
  onClick?: () => void;
  isDragging?: boolean;
}

function KanbanCard({ task, colors, isDarkMode, onClick, isDragging }: KanbanCardProps) {
  const dueDateInfo = getDueDateInfo(task.dueDate);
  const isCompleted = task.status === '✅ Done';
  const isTopPriority = task.priority === '🔥 Top 5';
  
  return (
    <div
      onClick={onClick}
      style={{
        padding: 12,
        backgroundColor: colors.cardBg,
        border: `1px solid ${colors.cardBorder}`,
        borderRadius: 8,
        cursor: isDragging ? 'grabbing' : 'pointer',
        boxShadow: isDragging ? '0 8px 16px rgba(0,0,0,0.15)' : 'none',
        borderLeft: isTopPriority ? '3px solid #d1453b' : `1px solid ${colors.cardBorder}`,
      }}
    >
      {/* Task name */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 8,
        marginBottom: dueDateInfo || task.status ? 8 : 0,
      }}>
        {isCompleted ? (
          <CheckCircle size={16} weight="fill" style={{ color: '#22c55e', flexShrink: 0, marginTop: 2 }} />
        ) : (
          <Circle size={16} style={{ color: isTopPriority ? '#d1453b' : colors.textSecondary, flexShrink: 0, marginTop: 2 }} />
        )}
        <span style={{
          fontSize: 14,
          color: isCompleted ? colors.textSecondary : colors.text,
          textDecoration: isCompleted ? 'line-through' : 'none',
          lineHeight: 1.4,
        }}>
          {task.name}
        </span>
      </div>
      
      {/* Badges */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
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
            <CalendarBlank size={10} />
            {dueDateInfo.text}
          </span>
        )}
        
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
      </div>
    </div>
  );
}
