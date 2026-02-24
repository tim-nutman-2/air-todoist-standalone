import { useState, useRef, useEffect } from 'react';
import { MagnifyingGlass, X } from '@phosphor-icons/react';
import { useStore } from '../store';
import type { Task } from '../types';

interface SearchBarProps {
  onSelectTask: (task: Task) => void;
}

export function SearchBar({ onSelectTask }: SearchBarProps) {
  const { tasks, projects, isDarkMode } = useStore();
  
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
  
  // Filter tasks based on query
  const filteredTasks = query.trim()
    ? tasks.filter(task => 
        task.name.toLowerCase().includes(query.toLowerCase()) ||
        task.notes?.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 10)
    : [];
  
  const handleSelect = (task: Task) => {
    onSelectTask(task);
    setQuery('');
    setIsOpen(false);
  };
  
  const getProjectName = (projectId: string | null) => {
    if (!projectId) return null;
    return projects.find(p => p.id === projectId)?.name;
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
            filteredTasks.map(task => (
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
                  marginBottom: 2,
                }}>
                  {task.name}
                </div>
                <div style={{
                  fontSize: 12,
                  color: colors.textSecondary,
                  display: 'flex',
                  gap: 8,
                }}>
                  {getProjectName(task.projectId) && (
                    <span>{getProjectName(task.projectId)}</span>
                  )}
                  {task.dueDate && (
                    <span>{new Date(task.dueDate).toLocaleDateString()}</span>
                  )}
                  {task.status && (
                    <span>{task.status}</span>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
