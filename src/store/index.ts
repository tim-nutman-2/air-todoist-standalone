// Zustand store for global state management
// Replaces useRecords and other Airtable SDK hooks

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Task, Project, Tag, Section, Filter, ViewType } from '../types';
import * as api from '../api/airtable';
import * as db from '../db';
import { STORAGE_KEYS } from '../utils/constants';

interface AppState {
  // Data
  tasks: Task[];
  projects: Project[];
  tags: Tag[];
  sections: Section[];
  filters: Filter[];
  
  // UI State
  currentView: ViewType;
  selectedProjectId: string | null;
  selectedFilterId: string | null;
  selectedTagId: string | null;
  editingTaskId: string | null;
  showCompleted: boolean;
  isDarkMode: boolean;
  sidebarWidth: number;
  
  // Sync State
  isLoading: boolean;
  isSyncing: boolean;
  lastSyncTime: number | null;
  isOnline: boolean;
  syncError: string | null;
  
  // Toast
  toast: { message: string; type: 'success' | 'error' | 'info' } | null;
  
  // Confirm modal
  confirmModal: {
    isOpen: boolean;
    title: string;
    message: string;
    type: 'delete' | 'warning' | 'info';
    onConfirm: (() => void) | null;
  } | null;
  
  // Actions
  setCurrentView: (view: ViewType) => void;
  setView: (view: ViewType, entityId?: string | null) => void;
  setSelectedProject: (projectId: string | null) => void;
  setSelectedFilter: (filterId: string | null) => void;
  setSelectedTag: (tagId: string | null) => void;
  setEditingTask: (taskId: string | null) => void;
  toggleShowCompleted: () => void;
  toggleDarkMode: () => void;
  setSidebarWidth: (width: number) => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  hideToast: () => void;
  showConfirm: (options: { title: string; message: string; type?: 'delete' | 'warning' | 'info'; onConfirm: () => void }) => void;
  hideConfirm: () => void;
  confirmAction: () => void;
  
  // Data Actions
  fetchAllData: () => Promise<void>;
  createTask: (task: Partial<Task>) => Promise<Task | null>;
  updateTask: (taskId: string, updates: Partial<Task>) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  completeTask: (taskId: string) => Promise<void>;
  
  // Section Actions
  createSection: (section: Partial<Section>) => Promise<Section | null>;
  
  // Filter Actions
  saveFilter: (filter: Filter) => Promise<void>;
  deleteFilter: (filterId: string) => Promise<void>;
  
  // Sync Actions
  syncPendingChanges: () => Promise<void>;
  setOnlineStatus: (online: boolean) => void;
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Initial data state
      tasks: [],
      projects: [],
      tags: [],
      sections: [],
      filters: [],
      
      // Initial UI state
      currentView: 'today',
      selectedProjectId: null,
      selectedFilterId: null,
      selectedTagId: null,
      editingTaskId: null,
      showCompleted: false,
      isDarkMode: true, // Default to dark mode
      sidebarWidth: 280,
      
      // Initial sync state
      isLoading: true,
      isSyncing: false,
      lastSyncTime: null,
      isOnline: navigator.onLine,
      syncError: null,
      
      // Toast
      toast: null,
      
      // Confirm modal
      confirmModal: null,
      
      // UI Actions
      setCurrentView: (view) => set({ currentView: view }),
      setView: (view, entityId) => {
        const updates: Partial<AppState> = { currentView: view };
        if (view === 'project') updates.selectedProjectId = entityId || null;
        else if (view === 'filter') updates.selectedFilterId = entityId || null;
        else if (view === 'tag') updates.selectedTagId = entityId || null;
        set(updates);
      },
      setSelectedProject: (projectId) => set({ selectedProjectId: projectId, currentView: 'project' }),
      setSelectedFilter: (filterId) => set({ selectedFilterId: filterId, currentView: 'filter' }),
      setSelectedTag: (tagId) => set({ selectedTagId: tagId, currentView: 'tag' }),
      setEditingTask: (taskId) => set({ editingTaskId: taskId }),
      toggleShowCompleted: () => set((state) => ({ showCompleted: !state.showCompleted })),
      toggleDarkMode: () => set((state) => ({ isDarkMode: !state.isDarkMode })),
      setSidebarWidth: (width) => set({ sidebarWidth: width }),
      
      showToast: (message, type = 'success') => {
        set({ toast: { message, type } });
        setTimeout(() => get().hideToast(), 3000);
      },
      hideToast: () => set({ toast: null }),
      
