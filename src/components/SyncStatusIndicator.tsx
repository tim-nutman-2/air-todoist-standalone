import { useState, useEffect, useCallback } from 'react';
import { 
  Cloud, 
  CloudSlash, 
  CloudArrowUp, 
  CheckCircle,
  Warning,
  ArrowsClockwise 
} from '@phosphor-icons/react';
import { useStore } from '../store';
import { getPendingSyncItems } from '../db';

type SyncState = 'synced' | 'syncing' | 'offline' | 'pending' | 'error';

export function SyncStatusIndicator() {
  const { 
    isOnline, 
    isSyncing, 
    lastSyncTime, 
    syncError,
    isDarkMode,
    syncPendingChanges,
    setOnlineStatus,
    showToast
  } = useStore();
  
  const [isHovered, setIsHovered] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  
  // Determine current sync state
  const getSyncState = (): SyncState => {
    if (!isOnline) return 'offline';
    if (syncError) return 'error';
    if (isSyncing) return 'syncing';
    if (pendingCount > 0) return 'pending';
    return 'synced';
  };
  
  const syncState = getSyncState();
  
  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = () => {
      setOnlineStatus(true);
      showToast('Back online - syncing changes...', 'success');
      // Auto-sync when coming back online
      syncPendingChanges();
    };
    
    const handleOffline = () => {
      setOnlineStatus(false);
      showToast('You\'re offline - changes will sync when reconnected', 'info');
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Set initial status
    setOnlineStatus(navigator.onLine);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [setOnlineStatus, showToast, syncPendingChanges]);
  
  // Check for pending sync items periodically
  useEffect(() => {
    const checkPending = async () => {
      const items = await getPendingSyncItems();
      setPendingCount(items.length);
    };
    
    checkPending();
    const interval = setInterval(checkPending, 5000);
    return () => clearInterval(interval);
  }, []);
  
  // Format last sync time
  const formatLastSync = (timestamp: number | null): string => {
    if (!timestamp) return 'Never synced';
    
    const now = Date.now();
    const diff = now - timestamp;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return new Date(timestamp).toLocaleDateString();
  };
  
  // Handle manual sync
  const handleSync = useCallback(() => {
    if (isOnline && !isSyncing) {
      syncPendingChanges();
    }
  }, [isOnline, isSyncing, syncPendingChanges]);
  
  // State-specific styling
  const stateConfig = {
    synced: {
      icon: CheckCircle,
      color: '#16a34a',
      bgColor: isDarkMode ? 'rgba(22, 163, 74, 0.15)' : '#dcfce7',
      label: 'Synced',
      description: `Last sync: ${formatLastSync(lastSyncTime)}`,
    },
    syncing: {
      icon: ArrowsClockwise,
      color: '#2563eb',
      bgColor: isDarkMode ? 'rgba(37, 99, 235, 0.15)' : '#dbeafe',
      label: 'Syncing...',
      description: 'Updating your data',
    },
    offline: {
      icon: CloudSlash,
      color: '#d97706',
      bgColor: isDarkMode ? 'rgba(217, 119, 6, 0.15)' : '#fef3c7',
      label: 'Offline',
      description: 'Changes will sync when online',
    },
    pending: {
      icon: CloudArrowUp,
      color: '#7c3aed',
      bgColor: isDarkMode ? 'rgba(124, 58, 237, 0.15)' : '#ede9fe',
      label: `${pendingCount} pending`,
      description: 'Click to sync now',
    },
    error: {
      icon: Warning,
      color: '#dc2626',
      bgColor: isDarkMode ? 'rgba(220, 38, 38, 0.15)' : '#fee2e2',
      label: 'Sync error',
      description: syncError || 'Failed to sync',
    },
  };
  
  const config = stateConfig[syncState];
  const Icon = config.icon;
  
  return (
    <div
      style={{ position: 'relative' }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Main indicator button */}
      <button
        onClick={handleSync}
        disabled={!isOnline || isSyncing}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '6px 12px',
          borderRadius: 8,
          border: 'none',
          backgroundColor: config.bgColor,
          color: config.color,
          fontSize: 12,
          fontWeight: 500,
          cursor: isOnline && !isSyncing ? 'pointer' : 'default',
          transition: 'all 0.2s',
          opacity: isSyncing ? 0.8 : 1,
        }}
      >
        <Icon 
          size={16} 
          weight={syncState === 'synced' ? 'fill' : 'regular'}
          style={{
            animation: syncState === 'syncing' ? 'spin 1s linear infinite' : 'none',
          }}
        />
        <span>{config.label}</span>
      </button>
      
      {/* Tooltip on hover */}
      {isHovered && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: 8,
            padding: '12px 16px',
            backgroundColor: isDarkMode ? '#2a2a2a' : '#ffffff',
            border: `1px solid ${isDarkMode ? '#3a3a3a' : '#e5e5e5'}`,
            borderRadius: 8,
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            zIndex: 1000,
            minWidth: 200,
          }}
        >
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 8,
            marginBottom: 8,
          }}>
            <Icon size={20} weight="fill" style={{ color: config.color }} />
            <span style={{ 
              fontWeight: 600, 
              color: isDarkMode ? '#ffffff' : '#202020',
              fontSize: 14,
            }}>
              {syncState === 'offline' ? 'Working Offline' : 
               syncState === 'syncing' ? 'Syncing Data' :
               syncState === 'pending' ? 'Pending Changes' :
               syncState === 'error' ? 'Sync Error' :
               'All Synced'}
            </span>
          </div>
          
          <p style={{ 
            fontSize: 12, 
            color: isDarkMode ? '#a0a0a0' : '#808080',
            margin: 0,
            lineHeight: 1.4,
          }}>
            {config.description}
          </p>
          
          {/* Show sync button if pending and online */}
          {syncState === 'pending' && isOnline && (
            <button
              onClick={handleSync}
              style={{
                marginTop: 12,
                width: '100%',
                padding: '8px 12px',
                borderRadius: 6,
                border: 'none',
                backgroundColor: '#d1453b',
                color: '#ffffff',
                fontSize: 12,
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Sync Now
            </button>
          )}
          
          {/* Show retry button if error */}
          {syncState === 'error' && isOnline && (
            <button
              onClick={handleSync}
              style={{
                marginTop: 12,
                width: '100%',
                padding: '8px 12px',
                borderRadius: 6,
                border: 'none',
                backgroundColor: '#dc2626',
                color: '#ffffff',
                fontSize: 12,
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Retry Sync
            </button>
          )}
          
          {/* Last sync info */}
          {lastSyncTime && syncState !== 'syncing' && (
            <div style={{
              marginTop: 12,
              paddingTop: 12,
              borderTop: `1px solid ${isDarkMode ? '#3a3a3a' : '#e5e5e5'}`,
            }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center',
                gap: 6,
                fontSize: 11,
                color: isDarkMode ? '#808080' : '#a0a0a0',
              }}>
                <Cloud size={12} />
                <span>Last sync: {formatLastSync(lastSyncTime)}</span>
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* CSS for spin animation */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
