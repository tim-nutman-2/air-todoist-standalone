// Types matching your Airtable schema

export interface Task {
  id: string;
  name: string;
  status: string | null;  // e.g., "📥 Inbox", "✅ Done"
  priority: string | null;  // e.g., "🔥 Top 5", "📌 Everything Else"
  startDate: string | null;
  dueDate: string | null;
  completedDate: string | null;
  projectId: string | null;
  projectName?: string;
  tagIds: string[];
  tagNames?: string[];
  parentTaskId: string | null;
  subtaskIds: string[];
  sectionId: string | null;
  notes: string;
  // Calendar sync fields
  syncToCalendar: boolean;
  scheduledTime: string | null;
  duration: string | null;
  calendarEventId: string | null;
  calendarSyncStatus: string | null;  // e.g., "Synced", "Needs sync"
  // Effort tracking
  plannedEffort: number | null;
  actualEffort: number | null;
  // Local-only fields for sync
  _localId?: string;
  _syncStatus?: SyncStatus;
  _modifiedAt?: number;
  _createdAt?: number;
}

export interface Project {
  id: string;
  name: string;
  status: string | null;  // e.g., "Active", "On Hold"
  description: string;
  startDate: string | null;
  targetDate: string | null;
  notes: string;
  taskIds: string[];
  // Local-only
  _syncStatus?: SyncStatus;
  _modifiedAt?: number;
}

export interface Tag {
  id: string;
  name: string;
  type: string | null;  // e.g., "Priority", "Context"
  description: string;
  taskIds: string[];
}

export interface Section {
  id: string;
  name: string;
  projectId: string | null;
  order: number;
  color: string | null;
  // Local-only
  _syncStatus?: SyncStatus;
  _modifiedAt?: number;
}

export interface Filter {
  id: string;
  name: string;
  criteria: FilterCriteria;
  color: string;
  createdAt: string;
}

export interface FilterCriteria {
  status?: string[];
  priority?: string[];
  projectIds?: string[];
  tagIds?: string[];
  dueDateRange?: 'overdue' | 'today' | 'tomorrow' | 'this_week' | 'no_date';
}

// Enums matching Airtable select options
export type TaskStatus = 
  | '📥 Inbox'
  | '📋 To Do'
  | '🔄 In Progress'
  | '✅ Done'
  | '🚫 Blocked'
  | '⏸️ Waiting';

export type TaskPriority = 
  | '🔥 Top 5'
  | '📌 Everything Else';

export type ProjectStatus = 
  | 'Active'
  | 'On Hold'
  | 'Completed'
  | 'Archived';

export type TagType = 
  | 'Priority'
  | 'Energy Level'
  | 'Context'
  | 'Status';

export type CalendarSyncStatus = 
  | 'Not synced'
  | 'Synced'
  | 'Needs sync'
  | 'Sync error';

export type SyncStatus = 
  | 'synced'
  | 'pending'
  | 'error';

// View types
export type ViewType = 
  | 'today'
  | 'inbox'
  | 'upcoming'
  | 'projects'
  | 'project'
  | 'filters'
  | 'filter'
  | 'tags'
  | 'tag'
  | 'schedule';

// Airtable API types
export interface AirtableRecord<T> {
  id: string;
  fields: T;
  createdTime: string;
}

export interface AirtableResponse<T> {
  records: AirtableRecord<T>[];
  offset?: string;
}
