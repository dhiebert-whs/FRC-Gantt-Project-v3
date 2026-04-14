import { useEffect, useState, useCallback } from 'react';
import { useSettingsStore } from './stores/settingsStore';
import { useTeamStore } from './stores/teamStore';
import { useProjectStore } from './stores/projectStore';
import { TopBar } from './components/TopBar';
import type { View } from './components/TopBar';
import { NewProjectDialog } from './components/NewProjectDialog';
import { GanttView } from './components/GanttView';
import { DailyView } from './components/DailyView';
import { TeamPanel } from './components/TeamPanel';
import { Settings } from './components/Settings';

function App() {
  const loadSettings   = useSettingsStore(s => s.loadSettings);
  const loadTeamDb     = useTeamStore(s => s.loadTeamDb);
  const settingsLoaded = useSettingsStore(s => s.isLoaded);
  const teamLoaded     = useTeamStore(s => s.isLoaded);
  const defaultView    = useSettingsStore(s => s.settings.defaultView);

  const saveProject   = useProjectStore(s => s.saveProject);
  const openProject   = useProjectStore(s => s.openProject);

  const [currentView,      setCurrentView]      = useState<View>('gantt');
  const [showNewProject,   setShowNewProject]   = useState(false);

  // Initialize stores on mount
  useEffect(() => {
    loadSettings();
    loadTeamDb();
  }, []);

  // Apply default view once settings load
  useEffect(() => {
    if (settingsLoaded) {
      setCurrentView(defaultView as View);
    }
  }, [settingsLoaded]);

  // Global keyboard shortcuts
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!e.ctrlKey && !e.metaKey) return;
    switch (e.key.toLowerCase()) {
      case 's':
        e.preventDefault();
        saveProject();
        break;
      case 'o':
        e.preventDefault();
        openProject();
        break;
      case 'n':
        e.preventDefault();
        setShowNewProject(true);
        break;
    }
  }, [saveProject, openProject]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Loading screen
  if (!settingsLoaded || !teamLoaded) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-950 text-white">
        <p className="text-lg tracking-wide text-gray-400">Loading…</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-950 text-white overflow-hidden">
      <TopBar
        currentView={currentView}
        onViewChange={setCurrentView}
        onNewProject={() => setShowNewProject(true)}
      />

      <main className="flex-1 overflow-hidden">
        {currentView === 'gantt'    && <GanttView />}
        {currentView === 'daily'    && <DailyView />}
        {currentView === 'team'     && <TeamPanel />}
        {currentView === 'settings' && <Settings />}
      </main>

      {showNewProject && (
        <NewProjectDialog onClose={() => setShowNewProject(false)} />
      )}
    </div>
  );
}

export default App;
