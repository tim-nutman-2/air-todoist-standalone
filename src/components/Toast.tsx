import { useStore } from '../store';
import { CheckCircle, XCircle, Info, X } from '@phosphor-icons/react';

export function Toast() {
  const { toast, hideToast, isDarkMode } = useStore();
  
  if (!toast) return null;
  
  const styles = {
    success: {
      bg: isDarkMode ? 'rgba(22, 163, 74, 0.15)' : '#f0fdf4',
      border: isDarkMode ? 'rgba(22, 163, 74, 0.3)' : '#bbf7d0',
      icon: '#22c55e',
    },
    error: {
      bg: isDarkMode ? 'rgba(239, 68, 68, 0.15)' : '#fef2f2',
      border: isDarkMode ? 'rgba(239, 68, 68, 0.3)' : '#fecaca',
      icon: '#ef4444',
    },
    info: {
      bg: isDarkMode ? 'rgba(59, 130, 246, 0.15)' : '#eff6ff',
      border: isDarkMode ? 'rgba(59, 130, 246, 0.3)' : '#bfdbfe',
      icon: '#3b82f6',
    },
  };
  
  const style = styles[toast.type];
  
  return (
    <div style={{
      position: 'fixed',
      bottom: 24,
      right: 24,
      zIndex: 9999,
      animation: 'slide-up 0.2s ease-out',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 16px',
        borderRadius: 8,
        backgroundColor: style.bg,
        border: `1px solid ${style.border}`,
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      }}>
        {toast.type === 'success' && <CheckCircle size={20} weight="fill" style={{ color: style.icon }} />}
        {toast.type === 'error' && <XCircle size={20} weight="fill" style={{ color: style.icon }} />}
        {toast.type === 'info' && <Info size={20} weight="fill" style={{ color: style.icon }} />}
        
        <span style={{
          fontSize: 14,
          color: isDarkMode ? '#e5e5e5' : '#374151',
        }}>
          {toast.message}
        </span>
        
        <button
          onClick={hideToast}
          style={{
            marginLeft: 8,
            padding: 4,
            border: 'none',
            backgroundColor: 'transparent',
            color: isDarkMode ? '#9ca3af' : '#6b7280',
            cursor: 'pointer',
          }}
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
