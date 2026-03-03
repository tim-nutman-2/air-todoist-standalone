import { useState, useEffect, useRef } from 'react';
import { X, Folder } from '@phosphor-icons/react';
import { useStore } from '../store';

const PROJECT_STATUS_OPTIONS = [
  { value: 'Active', label: 'Active' },
  { value: 'On Hold', label: 'On Hold' },
  { value: 'Completed', label: 'Completed' },
  { value: 'Archived', label: 'Archived' },
];

interface AddProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AddProjectModal({ isOpen, onClose }: AddProjectModalProps) {
  const createProject = useStore(state => state.createProject);
  const isDarkMode = useStore(state => state.isDarkMode);
  
  const [name, setName] = useState('');
  const [status, setStatus] = useState('Active');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [targetDate, setTargetDate] = useState('');
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
      setStatus('Active');
      setDescription('');
      setStartDate('');
      setTargetDate('');
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || isSubmitting) return;
    
    setIsSubmitting(true);
    
    await createProject({
      name: name.trim(),
      status,
      description: description.trim(),
      startDate: startDate || null,
      targetDate: targetDate || null,
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
          maxWidth: 480,
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
          backgroundColor: colors.primary,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Folder size={22} weight="fill" style={{ color: '#ffffff' }} />
            <h2 style={{ fontSize: 16, fontWeight: 600, color: '#ffffff', margin: 0 }}>
              New Project
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              padding: 4,
              border: 'none',
              backgroundColor: 'rgba(255,255,255,0.2)',
              color: '#ffffff',
              cursor: 'pointer',
              borderRadius: 4,
            }}
          >
            <X size={20} />
          </button>
        </div>
        
        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: 20 }}>
          {/* Project Name */}
          <div style={{ marginBottom: 16 }}>
            <label style={{
              display: 'block',
              fontSize: 13,
              fontWeight: 500,
              color: colors.textSecondary,
              marginBottom: 6,
            }}>
              Project Name *
            </label>
            <input
              ref={inputRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Website Redesign"
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
          
          {/* Status */}
          <div style={{ marginBottom: 16 }}>
            <label style={{
              display: 'block',
              fontSize: 13,
              fontWeight: 500,
              color: colors.textSecondary,
              marginBottom: 6,
            }}>
              Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
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
            >
              {PROJECT_STATUS_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          
          {/* Description */}
          <div style={{ marginBottom: 16 }}>
            <label style={{
              display: 'block',
              fontSize: 13,
              fontWeight: 500,
              color: colors.textSecondary,
              marginBottom: 6,
            }}>
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this project about?"
              rows={3}
              style={{
                width: '100%',
                padding: '10px 12px',
                fontSize: 14,
                border: `1px solid ${colors.border}`,
                borderRadius: 8,
                backgroundColor: colors.inputBg,
                color: colors.text,
                outline: 'none',
                resize: 'vertical',
              }}
            />
          </div>
          
          {/* Dates */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
            <div style={{ flex: 1 }}>
              <label style={{
                display: 'block',
                fontSize: 13,
                fontWeight: 500,
                color: colors.textSecondary,
                marginBottom: 6,
              }}>
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
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
            <div style={{ flex: 1 }}>
              <label style={{
                display: 'block',
                fontSize: 13,
                fontWeight: 500,
                color: colors.textSecondary,
                marginBottom: 6,
              }}>
                Target Date
              </label>
              <input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
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
              {isSubmitting ? 'Creating...' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
