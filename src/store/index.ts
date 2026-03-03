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
  toast: { message: string; type: 'success' | 'error' | 'info' | 'warning' } | null;
  
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
  showToast: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
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
  
  // Project Actions
  createProject: (project: Partial<Project>) => Promise<Project | null>;
  updateProject: (projectId: string, updates: Partial<Project>) => Promise<void>;
  deleteProject: (projectId: string) => Promise<void>;
  
  // Tag Actions
  createTag: (tag: Partial<Tag>) => Promise<Tag | null>;
  updateTag: (tagId: string, updates: Partial<Tag>) => Promise<void>;
  deleteTag: (tagId: string) => Promise<void>;
  
  // Section Actions
  createSection: (section: Partial<Section>) => Promise<Section | null>;
  updateSection: (sectionId: string, updates: Partial<Section>) => Promise<void>;
  deleteSection: (sectionId: string) => Promise<void>;
  
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
      
      // Create project
      createProject: async (projectData) => {
        const { isOnline, showToast, projects } = get();
        
        try {
          let newProject: Project;
          
          if (isOnline) {
            newProject = await api.createProject(projectData);
          } else {
            // Create locally and queue for sync
            const localProject = await db.createProjectLocally(projectData);
            newProject = localProject;
            showToast('Project created locally - will sync when online', 'info');
          }
          
          set({ projects: [...projects, newProject] });
          showToast(`Project "${newProject.name}" created`);
          
          return newProject;
        } catch (error) {
          console.error('Failed to create project:', error);
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          showToast(`Failed to create project: ${errorMessage}`, 'error');
          return null;
        }
      },
      
      // Update project
      updateProject: async (projectId, updates) => {
        const { isOnline, showToast, projects } = get();
        
        // Optimistic update
        const updatedProjects = projects.map(p =>
          p.id === projectId ? { ...p, ...updates } : p
        );
        set({ projects: updatedProjects });
        
        try {
          if (isOnline) {
            await api.updateProject(projectId, updates);
          } else {
            // Save locally and queue for sync
            await db.updateProjectLocally(projectId, updates);
            showToast('Changes saved locally - will sync when online', 'info');
            return;
          }
          
          showToast('Project updated');
        } catch (error) {
          console.error('Failed to update project:', error);
          // Revert optimistic update
          set({ projects });
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          showToast(`Failed to update project: ${errorMessage}`, 'error');
        }
      },
      
      // Delete project
      deleteProject: async (projectId) => {
        const { isOnline, showToast, projects } = get();
        
        // Optimistic update
        const updatedProjects = projects.filter(p => p.id !== projectId);
        set({ projects: updatedProjects });
        
        try {
          if (isOnline) {
            await api.deleteProject(projectId);
          } else {
            await db.deleteProjectLocally(projectId);
            showToast('Project will be deleted when online', 'info');
            return;
          }
          
          showToast('Project deleted');
        } catch (error) {
          console.error('Failed to delete project:', error);
          // Revert optimistic update
          set({ projects });
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          showToast(`Failed to delete project: ${errorMessage}`, 'error');
        }
      },
      
      // Create tag
      createTag: async (tagData) => {
        const { isOnline, showToast, tags } = get();
        
        if (!isOnline) {
          showToast('Cannot create tags while offline', 'error');
          return null;
        }
        
        try {
          const newTag = await api.createTag(tagData);
          set({ tags: [...tags, newTag] });
          showToast(`Tag "${newTag.name}" created`);
          return newTag;
        } catch (error) {
          console.error('Failed to create tag:', error);
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          showToast(`Failed to create tag: ${errorMessage}`, 'error');
          return null;
        }
      },
      
      // Update tag
      updateTag: async (tagId, updates) => {
        const { isOnline, showToast, tags } = get();
        
        if (!isOnline) {
          showToast('Cannot update tags while offline', 'error');
          return;
        }
        
        // Optimistic update
        const updatedTags = tags.map(t =>
          t.id === tagId ? { ...t, ...updates } : t
        );
        set({ tags: updatedTags });
        
        try {
          await api.updateTag(tagId, updates);
          showToast('Tag updated');
        } catch (error) {
          console.error('Failed to update tag:', error);
          set({ tags });
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          showToast(`Failed to update tag: ${errorMessage}`, 'error');
        }
      },
      
      // Delete tag
      deleteTag: async (tagId) => {
        const { isOnline, showToast, tags } = get();
        
        if (!isOnline) {
          showToast('Cannot delete tags while offline', 'error');
          return;
        }
        
        // Optimistic update
        const updatedTags = tags.filter(t => t.id !== tagId);
        set({ tags: updatedTags });
        
        try {
          await api.deleteTag(tagId);
          showToast('Tag deleted');
        } catch (error) {
          console.error('Failed to delete tag:', error);
          set({ tags });
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          showToast(`Failed to delete tag: ${errorMessage}`, 'error');
        }
      },
      
      // Create section
      createSection: async (sectionData) => {
        const { isOnline, showToast, sections } = get();
        
        try {
          let newSection: Section;
          
          if (isOnline) {
            newSection = await api.createSection(sectionData);
          } else {
            // Create locally and queue for sync
            const localSection = await db.createSectionLocally(sectionData);
            newSection = localSection;
            showToast('Section created locally - will sync when online', 'info');
          }
          
          set({ sections: [...sections, newSection] });
          showToast(`Section "${newSection.name}" created`);
          
          return newSection;
        } catch (error) {
          console.error('Failed to create section:', error);
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          showToast(`Failed to create section: ${errorMessage}`, 'error');
          return null;
        }
      },
      
      // Update section
      updateSection: async (sectionId, updates) => {
        const { isOnline, showToast, sections } = get();
        
        // Optimistic update
        const updatedSections = sections.map(s =>
          s.id === sectionId ? { ...s, ...updates } : s
        );
        set({ sections: updatedSections });
        
        try {
          if (isOnline) {
            await api.updateSection(sectionId, updates);
          } else {
            await db.updateSectionLocally(sectionId, updates);
            showToast('Changes saved locally - will sync when online', 'info');
            return;
          }
          
          showToast('Section updated');
        } catch (error) {
          console.error('Failed to update section:', error);
          set({ sections });
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          showToast(`Failed to update section: ${errorMessage}`, 'error');
        }
      },
      
      // Delete section
      deleteSection: async (sectionId) => {
        const { isOnline, showToast, sections } = get();
        
        // Optimistic update
        const updatedSections = sections.filter(s => s.id !== sectionId);
        set({ sections: updatedSections });
        
        try {
          if (isOnline) {
            await api.deleteSection(sectionId);
          } else {
            await db.deleteSectionLocally(sectionId);
            showToast('Section will be deleted when online', 'info');
            return;
          }
          
          showToast('Section deleted');
        } catch (error) {
          console.error('Failed to delete section:', error);
          set({ sections });
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          showToast(`Failed to delete section: ${errorMessage}`, 'error');
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
        const { isOnline, showToast, fetchAllData, tasks, projects, sections } = get();
        
        if (!isOnline) {
          showToast('Cannot sync while offline', 'info');
          return;
        }
        
        set({ isSyncing: true });
        
        // Track ID mappings for local -> real IDs
        const idMappings: Record<string, string> = {};
        
        try {
          const pendingItems = await db.getPendingSyncItems();
          let successCount = 0;
          let errorCount = 0;
          
          for (const item of pendingItems) {
            try {
              // If recordId is a local ID that was already mapped, use the real ID
              let recordId = item.recordId;
              if (recordId.startsWith('local_') && idMappings[recordId]) {
                recordId = idMappings[recordId];
              }
              
              switch (item.type) {
                case 'CREATE':
                  if (item.table === 'tasks') {
                    const newTask = await api.createTask(item.payload as Partial<Task>);
                    // Store mapping and replace local record
                    idMappings[item.localId!] = newTask.id;
                    await db.replaceLocalWithSynced('tasks', item.localId!, newTask);
                    // Update store with new ID
                    const updatedTasks = tasks.map(t => 
                      t.id === item.localId ? { ...t, ...newTask } : t
                    );
                    set({ tasks: updatedTasks });
                  } else if (item.table === 'projects') {
                    const newProject = await api.createProject(item.payload as Partial<Project>);
                    idMappings[item.localId!] = newProject.id;
                    await db.replaceLocalWithSynced('projects', item.localId!, newProject);
                    const updatedProjects = projects.map(p => 
                      p.id === item.localId ? { ...p, ...newProject } : p
                    );
                    set({ projects: updatedProjects });
                  } else if (item.table === 'sections') {
                    const newSection = await api.createSection(item.payload as Partial<Section>);
                    idMappings[item.localId!] = newSection.id;
                    await db.replaceLocalWithSynced('sections', item.localId!, newSection);
                    const updatedSections = sections.map(s => 
                      s.id === item.localId ? { ...s, ...newSection } : s
                    );
                    set({ sections: updatedSections });
                  }
                  break;
                  
                case 'UPDATE':
                  // Skip if this is for a local record that doesn't exist anymore
                  if (recordId.startsWith('local_')) {
                    console.warn(`Skipping UPDATE for unmapped local ID: ${recordId}`);
                    break;
                  }
                  if (item.table === 'tasks') {
                    await api.updateTask(recordId, item.payload as Partial<Task>);
                    await db.markAsSynced('tasks', recordId);
                  } else if (item.table === 'projects') {
                    await api.updateProject(recordId, item.payload as Partial<Project>);
                    await db.markAsSynced('projects', recordId);
                  } else if (item.table === 'sections') {
                    await api.updateSection(recordId, item.payload as Partial<Section>);
                    await db.markAsSynced('sections', recordId);
                  }
                  break;
                  
                case 'DELETE':
                  // Skip if this is for a local record that was never synced
                  if (recordId.startsWith('local_')) {
                    console.warn(`Skipping DELETE for local ID: ${recordId}`);
                    break;
                  }
                  if (item.table === 'tasks') {
                    await api.deleteTask(recordId);
                  } else if (item.table === 'projects') {
                    await api.deleteProject(recordId);
                  } else if (item.table === 'sections') {
                    await api.deleteSection(recordId);
                  }
                  break;
              }
              
              // Remove from queue on success
              await db.removeSyncQueueItem(item.id!);
              successCount++;
            } catch (error) {
              console.error(`Failed to sync item ${item.id}:`, error);
              errorCount++;
              await db.updateSyncQueueItem(item.id!, {
                attempts: item.attempts + 1,
                lastError: error instanceof Error ? error.message : 'Unknown error',
              });
              // Mark record as having sync error
              if (item.table === 'tasks' || item.table === 'projects' || item.table === 'sections') {
                await db.markSyncError(item.table, item.recordId);
              }
            }
          }
          
          // Refresh data after sync
          await fetchAllData();
          
          if (errorCount > 0) {
            showToast(`Sync complete: ${successCount} synced, ${errorCount} failed`, 'warning');
          } else if (successCount > 0) {
            showToast(`Sync complete: ${successCount} changes synced`);
          } else {
            showToast('Everything is up to date');
          }
          
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
