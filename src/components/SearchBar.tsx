import { useState, useRef, useEffect } from 'react';
import { MagnifyingGlass, X } from '@phosphor-icons/react';
import { useStore } from '../store';
import type { Task } from '../types';

interface SearchBarProps {
  onSelectTask: (task: Task) => void;
}

export function SearchBar({ onSelectTask }: SearchBarProps) {
  const { tasks, projects, tags, isDarkMode } = useStore();
  
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const colors = {
    bg: isDarkMode ? '#282828' : '#ffffff',
    border: isDarkMode ? '#3a3a3a' : '#e0e0e0',
    text: isDarkMode ? '#ffffff' : '#202020',
    textSecondary: isDarkMode ? '#a0a0a0' : '#808080',
    primary: '#d1453b',
    resultBg: isDarkMode ? '#333333' : '#f5f5f5',
    tagBg: isDarkMode ? 'rgba(139, 92, 246, 0.2)' : '#ede9fe',
    tagText: isDarkMode ? '#a78bfa' : '#7c3aed',
  };
  
  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  const getProjectName = (projectId: string | null) => {
    if (!projectId) return null;
    return projects.find(p => p.id === projectId)?.name;
  };
  
  const getTaskTags = (taskTagIds: string[]) => {
    return tags.filter(t => taskTagIds.includes(t.id));
  };
  
  // Filter tasks based on query - now includes project name and tags
  const filteredTasks = query.trim()
    ? tasks.filter(task => {
        const q = query.toLowerCase();
        
        // Match task name
        if (task.name.toLowerCase().includes(q)) return true;
        
        // Match task notes
        if (task.notes?.toLowerCase().includes(q)) return true;
        
        // Match project name
        const projectName = getProjectName(task.projectId);
        if (projectName?.toLowerCase().includes(q)) return true;
        
        // Match any tag name
        const taskTags = getTaskTags(task.tagIds);
        if (taskTags.some(tag => tag.name.toLowerCase().includes(q))) return true;
        
        // Match status
        if (task.status?.toLowerCase().includes(q)) return true;
        
        // Match priority
        if (task.priority?.toLowerCase().includes(q)) return true;
        
        return false;
      }).slice(0, 15)
    : [];
  
  const handleSelect = (task: Task) => {
    onSelectTask(task);
    setQuery('');
    setIsOpen(false);
  };
  
  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      {/* Search Button/Input */}
      {isOpen ? (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 12px',
          backgroundColor: colors.bg,
          border: `1px solid ${colors.primary}`,
          borderRadius: 8,
          width: 300,
        }}>
          <MagnifyingGlass size={18} style={{ color: colors.textSecondary, flexShrink: 0 }} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tasks..."
            autoFocus
            style={{
              flex: 1,
              border: 'none',
              backgroundColor: 'transparent',
              fontSize: 14,
              color: colors.text,
              outline: 'none',
            }}
          />
          <button
            onClick={() => { setQuery(''); setIsOpen(false); }}
            style={{
              padding: 2,
              border: 'none',
              backgroundColor: 'transparent',
              cursor: 'pointer',
              color: colors.textSecondary,
            }}
          >
            <X size={16} />
          </button>
        </div>
      ) : (
        <button
          onClick={() => setIsOpen(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 12px',
            backgroundColor: 'transparent',
            border: `1px solid ${colors.border}`,
            borderRadius: 8,
            cursor: 'pointer',
            color: colors.textSecondary,
            fontSize: 14,
          }}
        >
          <MagnifyingGlass size={18} />
          <span>Search...</span>
        </button>
      )}
      
      {/* Search Results Dropdown */}
      {isOpen && query.trim() && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          marginTop: 4,
          backgroundColor: colors.bg,
          border: `1px solid ${colors.border}`,
          borderRadius: 8,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          maxHeight: 400,
          overflowY: 'auto',
          zIndex: 100,
        }}>
          {filteredTasks.length === 0 ? (
            <div style={{
              padding: 16,
              textAlign: 'center',
              color: colors.textSecondary,
              fontSize: 14,
            }}>
              No tasks found
            </div>
          ) : (
            filteredTasks.map(task => {
              const taskTags = getTaskTags(task.tagIds);
              return (
                <button
                  key={task.id}
                  onClick={() => handleSelect(task)}
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: '12px 16px',
                    border: 'none',
                    backgroundColor: 'transparent',
                    textAlign: 'left',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.resultBg}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <div style={{
                    fontSize: 14,
                    color: task.status === '✅ Done' ? colors.textSecondary : colors.text,
                    textDecoration: task.status === '✅ Done' ? 'line-through' : 'none',
                    marginBottom: 4,
                  }}>
                    {task.name}
                  </div>
                  <div style={{
                    fontSize: 12,
                    color: colors.textSecondary,
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 6,
                    alignItems: 'center',
                  }}>
                    {getProjectName(task.projectId) && (
                      <span style={{ fontWeight: 500 }}>{getProjectName(task.projectId)}</span>
                    )}
                    {task.dueDate && (
                      <span>{new Date(task.dueDate).toLocaleDateString()}</span>
                    )}
                    {task.status && task.status !== '📋 To Do' && task.status !== '📥 Inbox' && (
                      <span>{task.status}</span>
                    )}
                    {taskTags.slice(0, 3).map(tag => (
                      <span
                        key={tag.id}
                        style={{
                          padding: '1px 6px',
                          borderRadius: 4,
                          backgroundColor: colors.tagBg,
                          color: colors.tagText,
                          fontSize: 11,
                        }}
                      >
                        #{tag.name}
                      </span>
                    ))}
                    {taskTags.length > 3 && (
                      <span style={{ fontSize: 11 }}>+{taskTags.length - 3} more</span>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
