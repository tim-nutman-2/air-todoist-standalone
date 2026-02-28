import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { DotsSixVertical } from '@phosphor-icons/react';
import { TaskItem } from './TaskItem';
import { useStore } from '../store';
import type { Task } from '../types';

interface DraggableTaskItemProps {
  task: Task;
  level?: number;
  showProject?: boolean;
  onEditTask?: (task: Task) => void;
  onAddSubtask?: (parentTask: Task) => void;
}

export function DraggableTaskItem({ task, level = 0, showProject = true, onEditTask, onAddSubtask }: DraggableTaskItemProps) {
  const { isDarkMode } = useStore();
  
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
    position: 'relative' as const,
  };
  
  const colors = {
    dragHandle: isDarkMode ? '#505050' : '#c0c0c0',
    dragHandleHover: isDarkMode ? '#808080' : '#808080',
  };
  
  return (
    <div ref={setNodeRef} style={style}>
      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        style={{
          position: 'absolute',
          left: level > 0 ? 16 + (level - 1) * 28 : 4,
          top: '50%',
          transform: 'translateY(-50%)',
          width: 12,
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
        onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.color = colors.dragHandleHover; }}
        onMouseLeave={(e) => { e.currentTarget.style.opacity = '0'; e.currentTarget.style.color = colors.dragHandle; }}
      >
        <DotsSixVertical size={16} weight="bold" />
      </div>
      
      <TaskItem
        task={task}
        level={level}
        showProject={showProject}
        onEditTask={onEditTask}
        onAddSubtask={onAddSubtask}
      />
    </div>
  );
}
