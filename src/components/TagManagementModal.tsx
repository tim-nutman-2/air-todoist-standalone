import { useState, useEffect, useRef } from 'react';
import { X, Tag, Plus, Pencil, Trash, Check } from '@phosphor-icons/react';
import { useStore } from '../store';
import type { Tag as TagType } from '../types';

const TAG_TYPES = [
  { value: '', label: 'No type' },
  { value: 'Context', label: 'Context' },
  { value: 'Category', label: 'Category' },
  { value: 'Energy', label: 'Energy' },
  { value: 'Priority', label: 'Priority' },
];

interface TagManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TagManagementModal({ isOpen, onClose }: TagManagementModalProps) {
  const tags = useStore(state => state.tags);
  const createTag = useStore(state => state.createTag);
  const updateTag = useStore(state => state.updateTag);
  const deleteTag = useStore(state => state.deleteTag);
  const showConfirm = useStore(state => state.showConfirm);
  const isDarkMode = useStore(state => state.isDarkMode);
  
  const [isCreating, setIsCreating] = useState(false);
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [type, setType] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const colors = {
    bg: isDarkMode ? '#1f1f1f' : '#ffffff',
    border: isDarkMode ? '#3a3a3a' : '#e0e0e0',
    text: isDarkMode ? '#ffffff' : '#202020',
    textSecondary: isDarkMode ? '#a0a0a0' : '#808080',
    inputBg: isDarkMode ? '#333333' : '#ffffff',
    hoverBg: isDarkMode ? '#2a2a2a' : '#f5f5f5',
    primary: '#d1453b',
    tagBg: isDarkMode ? '#3a3a3a' : '#f0f0f0',
  };
  
  useEffect(() => {
    if (isCreating || editingTagId) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isCreating, editingTagId]);
  
  useEffect(() => {
    if (!isOpen) {
      setIsCreating(false);
      setEditingTagId(null);
      resetForm();
    }
  }, [isOpen]);
  
  const resetForm = () => {
    setName('');
    setType('');
    setDescription('');
  };
  
  const startEditing = (tag: TagType) => {
    setEditingTagId(tag.id);
    setName(tag.name);
    setType(tag.type || '');
    setDescription(tag.description || '');
    setIsCreating(false);
  };
  
  const startCreating = () => {
    setIsCreating(true);
    setEditingTagId(null);
    resetForm();
  };
  
  const cancelEdit = () => {
    setIsCreating(false);
    setEditingTagId(null);
    resetForm();
  };
  
