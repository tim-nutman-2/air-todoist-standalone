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
  
  console.log(`[Airtable API] ${options.method || 'GET'}: ${url}`);
  if (options.body) {
    console.log(`[Airtable API] Body:`, JSON.parse(options.body as string));
  }
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: { message: response.statusText } }));
    console.error(`[Airtable API] Error ${response.status}:`, errorData);
    const errorMsg = errorData.error?.message || errorData.error?.type || response.statusText;
    throw new Error(`Airtable API Error (${response.status}): ${errorMsg}`);
  }
  
  const data = await response.json();
  console.log(`[Airtable API] Response OK`);
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
  
  // Text fields - ensure we always get strings (rich text fields might return objects)
  const name = f[FIELDS.TASK_NAME] || f['Task'] || '';
  const rawNotes = f[FIELDS.TASK_NOTES] || f['Notes'];
  const notes = typeof rawNotes === 'string' ? rawNotes : '';
  const calendarEventId = f[FIELDS.TASK_CALENDAR_EVENT_ID] || f['Calendar Event ID'] || null;
  
  // Date fields
  const startDate = f[FIELDS.TASK_START_DATE] || f['Start Date'] || null;
  const dueDate = f[FIELDS.TASK_DUE_DATE] || f['Due Date'] || null;
  const completedDate = f[FIELDS.TASK_COMPLETED_DATE] || f['Completed Date'] || null;
  
  // Checkbox field
  const syncToCalendar = f[FIELDS.TASK_SYNC_TO_CALENDAR] || f['Sync to Calendar'] || false;
  
  // Duration/effort fields (stored in seconds in Airtable)
  const plannedEffort = f[FIELDS.TASK_PLANNED_EFFORT] || f['Planned Effort'] || null;
  const actualEffort = f[FIELDS.TASK_ACTUAL_EFFORT] || f['Actual Effort'] || null;
  
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
    plannedEffort,
    actualEffort,
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
  
  // Text fields - ensure we send strings
  if (task.name) fields[FIELDS.TASK_NAME] = task.name;
  if (task.notes && typeof task.notes === 'string') fields[FIELDS.TASK_NOTES] = task.notes;
  
  // Single select fields - pass string value directly
  if (task.status) fields[FIELDS.TASK_STATUS] = task.status;
  if (task.priority) fields[FIELDS.TASK_PRIORITY] = task.priority;
  
  // Date fields
  if (task.startDate) fields[FIELDS.TASK_START_DATE] = task.startDate;
  if (task.dueDate) fields[FIELDS.TASK_DUE_DATE] = task.dueDate;
  
  // Linked record fields - array of record ID strings
  if (task.projectId) fields[FIELDS.TASK_PROJECT] = [task.projectId];
  if (task.tagIds?.length) fields[FIELDS.TASK_TAGS] = task.tagIds;
  if (task.parentTaskId) fields[FIELDS.TASK_PARENT] = [task.parentTaskId];
  if (task.sectionId) fields[FIELDS.TASK_SECTION] = [task.sectionId];
  
  console.log(`[Create Task]:`, { task, fields });
  
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
  
  // Text fields - ensure we send strings
  if (updates.name !== undefined) fields[FIELDS.TASK_NAME] = updates.name;
  if (updates.notes !== undefined) {
    fields[FIELDS.TASK_NOTES] = typeof updates.notes === 'string' ? updates.notes : '';
  }
  
  // Single select fields - Airtable REST API accepts just the string value
  if (updates.status !== undefined) fields[FIELDS.TASK_STATUS] = updates.status || null;
  if (updates.priority !== undefined) fields[FIELDS.TASK_PRIORITY] = updates.priority || null;
  if (updates.scheduledTime !== undefined) fields[FIELDS.TASK_SCHEDULED_TIME] = updates.scheduledTime || null;
  if (updates.duration !== undefined) fields[FIELDS.TASK_DURATION] = updates.duration || null;
  if (updates.calendarSyncStatus !== undefined) fields[FIELDS.TASK_CALENDAR_SYNC_STATUS] = updates.calendarSyncStatus || null;
  
  // Date fields
  if (updates.startDate !== undefined) fields[FIELDS.TASK_START_DATE] = updates.startDate || null;
  if (updates.dueDate !== undefined) fields[FIELDS.TASK_DUE_DATE] = updates.dueDate || null;
  if (updates.completedDate !== undefined) fields[FIELDS.TASK_COMPLETED_DATE] = updates.completedDate || null;
  
  // Linked record fields - array of record ID strings
  if (updates.projectId !== undefined) fields[FIELDS.TASK_PROJECT] = updates.projectId ? [updates.projectId] : null;
  if (updates.tagIds !== undefined) fields[FIELDS.TASK_TAGS] = updates.tagIds.length ? updates.tagIds : null;
  if (updates.parentTaskId !== undefined) fields[FIELDS.TASK_PARENT] = updates.parentTaskId ? [updates.parentTaskId] : null;
  if (updates.sectionId !== undefined) fields[FIELDS.TASK_SECTION] = updates.sectionId ? [updates.sectionId] : null;
  
  // Boolean and number fields
  if (updates.syncToCalendar !== undefined) fields[FIELDS.TASK_SYNC_TO_CALENDAR] = updates.syncToCalendar;
  if (updates.plannedEffort !== undefined) fields[FIELDS.TASK_PLANNED_EFFORT] = updates.plannedEffort;
  if (updates.actualEffort !== undefined) fields[FIELDS.TASK_ACTUAL_EFFORT] = updates.actualEffort;
  
  console.log(`[Update Task] ${taskId}:`, { updates, fields });
  
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
  
  // Log raw field data for debugging
  console.log(`[Map Project Raw] ${record.id}:`, {
    rawStatus: f[FIELDS.PROJECT_STATUS],
    rawStatusAlt: f['Status'],
    allFields: Object.keys(f),
  });
  
  // Single select field
  const status = getSingleSelectValue(f[FIELDS.PROJECT_STATUS] || f['Status']);
  
  // Linked records
  const taskIds = getLinkedRecordIds(f[FIELDS.PROJECT_TASKS] || f['Tasks']);
  
  // Text fields - ensure we always get strings (rich text fields might return objects)
  const name = f[FIELDS.PROJECT_NAME] || f['Project Name'] || f['Name'] || '';
  const rawDescription = f[FIELDS.PROJECT_DESCRIPTION] || f['Description'];
  const description = typeof rawDescription === 'string' ? rawDescription : '';
  const rawNotes = f[FIELDS.PROJECT_NOTES] || f['Notes'];
  const notes = typeof rawNotes === 'string' ? rawNotes : '';
  
  // Date fields
  const startDate = f[FIELDS.PROJECT_START_DATE] || f['Start Date'] || null;
  const targetDate = f[FIELDS.PROJECT_TARGET_DATE] || f['Target Date'] || null;
  
  console.log(`[Map Project] ${record.id}: "${name}" | Status: "${status}" | Tasks: ${taskIds.length}`);
  
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

