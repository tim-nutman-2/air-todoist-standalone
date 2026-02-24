// Airtable REST API Service
// Replaces the Blocks SDK with direct API calls

import { AIRTABLE_CONFIG } from '../utils/constants';
import type { Task, Project, Tag, Section, AirtableResponse } from '../types';

const { BASE_ID, TABLES, FIELDS } = AIRTABLE_CONFIG;

// Get API key from environment
const getApiKey = (): string => {
  const key = import.meta.env.VITE_AIRTABLE_API_KEY;
  if (!key) {
    throw new Error('VITE_AIRTABLE_API_KEY is not set. Please add it to your .env.local file.');
  }
  return key;
};

// Base fetch function with error handling
async function airtableFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const apiKey = getApiKey();
  const url = `https://api.airtable.com/v0/${BASE_ID}/${endpoint}`;
  
  console.log(`[Airtable API] Fetching: ${url}`);
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }));
    console.error(`[Airtable API] Error:`, error);
    throw new Error(`Airtable API Error: ${error.error?.message || response.statusText}`);
  }
  
  const data = await response.json();
  console.log(`[Airtable API] Response:`, data);
  return data;
}

// Rate limiting helper (5 requests per second)
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 200; // 200ms = 5 req/s

async function rateLimitedFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  
  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    await new Promise(resolve => setTimeout(resolve, MIN_REQUEST_INTERVAL - timeSinceLastRequest));
  }
  
  lastRequestTime = Date.now();
  return airtableFetch<T>(endpoint, options);
}

// ============================================================================
// TASKS
// ============================================================================

// Helper to extract single select value
// REST API returns string directly: "📥 Inbox"
// Blocks SDK returns object: {name: "📥 Inbox"}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getSingleSelectValue(field: any): string | null {
  if (!field) return null;
  if (typeof field === 'string') return field;
  if (typeof field === 'object' && field.name) return field.name;
  return null;
}

// Helper to extract linked record ID (REST API returns array of strings, not objects)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getLinkedRecordId(field: any): string | null {
  if (!field || !Array.isArray(field) || field.length === 0) return null;
  // REST API returns array of record ID strings like ["recXXX"]
  // Blocks SDK returns array of objects like [{id: "recXXX", name: "..."}]
  const first = field[0];
  if (typeof first === 'string') return first;
  if (typeof first === 'object' && first.id) return first.id;
  return null;
}

