# Air Todoist Standalone

A standalone React application for the Air Todoist task management system. Available as both a web app and a native desktop application (via Electron).

## Features

- **Offline-First**: Work on your tasks even without internet connection
- **Background Sync**: Changes made offline sync automatically when back online
- **Multiple Views**: Today, Inbox, By Project, Upcoming, Tags, and custom Filters
- **Subtask Support**: Hierarchical tasks with unlimited nesting
- **Project Colors**: Visual organization with color-coded projects
- **Dark Mode**: Toggle between light and dark themes
- **Desktop App**: Native macOS/Windows app with system tray and global shortcuts

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Airtable API Key

1. Go to [Airtable Token Creation](https://airtable.com/create/tokens)
2. Create a new Personal Access Token with:
   - **Scopes**: `data.records:read`, `data.records:write`, `schema.bases:read`
   - **Access**: Select your Air Todoist base
3. Copy `.env.local.example` to `.env.local`:
   ```bash
   cp .env.local.example .env.local
   ```
4. Add your token to `.env.local`:
   ```
   VITE_AIRTABLE_API_KEY=pat_your_token_here
   ```

## Development

### Web Development (Browser)

```bash
npm run dev
```

Opens at `http://localhost:5173` with hot reload.

### Desktop Development (Electron)

```bash
npm run dev:electron
```

Opens the app in an Electron window with hot reload. Same development experience as web.

## Building

### Web Build

```bash
npm run build
```

Built files go to `dist/` directory.

### Desktop App Package

```bash
# Build for current platform
npm run package

# Build for macOS
npm run package:mac

# Build for Windows
npm run package:win
```

Installers are created in `release/` directory.

## Desktop App Features

- **System Tray**: Quick access from menu bar
- **Global Shortcuts**:
  - `Cmd/Ctrl + Shift + A`: Quick add task (works even when app is hidden)
  - `Cmd/Ctrl + Shift + T`: Toggle app visibility
- **Native Notifications**: Task reminders and sync status
- **Background Running**: Minimizes to tray instead of quitting

## Architecture

```
src/
├── api/           # Airtable REST API service
├── components/    # React UI components
├── db/            # IndexedDB (Dexie) for offline storage
├── hooks/         # Custom React hooks
├── store/         # Zustand state management
├── types/         # TypeScript type definitions
└── utils/         # Utility functions
```

## Offline Capabilities

- **Read**: All data is cached locally in IndexedDB
- **Create/Update/Delete**: Changes are stored locally and queued for sync
- **Conflict Resolution**: Last-write-wins strategy with server as source of truth
- **Sync Status**: Visual indicator shows online/offline status and last sync time

## Comparison with Airtable Extension

| Feature | Airtable Extension | Standalone App |
|---------|-------------------|----------------|
| Offline Reading | ❌ | ✅ |
| Offline Editing | ❌ | ✅ |
| Background Sync | ❌ | ✅ |
| Custom Domain | ❌ | ✅ |
| PWA Install | ❌ | ✅ |
| Airtable Integration | Native | API-based |

## Tech Stack

- **React 18** with TypeScript
- **Vite** for fast development
- **Tailwind CSS** for styling
- **Zustand** for state management
- **Dexie.js** for IndexedDB
- **Phosphor Icons** for iconography

## Related

- [Air Todoist Airtable Extension](../air_todoist_task_view) - The original Airtable custom extension
