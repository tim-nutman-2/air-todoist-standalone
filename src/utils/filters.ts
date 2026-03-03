import type { Task, FilterCriteria } from '../types';
import { parseLocalDate } from './dates';

/**
 * Shared filter utility for applying filter criteria to tasks
 * Used by both App.tsx filter view and FiltersManagementView for task counts
 */
export function applyFilterCriteria(
  task: Task,
  criteria: FilterCriteria,
  options: { showCompleted?: boolean } = {}
): boolean {
  const { showCompleted = false } = options;
  
  // Skip completed tasks unless showCompleted is true
  if (task.status === '✅ Done' && !showCompleted) return false;
  
  // Skip subtasks (they should be filtered with their parent)
  if (task.parentTaskId) return false;
  
  // Status filter
  if (criteria.status?.length && !criteria.status.includes(task.status || '')) {
    return false;
  }
  
  // Priority filter
  if (criteria.priority?.length && !criteria.priority.includes(task.priority || '')) {
    return false;
  }
  
  // Project filter
  if (criteria.projectIds?.length && !criteria.projectIds.includes(task.projectId || '')) {
    return false;
  }
  
  // Tag filter (task must have at least one of the selected tags)
  if (criteria.tagIds?.length && !task.tagIds.some(id => criteria.tagIds?.includes(id))) {
    return false;
  }
  
  // Section filter
  if (criteria.sectionIds?.length && !criteria.sectionIds.includes(task.sectionId || '')) {
    return false;
  }
  
  // Due date range filter
  if (criteria.dueDateRange) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const endOfWeek = new Date(today);
    endOfWeek.setDate(endOfWeek.getDate() + (7 - today.getDay()));
    
    switch (criteria.dueDateRange) {
      case 'overdue': {
        if (!task.dueDate) return false;
        const dueDate = parseLocalDate(task.dueDate);
        if (!dueDate || dueDate >= today) return false;
        break;
      }
      case 'today': {
        if (!task.dueDate) return false;
        const dueDate = parseLocalDate(task.dueDate);
        if (!dueDate) return false;
        if (dueDate.getTime() !== today.getTime()) return false;
        break;
      }
      case 'tomorrow': {
        if (!task.dueDate) return false;
        const dueDate = parseLocalDate(task.dueDate);
        if (!dueDate) return false;
        if (dueDate.getTime() !== tomorrow.getTime()) return false;
        break;
      }
      case 'this_week': {
        if (!task.dueDate) return false;
        const dueDate = parseLocalDate(task.dueDate);
        if (!dueDate) return false;
        if (dueDate < today || dueDate > endOfWeek) return false;
        break;
      }
      case 'no_date': {
        if (task.dueDate) return false;
        break;
      }
    }
  }
  
  return true;
}

/**
 * Get tasks that match filter criteria
 */
export function getFilteredTasks(
  tasks: Task[],
  criteria: FilterCriteria,
  options: { showCompleted?: boolean } = {}
): Task[] {
  return tasks.filter(task => applyFilterCriteria(task, criteria, options));
}

/**
 * Get count of tasks matching filter criteria
 */
export function getFilterTaskCount(
  tasks: Task[],
  criteria: FilterCriteria,
  options: { showCompleted?: boolean } = {}
): number {
  return getFilteredTasks(tasks, criteria, options).length;
}