// Helper to extract multiple linked record IDs
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getLinkedRecordIds(field: any): string[] {
  if (!field || !Array.isArray(field)) return [];
  return field.map((item: string | { id: string }) => {
    if (typeof item === 'string') return item;
    if (typeof item === 'object' && item.id) return item.id;
    return null;
  }).filter(Boolean) as string[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapTaskFromAirtable(record: { id: string; fields: Record<string, any> }): Task {
  const f = record.fields;
  
  // Single select fields - use helper to handle both string and object formats
  const status = getSingleSelectValue(f[FIELDS.TASK_STATUS] || f['Status']);
  const priority = getSingleSelectValue(f[FIELDS.TASK_PRIORITY] || f['Priority']);
  const scheduledTime = getSingleSelectValue(f[FIELDS.TASK_SCHEDULED_TIME] || f['Scheduled Time']);
  const duration = getSingleSelectValue(f[FIELDS.TASK_DURATION] || f['Duration']);
  const calendarSyncStatus = getSingleSelectValue(f[FIELDS.TASK_CALENDAR_SYNC_STATUS] || f['Calendar Sync Status']);
  
  // Linked record fields
  const projectId = getLinkedRecordId(f[FIELDS.TASK_PROJECT] || f['Project']);
  const tagIds = getLinkedRecordIds(f[FIELDS.TASK_TAGS] || f['Tags']);
  const parentTaskId = getLinkedRecordId(f[FIELDS.TASK_PARENT] || f['Parent Task']);
  const subtaskIds = getLinkedRecordIds(f[FIELDS.TASK_SUBTASKS] || f['Subtasks']);
  const sectionId = getLinkedRecordId(f[FIELDS.TASK_SECTION] || f['Section']);
  
  // Text fields
  const name = f[FIELDS.TASK_NAME] || f['Task'] || '';
  const notes = f[FIELDS.TASK_NOTES] || f['Notes'] || '';
  const calendarEventId = f[FIELDS.TASK_CALENDAR_EVENT_ID] || f['Calendar Event ID'] || null;
  
  // Date fields
  const startDate = f[FIELDS.TASK_START_DATE] || f['Start Date'] || null;
  const dueDate = f[FIELDS.TASK_DUE_DATE] || f['Due Date'] || null;
  const completedDate = f[FIELDS.TASK_COMPLETED_DATE] || f['Completed Date'] || null;
  
  // Checkbox field
  const syncToCalendar = f[FIELDS.TASK_SYNC_TO_CALENDAR] || f['Sync to Calendar'] || false;
  
  // Debug log
  console.log(`[Map Task] ${record.id}: "${name}" | Status: ${status} | Priority: ${priority} | Project: ${projectId}`);
  
  const task: Task = {
    id: record.id,
    name,
    status,
    priority,
    startDate,
    dueDate,
    completedDate,
    projectId,
    projectName: undefined,
    tagIds,
    tagNames: [],
    parentTaskId,
    subtaskIds,
    sectionId,
    notes,
    syncToCalendar,
    scheduledTime,
    duration,
    calendarEventId,
    calendarSyncStatus,
    plannedEffort: null,
    actualEffort: null,
  };
  
  return task;
}

export async function fetchAllTasks(): Promise<Task[]> {
  const tasks: Task[] = [];
  let offset: string | undefined;
  
  do {
    const params = new URLSearchParams();
    if (offset) params.set('offset', offset);
    
    // Use table ID for reliability
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await rateLimitedFetch<AirtableResponse<Record<string, any>>>(
      `${TABLES.TASKS.id}?${params.toString()}`
    );
    
    console.log(`[Fetch Tasks] Got ${response.records.length} records`);
    
    tasks.push(...response.records.map(mapTaskFromAirtable));
    offset = response.offset;
  } while (offset);
  
  console.log(`[Fetch Tasks] Total tasks: ${tasks.length}`);
  return tasks;
}

export async function createTask(task: Partial<Task>): Promise<Task> {
  const fields: Record<string, unknown> = {};
  
  if (task.name) fields[FIELDS.TASK_NAME] = task.name;
  if (task.status) fields[FIELDS.TASK_STATUS] = { name: task.status };
  if (task.priority) fields[FIELDS.TASK_PRIORITY] = { name: task.priority };
  if (task.startDate) fields[FIELDS.TASK_START_DATE] = task.startDate;
  if (task.dueDate) fields[FIELDS.TASK_DUE_DATE] = task.dueDate;
  if (task.projectId) fields[FIELDS.TASK_PROJECT] = [{ id: task.projectId }];
  if (task.tagIds?.length) fields[FIELDS.TASK_TAGS] = task.tagIds.map(id => ({ id }));
  if (task.parentTaskId) fields[FIELDS.TASK_PARENT] = [{ id: task.parentTaskId }];
  if (task.sectionId) fields[FIELDS.TASK_SECTION] = [{ id: task.sectionId }];
  if (task.notes) fields[FIELDS.TASK_NOTES] = task.notes;
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const response = await rateLimitedFetch<{ id: string; fields: Record<string, any> }>(
    TABLES.TASKS.id,
    {
      method: 'POST',
      body: JSON.stringify({ fields }),
    }
  );
  
  return mapTaskFromAirtable(response);
}

export async function updateTask(taskId: string, updates: Partial<Task>): Promise<Task> {
  const fields: Record<string, unknown> = {};
  
  if (updates.name !== undefined) fields[FIELDS.TASK_NAME] = updates.name;
  if (updates.status !== undefined) fields[FIELDS.TASK_STATUS] = updates.status ? { name: updates.status } : null;
  if (updates.priority !== undefined) fields[FIELDS.TASK_PRIORITY] = updates.priority ? { name: updates.priority } : null;
  if (updates.startDate !== undefined) fields[FIELDS.TASK_START_DATE] = updates.startDate;
  if (updates.dueDate !== undefined) fields[FIELDS.TASK_DUE_DATE] = updates.dueDate;
  if (updates.completedDate !== undefined) fields[FIELDS.TASK_COMPLETED_DATE] = updates.completedDate;
  if (updates.projectId !== undefined) fields[FIELDS.TASK_PROJECT] = updates.projectId ? [{ id: updates.projectId }] : null;
  if (updates.tagIds !== undefined) fields[FIELDS.TASK_TAGS] = updates.tagIds.length ? updates.tagIds.map(id => ({ id })) : null;
  if (updates.parentTaskId !== undefined) fields[FIELDS.TASK_PARENT] = updates.parentTaskId ? [{ id: updates.parentTaskId }] : null;
  if (updates.sectionId !== undefined) fields[FIELDS.TASK_SECTION] = updates.sectionId ? [{ id: updates.sectionId }] : null;
  if (updates.notes !== undefined) fields[FIELDS.TASK_NOTES] = updates.notes;
  if (updates.syncToCalendar !== undefined) fields[FIELDS.TASK_SYNC_TO_CALENDAR] = updates.syncToCalendar;
  if (updates.scheduledTime !== undefined) fields[FIELDS.TASK_SCHEDULED_TIME] = updates.scheduledTime ? { name: updates.scheduledTime } : null;
  if (updates.duration !== undefined) fields[FIELDS.TASK_DURATION] = updates.duration ? { name: updates.duration } : null;
  if (updates.calendarSyncStatus !== undefined) fields[FIELDS.TASK_CALENDAR_SYNC_STATUS] = updates.calendarSyncStatus ? { name: updates.calendarSyncStatus } : null;
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const response = await rateLimitedFetch<{ id: string; fields: Record<string, any> }>(
    `${TABLES.TASKS.id}/${taskId}`,
    {
      method: 'PATCH',
      body: JSON.stringify({ fields }),
    }
  );
  
  return mapTaskFromAirtable(response);
}

export async function deleteTask(taskId: string): Promise<void> {
  await rateLimitedFetch(
    `${TABLES.TASKS.id}/${taskId}`,
    { method: 'DELETE' }
  );
}

// ============================================================================
// PROJECTS
// ============================================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapProjectFromAirtable(record: { id: string; fields: Record<string, any> }): Project {
  const f = record.fields;
  
  // Single select field
  const status = getSingleSelectValue(f[FIELDS.PROJECT_STATUS] || f['Status']);
  
  // Linked records
  const taskIds = getLinkedRecordIds(f[FIELDS.PROJECT_TASKS] || f['Tasks']);
  
  // Text fields
  const name = f[FIELDS.PROJECT_NAME] || f['Project Name'] || f['Name'] || '';
  const description = f[FIELDS.PROJECT_DESCRIPTION] || f['Description'] || '';
  const notes = f[FIELDS.PROJECT_NOTES] || f['Notes'] || '';
  
  // Date fields
  const startDate = f[FIELDS.PROJECT_START_DATE] || f['Start Date'] || null;
  const targetDate = f[FIELDS.PROJECT_TARGET_DATE] || f['Target Date'] || null;
  
  console.log(`[Map Project] ${record.id}: "${name}" | Status: ${status} | Tasks: ${taskIds.length}`);
  
  return {
    id: record.id,
    name,
    status,
    description,
    startDate,
    targetDate,
    notes,
    taskIds,
  };
}

export async function fetchAllProjects(): Promise<Project[]> {
  const projects: Project[] = [];
  let offset: string | undefined;
  
  console.log(`[Fetch Projects] Starting fetch from table: "${TABLES.PROJECTS.name}"`);
  
  do {
    const params = new URLSearchParams();
    if (offset) params.set('offset', offset);
    
    // Try using table ID instead of name
    const endpoint = `${TABLES.PROJECTS.id}?${params.toString()}`;
    console.log(`[Fetch Projects] Endpoint (using ID): ${endpoint}`);
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await rateLimitedFetch<AirtableResponse<Record<string, any>>>(
      endpoint
    );
    
    console.log(`[Fetch Projects] Got ${response.records.length} records`);
    console.log(`[Fetch Projects] Raw response:`, response);
    
    projects.push(...response.records.map(mapProjectFromAirtable));
    offset = response.offset;
  } while (offset);
  
  console.log(`[Fetch Projects] Total projects: ${projects.length}`);
  return projects;
}

// ============================================================================
// TAGS
// ============================================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapTagFromAirtable(record: { id: string; fields: Record<string, any> }): Tag {
  const f = record.fields;
  
  // Single select field
  const type = getSingleSelectValue(f[FIELDS.TAG_TYPE] || f['Type']);
  
  // Linked records
  const taskIds = getLinkedRecordIds(f[FIELDS.TAG_TASKS] || f['Tasks']);
  
  // Text fields
  const name = f[FIELDS.TAG_NAME] || f['Tag Name'] || '';
  const description = f[FIELDS.TAG_DESCRIPTION] || f['Description'] || '';
  
  console.log(`[Map Tag] ${record.id}: "${name}" | Type: ${type}`);
  
  return {
    id: record.id,
    name,
    type,
    description,
    taskIds,
  };
}

