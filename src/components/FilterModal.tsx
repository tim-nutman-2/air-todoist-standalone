import { useState, useEffect } from 'react';
import { X } from '@phosphor-icons/react';
import { useStore } from '../store';
import { STATUS_OPTIONS, PRIORITY_OPTIONS } from '../utils/constants';
import type { Filter, FilterCriteria } from '../types';

interface FilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingFilter?: Filter | null;
}

const FILTER_COLORS = [
  '#d1453b', '#ff9933', '#ffc107', '#7cb342',
  '#29b6f6', '#5c6bc0', '#ab47bc', '#ec407a',
];

export function FilterModal({ isOpen, onClose, editingFilter }: FilterModalProps) {
  const { projects, tags, saveFilter, deleteFilter, isDarkMode, showConfirm } = useStore();
  
  const [name, setName] = useState('');
  const [color, setColor] = useState(FILTER_COLORS[0]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedPriorities, setSelectedPriorities] = useState<string[]>([]);
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [dueDateRange, setDueDateRange] = useState<FilterCriteria['dueDateRange']>(undefined);
  
  const colors = {
    bg: isDarkMode ? '#1f1f1f' : '#ffffff',
    surface: isDarkMode ? '#282828' : '#ffffff',
    border: isDarkMode ? '#3a3a3a' : '#e0e0e0',
    text: isDarkMode ? '#ffffff' : '#202020',
    textSecondary: isDarkMode ? '#a0a0a0' : '#808080',
    inputBg: isDarkMode ? '#333333' : '#ffffff',
    primary: '#d1453b',
  };
  
  // Load editing filter data
  useEffect(() => {
    if (editingFilter) {
      setName(editingFilter.name);
      setColor(editingFilter.color);
      setSelectedStatuses(editingFilter.criteria.status || []);
      setSelectedPriorities(editingFilter.criteria.priority || []);
      setSelectedProjectIds(editingFilter.criteria.projectIds || []);
      setSelectedTagIds(editingFilter.criteria.tagIds || []);
      setDueDateRange(editingFilter.criteria.dueDateRange);
    } else {
      // Reset form
      setName('');
      setColor(FILTER_COLORS[0]);
      setSelectedStatuses([]);
      setSelectedPriorities([]);
      setSelectedProjectIds([]);
      setSelectedTagIds([]);
      setDueDateRange(undefined);
    }
  }, [editingFilter, isOpen]);
  
  const handleSave = async () => {
    if (!name.trim()) return;
    
    const filter: Filter = {
      id: editingFilter?.id || `filter-${Date.now()}`,
      name: name.trim(),
      color,
      criteria: {
        status: selectedStatuses.length > 0 ? selectedStatuses : undefined,
        priority: selectedPriorities.length > 0 ? selectedPriorities : undefined,
        projectIds: selectedProjectIds.length > 0 ? selectedProjectIds : undefined,
        tagIds: selectedTagIds.length > 0 ? selectedTagIds : undefined,
        dueDateRange,
      },
      createdAt: editingFilter?.createdAt || new Date().toISOString(),
    };
    
    await saveFilter(filter);
    onClose();
  };
  
  const handleDelete = () => {
    if (!editingFilter) return;
    showConfirm({
      title: 'Delete Filter',
      message: `Are you sure you want to delete "${editingFilter.name}"? This action cannot be undone.`,
      type: 'delete',
      onConfirm: async () => {
        await deleteFilter(editingFilter.id);
        onClose();
      },
    });
  };
  
  const toggleArrayItem = <T,>(array: T[], item: T, setter: (arr: T[]) => void) => {
    if (array.includes(item)) {
      setter(array.filter(i => i !== item));
    } else {
      setter([...array, item]);
    }
  };
  
  if (!isOpen) return null;
  
  const activeProjects = projects.filter(p => p.status === 'Active');
  
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          backgroundColor: colors.surface,
          borderRadius: 12,
          width: 480,
          maxWidth: '90vw',
          maxHeight: '90vh',
          overflow: 'auto',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          borderBottom: `1px solid ${colors.border}`,
        }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: colors.text, margin: 0 }}>
            {editingFilter ? 'Edit Filter' : 'Create Filter'}
          </h2>
          <button
            onClick={onClose}
            style={{ padding: 4, background: 'none', border: 'none', cursor: 'pointer', color: colors.textSecondary }}
          >
            <X size={20} />
          </button>
        </div>
        
        {/* Form */}
        <div style={{ padding: 20 }}>
          {/* Filter Name */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: colors.textSecondary, marginBottom: 6 }}>
              Filter Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., High Priority This Week"
              style={{
                width: '100%',
                padding: '10px 12px',
                fontSize: 14,
                border: `1px solid ${colors.border}`,
                borderRadius: 6,
                backgroundColor: colors.inputBg,
                color: colors.text,
                outline: 'none',
              }}
            />
          </div>
          
          {/* Color */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: colors.textSecondary, marginBottom: 6 }}>
              Color
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              {FILTER_COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    backgroundColor: c,
                    border: color === c ? '3px solid white' : 'none',
                    boxShadow: color === c ? `0 0 0 2px ${c}` : 'none',
                    cursor: 'pointer',
                  }}
                />
              ))}
            </div>
          </div>
          
          {/* Status Filter */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: colors.textSecondary, marginBottom: 6 }}>
              Status
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {STATUS_OPTIONS.map(opt => {
                const isSelected = selectedStatuses.includes(opt.value);
                return (
                  <button
                    key={opt.value}
                    onClick={() => toggleArrayItem(selectedStatuses, opt.value, setSelectedStatuses)}
                    style={{
                      padding: '6px 12px',
                      fontSize: 13,
                      borderRadius: 16,
                      border: `1px solid ${isSelected ? colors.primary : colors.border}`,
                      backgroundColor: isSelected ? (isDarkMode ? 'rgba(209, 69, 59, 0.2)' : '#fee9e9') : 'transparent',
                      color: isSelected ? colors.primary : colors.text,
                      cursor: 'pointer',
                    }}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
          
          {/* Priority Filter */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: colors.textSecondary, marginBottom: 6 }}>
              Priority
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {PRIORITY_OPTIONS.map(opt => {
                const isSelected = selectedPriorities.includes(opt.value);
                return (
                  <button
                    key={opt.value}
                    onClick={() => toggleArrayItem(selectedPriorities, opt.value, setSelectedPriorities)}
                    style={{
                      padding: '6px 12px',
                      fontSize: 13,
                      borderRadius: 16,
                      border: `1px solid ${isSelected ? colors.primary : colors.border}`,
                      backgroundColor: isSelected ? (isDarkMode ? 'rgba(209, 69, 59, 0.2)' : '#fee9e9') : 'transparent',
                      color: isSelected ? colors.primary : colors.text,
                      cursor: 'pointer',
                    }}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
          
          {/* Due Date Filter */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: colors.textSecondary, marginBottom: 6 }}>
              Due Date
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {[
                { value: 'overdue', label: 'Overdue' },
                { value: 'today', label: 'Today' },
                { value: 'tomorrow', label: 'Tomorrow' },
                { value: 'this_week', label: 'This Week' },
                { value: 'no_date', label: 'No Date' },
              ].map(opt => {
                const isSelected = dueDateRange === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => setDueDateRange(isSelected ? undefined : opt.value as FilterCriteria['dueDateRange'])}
                    style={{
                      padding: '6px 12px',
                      fontSize: 13,
                      borderRadius: 16,
                      border: `1px solid ${isSelected ? colors.primary : colors.border}`,
                      backgroundColor: isSelected ? (isDarkMode ? 'rgba(209, 69, 59, 0.2)' : '#fee9e9') : 'transparent',
                      color: isSelected ? colors.primary : colors.text,
                      cursor: 'pointer',
                    }}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
          
          {/* Projects Filter */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: colors.textSecondary, marginBottom: 6 }}>
              Projects
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {activeProjects.map(project => {
                const isSelected = selectedProjectIds.includes(project.id);
                return (
                  <button
                    key={project.id}
                    onClick={() => toggleArrayItem(selectedProjectIds, project.id, setSelectedProjectIds)}
                    style={{
                      padding: '6px 12px',
                      fontSize: 13,
                      borderRadius: 16,
                      border: `1px solid ${isSelected ? colors.primary : colors.border}`,
                      backgroundColor: isSelected ? (isDarkMode ? 'rgba(209, 69, 59, 0.2)' : '#fee9e9') : 'transparent',
                      color: isSelected ? colors.primary : colors.text,
                      cursor: 'pointer',
                    }}
                  >
                    {project.name}
                  </button>
                );
              })}
            </div>
          </div>
          
          {/* Tags Filter */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: colors.textSecondary, marginBottom: 6 }}>
              Tags
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {tags.map(tag => {
                const isSelected = selectedTagIds.includes(tag.id);
                return (
                  <button
                    key={tag.id}
                    onClick={() => toggleArrayItem(selectedTagIds, tag.id, setSelectedTagIds)}
                    style={{
                      padding: '6px 12px',
                      fontSize: 13,
                      borderRadius: 16,
                      border: `1px solid ${isSelected ? colors.primary : colors.border}`,
                      backgroundColor: isSelected ? (isDarkMode ? 'rgba(209, 69, 59, 0.2)' : '#fee9e9') : 'transparent',
                      color: isSelected ? colors.primary : colors.text,
                      cursor: 'pointer',
                    }}
                  >
                    {tag.name}
                  </button>
                );
              })}
            </div>
          </div>
          
          {/* Actions */}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between' }}>
            {editingFilter && (
              <button
                onClick={handleDelete}
                style={{
                  padding: '10px 16px',
                  fontSize: 14,
                  fontWeight: 500,
                  borderRadius: 6,
                  border: 'none',
                  backgroundColor: isDarkMode ? 'rgba(239, 68, 68, 0.2)' : '#fee2e2',
                  color: '#ef4444',
                  cursor: 'pointer',
                }}
              >
                Delete
              </button>
            )}
            <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
              <button
                onClick={onClose}
                style={{
                  padding: '10px 16px',
                  fontSize: 14,
                  fontWeight: 500,
                  borderRadius: 6,
                  border: 'none',
                  backgroundColor: isDarkMode ? '#3a3a3a' : '#f5f5f5',
                  color: colors.text,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!name.trim()}
                style={{
                  padding: '10px 16px',
                  fontSize: 14,
                  fontWeight: 500,
                  borderRadius: 6,
                  border: 'none',
                  backgroundColor: colors.primary,
                  color: '#ffffff',
                  cursor: !name.trim() ? 'not-allowed' : 'pointer',
                  opacity: !name.trim() ? 0.5 : 1,
                }}
              >
                {editingFilter ? 'Save Changes' : 'Create Filter'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