      showConfirm: ({ title, message, type = 'warning', onConfirm }) => {
        set({
          confirmModal: {
            isOpen: true,
            title,
            message,
            type,
            onConfirm,
          }
        });
      },
      hideConfirm: () => set({ confirmModal: null }),
      confirmAction: () => {
        const { confirmModal, hideConfirm } = get();
        if (confirmModal?.onConfirm) {
          confirmModal.onConfirm();
        }
        hideConfirm();
      },
      
      // Fetch all data from Airtable and save to local DB
      fetchAllData: async () => {
        const { isOnline, showToast } = get();
        set({ isLoading: true, syncError: null });
        
        try {
          if (isOnline) {
            // Fetch from Airtable
            const data = await api.fetchAllData();
            
            console.log('[Store] Fetched data:', {
              tasks: data.tasks.length,
              projects: data.projects.length,
              tags: data.tags.length,
              sections: data.sections.length,
            });
            console.log('[Store] Projects:', data.projects);
            
            // Save to local DB
            await db.saveAllToLocal(data);
            
            // Update state
            set({
              tasks: data.tasks,
              projects: data.projects,
              tags: data.tags,
              sections: data.sections,
              lastSyncTime: Date.now(),
              isLoading: false,
            });
            
            console.log('[Store] State updated');
          } else {
            // Load from local DB
            const [tasks, projects, tags, sections] = await Promise.all([
              db.db.tasks.toArray(),
              db.db.projects.toArray(),
              db.db.tags.toArray(),
              db.db.sections.toArray(),
            ]);
            
            const lastSync = await db.getLastSyncTime();
            
            set({
              tasks,
              projects,
              tags,
              sections,
              lastSyncTime: lastSync,
              isLoading: false,
            });
            
            showToast('Working offline - using cached data', 'info');
          }
          
          // Load filters from local DB
          const filters = await db.getAllFilters();
          set({ filters });
          
        } catch (error) {
          console.error('Failed to fetch data:', error);
          set({
            syncError: error instanceof Error ? error.message : 'Failed to fetch data',
            isLoading: false,
          });
          
          // Try loading from local DB as fallback
          try {
            const [tasks, projects, tags, sections, filters] = await Promise.all([
              db.db.tasks.toArray(),
              db.db.projects.toArray(),
              db.db.tags.toArray(),
              db.db.sections.toArray(),
              db.getAllFilters(),
            ]);
            
            set({ tasks, projects, tags, sections, filters });
            showToast('Using cached data - sync failed', 'error');
          } catch {
            showToast('Failed to load data', 'error');
          }
        }
      },
      
      // Create task
      createTask: async (taskData) => {
        const { isOnline, showToast, tasks } = get();
        
        try {
          let newTask: Task;
          
          if (isOnline) {
            // Create directly in Airtable
            newTask = await api.createTask(taskData);
          } else {
            // Create locally (will sync later)
            newTask = await db.createTaskLocally(taskData);
          }
          
          // Update state
          set({ tasks: [...tasks, newTask] });
          showToast(`Task "${newTask.name}" created`);
          
          return newTask;
        } catch (error) {
          console.error('Failed to create task:', error);
          showToast('Failed to create task', 'error');
          return null;
        }
      },
      
      // Update task
      updateTask: async (taskId, updates) => {
        const { isOnline, showToast, tasks } = get();
        
        // Optimistic update
        const updatedTasks = tasks.map(t =>
          t.id === taskId ? { ...t, ...updates } : t
        );
        set({ tasks: updatedTasks });
        
        try {
          if (isOnline) {
            await api.updateTask(taskId, updates);
          } else {
            await db.updateTaskLocally(taskId, updates);
          }
          
          showToast('Task updated');
        } catch (error) {
          console.error('Failed to update task:', error);
          // Revert optimistic update
          set({ tasks });
          showToast('Failed to update task', 'error');
        }
      },
      
      // Delete task
      deleteTask: async (taskId) => {
        const { isOnline, showToast, tasks } = get();
        
        // Optimistic update
        const filteredTasks = tasks.filter(t => t.id !== taskId);
        set({ tasks: filteredTasks });
        
        try {
          if (isOnline) {
            await api.deleteTask(taskId);
          } else {
            await db.deleteTaskLocally(taskId);
          }
          
          showToast('Task deleted');
        } catch (error) {
          console.error('Failed to delete task:', error);
          // Revert optimistic update
          set({ tasks });
          showToast('Failed to delete task', 'error');
        }
      },
      
