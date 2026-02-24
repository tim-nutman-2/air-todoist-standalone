import { useEffect, useMemo, useState, useCallback } from 'react';
import { useStore } from './store';
import { Sidebar } from './components/Sidebar';
import { TaskList } from './components/TaskList';
import { Toast } from './components/Toast';
import { AddTaskModal } from './components/AddTaskModal';
import { EditTaskPanel } from './components/EditTaskPanel';
import { ScheduleView } from './components/ScheduleView';
import { FilterModal } from './components/FilterModal';
import { SearchBar } from './components/SearchBar';
import { ProjectDashboard } from './components/ProjectDashboard';
import { ProjectDetailsPanel } from './components/ProjectDetailsPanel';
import { ProjectKanbanView } from './components/ProjectKanbanView';
import { ConfirmModal } from './components/ConfirmModal';
import { FiltersManagementView } from './components/FiltersManagementView';
import { LoadingScreen } from './components/LoadingScreen';
import { getFormattedTodayDate, parseLocalDate } from './utils/dates';
import { Plus, Sun, Moon, ArrowsClockwise, FunnelSimple, Columns, List } from '@phosphor-icons/react';
import type { Task, Filter, Project } from './types';

export default function App() {
  const {
    currentView,
    selectedProjectId,
    selectedFilterId,
    selectedTagId,
    tasks,
    projects,
    tags,
    filters,
    showCompleted,
    toggleShowCompleted,
    isDarkMode,
    toggleDarkMode,
    isLoading,
    isSyncing,
    fetchAllData,
    syncPendingChanges,
    confirmModal,
    confirmAction,
    hideConfirm,
  } = useStore();
  
  // Modal/Panel state
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [editingFilter, setEditingFilter] = useState<Filter | null>(null);
  const [viewingProject, setViewingProject] = useState<Project | null>(null);
  const [showKanban, setShowKanban] = useState(false);
  const [showProjectDashboard, setShowProjectDashboard] = useState(true);
  
  // Fetch data on mount
  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);
  
  // Apply dark mode to html element
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);
  
  // Handle task edit
  const handleEditTask = useCallback((task: Task) => {
    setEditingTask(task);
  }, []);
  
  // Handle project selection from dashboard
  const handleSelectProject = useCallback((projectId: string) => {
    useStore.getState().setView('project', projectId);
    setShowProjectDashboard(false);
  }, []);
  
  // Handle view project details
  const handleViewProjectDetails = useCallback((project: Project) => {
    setViewingProject(project);
  }, []);
  
  // Filter tasks based on current view
  const { title, subtitle, filteredTasks, groupBy, showProject, isScheduleView, emptyStateType, isFiltersManagement } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    switch (currentView) {
      case 'today': {
        const todayTasks = tasks.filter(t => {
          if (t.status === '✅ Done' && !showCompleted) return false;
          if (t.parentTaskId) return false;
          
          const dueDate = t.dueDate ? parseLocalDate(t.dueDate) : null;
          const startDate = t.startDate ? parseLocalDate(t.startDate) : null;
          
          if (dueDate) {
            dueDate.setHours(0, 0, 0, 0);
            if (dueDate <= today) return true;
          }
          if (startDate) {
            startDate.setHours(0, 0, 0, 0);
            if (startDate.getTime() === today.getTime()) return true;
          }
          return false;
        });
        
        return {
          title: 'Today',
          subtitle: `${getFormattedTodayDate()} • ${todayTasks.length} tasks`,
          filteredTasks: todayTasks,
          groupBy: 'date' as const,
          showProject: true,
          isScheduleView: false,
          emptyStateType: 'today' as const,
          isFiltersManagement: false,
        };
      }
      
      case 'inbox': {
        const inboxTasks = tasks.filter(t => {
          if (t.status === '✅ Done' && !showCompleted) return false;
          if (t.parentTaskId) return false;
          return t.status === '📥 Inbox';
        });
        
        return {
          title: 'Inbox',
          subtitle: `${inboxTasks.length} tasks`,
          filteredTasks: inboxTasks,
          groupBy: 'none' as const,
          showProject: true,
          isScheduleView: false,
          emptyStateType: 'inbox' as const,
          isFiltersManagement: false,
        };
      }
      
      case 'upcoming': {
        const nextWeek = new Date(today);
        nextWeek.setDate(nextWeek.getDate() + 7);
        
        const upcomingTasks = tasks.filter(t => {
          if (t.status === '✅ Done' && !showCompleted) return false;
          if (t.parentTaskId) return false;
          if (!t.dueDate) return false;
          const due = parseLocalDate(t.dueDate);
          if (!due) return false;
          due.setHours(0, 0, 0, 0);
          return due > today && due <= nextWeek;
        });
        
        return {
          title: 'Upcoming',
          subtitle: 'Next 7 days',
          filteredTasks: upcomingTasks,
          groupBy: 'date' as const,
          showProject: true,
          isScheduleView: false,
          emptyStateType: 'upcoming' as const,
          isFiltersManagement: false,
        };
      }
      
      case 'schedule': {
        return {
          title: 'Schedule',
          subtitle: 'Calendar view',
          filteredTasks: [],
          groupBy: 'none' as const,
          showProject: true,
          isScheduleView: true,
          emptyStateType: 'schedule' as const,
          isFiltersManagement: false,
        };
      }
      
      case 'filters': {
        // Filters management view (no specific filter selected)
        return {
          title: 'Saved Filters',
          subtitle: `${filters.length} filter${filters.length !== 1 ? 's' : ''}`,
          filteredTasks: [],
          groupBy: 'none' as const,
          showProject: true,
          isScheduleView: false,
          emptyStateType: 'filter' as const,
          isFiltersManagement: true,
        };
      }
      
      case 'projects': {
        const activeTasks = tasks.filter(t => {
          if (t.status === '✅ Done' && !showCompleted) return false;
          if (t.parentTaskId) return false;
          return !!t.projectId;
        });
        
        return {
          title: 'By Project',
          subtitle: `${projects.filter(p => p.status === 'Active').length} active projects`,
          filteredTasks: activeTasks,
          groupBy: 'project' as const,
          showProject: false,
          isScheduleView: false,
          emptyStateType: 'projects' as const,
          isFiltersManagement: false,
        };
      }
      
      case 'project': {
        const project = projects.find(p => p.id === selectedProjectId);
        const projectTasks = tasks.filter(t => {
          if (t.status === '✅ Done' && !showCompleted) return false;
          if (t.parentTaskId) return false;
          return t.projectId === selectedProjectId;
        });
        
        return {
          title: project?.name || 'Project',
          subtitle: `${projectTasks.length} tasks`,
          filteredTasks: projectTasks,
          groupBy: 'section' as const,
          showProject: false,
          isScheduleView: false,
          emptyStateType: 'project' as const,
          isFiltersManagement: false,
        };
      }
      
      case 'tag': {
        const tag = tags.find(t => t.id === selectedTagId);
        const tagTasks = tasks.filter(t => {
          if (t.status === '✅ Done' && !showCompleted) return false;
          if (t.parentTaskId) return false;
          return t.tagIds.includes(selectedTagId || '');
        });
        
        return {
          title: tag?.name || 'Tag',
          subtitle: `${tagTasks.length} tasks`,
          filteredTasks: tagTasks,
          groupBy: 'none' as const,
          showProject: true,
          isScheduleView: false,
          emptyStateType: 'tag' as const,
          isFiltersManagement: false,
        };
      }
      
      case 'filter': {
        const filter = filters.find(f => f.id === selectedFilterId);
        const filterTasks = tasks.filter(t => {
          if (t.status === '✅ Done' && !showCompleted) return false;
          if (t.parentTaskId) return false;
          
          if (!filter?.criteria) return true;
          const c = filter.criteria;
          
          if (c.status?.length && !c.status.includes(t.status || '')) return false;
          if (c.priority?.length && !c.priority.includes(t.priority || '')) return false;
          if (c.projectIds?.length && !c.projectIds.includes(t.projectId || '')) return false;
          if (c.tagIds?.length && !t.tagIds.some(id => c.tagIds?.includes(id))) return false;
          
          return true;
        });
        
        return {
          title: filter?.name || 'Filter',
          subtitle: `${filterTasks.length} tasks`,
          filteredTasks: filterTasks,
          groupBy: 'none' as const,
          showProject: true,
          isScheduleView: false,
          emptyStateType: 'filter' as const,
          isFiltersManagement: false,
        };
      }
      
      default:
        return {
          title: 'Tasks',
          subtitle: '',
          filteredTasks: tasks.filter(t => (t.status !== '✅ Done' || showCompleted) && !t.parentTaskId),
          groupBy: 'none' as const,
          showProject: true,
          isScheduleView: false,
          emptyStateType: 'inbox' as const,
          isFiltersManagement: false,
        };
    }
  }, [currentView, tasks, projects, tags, filters, selectedProjectId, selectedTagId, selectedFilterId, showCompleted]);
  
  if (isLoading) {
    return <LoadingScreen />;
  }
  
  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      backgroundColor: isDarkMode ? '#1f1f1f' : '#ffffff',
      color: isDarkMode ? '#ffffff' : '#202020',
    }}>
      {/* Sidebar */}
      <Sidebar />
      
      {/* Main Content */}
      <main style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        backgroundColor: isDarkMode ? '#1f1f1f' : '#ffffff',
      }}>
        {/* Header */}
        <header style={{
          padding: '24px 32px',
          borderBottom: `1px solid ${isDarkMode ? '#3a3a3a' : '#e0e0e0'}`,
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          position: 'relative',
        }}>
          {/* Accent line */}
          <div style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 2,
            backgroundColor: '#d1453b',
            opacity: 0.5,
          }} />
          
          <div>
            <h1 style={{
              fontSize: 20,
              fontWeight: 600,
              color: isDarkMode ? '#ffffff' : '#202020',
              margin: 0,
            }}>{title}</h1>
            <p style={{
              fontSize: 13,
              color: isDarkMode ? '#a0a0a0' : '#808080',
              marginTop: 4,
            }}>{subtitle}</p>
          </div>
          
          {/* Header Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* Search */}
            <SearchBar onSelectTask={handleEditTask} />
            
            {/* View toggle (List/Kanban) - Only show in project view */}
            {currentView === 'project' && (
              <div style={{
                display: 'flex',
                backgroundColor: isDarkMode ? '#333333' : '#f0f0f0',
                borderRadius: 8,
                padding: 2,
              }}>
                <button
                  onClick={() => setShowKanban(false)}
                  style={{
                    padding: '6px 10px',
                    borderRadius: 6,
                    border: 'none',
                    backgroundColor: !showKanban ? (isDarkMode ? '#555' : '#fff') : 'transparent',
                    color: isDarkMode ? '#fff' : '#333',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    fontSize: 12,
                  }}
                  title="List view"
                >
                  <List size={16} />
                  List
                </button>
                <button
                  onClick={() => setShowKanban(true)}
                  style={{
                    padding: '6px 10px',
                    borderRadius: 6,
                    border: 'none',
                    backgroundColor: showKanban ? (isDarkMode ? '#555' : '#fff') : 'transparent',
                    color: isDarkMode ? '#fff' : '#333',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    fontSize: 12,
                  }}
                  title="Kanban view (by section)"
                >
                  <Columns size={16} />
                  Board
                </button>
              </div>
            )}
            
            {/* Dashboard toggle (only show on projects view) */}
            {currentView === 'projects' && (
              <button
                onClick={() => setShowProjectDashboard(!showProjectDashboard)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 6,
                  border: `1px solid ${isDarkMode ? '#3a3a3a' : '#e0e0e0'}`,
                  backgroundColor: showProjectDashboard ? '#d1453b' : 'transparent',
                  color: showProjectDashboard ? '#fff' : (isDarkMode ? '#a0a0a0' : '#606060'),
                  cursor: 'pointer',
                  fontSize: 12,
                }}
              >
                Dashboard
              </button>
            )}
            
            {/* Create Filter button (only show on filters view) */}
            {currentView === 'filters' && (
              <button
                onClick={() => { setEditingFilter(null); setShowFilterModal(true); }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 12px',
                  fontSize: 13,
                  fontWeight: 500,
                  borderRadius: 8,
                  border: 'none',
                  backgroundColor: '#d1453b',
                  color: '#ffffff',
                  cursor: 'pointer',
                }}
              >
                <FunnelSimple size={16} />
                New Filter
              </button>
            )}
            
            {/* Show completed toggle */}
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 13,
              color: isDarkMode ? '#a0a0a0' : '#808080',
              cursor: 'pointer',
            }}>
              <input
                type="checkbox"
                checked={showCompleted}
                onChange={toggleShowCompleted}
                style={{ width: 16, height: 16 }}
              />
              Show completed
            </label>
            
            {/* Theme toggle */}
            <button
              onClick={toggleDarkMode}
              style={{
                padding: 8,
                borderRadius: 8,
                border: 'none',
                backgroundColor: 'transparent',
                color: isDarkMode ? '#a0a0a0' : '#808080',
                cursor: 'pointer',
              }}
              title={isDarkMode ? 'Light mode' : 'Dark mode'}
            >
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            
            {/* Sync button */}
            <button
              onClick={() => syncPendingChanges()}
              disabled={isSyncing}
              style={{
                padding: 8,
                borderRadius: 8,
                border: 'none',
                backgroundColor: 'transparent',
                color: isDarkMode ? '#a0a0a0' : '#808080',
                cursor: isSyncing ? 'not-allowed' : 'pointer',
                opacity: isSyncing ? 0.5 : 1,
              }}
              title="Sync"
            >
              <ArrowsClockwise 
                size={20} 
                style={isSyncing ? { animation: 'spin 1s linear infinite' } : undefined}
              />
            </button>
          </div>
        </header>
        
        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {isScheduleView ? (
            <ScheduleView onEditTask={handleEditTask} />
          ) : isFiltersManagement ? (
            <FiltersManagementView
              onSelectFilter={(filterId) => useStore.getState().setSelectedFilter(filterId)}
              onEditFilter={(filter) => { setEditingFilter(filter); setShowFilterModal(true); }}
              onCreateFilter={() => { setEditingFilter(null); setShowFilterModal(true); }}
            />
          ) : currentView === 'project' && showKanban && selectedProjectId ? (
            <ProjectKanbanView
              projectId={selectedProjectId}
              onEditTask={handleEditTask}
              onAddSection={() => {/* TODO: Add section modal */}}
            />
          ) : currentView === 'projects' && showProjectDashboard ? (
            <ProjectDashboard
              onSelectProject={handleSelectProject}
              onViewProjectDetails={handleViewProjectDetails}
            />
          ) : (
            <TaskList
              tasks={filteredTasks}
              showProject={showProject}
              groupBy={groupBy}
              emptyMessage={`No tasks in ${title.toLowerCase()}`}
              emptyStateType={emptyStateType}
              onEditTask={handleEditTask}
              onAddTask={() => setShowAddModal(true)}
              enableDragDrop={true}
            />
          )}
        </div>
        
        {/* Floating Add Button */}
        <button
          onClick={() => setShowAddModal(true)}
          style={{
            position: 'fixed',
            bottom: 24,
            right: 96,
            width: 56,
            height: 56,
            borderRadius: '50%',
            backgroundColor: '#d1453b',
            color: '#ffffff',
            border: 'none',
            boxShadow: '0 4px 12px rgba(209, 69, 59, 0.4)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
          }}
          title="Add task"
        >
          <Plus size={24} weight="bold" />
        </button>
      </main>
      
      {/* Add Task Modal */}
      <AddTaskModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        defaultProjectId={currentView === 'project' ? selectedProjectId : null}
      />
      
      {/* Edit Task Panel */}
      <EditTaskPanel
        task={editingTask}
        onClose={() => setEditingTask(null)}
      />
      
      {/* Filter Modal */}
      <FilterModal
        isOpen={showFilterModal}
        onClose={() => { setShowFilterModal(false); setEditingFilter(null); }}
        editingFilter={editingFilter}
      />
      
      {/* Project Details Panel */}
      <ProjectDetailsPanel
        project={viewingProject}
        onClose={() => setViewingProject(null)}
        onSelectProject={handleSelectProject}
      />
      
      {/* Confirm Modal */}
      {confirmModal && (
        <ConfirmModal
          isOpen={confirmModal.isOpen}
          title={confirmModal.title}
          message={confirmModal.message}
          type={confirmModal.type}
          confirmLabel="Delete"
          onConfirm={confirmAction}
          onCancel={hideConfirm}
        />
      )}
      
      {/* Toast */}
      <Toast />
    </div>
  );
}