export async function fetchAllTags(): Promise<Tag[]> {
  const tags: Tag[] = [];
  let offset: string | undefined;
  
  do {
    const params = new URLSearchParams();
    if (offset) params.set('offset', offset);
    
    // Use table ID for reliability
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await rateLimitedFetch<AirtableResponse<Record<string, any>>>(
      `${TABLES.TAGS.id}?${params.toString()}`
    );
    
    console.log(`[Fetch Tags] Got ${response.records.length} records`);
    
    tags.push(...response.records.map(mapTagFromAirtable));
    offset = response.offset;
  } while (offset);
  
  console.log(`[Fetch Tags] Total tags: ${tags.length}`);
  return tags;
}

// ============================================================================
// SECTIONS
// ============================================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapSectionFromAirtable(record: { id: string; fields: Record<string, any> }): Section {
  const f = record.fields;
  
  // Get linked project
  const projectField = f[FIELDS.SECTION_PROJECT] || f['Project'];
  const projectId = getLinkedRecordId(projectField);
  
  return {
    id: record.id,
    name: f[FIELDS.SECTION_NAME] || f['Section Name'] || f['Name'] || '',
    projectId: projectId,
    order: f[FIELDS.SECTION_ORDER] || f['Order'] || 0,
    color: f[FIELDS.SECTION_COLOR] || f['Color'] || null,
  };
}

