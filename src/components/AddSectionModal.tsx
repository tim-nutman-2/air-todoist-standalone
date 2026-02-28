import { useState, useEffect, useRef } from 'react';
import { X } from '@phosphor-icons/react';
import { useStore } from '../store';

interface AddSectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
}

const SECTION_COLORS = [
  { value: '#ef4444', label: 'Red' },
  { value: '#f59e0b', label: 'Orange' },
  { value: '#eab308', label: 'Yellow' },
  { value: '#22c55e', label: 'Green' },
  { value: '#06b6d4', label: 'Cyan' },
  { value: '#3b82f6', label: 'Blue' },
  { value: '#8b5cf6', label: 'Purple' },
  { value: '#ec4899', label: 'Pink' },
  { value: '#6b7280', label: 'Gray' },
];

export function AddSectionModal({ isOpen, onClose, projectId }: AddSectionModalProps) {
  const { createSection, sections, isDarkMode } = useStore();
  const [name, setName] = useState('');
  const [color, setColor] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const colors = {
    bg: isDarkMode ? '#1f1f1f' : '#ffffff',
    border: isDarkMode ? '#3a3a3a' : '#e0e0e0',
    text: isDarkMode ? '#ffffff' : '#202020',
    textSecondary: isDarkMode ? '#a0a0a0' : '#808080',
    inputBg: isDarkMode ? '#333333' : '#ffffff',
    primary: '#d1453b',
  };
  
  useEffect(() => {
    if (isOpen) {
      setName('');
      setColor(null);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || isSubmitting) return;
    
    setIsSubmitting(true);
    
    const existingSections = sections.filter(s => s.projectId === projectId);
    const maxOrder = existingSections.length > 0 
      ? Math.max(...existingSections.map(s => s.order)) 
      : 0;
    
    await createSection({
      name: name.trim(),
      projectId,
      order: maxOrder + 1,
      color,
    });
    
    setIsSubmitting(false);
    onClose();
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };
  
  if (!isOpen) return null;
  
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
          maxWidth: 400,
          backgroundColor: colors.bg,
          borderRadius: 12,
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)',
          overflow: 'hidden',
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
          <h2 style={{ fontSize: 16, fontWeight: 600, color: colors.text, margin: 0 }}>
            Add Section
          </h2>
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
        
        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: 20 }}>
          {/* Section Name */}
          <div style={{ marginBottom: 16 }}>
            <label style={{
              display: 'block',
              fontSize: 13,
              fontWeight: 500,
              color: colors.textSecondary,
              marginBottom: 6,
            }}>
              Section Name
            </label>
            <input
              ref={inputRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., To Do, In Progress, Done"
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
          
          {/* Color Picker */}
          <div style={{ marginBottom: 20 }}>
            <label style={{
              display: 'block',
              fontSize: 13,
              fontWeight: 500,
              color: colors.textSecondary,
              marginBottom: 8,
            }}>
              Color (optional)
            </label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {SECTION_COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setColor(color === c.value ? null : c.value)}
                  title={c.label}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    backgroundColor: c.value,
                    border: color === c.value ? '3px solid white' : 'none',
                    boxShadow: color === c.value ? `0 0 0 2px ${c.value}` : 'none',
                    cursor: 'pointer',
                  }}
                />
              ))}
            </div>
          </div>
          
          {/* Buttons */}
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <button
              type="button"
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
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim() || isSubmitting}
              style={{
                padding: '10px 20px',
                fontSize: 14,
                fontWeight: 500,
                borderRadius: 8,
                border: 'none',
                backgroundColor: colors.primary,
                color: '#ffffff',
                cursor: name.trim() && !isSubmitting ? 'pointer' : 'not-allowed',
                opacity: name.trim() && !isSubmitting ? 1 : 0.5,
              }}
            >
              {isSubmitting ? 'Adding...' : 'Add Section'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
