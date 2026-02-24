import { WifiSlash } from '@phosphor-icons/react';
import { useStore } from '../store';

export function OfflineBanner() {
  const { isOnline, isDarkMode } = useStore();
  
  if (isOnline) return null;
  
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        padding: '8px 16px',
        backgroundColor: isDarkMode ? 'rgba(217, 119, 6, 0.15)' : '#fef3c7',
        borderBottom: `1px solid ${isDarkMode ? 'rgba(217, 119, 6, 0.3)' : '#fde68a'}`,
        color: '#d97706',
        fontSize: 13,
        fontWeight: 500,
      }}
    >
      <WifiSlash size={16} weight="bold" />
      <span>You're offline — changes will sync when you reconnect</span>
    </div>
  );
}
