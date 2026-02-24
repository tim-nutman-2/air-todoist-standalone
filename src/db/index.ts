// Local IndexedDB storage using Dexie
// Enables offline-first functionality

import Dexie, { type Table } from 'dexie';
import type { Task, Project, Tag, Section, Filter } from '../types';

// Extend types with local sync metadata
export interface LocalTask extends Task {
  _localId?: string;
  _syncStatus: 'synced' | 'pending' | 'error';
  _modifiedAt: number;
  _createdAt?: number;
}

export interface LocalProject extends Project {
  _syncStatus: 'synced' | 'pending' | 'error';
  _modifiedAt: number;
}

export interface LocalSection extends Section {
  _syncStatus: 'synced' | 'pending' | 'error';
  _modifiedAt: number;
}

// Sync queue item for offline changes
export interface SyncQueueItem {
  id?: number;
  type: 'CREATE' | 'UPDATE' | 'DELETE';
  table: 'tasks' | 'projects' | 'sections';
  recordId: string;
  localId?: string;
  payload: Record<string, unknown>;
  createdAt: number;
  attempts: number;
  lastError?: string;
}

class AirTodoistDB extends Dexie {
  tasks!: Table<LocalTask, string>;
  projects!: Table<LocalProject, string>;
  tags!: Table<Tag, string>;
  sections!: Table<LocalSection, string>;
  filters!: Table<Filter, string>;
  syncQueue!: Table<SyncQueueItem, number>;
  metadata!: Table<{ key: string; value: unknown }, string>;

  constructor() {
    super('AirTodoistDB');
    
    this.version(1).stores({
      // Primary key is the Airtable record ID
      tasks: 'id, status, priority, dueDate, projectId, parentTaskId, sectionId, _syncStatus, _modifiedAt',
      projects: 'id, status, _syncStatus, _modifiedAt',
      tags: 'id, type',
      sections: 'id, projectId, order, _syncStatus, _modifiedAt',
      filters: 'id, createdAt',
      syncQueue: '++id, type, table, recordId, createdAt',
      metadata: 'key',
    });
  }
}

export const db = new AirTodoistDB();

// ============================================================================
// SYNC OPERATIONS
// ============================================================================

/**
 * Save all fetched data to local database
 */
export async function saveAllToLocal(data: {
  tasks: Task[];
  projects: Project[];
  tags: Tag[];
  sections: Section[];
}): Promise<void> {
  const now = Date.now();
  
  await db.transaction('rw', [db.tasks, db.projects, db.tags, db.sections], async () => {
    // Clear existing synced data (keep pending changes)
    await db.tasks.where('_syncStatus').equals('synced').delete();
    await db.projects.where('_syncStatus').equals('synced').delete();
    await db.sections.where('_syncStatus').equals('synced').delete();
    await db.tags.clear();
    
    // Insert fresh data
    await db.tasks.bulkPut(
      data.tasks.map(t => ({ ...t, _syncStatus: 'synced' as const, _modifiedAt: now }))
    );
    await db.projects.bulkPut(
      data.projects.map(p => ({ ...p, _syncStatus: 'synced' as const, _modifiedAt: now }))
    );
    await db.tags.bulkPut(data.tags);
    await db.sections.bulkPut(
      data.sections.map(s => ({ ...s, _syncStatus: 'synced' as const, _modifiedAt: now }))
    );
  });
  
  // Update last sync time
  await db.metadata.put({ key: 'lastSync', value: now });
}

/**
 * Get last sync timestamp
 */
export async function getLastSyncTime(): Promise<number | null> {
  const record = await db.metadata.get('lastSync');
  return record?.value as number | null;
}

/**
 * Add item to sync queue (for offline changes)
 */
export async function addToSyncQueue(item: Omit<SyncQueueItem, 'id' | 'createdAt' | 'attempts'>): Promise<void> {
  await db.syncQueue.add({
    ...item,
    createdAt: Date.now(),
    attempts: 0,
  });
}

/**
 * Get pending sync queue items
 */
export async function getPendingSyncItems(): Promise<SyncQueueItem[]> {
  return db.syncQueue.orderBy('createdAt').toArray();
}

/**
 * Remove item from sync queue (after successful sync)
 */
export async function removeSyncQueueItem(id: number): Promise<void> {
  await db.syncQueue.delete(id);
}

/**
 * Update sync queue item (after failed attempt)
 */
export async function updateSyncQueueItem(id: number, updates: Partial<SyncQueueItem>): Promise<void> {
  await db.syncQueue.update(id, updates);
}

// ============================================================================
// LOCAL CRUD OPERATIONS (Offline-first)
// ============================================================================

/**
 * Create task locally (queued for sync)
 */
export async function createTaskLocally(task: Partial<Task>): Promise<LocalTask> {
  const localId = `local_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const now = Date.now();
  
  const localTask: LocalTask = {
    id: localId,
    name: task.name || '',
    status: task.status || '📥 Inbox',
    priority: task.priority || null,
    startDate: task.startDate || null,
    dueDate: task.dueDate || null,
    completedDate: task.completedDate || null,
    projectId: task.projectId || null,
    tagIds: task.tagIds || [],
    parentTaskId: task.parentTaskId || null,
    subtaskIds: [],
    sectionId: task.sectionId || null,
    notes: task.notes || '',
    syncToCalendar: task.syncToCalendar || false,
    scheduledTime: task.scheduledTime || null,
    duration: task.duration || null,
    calendarEventId: null,
    calendarSyncStatus: null,
    plannedEffort: task.plannedEffort || null,
    actualEffort: task.actualEffort || null,
    _localId: localId,
    _syncStatus: 'pending',
    _modifiedAt: now,
    _createdAt: now,
  };
  
  await db.tasks.add(localTask);
  
  // Add to sync queue
  await addToSyncQueue({
    type: 'CREATE',
    table: 'tasks',
    recordId: localId,
    localId,
    payload: task,
  });
  
  return localTask;
}

/**
 * Update task locally (queued for sync)
 */
export async function updateTaskLocally(taskId: string, updates: Partial<Task>): Promise<void> {
  const now = Date.now();
  
  await db.tasks.update(taskId, {
    ...updates,
    _syncStatus: 'pending',
    _modifiedAt: now,
  });
  
  // Add to sync queue
  await addToSyncQueue({
    type: 'UPDATE',
    table: 'tasks',
    recordId: taskId,
    payload: updates,
  });
}

/**
 * Delete task locally (queued for sync)
 */
export async function deleteTaskLocally(taskId: string): Promise<void> {
  // Check if it's a local-only task (not yet synced)
  const task = await db.tasks.get(taskId);
  if (task?._localId && task._syncStatus === 'pending') {
    // Just delete locally, remove from sync queue
    await db.tasks.delete(taskId);
    await db.syncQueue.where('localId').equals(taskId).delete();
    return;
  }
  
  // Mark for deletion and add to sync queue
  await db.tasks.update(taskId, {
    _syncStatus: 'pending',
    _modifiedAt: Date.now(),
  });
  
  await addToSyncQueue({
    type: 'DELETE',
    table: 'tasks',
    recordId: taskId,
    payload: {},
  });
  
  // Remove from local DB
  await db.tasks.delete(taskId);
}

// ============================================================================
// FILTERS (Local only - stored in IndexedDB)
// ============================================================================

export async function saveFilter(filter: Filter): Promise<void> {
  await db.filters.put(filter);
}

export async function deleteFilter(filterId: string): Promise<void> {
  await db.filters.delete(filterId);
}

export async function getAllFilters(): Promise<Filter[]> {
  return db.filters.toArray();
}
