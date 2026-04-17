import { useEffect, useState, useCallback } from 'react';
import { useSettingsStore } from './stores/settingsStore';
import { useTeamStore } from './stores/teamStore';
import { useProjectStore } from './stores/projectStore';
import { resolveDisplayMode } from './utils/displayMode';
import { useCommands } from './commands/useCommands';
import { TopBar } from './components/TopBar';
import type { View } from './components/TopBar';
import { NewProjectDialog } from './components/NewProjectDialog';
import { GanttView } from './components/GanttView';
import { DailyView } from './components/DailyView';
import { TeamPanel } from './components/TeamPanel';
import { Settings } from './components/Settings';
import { ToastContainer } from './components/ToastContainer';

function App() {
  const loadSettings   = useSettingsStore(s => s.loadSettings);
  const loadTeamDb     = useTeamStore(s => s.loadTeamDb);
  const settingsLoaded = useSettingsStore(s => s.isLoaded);
  const teamLoaded     = useTeamStore(s => s.isLoaded);
  const defaultView    = useSettingsStore(s => s.settings.defaultView);
  const displayModeSetting = useSettingsStore(s => s.settings.displayMode);
  const effectiveMode  = resolveDisplayMode(displayModeSetting);

  const projectFile    = useProjectStore(s => s.projectFile);
  const saveProject    = useProjectStore(s => s.saveProject);
  const saveProjectAs  = useProjectStore(s => s.saveProjectAs);
  const openProject    = useProjectStore(s => s.openProject);
  const closeProject   = useProjectStore(s => s.closeProject);

  const [currentView,      setCurrentView]      = useState<View>('gantt');
  const [showNewProject,   setShowNewProject]   = useState(false);

  const { dispatch } = useCommands({
    hasProject: !!projectFile,
    onNewProject: () => setShowNewProject(true),
    openProject,
    saveProject,
    saveProjectAs,
    closeProject,
  });

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
  }, [settingsLoaded, defaultView]);

  // Global keyboard shortcuts — all actions route through the command registry
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!e.ctrlKey && !e.metaKey) return;
    const tag = (e.target as HTMLElement)?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    switch (e.key.toLowerCase()) {
      case 's':
        e.preventDefault();
        dispatch(e.shiftKey ? 'project.saveAs' : 'project.save');
        break;
      case 'o':
        e.preventDefault();
        dispatch('project.open');
        break;
      case 'n':
        e.preventDefault();
        dispatch('project.new');
        break;
    }
  }, [dispatch]);

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
    <div
      className="flex flex-col h-screen bg-gray-950 text-white overflow-hidden"
      data-mode={effectiveMode}
    >
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

      <ToastContainer />
    </div>
  );
}

export default App;
