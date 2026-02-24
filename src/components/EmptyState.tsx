import { 
  CalendarBlank, 
  Tray, 
  FunnelSimple, 
  Folder, 
  CalendarDots,
  CheckCircle,
  MagnifyingGlass,
  Tag,
} from '@phosphor-icons/react';
import { useStore } from '../store';

export type EmptyStateType = 
  | 'today'
  | 'inbox'
  | 'upcoming'
  | 'project'
  | 'projects'
  | 'filter'
  | 'tag'
  | 'search'
  | 'schedule';

interface EmptyStateProps {
  type: EmptyStateType;
  searchQuery?: string;
  onAddTask?: () => void;
}

const emptyStateConfig: Record<EmptyStateType, {
  icon: React.ElementType;
  title: string;
  description: string;
  showAddButton?: boolean;
}> = {
  today: {
    icon: CheckCircle,
    title: 'All done for today!',
    description: 'Enjoy your free time or add new tasks to keep the momentum going.',
    showAddButton: true,
  },
  inbox: {
    icon: Tray,
    title: 'Inbox is empty',
    description: 'Capture new tasks here. They\'ll wait in your inbox until you organize them.',
    showAddButton: true,
  },
  upcoming: {
    icon: CalendarDots,
    title: 'Nothing upcoming',
    description: 'No tasks scheduled for the next 7 days. Plan ahead by adding due dates to your tasks.',
    showAddButton: true,
  },
  project: {
    icon: Folder,
    title: 'No tasks in this project',
    description: 'Start adding tasks to track your progress on this project.',
    showAddButton: true,
  },
  projects: {
    icon: Folder,
    title: 'No project tasks',
    description: 'Tasks assigned to projects will appear here, grouped by project.',
    showAddButton: true,
  },
  filter: {
    icon: FunnelSimple,
    title: 'No matching tasks',
    description: 'No tasks match your filter criteria. Try adjusting your filters.',
    showAddButton: false,
  },
  tag: {
    icon: Tag,
    title: 'No tasks with this tag',
    description: 'Tasks with this tag will appear here.',
    showAddButton: true,
  },
  search: {
    icon: MagnifyingGlass,
    title: 'No results found',
    description: 'Try searching with different keywords.',
    showAddButton: false,
  },
  schedule: {
    icon: CalendarBlank,
    title: 'No scheduled tasks',
    description: 'Schedule tasks by setting a due date and time to see them on the calendar.',
    showAddButton: true,
  },
};

export function EmptyState({ type, searchQuery, onAddTask }: EmptyStateProps) {
  const { isDarkMode } = useStore();
  
  const config = emptyStateConfig[type];
  const Icon = config.icon;
  
  const colors = {
    text: isDarkMode ? '#ffffff' : '#202020',
    textSecondary: isDarkMode ? '#a0a0a0' : '#808080',
    textMuted: isDarkMode ? '#606060' : '#b0b0b0',
    primary: '#d1453b',
    iconBg: isDarkMode ? '#2a2a2a' : '#f5f5f5',
  };
  
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '64px 32px',
      textAlign: 'center',
    }}>
      {/* Icon */}
      <div style={{
        width: 80,
        height: 80,
        borderRadius: '50%',
        backgroundColor: colors.iconBg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
      }}>
        <Icon size={36} style={{ color: colors.textMuted }} />
      </div>
      
      {/* Title */}
      <h3 style={{
        fontSize: 18,
        fontWeight: 600,
        color: colors.text,
        margin: 0,
        marginBottom: 8,
      }}>
        {type === 'search' && searchQuery 
          ? `No results for "${searchQuery}"`
          : config.title
        }
      </h3>
      
      {/* Description */}
      <p style={{
        fontSize: 14,
        color: colors.textSecondary,
        margin: 0,
        maxWidth: 360,
        lineHeight: 1.5,
      }}>
        {config.description}
      </p>
      
      {/* Add Task Button */}
      {config.showAddButton && onAddTask && (
        <button
          onClick={onAddTask}
          style={{
            marginTop: 24,
            padding: '10px 20px',
            fontSize: 14,
            fontWeight: 500,
            borderRadius: 8,
            border: 'none',
            backgroundColor: colors.primary,
            color: '#ffffff',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          Add a task
        </button>
      )}
    </div>
  );
}