  const handleSubmit = async () => {
    if (!name.trim() || isSubmitting) return;
    
    setIsSubmitting(true);
    
    try {
      if (editingTagId) {
        await updateTag(editingTagId, {
          name: name.trim(),
          type: type || null,
          description: description.trim(),
        });
      } else {
        await createTag({
          name: name.trim(),
          type: type || null,
          description: description.trim(),
        });
      }
      
      cancelEdit();
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleDelete = (tag: TagType) => {
    showConfirm({
      title: 'Delete Tag',
      message: `Are you sure you want to delete "${tag.name}"? This will remove it from all tasks.`,
      type: 'delete',
      onConfirm: async () => {
        await deleteTag(tag.id);
      },
    });
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      if (isCreating || editingTagId) {
        cancelEdit();
      } else {
        onClose();
      }
    } else if (e.key === 'Enter' && (isCreating || editingTagId)) {
      e.preventDefault();
      handleSubmit();
    }
  };
  
  if (!isOpen) return null;
  
  const sortedTags = [...tags].sort((a, b) => a.name.localeCompare(b.name));
  
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
          width: '100%',
          maxWidth: 520,
          maxHeight: '80vh',
          backgroundColor: colors.bg,
          borderRadius: 12,
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
        onKeyDown={handleKeyDown}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          borderBottom: `1px solid ${colors.border}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Tag size={22} weight="fill" style={{ color: colors.primary }} />
            <h2 style={{ fontSize: 16, fontWeight: 600, color: colors.text, margin: 0 }}>
              Manage Tags
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              padding: 4,
              border: 'none',
              backgroundColor: 'transparent',
              color: colors.textSecondary,
              cursor: 'pointer',
              borderRadius: 4,
            }}
          >
            <X size={20} />
          </button>
        </div>
        
        {/* Create/Edit Form */}
        {(isCreating || editingTagId) && (
          <div style={{
            padding: 16,
            borderBottom: `1px solid ${colors.border}`,
            backgroundColor: isDarkMode ? '#2a2a2a' : '#f9f9f9',
          }}>
            <div style={{ marginBottom: 12 }}>
              <input
                ref={inputRef}
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Tag name"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  fontSize: 14,
                  border: `1px solid ${colors.border}`,
                  borderRadius: 8,
                  backgroundColor: colors.inputBg,
                  color: colors.text,
                  outline: 'none',
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                style={{
                  flex: 1,
                  padding: '10px 12px',
                  fontSize: 14,
                  border: `1px solid ${colors.border}`,
                  borderRadius: 8,
                  backgroundColor: colors.inputBg,
                  color: colors.text,
                  outline: 'none',
                }}
              >
                {TAG_TYPES.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Description (optional)"
                style={{
                  flex: 2,
                  padding: '10px 12px',
                  fontSize: 14,
                  border: `1px solid ${colors.border}`,
                  borderRadius: 8,
                  backgroundColor: colors.inputBg,
                  color: colors.text,
                  outline: 'none',
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                onClick={cancelEdit}
                style={{
                  padding: '8px 16px',
                  fontSize: 13,
                  borderRadius: 6,
                  border: `1px solid ${colors.border}`,
                  backgroundColor: 'transparent',
                  color: colors.text,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!name.trim() || isSubmitting}
                style={{
                  padding: '8px 16px',
                  fontSize: 13,
                  borderRadius: 6,
                  border: 'none',
                  backgroundColor: colors.primary,
                  color: '#ffffff',
                  cursor: name.trim() && !isSubmitting ? 'pointer' : 'not-allowed',
                  opacity: name.trim() && !isSubmitting ? 1 : 0.5,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <Check size={16} />
                {editingTagId ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        )}
        
        {/* Add Button */}
        {!isCreating && !editingTagId && (
          <div style={{ padding: '12px 16px', borderBottom: `1px solid ${colors.border}` }}>
            <button
              onClick={startCreating}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 16px',
                fontSize: 14,
                fontWeight: 500,
                borderRadius: 8,
                border: 'none',
                backgroundColor: colors.primary,
                color: '#ffffff',
                cursor: 'pointer',
              }}
            >
              <Plus size={18} weight="bold" />
              Create New Tag
            </button>
          </div>
        )}
        
        {/* Tag List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
          {sortedTags.length === 0 ? (
            <div style={{
              padding: '40px 20px',
              textAlign: 'center',
              color: colors.textSecondary,
            }}>
              <Tag size={48} style={{ opacity: 0.3, marginBottom: 12 }} />
              <p style={{ margin: 0 }}>No tags yet. Create your first tag to get started.</p>
            </div>
          ) : (
            sortedTags.map(tag => (
              <div
                key={tag.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  borderBottom: `1px solid ${colors.border}`,
                  backgroundColor: editingTagId === tag.id ? colors.hoverBg : 'transparent',
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{
                      padding: '4px 10px',
                      fontSize: 13,
                      fontWeight: 500,
                      borderRadius: 6,
                      backgroundColor: colors.tagBg,
                      color: colors.text,
                    }}>
                      # {tag.name}
                    </span>
                    {tag.type && (
                      <span style={{
                        fontSize: 11,
                        color: colors.textSecondary,
                        backgroundColor: isDarkMode ? '#444' : '#e8e8e8',
                        padding: '2px 8px',
                        borderRadius: 4,
                      }}>
                        {tag.type}
                      </span>
                    )}
                    {tag.taskIds && tag.taskIds.length > 0 && (
                      <span style={{
                        fontSize: 11,
                        color: colors.textSecondary,
                      }}>
                        {tag.taskIds.length} task{tag.taskIds.length !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  {tag.description && (
                    <p style={{
                      margin: '6px 0 0',
                      fontSize: 12,
                      color: colors.textSecondary,
                    }}>
                      {tag.description}
                    </p>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button
                    onClick={() => startEditing(tag)}
                    style={{
                      padding: 8,
                      border: 'none',
                      backgroundColor: 'transparent',
                      color: colors.textSecondary,
                      cursor: 'pointer',
                      borderRadius: 6,
                    }}
                    title="Edit tag"
                  >
                    <Pencil size={18} />
                  </button>
                  <button
                    onClick={() => handleDelete(tag)}
                    style={{
                      padding: 8,
                      border: 'none',
                      backgroundColor: 'transparent',
                      color: '#e74c3c',
                      cursor: 'pointer',
                      borderRadius: 6,
                    }}
                    title="Delete tag"
                  >
                    <Trash size={18} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
        
        {/* Footer */}
        <div style={{
          padding: '12px 16px',
          borderTop: `1px solid ${colors.border}`,
          display: 'flex',
          justifyContent: 'flex-end',
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '10px 20px',
              fontSize: 14,
              fontWeight: 500,
              borderRadius: 8,
              border: `1px solid ${colors.border}`,
              backgroundColor: 'transparent',
              color: colors.text,
              cursor: 'pointer',
            }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