      // Complete task
      completeTask: async (taskId) => {
        const { updateTask } = get();
        await updateTask(taskId, {
          status: '✅ Done',
          completedDate: new Date().toISOString().split('T')[0],
        });
      },
      
      // Create section
      createSection: async (sectionData) => {
        const { isOnline, showToast, sections } = get();
        
        try {
          let newSection: Section;
          
          if (isOnline) {
            newSection = await api.createSection(sectionData);
          } else {
            // TODO: Create section locally
            showToast('Cannot create sections while offline', 'error');
            return null;
          }
          
          set({ sections: [...sections, newSection] });
          showToast(`Section "${newSection.name}" created`);
          
          return newSection;
        } catch (error) {
          console.error('Failed to create section:', error);
          showToast('Failed to create section', 'error');
          return null;
        }
      },
      
      // Save filter (local only)
      saveFilter: async (filter) => {
        const { filters, showToast } = get();
        
        await db.saveFilter(filter);
        
        const existingIndex = filters.findIndex(f => f.id === filter.id);
        if (existingIndex >= 0) {
          const updatedFilters = [...filters];
          updatedFilters[existingIndex] = filter;
          set({ filters: updatedFilters });
        } else {
          set({ filters: [...filters, filter] });
        }
        
        showToast(`Filter "${filter.name}" saved`);
      },
      
      // Delete filter (local only)
      deleteFilter: async (filterId) => {
        const { filters, showToast } = get();
        
        await db.deleteFilter(filterId);
        set({ filters: filters.filter(f => f.id !== filterId) });
        showToast('Filter deleted');
      },
      
      // Sync pending changes
      syncPendingChanges: async () => {
        const { isOnline, showToast, fetchAllData } = get();
        
        if (!isOnline) {
          showToast('Cannot sync while offline', 'info');
          return;
        }
        
        set({ isSyncing: true });
        
        try {
          const pendingItems = await db.getPendingSyncItems();
          
          for (const item of pendingItems) {
            try {
              switch (item.type) {
                case 'CREATE':
                  if (item.table === 'tasks') {
                    const newTask = await api.createTask(item.payload as Partial<Task>);
                    // Update local record with real ID
                    await db.db.tasks.delete(item.localId!);
                    await db.db.tasks.put({
                      ...(item.payload as unknown as Partial<Task>),
                      id: newTask.id,
                      _syncStatus: 'synced',
                      _modifiedAt: Date.now(),
                    } as db.LocalTask);
                  }
                  break;
                  
                case 'UPDATE':
                  if (item.table === 'tasks') {
                    await api.updateTask(item.recordId, item.payload as Partial<Task>);
                  }
                  break;
                  
                case 'DELETE':
                  if (item.table === 'tasks') {
                    await api.deleteTask(item.recordId);
                  }
                  break;
              }
              
              // Remove from queue on success
              await db.removeSyncQueueItem(item.id!);
            } catch (error) {
              console.error(`Failed to sync item ${item.id}:`, error);
              await db.updateSyncQueueItem(item.id!, {
                attempts: item.attempts + 1,
                lastError: error instanceof Error ? error.message : 'Unknown error',
              });
            }
          }
          
          // Refresh data after sync
          await fetchAllData();
          showToast('Sync complete');
          
        } catch (error) {
          console.error('Sync failed:', error);
          showToast('Sync failed', 'error');
        } finally {
          set({ isSyncing: false });
        }
      },
      
      // Set online status
      setOnlineStatus: (online) => {
        const { isOnline: wasOnline, syncPendingChanges, showToast } = get();
        set({ isOnline: online });
        
        if (online && !wasOnline) {
          showToast('Back online - syncing...', 'info');
          syncPendingChanges();
        } else if (!online && wasOnline) {
          showToast('You are offline - changes will sync when online', 'info');
        }
      },
    }),
    {
      name: STORAGE_KEYS.THEME,
      partialize: (state) => ({
        isDarkMode: state.isDarkMode,
        showCompleted: state.showCompleted,
        sidebarWidth: state.sidebarWidth,
      }),
    }
  )
);

// Online/offline event listeners
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => useStore.getState().setOnlineStatus(true));
  window.addEventListener('offline', () => useStore.getState().setOnlineStatus(false));
}
