// Airtable Base and Table Configuration
// These IDs match your Air Todoist base

export const AIRTABLE_CONFIG = {
  BASE_ID: 'appUl0FdAjLrotIsG',
  
  TABLES: {
    TASKS: {
      id: 'tbl8M5NIaVcn7otwF',
      name: 'Tasks',
    },
    PROJECTS: {
      id: 'tblvdxJlbEz9rdKuN',
      name: 'Projects',
    },
    TAGS: {
      id: 'tbl5reOJK55nzPb87',
      name: 'Tags',
    },
    SECTIONS: {
      id: 'tblJKQ2ghBDAL7Ke0',
      name: 'Sections',
    },
  },
  
  // Field NAMES (REST API uses names, not IDs)
  FIELDS: {
    // Tasks table fields
    TASK_NAME: 'Task',
    TASK_STATUS: 'Status',
    TASK_PRIORITY: 'Priority',
    TASK_START_DATE: 'Start Date',
    TASK_DUE_DATE: 'Due Date',
    TASK_COMPLETED_DATE: 'Completed Date',
    TASK_PROJECT: 'Project',
    TASK_TAGS: 'Tags',
    TASK_PARENT: 'Parent Task',
    TASK_SUBTASKS: 'Subtasks',
    TASK_NOTES: 'Notes',
    TASK_SECTION: 'Section',
    TASK_SYNC_TO_CALENDAR: 'Sync to Calendar',
    TASK_SCHEDULED_TIME: 'Scheduled Time',
    TASK_DURATION: 'Duration',
    TASK_CALENDAR_EVENT_ID: 'Calendar Event ID',
    TASK_CALENDAR_SYNC_STATUS: 'Calendar Sync Status',
    TASK_PLANNED_EFFORT: 'Planned Effort',
    TASK_ACTUAL_EFFORT: 'Actual Effort',
    
    // Projects table fields
    PROJECT_NAME: 'Project Name',
    PROJECT_STATUS: 'Status',
    PROJECT_DESCRIPTION: 'Description',
    PROJECT_START_DATE: 'Start Date',
    PROJECT_TARGET_DATE: 'Target Date',
    PROJECT_NOTES: 'Notes',
    PROJECT_TASKS: 'Tasks',
    
    // Tags table fields
    TAG_NAME: 'Tag Name',
    TAG_TYPE: 'Type',
    TAG_DESCRIPTION: 'Description',
    TAG_TASKS: 'Tasks',
    
    // Sections table fields
    SECTION_NAME: 'Section Name',
    SECTION_PROJECT: 'Project',
    SECTION_ORDER: 'Order',
    SECTION_COLOR: 'Color',
  },
};

// Project colors (matching your extension)
export const PROJECT_COLORS: Record<string, string> = {
  'recgI1LsOYTFcOB0A': '#d1453b', // EMEA Strategic Initiatives - Red
  'rec9DQtFTWKWxEbHR': '#7c3aed', // GTM AI Labs - LI Analysis - Purple
  'recjhoLOQUSp16G2j': '#2563eb', // GTM AI Labs - Coaching - Blue
  'recb8hbP1pabRswAe': '#16a34a', // CEKO FY27 - Green
  'recR7KzAxuR0R79r4': '#d97706', // Team Design & Development - Orange
};

// Default project color for new/unknown projects
export const DEFAULT_PROJECT_COLOR = '#808080';

// Tag colors by type
export const TAG_COLORS: Record<string, string> = {
  'Priority': '#ef4444',
  'Energy Level': '#f59e0b',
  'Context': '#3b82f6',
  'Status': '#8b5cf6',
};

// Status options
export const STATUS_OPTIONS = [
  { value: '📥 Inbox', label: '📥 Inbox' },
  { value: '📋 To Do', label: '📋 To Do' },
  { value: '🔄 In Progress', label: '🔄 In Progress' },
  { value: '✅ Done', label: '✅ Done' },
  { value: '🚫 Blocked', label: '🚫 Blocked' },
  { value: '⏸️ Waiting', label: '⏸️ Waiting' },
];

// Priority options
export const PRIORITY_OPTIONS = [
  { value: '🔥 Top 5', label: '🔥 Top 5' },
  { value: '📌 Everything Else', label: '📌 Everything Else' },
];

// Calendar sync options
export const SCHEDULED_TIME_OPTIONS = [
  { value: '9:00 AM', label: '9:00 AM' },
  { value: '9:30 AM', label: '9:30 AM' },
  { value: '10:00 AM', label: '10:00 AM' },
  { value: '10:30 AM', label: '10:30 AM' },
  { value: '11:00 AM', label: '11:00 AM' },
  { value: '11:30 AM', label: '11:30 AM' },
  { value: '12:00 PM', label: '12:00 PM' },
  { value: '12:30 PM', label: '12:30 PM' },
  { value: '1:00 PM', label: '1:00 PM' },
  { value: '1:30 PM', label: '1:30 PM' },
  { value: '2:00 PM', label: '2:00 PM' },
  { value: '2:30 PM', label: '2:30 PM' },
  { value: '3:00 PM', label: '3:00 PM' },
  { value: '3:30 PM', label: '3:30 PM' },
  { value: '4:00 PM', label: '4:00 PM' },
  { value: '4:30 PM', label: '4:30 PM' },
  { value: '5:00 PM', label: '5:00 PM' },
  { value: '5:30 PM', label: '5:30 PM' },
  { value: '6:00 PM', label: '6:00 PM' },
];

export const DURATION_OPTIONS = [
  { value: '30 minutes', label: '30 minutes' },
  { value: '1 hour', label: '1 hour' },
  { value: '2 hours', label: '2 hours' },
  { value: '3 hours', label: '3 hours' },
  { value: '4 hours', label: '4 hours' },
  { value: 'All day', label: 'All day' },
];

// Theme configuration
export const THEME = {
  primaryColor: '#d1453b',
  primaryHover: '#b93d35',
  primaryLight: '#fee9e9',
};

// Local storage keys
export const STORAGE_KEYS = {
  THEME: 'air-todoist-theme',
  SHOW_COMPLETED: 'air-todoist-show-completed',
  COLLAPSED_SECTIONS: 'air-todoist-collapsed-sections',
  SIDEBAR_WIDTH: 'air-todoist-sidebar-width',
  FILTERS: 'air-todoist-filters',
  LAST_SYNC: 'air-todoist-last-sync',
  ACTIVE_TIMER: 'air-todoist-active-timer',
};