export async function fetchAllSections(): Promise<Section[]> {
  try {
    const sections: Section[] = [];
    let offset: string | undefined;
    
    do {
      const params = new URLSearchParams();
      if (offset) params.set('offset', offset);
      
      // Use table ID for reliability
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const response = await rateLimitedFetch<AirtableResponse<Record<string, any>>>(
        `${TABLES.SECTIONS.id}?${params.toString()}`
      );
      
      console.log(`[Fetch Sections] Got ${response.records.length} records`);
      
      sections.push(...response.records.map(mapSectionFromAirtable));
      offset = response.offset;
    } while (offset);
    
    console.log(`[Fetch Sections] Total sections: ${sections.length}`);
    return sections;
  } catch (error) {
    console.warn('[Fetch Sections] Table may not exist, returning empty array:', error);
    return [];
  }
}

export async function createSection(section: Partial<Section>): Promise<Section> {
  const fields: Record<string, unknown> = {};
  
  if (section.name) fields[FIELDS.SECTION_NAME] = section.name;
  if (section.projectId) fields[FIELDS.SECTION_PROJECT] = [{ id: section.projectId }];
  if (section.order !== undefined) fields[FIELDS.SECTION_ORDER] = section.order;
  if (section.color) fields[FIELDS.SECTION_COLOR] = section.color;
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const response = await rateLimitedFetch<{ id: string; fields: Record<string, any> }>(
    TABLES.SECTIONS.id,
    {
      method: 'POST',
      body: JSON.stringify({ fields }),
    }
  );
  
  return mapSectionFromAirtable(response);
}

// ============================================================================
// BATCH FETCH ALL DATA
// ============================================================================

export interface AllData {
  tasks: Task[];
  projects: Project[];
  tags: Tag[];
  sections: Section[];
}

export async function fetchAllData(): Promise<AllData> {
  console.log('[Fetch All Data] Starting...');
  
  // Fetch all tables in parallel (respecting rate limits)
  const [tasks, projects, tags, sections] = await Promise.all([
    fetchAllTasks(),
    fetchAllProjects(),
    fetchAllTags(),
    fetchAllSections(),
  ]);
  
  console.log('[Fetch All Data] Complete:', { 
    tasks: tasks.length, 
    projects: projects.length, 
    tags: tags.length, 
    sections: sections.length 
  });
  
  return { tasks, projects, tags, sections };
}
