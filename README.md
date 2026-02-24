# Air Todoist Standalone

A standalone React application for the Air Todoist task management system. This is a progressive web app (PWA) that provides offline-first functionality with Airtable as the backend.

## Features

- **Offline-First**: Work on your tasks even without internet connection
- **Background Sync**: Changes made offline sync automatically when back online
- **Multiple Views**: Today, Inbox, By Project, Upcoming, Tags, and custom Filters
- **Subtask Support**: Hierarchical tasks with unlimited nesting
- **Project Colors**: Visual organization with color-coded projects
- **Dark Mode**: Toggle between light and dark themes

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

### 3. Start Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

## Building for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

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