export async function updateProject(projectId: string, updates: Partial<Project>): Promise<Project> {
  const fields: Record<string, unknown> = {};
  
  // Text fields
  if (updates.name !== undefined) fields[FIELDS.PROJECT_NAME] = updates.name;
  if (updates.description !== undefined) {
    if (typeof updates.description === 'string') {
      fields[FIELDS.PROJECT_DESCRIPTION] = updates.description;
    }
  }
  // Note: PROJECT_NOTES is an AI-generated field and should not be updated manually
  
  // Single select field - send the exact string value or null to clear
  if (updates.status !== undefined) {
    // Airtable expects the exact option name as a string, or null to clear
    fields[FIELDS.PROJECT_STATUS] = updates.status && updates.status.trim() ? updates.status.trim() : null;
  }
  
  // Date fields - send ISO date string or null
  if (updates.startDate !== undefined) fields[FIELDS.PROJECT_START_DATE] = updates.startDate || null;
  if (updates.targetDate !== undefined) fields[FIELDS.PROJECT_TARGET_DATE] = updates.targetDate || null;
  
  console.log(`[Update Project] ${projectId}:`, { 
    updates, 
    fields,
    statusType: typeof updates.status,
    statusValue: updates.status,
  });
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const response = await rateLimitedFetch<{ id: string; fields: Record<string, any> }>(
    `${TABLES.PROJECTS.id}/${projectId}`,
    {
      method: 'PATCH',
      body: JSON.stringify({ fields }),
    }
  );
  
  return mapProjectFromAirtable(response);
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
  if (section.projectId) fields[FIELDS.SECTION_PROJECT] = [section.projectId];
  if (section.order !== undefined) fields[FIELDS.SECTION_ORDER] = section.order;
  if (section.color) fields[FIELDS.SECTION_COLOR] = section.color;
  
  console.log(`[Create Section]:`, { section, fields });
  
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
