import { Warning, Trash, Info } from '@phosphor-icons/react';
import { useStore } from '../store';

export type ConfirmModalType = 'delete' | 'warning' | 'info';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  type?: ConfirmModalType;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  isOpen,
  title,
  message,
  type = 'warning',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const { isDarkMode } = useStore();
  
  const colors = {
    bg: isDarkMode ? '#1f1f1f' : '#ffffff',
    surface: isDarkMode ? '#282828' : '#ffffff',
    border: isDarkMode ? '#3a3a3a' : '#e0e0e0',
    text: isDarkMode ? '#ffffff' : '#202020',
    textSecondary: isDarkMode ? '#a0a0a0' : '#808080',
  };
  
  const typeConfig = {
    delete: {
      icon: Trash,
      iconColor: '#ef4444',
      iconBg: isDarkMode ? 'rgba(239, 68, 68, 0.15)' : '#fef2f2',
      confirmBg: '#ef4444',
      confirmHover: '#dc2626',
    },
    warning: {
      icon: Warning,
      iconColor: '#f59e0b',
      iconBg: isDarkMode ? 'rgba(245, 158, 11, 0.15)' : '#fffbeb',
      confirmBg: '#f59e0b',
      confirmHover: '#d97706',
    },
    info: {
      icon: Info,
      iconColor: '#3b82f6',
      iconBg: isDarkMode ? 'rgba(59, 130, 246, 0.15)' : '#eff6ff',
      confirmBg: '#3b82f6',
      confirmHover: '#2563eb',
    },
  };
  
  const config = typeConfig[type];
  const Icon = config.icon;
  
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
        zIndex: 2000,
      }}
      onClick={(e) => e.target === e.currentTarget && onCancel()}
    >
      <div
        style={{
          backgroundColor: colors.surface,
          borderRadius: 16,
          width: 400,
          maxWidth: '90vw',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
          overflow: 'hidden',
        }}
      >
        {/* Content */}
        <div style={{ padding: 24, textAlign: 'center' }}>
          {/* Icon */}
          <div style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            backgroundColor: config.iconBg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
          }}>
            <Icon size={28} style={{ color: config.iconColor }} />
          </div>
          
          {/* Title */}
          <h2 style={{
            fontSize: 18,
            fontWeight: 600,
            color: colors.text,
            margin: '0 0 8px',
          }}>
            {title}
          </h2>
          
          {/* Message */}
          <p style={{
            fontSize: 14,
            color: colors.textSecondary,
            margin: 0,
            lineHeight: 1.5,
          }}>
            {message}
          </p>
        </div>
        
        {/* Actions */}
        <div style={{
          display: 'flex',
          gap: 12,
          padding: '0 24px 24px',
        }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1,
              padding: '12px 16px',
              fontSize: 14,
              fontWeight: 500,
              borderRadius: 8,
              border: `1px solid ${colors.border}`,
              backgroundColor: 'transparent',
              color: colors.text,
              cursor: 'pointer',
            }}
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            style={{
              flex: 1,
              padding: '12px 16px',
              fontSize: 14,
              fontWeight: 500,
              borderRadius: 8,
              border: 'none',
              backgroundColor: config.confirmBg,
              color: '#ffffff',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = config.confirmHover}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = config.confirmBg}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// Hook for managing confirm modal state
import { useState, useCallback } from 'react';

interface ConfirmOptions {
  title: string;
  message: string;
  type?: ConfirmModalType;
  confirmLabel?: string;
  cancelLabel?: string;
}

export function useConfirm() {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const [resolveRef, setResolveRef] = useState<((value: boolean) => void) | null>(null);
  
  const confirm = useCallback((opts: ConfirmOptions): Promise<boolean> => {
    setOptions(opts);
    setIsOpen(true);
    
    return new Promise((resolve) => {
      setResolveRef(() => resolve);
    });
  }, []);
  
  const handleConfirm = useCallback(() => {
    setIsOpen(false);
    resolveRef?.(true);
  }, [resolveRef]);
  
  const handleCancel = useCallback(() => {
    setIsOpen(false);
    resolveRef?.(false);
  }, [resolveRef]);
  
  const ConfirmModalComponent = options ? (
    <ConfirmModal
      isOpen={isOpen}
      title={options.title}
      message={options.message}
      type={options.type}
      confirmLabel={options.confirmLabel}
      cancelLabel={options.cancelLabel}
      onConfirm={handleConfirm}
      onCancel={handleCancel}
    />
  ) : null;
  
  return { confirm, ConfirmModal: ConfirmModalComponent };
}
